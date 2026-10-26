'use strict';
const { test, expect } = require('@playwright/test');
const { fechaFutura, semanaActual } = require('./datos');
const { elegirHorario, registrar, vista, aviso, tokenPagina, api, item, crearTarea } = require('./ayudas');

test.beforeEach(async ({ page }) => { await registrar(page); });

async function abrirFiltros(page) {
  const filtros = page.locator('#filtros-tareas');
  if (!await filtros.evaluate(e => e.open)) await filtros.locator('summary').click();
}

test('tareas: búsqueda, rango inclusivo y eliminación cancelada/confirmada', async ({ page, request }) => {
  const token = await tokenPagina(page);
  const desde = fechaFutura(3), hasta = fechaFutura(5);
  for (const [nombre, fecha] of [['Informe temprano', desde], ['Informe final', hasta], ['Informe posterior', fechaFutura(6)], ['Otra actividad', hasta]]) {
    await api(request, token, 'post', '/tareas', { nombre, fecha_entrega: fecha, prioridad: 'Media' }, 201);
  }
  await page.reload();
  await expect(page.locator('#aplicacion')).toBeVisible();
  await vista(page, 'tareas');
  await page.locator('#buscar-tarea').fill('Informe');
  await abrirFiltros(page);
  await page.locator('#filtro-fecha-desde').fill(desde);
  await page.locator('#filtro-fecha-hasta').fill(hasta);
  await expect(page.locator('#lista-tareas > .item')).toHaveCount(2);
  await expect(page.locator('#total-tareas')).toHaveText('2 resultados');
  const fila = item(page, '#lista-tareas', 'Informe final');
  const deletes = [];
  page.on('request', r => { if (r.method() === 'DELETE' && r.url().includes('/api/tareas/')) deletes.push(r); });
  await fila.getByRole('button', { name: 'Eliminar', exact: true }).click();
  const modal = page.locator('#modal-accion');
  await expect(modal).toContainText('Informe final');
  await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(fila).toBeVisible();
  expect(deletes).toHaveLength(0);
  expect((await api(request, token, 'get', '/tareas')).datos).toHaveLength(4);
  await fila.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await modal.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await aviso(page, 'Tarea eliminada.');
  await expect(fila).toHaveCount(0);
  expect(deletes).toHaveLength(1);
  expect((await api(request, token, 'get', '/tareas')).datos).toHaveLength(3);
});

test('materias: alta y edición en el formulario contextual con horario estructurado', async ({ page, request }) => {
  await vista(page, 'materias');
  const form = page.locator('#form-materia');
  await expect(form).toBeHidden();
  await page.locator('#mostrar-form-materia').click();
  await expect(form).toBeVisible();
  await form.getByLabel('Asignatura').selectOption({ index: 2 });
  const nombre = await form.locator('select[name=id_catalogo_materia] option:checked').textContent();
  await elegirHorario(form, [['Viernes', 540, 600]]);
  await form.getByRole('button', { name: 'Guardar materia' }).click();
  await aviso(page, 'Materia creada.');
  await expect(form).toBeHidden();
  const fila = item(page, '#lista-materias', nombre);
  await expect(fila).toContainText('Viernes 9:00 a. m. – 10:00 a. m.');
  expect((await api(request, await tokenPagina(page), 'get', '/materias')).datos).toEqual(expect.arrayContaining([expect.objectContaining({ nombre, horario: 'Viernes 9:00 a. m. – 10:00 a. m.' })]));
  await fila.getByRole('button', { name: 'Editar', exact: true }).click();
  await expect(form).toBeVisible();
  await elegirHorario(form, [['Sábado', 660, 720]]);
  await form.getByRole('button', { name: 'Guardar materia' }).click();
  await aviso(page, 'Materia actualizada.');
  await expect(fila).toContainText('Sábado 11:00 a. m. – 12:00 p. m.');
});

test('sugerencia estándar: consultarla no guarda; aceptar guarda una sola meta', async ({ page, request }) => {
  const token = await tokenPagina(page);
  const escrituras = [];
  page.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/api/metas')) escrituras.push(r); });
  await vista(page, 'gamificacion');
  await expect(page.locator('#meta-sugerida')).toContainText('Sugerencia estándar');
  await expect(page.locator('#descripcion-meta-sugerida')).toHaveText('Completar 5 actividades de estudio esta semana');
  await expect(page.locator('#semana-meta-sugerida')).toContainText('Semana');
  expect((await api(request, token, 'get', '/metas')).datos).toHaveLength(0);
  await vista(page, 'dashboard');
  await vista(page, 'gamificacion');
  expect(escrituras).toHaveLength(0);
  await page.locator('#aceptar-meta-sugerida').click();
  await aviso(page, 'Meta creada.');
  await expect(page.locator('#panel-meta')).toBeHidden();
  const metas = (await api(request, token, 'get', '/metas')).datos;
  expect(metas).toHaveLength(1);
  expect(metas[0]).toMatchObject({ semana: semanaActual(), valor_objetivo: 5 });
  expect(escrituras).toHaveLength(1);
});

test('retos: condición natural, estado textual y confirmación antes del crédito', async ({ page, request }) => {
  const token = await tokenPagina(page);
  const { dato } = await api(request, token, 'post', '/retos', { descripcion: 'Reto de cinco tareas', condicion: 'tareas:5', puntos_recompensa: 25, semana: semanaActual() }, 201);
  await page.reload();
  await expect(page.locator('#aplicacion')).toBeVisible();
  await vista(page, 'gamificacion');
  const fila = item(page, '#lista-retos-metas', 'Reto de cinco tareas');
  await expect(fila).toContainText('Completar 5 tareas');
  await expect(fila).toContainText('25 puntos');
  await expect(fila.locator('.chip')).toHaveText('Activo');
  await expect(fila).not.toContainText('tareas:5');
  const antes = (await api(request, token, 'get', '/puntos')).total;
  const creditos = [];
  page.on('request', r => { if (r.method() === 'PATCH' && r.url().endsWith(`/retos/${dato.id_reto}/completar`)) creditos.push(r); });
  await fila.getByRole('button', { name: 'Completar', exact: true }).click();
  await expect(page.locator('#modal-accion')).toContainText('25 puntos');
  await page.locator('#cancelar-accion').click();
  expect(creditos).toHaveLength(0);
  expect((await api(request, token, 'get', '/puntos')).total).toBe(antes);
  await expect(fila.locator('.chip')).toHaveText('Activo');
});

for (const accion of ['desactivar-cuenta', 'eliminar-datos']) {
  test(`zona de peligro: cancelar ${accion} no cambia la cuenta ni sus datos`, async ({ page, request }) => {
    await crearTarea(page, 'Datos conservados');
    const token = await tokenPagina(page);
    const antes = await api(request, token, 'get', '/auth/perfil');
    await vista(page, 'configuracion');
    await expect(page.locator('#zona-peligro')).toContainText('Zona de peligro');
    const borrados = [];
    page.on('request', r => { if (r.method() === 'DELETE' && r.url().includes('/api/cuentas/')) borrados.push(r); });
    await page.locator(`#${accion}`).click();
    const modal = page.locator('#modal-accion');
    await expect(modal).toContainText(antes.cuenta.correo);
    // Paso 1 contextual; el paso 2 reforzado exige escribir el correo.
    await expect(modal.locator('input')).toHaveCount(0);
    await page.locator('#confirmar-accion').click();
    expect(borrados).toHaveLength(0);
    await expect(page.locator('#confirmar-accion')).toBeDisabled();
    await modal.locator('input').fill('correo-incorrecto@test.local');
    await expect(page.locator('#confirmar-accion')).toBeDisabled();
    await modal.locator('input').fill(antes.cuenta.correo);
    await expect(page.locator('#confirmar-accion')).toBeEnabled();
    await page.locator('#cancelar-accion').click();
    expect(borrados).toHaveLength(0);
    expect(await tokenPagina(page)).toBe(token);
    expect((await api(request, token, 'get', '/auth/perfil')).cuenta).toEqual(antes.cuenta);
    expect((await api(request, token, 'get', '/tareas')).datos).toEqual(expect.arrayContaining([expect.objectContaining({ nombre: 'Datos conservados' })]));
  });
}

test('preferencias: dos temas, modo oscuro y error sin actualización visual', async ({ page }) => {
  await vista(page, 'configuracion');
  const form = page.locator('#form-preferencias');
  await expect(form.locator('[name=tema] option')).toHaveCount(6);
  for (const tema of ['teal', 'blue']) {
    await form.locator('[name=tema]').selectOption(tema);
    await form.getByLabel('Activar modo oscuro').setChecked(tema === 'blue');
    await form.getByRole('button', { name: 'Guardar preferencias' }).click();
    await aviso(page, 'Preferencias guardadas.');
    await expect(page.locator('html')).toHaveAttribute('data-tema', tema);
    if (tema === 'blue') await expect(page.locator('html')).toHaveClass(/modo-oscuro/);
    else await expect(page.locator('html')).not.toHaveClass(/modo-oscuro/);
  }
  await page.reload();
  await expect(page.locator('#aplicacion')).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'blue');
  await expect(page.locator('html')).toHaveClass(/modo-oscuro/);
  await vista(page, 'configuracion');
  await page.route('**/api/preferencias', route => route.request().method() === 'PUT' ? route.fulfill({ status: 503, json: { error: 'Preferencias no disponibles' } }) : route.continue());
  await form.locator('[name=tema]').selectOption('coral');
  await form.getByLabel('Activar modo oscuro').uncheck();
  await form.getByRole('button', { name: 'Guardar preferencias' }).click();
  await aviso(page, 'Preferencias no disponibles');
  await expect(page.locator('html')).toHaveAttribute('data-tema', 'blue');
  await expect(page.locator('html')).toHaveClass(/modo-oscuro/);
});

for (const ancho of [375, 390, 768, 1024, 1440]) {
  test(`vistas de estudiante sin desbordamiento a ${ancho}px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    for (const nombre of ['dashboard', 'materias', 'tareas', 'pomodoro', 'gamificacion', 'estadisticas', 'recordatorios', 'notificaciones', 'configuracion']) {
      await vista(page, nombre);
      expect(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), nombre).toBe(true);
    }
  });
}

test('tarea: petición pendiente impide doble envío y error conserva formulario y lista', async ({ page, request }) => {
  await vista(page, 'tareas');
  await page.locator('#mostrar-form-tarea').click();
  const form = page.locator('#form-tarea');
  await form.getByLabel('Nombre', { exact: true }).fill('No guardada');
  await form.getByLabel('Fecha de entrega').fill(fechaFutura());
  let pendiente, envios = 0;
  await page.route('**/api/tareas', route => {
    if (route.request().method() === 'POST') { envios++; pendiente = route; }
    else return route.continue();
  });
  await form.getByRole('button', { name: 'Guardar tarea' }).click();
  await expect(form).toHaveAttribute('aria-busy', 'true');
  await expect(form.getByRole('button', { name: 'Guardar tarea' })).toBeDisabled();
  await form.evaluate(e => e.requestSubmit());
  await expect.poll(() => Boolean(pendiente)).toBe(true);
  expect(envios).toBe(1);
  await pendiente.fulfill({ status: 503, json: { error: 'Tareas no disponibles; intenta más tarde' } });
  await aviso(page, 'Tareas no disponibles; intenta más tarde');
  await expect(form).toBeVisible();
  await expect(form.getByLabel('Nombre', { exact: true })).toHaveValue('No guardada');
  await expect(item(page, '#lista-tareas', 'No guardada')).toHaveCount(0);
  expect((await api(request, await tokenPagina(page), 'get', '/tareas')).datos).toHaveLength(0);
});

test('meta: semana ISO inexistente rechazada sin guardar', async ({ page, request }) => {
  await vista(page, 'gamificacion');
  await page.locator('#mostrar-form-meta').click();
  const form = page.locator('#form-meta');
  await form.getByLabel('Descripción', { exact: true }).fill('Semana inexistente');
  await form.getByLabel('Objetivo', { exact: true }).fill('5');
  await form.locator('[name=semana]').evaluate(e => { e.value = '2021-W53'; });
  const respuesta = page.waitForResponse(r => r.url().endsWith('/api/metas') && r.request().method() === 'POST');
  await form.getByRole('button', { name: 'Crear meta propia' }).click();
  expect((await respuesta).status()).toBe(400);
  await aviso(page, 'semana no es una semana ISO válida');
  await expect(form).toBeVisible();
  expect((await api(request, await tokenPagina(page), 'get', '/metas')).datos).toHaveLength(0);
});
