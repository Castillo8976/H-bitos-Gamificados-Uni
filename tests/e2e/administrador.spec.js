'use strict';
const { randomUUID } = require('node:crypto');
const { test, expect } = require('@playwright/test');
const { ADMIN, semanaActual } = require('./datos');
const { iniciarSesion, registrarAPI, loginAPI, api, tokenPagina, aviso, vista, item, dialogo, prepararRegistro, sinSecretos } = require('./ayudas');

test('login administrativo y gestión de otra cuenta: desactivar y reactivar', async ({ page, request }) => {
  const estudiante = await registrarAPI(request);
  await iniciarSesion(page, ADMIN);
  await expect(page.locator('#vista-administracion')).toBeVisible();
  const fila = page.locator('#lista-usuarios-admin > .item').filter({ hasText: estudiante.correo });
  await fila.getByLabel('Activa', { exact: true }).uncheck();
  const guardar = async () => {
    const respuesta = page.waitForResponse(r => r.url().endsWith(`/api/cuentas/${estudiante.cuenta.id_cuenta}`) && r.request().method() === 'PUT');
    await fila.getByRole('button', { name: 'Guardar', exact: true }).click();
    expect((await respuesta).status()).toBe(200);
    await aviso(page, 'Cuenta actualizada.');
  };
  await guardar();
  const login = () => request.post('/api/auth/login', { data: { correo: estudiante.correo, contrasena: estudiante.contrasena } });
  expect((await login()).status()).toBe(403);
  await fila.getByLabel('Activa', { exact: true }).check();
  await guardar();
  await expect(fila.getByLabel('Activa', { exact: true })).toBeChecked();
  expect((await login()).status()).toBe(200);
});

test('P17: crear, editar, desactivar, ocultar en registro, reactivar y eliminar', async ({ page, request, context }) => {
  await iniciarSesion(page, ADMIN);
  const nombre = `Asignatura E2E ${randomUUID()}`;
  const nuevo = `${nombre} revisada`;
  const form = page.locator('#form-admin-catalogo');
  await form.getByLabel('Nombre', { exact: true }).fill(nombre);
  await form.getByRole('button', { name: 'Crear asignatura' }).click();
  await aviso(page, 'Asignatura creada.');
  let fila = item(page, '#lista-catalogo-materias', nombre);
  await dialogo(page, () => fila.getByRole('button', { name: 'Editar nombre' }).click(), nuevo);
  await aviso(page, 'Catálogo actualizado.');
  fila = item(page, '#lista-catalogo-materias', nuevo);
  await expect(fila).toBeVisible();
  const id = await fila.locator('[data-accion=estado-catalogo]').getAttribute('data-id');
  await fila.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(fila.getByText('Inactiva', { exact: true })).toBeVisible();
  const publica = await context.newPage();
  try {
    await prepararRegistro(publica);
    await expect(publica.locator(`#form-registro option[value="${id}"]`)).toHaveCount(0);
    const catalogo = await (await request.get('/api/catalogo-materias')).json();
    expect(catalogo.datos.some(m => m.id_catalogo_materia === id)).toBe(false);
  } finally { await publica.close(); }
  await fila.getByRole('button', { name: 'Reactivar', exact: true }).click();
  await expect(fila.getByText('Activa', { exact: true })).toBeVisible();
  expect((await (await request.get('/api/catalogo-materias')).json()).datos.some(m => m.id_catalogo_materia === id)).toBe(true);
  await dialogo(page, () => fila.getByRole('button', { name: 'Eliminar', exact: true }).click());
  await expect(fila).toHaveCount(0);
});

test('insignias y niveles: crear, editar y eliminar por UI', async ({ page, request }) => {
  await iniciarSesion(page, ADMIN);
  const sufijo = randomUUID();
  const insignia = `Insignia ${sufijo}`;
  const nivel = `Nivel ${sufijo}`;
  const form = page.locator('#form-admin-insignia');
  await form.getByLabel('Nombre', { exact: true }).fill(insignia);
  await form.getByLabel('Descripción', { exact: true }).fill('Descripción inicial');
  await form.getByLabel('Condición', { exact: true }).fill(`e2e_${sufijo}`);
  await form.getByRole('button', { name: 'Crear insignia' }).click();
  await aviso(page, 'Insignia creada.');
  const nivelForm = page.locator('#form-admin-nivel');
  const token = await tokenPagina(page);
  const niveles = (await api(request, token, 'get', '/niveles')).datos;
  const orden = Math.max(0, ...niveles.map(n => n.orden)) + 1;
  await nivelForm.getByLabel('Nombre', { exact: true }).fill(nivel);
  await nivelForm.getByLabel('Descripción', { exact: true }).fill('Nivel de prueba');
  await nivelForm.getByLabel('Puntos mínimos').fill(String(orden * 10000));
  await nivelForm.getByLabel('Orden', { exact: true }).fill(String(orden));
  await nivelForm.getByRole('button', { name: 'Crear nivel' }).click();
  await aviso(page, 'Nivel creado.');
  for (const [nombre, recurso, idCampo] of [[insignia, 'insignias', 'id_insignia'], [nivel, 'niveles', 'id_nivel']]) {
    const fila = item(page, '#lista-catalogos-admin', nombre);
    const id = await fila.getByRole('button', { name: 'Editar', exact: true }).getAttribute('data-id');
    await dialogo(page, () => fila.getByRole('button', { name: 'Editar', exact: true }).click(), 'Descripción editada E2E');
    await aviso(page, /actualizada|actualizado/);
    const dato = (await api(request, token, 'get', `/${recurso}/${id}`)).dato;
    expect(dato[idCampo]).toBe(id);
    expect(dato.descripcion).toBe('Descripción editada E2E');
    await dialogo(page, () => fila.getByRole('button', { name: 'Eliminar', exact: true }).click());
    await expect(fila).toHaveCount(0);
  }
});

test('asigna y gestiona retos administrativos de otra cuenta', async ({ page, request }) => {
  const estudiante = await registrarAPI(request);
  await iniciarSesion(page, ADMIN);
  const form = page.locator('#form-admin-reto');
  const detalle = page.waitForResponse(r => r.url().includes(`/api/retos?id_cuenta=${estudiante.cuenta.id_cuenta}`));
  await form.locator('select[name=id_cuenta]').selectOption(estudiante.cuenta.id_cuenta);
  expect((await detalle).status()).toBe(200);
  // El cambio de cuenta consulta el detalle y vuelve a representar los controles.
  await expect(page.locator('#admin-correccion-cuenta')).toHaveValue(estudiante.cuenta.id_cuenta);
  await form.getByLabel('Descripción', { exact: true }).fill('Reto administrativo E2E');
  await form.getByLabel('Condición', { exact: true }).fill('tareas:3');
  await form.getByLabel('Recompensa', { exact: true }).fill('41');
  await form.getByLabel('Semana', { exact: true }).fill(semanaActual());
  await form.getByRole('button', { name: 'Asignar reto', exact: true }).click();
  await aviso(page, 'Reto semanal asignado.');
  const fila = item(page, '#lista-retos-admin', 'Reto administrativo E2E');
  await dialogo(page, () => fila.getByRole('button', { name: 'Editar', exact: true }).click(), 'Reto administrativo revisado');
  await aviso(page, 'Reto actualizado.');
  const editada = item(page, '#lista-retos-admin', 'Reto administrativo revisado');
  await editada.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await expect(editada.locator('.chip')).toHaveText('Inactivo');
  await editada.getByRole('button', { name: 'Reactivar', exact: true }).click();
  await expect(editada.locator('.chip')).toHaveText('Activo');
  const retos = (await api(request, estudiante.token, 'get', '/retos')).datos;
  expect(retos).toHaveLength(1);
  expect(retos[0]).toMatchObject({ descripcion: 'Reto administrativo revisado', activo: true, id_cuenta: estudiante.cuenta.id_cuenta });
  await dialogo(page, () => editada.getByRole('button', { name: 'Eliminar', exact: true }).click());
  await expect(editada).toHaveCount(0);
});

test('estadísticas institucionales muestran agregados sin datos personales', async ({ page, request }) => {
  const usuario = await registrarAPI(request);
  await iniciarSesion(page, ADMIN);
  await vista(page, 'institucional');
  const pendiente = page.waitForResponse(r => r.url().includes('/api/estadisticas/institucionales'));
  await page.getByRole('button', { name: 'Consultar indicadores' }).click();
  const respuesta = await pendiente;
  expect(respuesta.status()).toBe(200);
  const datos = await respuesta.json();
  await sinSecretos(datos);
  expect(JSON.stringify(datos)).not.toMatch(/"(?:correo|nombre|id_cuenta|cuentas|estudiantes)"/);
  expect(JSON.stringify(datos)).not.toContain(usuario.correo);
  await expect(page.locator('#metricas-institucionales')).toContainText('Estudiantes activos');
  await expect(page.locator('#vista-institucional')).not.toContainText(usuario.correo);
});
