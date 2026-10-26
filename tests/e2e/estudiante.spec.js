'use strict';
const fs = require('node:fs/promises');
const { test, expect } = require('@playwright/test');
const { fechaFutura, semanaActual, ADMIN, CONTRASENA } = require('./datos');
const { registrar, vista, aviso, tokenPagina, api, item, dialogo, crearTarea, sinSecretos, loginAPI, salir, iniciarSesion } = require('./ayudas');

test.beforeEach(async ({ page }) => { await registrar(page); });

test('dashboard muestra métricas y estados de una cuenta nueva', async ({ page }) => {
  for (const id of ['pendientes', 'puntos', 'sesiones']) await expect(page.locator(`#metrica-${id}`)).toHaveText('0');
  await expect(page.locator('#metrica-nivel')).not.toBeEmpty();
  await expect(page.locator('#dashboard-tareas')).toHaveText('No tienes tareas pendientes.');
});

test('Materias permite seleccionar del catálogo, editar y eliminar', async ({ page }) => {
  await vista(page, 'materias');
  await page.locator('#mostrar-form-materia').click();
  const form = page.locator('#form-materia');
  const select = form.getByLabel('Asignatura');
  await expect(select).toBeEnabled();
  await expect(form.locator('input[name=nombre]')).toHaveCount(0);
  // La primera asignatura ya pertenece al estudiante por el registro.
  await select.selectOption({ index: 2 });
  const nombre = await select.locator('option:checked').textContent();
  await form.getByLabel(/Horario/).fill('Lunes 10:00');
  await form.getByRole('button', { name: 'Guardar materia' }).click();
  await aviso(page, 'Materia creada.');
  const fila = item(page, '#lista-materias', nombre);
  await expect(fila).toContainText('Lunes 10:00');
  await fila.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#modal-accion').getByLabel(/Horario/).fill('Martes 14:00');
  await page.locator('#modal-accion').getByRole('button', { name: 'Guardar materia' }).click();
  await aviso(page, 'Materia actualizada.');
  await expect(fila).toContainText('Martes 14:00');
  await dialogo(page, () => fila.getByRole('button', { name: 'Eliminar', exact: true }).click());
  await expect(fila).toHaveCount(0);
});

test('CRUD de tareas, filtros independientes y completar acredita puntos', async ({ page, request }) => {
  let fila = await crearTarea(page, 'Lectura principal');
  await crearTarea(page, 'Borrador secundario', { prioridad: 'Baja', materia: false });
  await page.locator('#buscar-tarea').fill('Lectura');
  await expect(page.locator('#lista-tareas > .item')).toHaveCount(1);
  await expect(fila).toBeVisible();
  await page.locator('#limpiar-filtros').click();
  await page.locator('#filtro-materia').selectOption({ index: 1 });
  await expect(page.locator('#lista-tareas > .item')).toHaveCount(1);
  await expect(fila).toBeVisible();
  await page.locator('#limpiar-filtros').click();
  await page.locator('#filtro-prioridad').selectOption('Baja');
  await expect(page.locator('#lista-tareas > .item')).toHaveCount(1);
  await expect(item(page, '#lista-tareas', 'Borrador secundario')).toBeVisible();
  await page.locator('#limpiar-filtros').click();
  await fila.getByRole('button', { name: 'Detalle', exact: true }).click();
  await expect(page.locator('#detalle-tarea-nombre')).toHaveText('Lectura principal');
  await page.locator('#cerrar-detalle-tarea').click();
  await fila.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.locator('#form-tarea').getByLabel('Nombre', { exact: true }).fill('Lectura revisada');
  await page.locator('#form-tarea').getByRole('button', { name: 'Guardar tarea' }).click();
  await aviso(page, 'Tarea actualizada.');
  fila = item(page, '#lista-tareas', 'Lectura revisada');
  const token = await tokenPagina(page);
  const antes = (await api(request, token, 'get', '/puntos')).total;
  await fila.getByRole('button', { name: 'Completar', exact: true }).click();
  await expect(page.locator('#modal-recompensa')).toBeVisible();
  await expect(page.locator('#detalle-recompensa')).toContainText(/\+\d+ puntos/);
  await page.locator('#cerrar-recompensa').click();
  expect((await api(request, token, 'get', '/puntos')).total).toBeGreaterThan(Number(antes));
  await page.locator('#filtro-estado').selectOption('Completada');
  await expect(page.locator('#lista-tareas > .item')).toHaveCount(1);
  await expect(fila).toContainText('Completada');
  await page.locator('#filtro-estado').selectOption('Pendiente');
  await expect(item(page, '#lista-tareas', 'Borrador secundario')).toBeVisible();
  await expect(fila).toHaveCount(0);
  await page.locator('#limpiar-filtros').click();
  const borrador = item(page, '#lista-tareas', 'Borrador secundario');
  await dialogo(page, () => borrador.getByRole('button', { name: 'Eliminar', exact: true }).click());
  await expect(borrador).toHaveCount(0);
});

test('retos: crear, editar, desactivar, reactivar y recompensa única', async ({ page, request }) => {
  await vista(page, 'gamificacion');
  await expect(page.locator('#gamificacion-nivel')).not.toBeEmpty();
  await expect(page.locator('#lista-insignias')).toBeVisible();
  await page.getByRole('button', { name: 'Nuevo reto', exact: true }).click();
  const form = page.locator('#form-reto');
  await form.getByLabel(/^Descripción/).fill('Reto de prueba');
  await form.getByLabel('Tipo de condición').selectOption('tareas');
  await form.getByLabel('Objetivo', { exact: true }).fill('2');
  await form.getByLabel(/^Puntos de recompensa/).fill('37');
  await form.getByLabel('Semana', { exact: true }).fill(semanaActual());
  await form.getByRole('button', { name: 'Guardar reto' }).click();
  await aviso(page, 'Reto creado.');
  let fila = item(page, '#lista-retos-metas', 'Reto de prueba');
  await fila.getByRole('button', { name: 'Editar', exact: true }).click();
  await form.getByLabel(/^Descripción/).fill('Reto revisado');
  await form.getByRole('button', { name: 'Guardar reto' }).click();
  await aviso(page, 'Reto actualizado.');
  fila = item(page, '#lista-retos-metas', 'Reto revisado');
  await fila.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(fila.locator('.chip')).toHaveText('Inactivo');
  await expect(fila.getByRole('button', { name: 'Completar', exact: true })).toHaveCount(0);
  await fila.getByRole('button', { name: 'Reactivar', exact: true }).click();
  await expect(fila.locator('.chip')).toHaveText('Activo');
  const token = await tokenPagina(page);
  const antes = Number((await api(request, token, 'get', '/puntos')).total);
  const id = await fila.locator('[data-accion=completar-reto]').getAttribute('data-id');
  await dialogo(page, () => fila.getByRole('button', { name: 'Completar', exact: true }).click());
  await aviso(page, 'Reto completado.');
  await expect(fila.locator('.chip')).toHaveText('Completado');
  expect(Number((await api(request, token, 'get', '/puntos')).total)).toBe(antes + 37);
  await api(request, token, 'patch', `/retos/${id}/completar`);
  const puntos = await api(request, token, 'get', '/puntos');
  expect(Number(puntos.total)).toBe(antes + 37);
  expect(puntos.datos.filter(p => p.id_origen === id)).toHaveLength(1);
});

test('la sugerencia solo se guarda al aceptarla', async ({ page, request }) => {
  const correo = await page.locator('#usuario-correo').textContent();
  await salir(page);
  await iniciarSesion(page, { correo, contrasena: CONTRASENA });
  const token = await tokenPagina(page);
  await vista(page, 'gamificacion');
  await expect(page.locator('#meta-sugerida')).toBeVisible();
  await expect(page.locator('#descripcion-meta-sugerida')).toHaveText('Completar 5 actividades de estudio esta semana');
  expect((await api(request, token, 'get', '/metas')).datos).toHaveLength(0);
  await page.reload();
  await expect(page.locator('#aplicacion')).toBeVisible();
  await vista(page, 'gamificacion');
  await expect(page.locator('#meta-sugerida')).toBeVisible();
  expect((await api(request, token, 'get', '/metas')).datos).toHaveLength(0);
  await page.getByRole('button', { name: 'Aceptar sugerencia', exact: true }).click();
  await aviso(page, 'Meta creada.');
  await expect(item(page, '#lista-retos-metas', 'Completar 5 actividades de estudio esta semana')).toBeVisible();
  await expect(page.locator('#meta-sugerida')).toBeHidden();
  await expect(page.locator('#form-meta')).toBeHidden();
  expect((await api(request, token, 'get', '/metas')).datos).toHaveLength(1);
});

test('personalizar la sugerencia permite crear una meta propia', async ({ page, request }) => {
  await vista(page, 'gamificacion');
  await page.getByRole('button', { name: 'Personalizar', exact: true }).click();
  const form = page.locator('#form-meta');
  await expect(form.getByLabel('Descripción', { exact: true })).toHaveValue('Completar 5 actividades de estudio esta semana');
  await expect(form.getByLabel('Objetivo', { exact: true })).toHaveValue('5');
  const token = await tokenPagina(page);
  expect((await api(request, token, 'get', '/metas')).datos).toHaveLength(0);
  await form.getByLabel('Descripción', { exact: true }).fill('Repasar álgebra');
  await form.getByLabel('Objetivo', { exact: true }).fill('3');
  await form.getByRole('button', { name: 'Crear meta propia', exact: true }).click();
  await aviso(page, 'Meta creada.');
  await expect(item(page, '#lista-retos-metas', 'Repasar álgebra')).toContainText('0/3');
  await expect(form).toBeHidden();
  const metas = (await api(request, token, 'get', '/metas')).datos;
  expect(metas).toHaveLength(1);
  expect(metas[0]).toMatchObject({ descripcion: 'Repasar álgebra', valor_objetivo: 3 });
});

test('metas existentes se editan y eliminan por UI', async ({ page, request }) => {
  const token = await tokenPagina(page);
  await api(request, token, 'post', '/metas', { descripcion: 'Meta inicial', semana: semanaActual(), valor_objetivo: 180 }, 201);
  await page.reload();
  await expect(page.locator('#aplicacion')).toBeVisible();
  await vista(page, 'gamificacion');
  const inicial = item(page, '#lista-retos-metas', 'Meta inicial');
  await dialogo(page, () => inicial.getByRole('button', { name: 'Editar', exact: true }).click(), 'Meta actualizada E2E');
  await aviso(page, 'Meta actualizada.');
  const fila = item(page, '#lista-retos-metas', 'Meta actualizada E2E');
  await expect(fila).toBeVisible();
  await dialogo(page, () => fila.getByRole('button', { name: 'Eliminar', exact: true }).click());
  await expect(fila).toHaveCount(0);
  expect((await api(request, token, 'get', '/metas')).datos).toHaveLength(0);
});

test('Pomodoro: enfoque, pausa, descanso, guardar, libre y cancelar', async ({ page, request }) => {
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await vista(page, 'pomodoro');
  await page.locator('#iniciar-temporizador').click();
  await expect(page.locator('#tarjeta-temporizador')).toHaveClass(/enfoque/);
  await page.clock.runFor(60_000);
  await expect(page.locator('#reloj')).toHaveText('24:00');
  await page.locator('#iniciar-temporizador').click();
  await expect(page.locator('#estado-temporizador')).toHaveText('Sesión pausada.');
  await page.clock.runFor(10_000);
  await expect(page.locator('#reloj')).toHaveText('24:00');
  await expect(page.locator('#tarjeta-temporizador')).not.toHaveClass(/enfoque/);
  await page.locator('#iniciar-temporizador').click();
  await page.clock.runFor(24 * 60_000);
  await expect(page.locator('#estado-temporizador')).toContainText('Descanso de 5 minutos');
  await expect(page.locator('#tarjeta-temporizador')).not.toHaveClass(/enfoque/);
  await page.clock.runFor(5 * 60_000);
  await expect(page.locator('#estado-temporizador')).toContainText('Nuevo ciclo de enfoque');
  await page.locator('#guardar-temporizador').click();
  await expect(page.locator('#modal-recompensa')).toBeVisible();
  await page.locator('#cerrar-recompensa').click();
  const token = await tokenPagina(page);
  let sesiones = (await api(request, token, 'get', '/sesiones')).datos;
  expect(sesiones).toHaveLength(1);
  expect(sesiones[0]).toMatchObject({ duracion_minutos: 25, modo_enfoque: true, id_tarea: null });
  await page.getByLabel('Libre', { exact: true }).check();
  await page.locator('#iniciar-temporizador').click();
  await page.clock.runFor(120_000);
  await expect(page.locator('#reloj')).toHaveText('02:00');
  await page.locator('#guardar-temporizador').click();
  await expect(page.locator('#modal-recompensa')).toBeVisible();
  await page.locator('#cerrar-recompensa').click();
  sesiones = (await api(request, token, 'get', '/sesiones')).datos;
  expect(sesiones).toHaveLength(2);
  expect(sesiones).toEqual(expect.arrayContaining([expect.objectContaining({ duracion_minutos: 2, modo_enfoque: false })]));
  await page.locator('#iniciar-temporizador').click();
  await page.clock.runFor(1000);
  await page.locator('#cancelar-temporizador').click();
  // Regresión: tras cancelar en modo Libre el estado no anuncia una sesión Pomodoro.
  await expect(page.locator('#estado-temporizador')).toHaveText('Listo para comenzar una sesión libre.');
  await expect(page.locator('#reloj')).toHaveText('00:00');
  expect((await api(request, token, 'get', '/sesiones')).datos).toHaveLength(2);
});

test('recordatorios: crear; notificaciones: marcar leída', async ({ page, request }) => {
  await crearTarea(page);
  await vista(page, 'recordatorios');
  const form = page.locator('#form-recordatorio');
  await form.locator('select[name=id_tarea]').selectOption({ index: 0 });
  await form.getByLabel('Fecha programada').fill(fechaFutura(2));
  await form.getByLabel('Mensaje', { exact: true }).fill('Preparar la lectura');
  await form.getByRole('button', { name: 'Guardar recordatorio' }).click();
  await aviso(page, 'Recordatorio creado.');
  await expect(page.locator('#lista-recordatorios')).toContainText('Preparar la lectura');
  // Crear un aviso por el contrato administrativo, sin depender del planificador ni la hora del equipo.
  const token = await tokenPagina(page);
  const perfil = await api(request, token, 'get', '/auth/perfil');
  const admin = await loginAPI(request, ADMIN);
  await api(request, admin.token, 'post', '/notificaciones', { id_cuenta: perfil.cuenta.id_cuenta, tipo: 'Sistema', mensaje: 'Aviso E2E' }, 201);
  await page.reload();
  await expect(page.locator('#aplicacion')).toBeVisible();
  await vista(page, 'notificaciones');
  const fila = page.locator('#lista-notificaciones > .item').filter({ hasText: 'Aviso E2E' });
  await fila.getByRole('button', { name: 'Marcar leída', exact: true }).click();
  await expect(fila).toHaveClass(/completada/);
  const lista = (await api(request, token, 'get', '/notificaciones')).datos;
  expect(lista.find(n => n.mensaje === 'Aviso E2E').leida).toBe(true);
});

test('tema y modo oscuro persisten después de recargar', async ({ page }) => {
  await vista(page, 'configuracion');
  const form = page.locator('#form-preferencias');
  await form.locator('select[name=tema]').selectOption('teal');
  await form.getByLabel('Activar modo oscuro').check();
  await form.getByRole('button', { name: 'Guardar preferencias' }).click();
  await aviso(page, 'Preferencias guardadas.');
  await page.reload();
  await expect(page.locator('#aplicacion')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'teal');
  await expect(page.locator('html')).toHaveClass(/modo-oscuro/);
  await vista(page, 'configuracion');
  await expect(form.locator('select[name=tema]')).toHaveValue('teal');
  await expect(form.getByLabel('Activar modo oscuro')).toBeChecked();
});

test('exportación descarga JSON propio sin hashes', async ({ page }) => {
  const correo = await page.locator('#usuario-correo').textContent();
  await crearTarea(page, 'Contenido privado exportable');
  await vista(page, 'exportacion');
  const pendiente = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Descargar datos.json' }).click();
  const descarga = await pendiente;
  expect(descarga.suggestedFilename()).toBe('datos.json');
  const datos = JSON.parse(await fs.readFile(await descarga.path(), 'utf8'));
  expect(datos.cuenta.correo).toBe(correo);
  expect(datos.tareas).toEqual(expect.arrayContaining([expect.objectContaining({ nombre: 'Contenido privado exportable' })]));
  for (const clave of ['materias', 'tareas', 'sesiones_estudio', 'puntos', 'retos', 'metas', 'recordatorios', 'notificaciones']) {
    for (const registro of datos[clave]) expect(registro.id_cuenta).toBe(datos.cuenta.id_cuenta);
  }
  await sinSecretos(datos);
});
