'use strict';
const { expect } = require('@playwright/test');
const { estudiante, fechaFutura } = require('./datos');

async function aviso(page, texto) {
  await expect(page.locator('#avisos')).toContainText(texto);
  await expect(page.locator('#avisos .aviso')).toBeVisible();
}
async function vista(page, nombre) {
  if (await page.locator('#abrir-menu').isVisible()) await page.locator('#abrir-menu').click();
  await page.locator(`nav [data-vista="${nombre}"]`).click();
  await expect(page.locator(`#vista-${nombre}`)).toBeVisible();
}
async function prepararRegistro(page, datos = estudiante(), { seleccionarMateria = true } = {}) {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Crear cuenta' }).click();
  const form = page.locator('#form-registro');
  await expect(form.locator('select[name=id_catalogo_materia]')).toBeEnabled();
  await form.getByLabel('Nombre completo').fill(datos.nombre);
  await form.getByLabel('Correo', { exact: true }).fill(datos.correo);
  await form.getByLabel(/^Contraseña/).fill(datos.contrasena);
  if (seleccionarMateria) await form.getByLabel('Materia inicial').selectOption({ index: 1 });
  return datos;
}
async function registrar(page, datos = estudiante(), { correo = false } = {}) {
  await prepararRegistro(page, datos);
  const respuesta = page.waitForResponse(r => r.url().endsWith('/api/auth/registro') && r.request().method() === 'POST');
  await page.locator('#form-registro').getByRole('button', { name: 'Registrarme' }).click();
  expect((await respuesta).status()).toBe(201);
  await expect(page.locator(correo ? '#modal-codigo-correo' : '#aplicacion')).toBeVisible();
  if (!correo) await expect(page.locator('#usuario-correo')).toHaveText(datos.correo);
  return datos;
}
async function enviarLogin(page, datos) {
  await page.goto('/');
  await page.getByRole('tab', { name: 'Ingresar', exact: true }).click();
  const form = page.locator('#form-login');
  await form.getByLabel('Correo', { exact: true }).fill(datos.correo);
  await form.getByLabel('Contraseña', { exact: true }).fill(datos.contrasena);
  const respuesta = page.waitForResponse(r => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST');
  await form.getByRole('button', { name: 'Iniciar sesión', exact: true }).click();
  return respuesta;
}
async function iniciarSesion(page, datos) {
  const respuesta = await enviarLogin(page, datos);
  expect(respuesta.status()).toBe(200);
  await expect(page.locator('#aplicacion')).toBeVisible();
  await expect(page.locator('#usuario-correo')).toHaveText(datos.correo);
}
async function salir(page) {
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.locator('#form-login')).toBeVisible();
  expect(await tokenPagina(page)).toBeNull();
}
const tokenPagina = page => page.evaluate(() => sessionStorage.getItem('studyquest_token'));
const autorizacion = token => ({ Authorization: `Bearer ${token}` });
async function api(request, token, metodo, ruta, data, esperado = 200) {
  const respuesta = await request[metodo](`/api${ruta}`, { headers: autorizacion(token), ...(data === undefined ? {} : { data }) });
  expect(respuesta.status(), `${metodo.toUpperCase()} ${ruta}: ${await respuesta.text()}`).toBe(esperado);
  return esperado === 204 ? null : respuesta.json();
}
async function registrarAPI(request, datos = estudiante()) {
  const catalogo = await (await request.get('/api/catalogo-materias')).json();
  const respuesta = await request.post('/api/auth/registro', { data: { ...datos, materia: { id_catalogo_materia: catalogo.datos[0].id_catalogo_materia } } });
  expect(respuesta.status()).toBe(201);
  return { ...datos, cuenta: (await respuesta.json()).cuenta, ...await loginAPI(request, datos) };
}
async function loginAPI(request, datos) {
  const respuesta = await request.post('/api/auth/login', { data: { correo: datos.correo, contrasena: datos.contrasena } });
  expect(respuesta.status()).toBe(200);
  const resultado = await respuesta.json();
  expect(resultado.token).toEqual(expect.any(String));
  return resultado;
}
function item(page, lista, texto) {
  return page.locator(`${lista} .item`).filter({ has: page.locator('strong').filter({ hasText: texto }) });
}
async function dialogo(page, accion, respuesta) {
  await accion();
  const dialog = page.locator('#modal-accion');
  await expect(dialog).toBeVisible();
  if (respuesta !== undefined) await dialog.locator('input').fill(respuesta);
  await dialog.locator('button[type=submit]').click();
}
/** Rellena las franjas del selector de horario: [[día, inicioMin, finMin], ...]. */
async function elegirHorario(form, franjas) {
  const control = form.locator('[data-selector-horario-control]');
  for (const [i, [dia, inicio, fin]] of franjas.entries()) {
    if (i >= await control.locator('[data-franja-horario]').count()) await control.locator('[data-agregar-horario]').click();
    const fila = control.locator('[data-franja-horario]').nth(i);
    await fila.locator('[data-horario-dia]').selectOption(dia);
    await fila.locator('[data-horario-inicio]').selectOption(String(inicio));
    await fila.locator('[data-horario-fin]').selectOption(String(fin));
  }
  return control;
}

async function crearTarea(page, nombre = 'Lectura de prueba', opciones = {}) {
  await vista(page, 'tareas');
  await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
  const form = page.locator('#form-tarea');
  await form.getByLabel('Nombre', { exact: true }).fill(nombre);
  await form.getByLabel('Fecha de entrega').fill(fechaFutura());
  await form.locator('select[name=prioridad]').selectOption(opciones.prioridad || 'Alta');
  if (opciones.materia !== false) await form.locator('[name=id_materia]').selectOption({ index: 1 });
  const respuesta = page.waitForResponse(r => r.url().endsWith('/api/tareas') && r.request().method() === 'POST');
  await form.getByRole('button', { name: 'Guardar tarea' }).click();
  expect((await respuesta).status()).toBe(201);
  await aviso(page, 'Tarea creada.');
  await expect(item(page, '#lista-tareas', nombre)).toBeVisible();
  return item(page, '#lista-tareas', nombre);
}
async function sinSecretos(valor) {
  const texto = JSON.stringify(valor);
  expect(texto).not.toMatch(/contrasena_hash|codigo_hash|version_sesion|JWT_SECRET|AUTH_CODE_SECRET|solo-pruebas-e2e/);
}
module.exports = { elegirHorario, aviso, vista, prepararRegistro, registrar, enviarLogin, iniciarSesion, salir, tokenPagina, autorizacion, api, registrarAPI, loginAPI, item, dialogo, crearTarea, sinSecretos };
