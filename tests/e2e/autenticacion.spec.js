'use strict';
const { test, expect } = require('@playwright/test');
const { estudiante } = require('./datos');
const { registrar, prepararRegistro, aviso, enviarLogin, iniciarSesion, salir, vista, tokenPagina, autorizacion } = require('./ayudas');

test('registro válido usa una asignatura del catálogo y abre sesión', async ({ page, request }) => {
  const usuario = await registrar(page);
  const token = await tokenPagina(page);
  const materias = await (await request.get('/api/materias', { headers: autorizacion(token) })).json();
  expect(materias.datos).toHaveLength(1);
  expect(materias.datos[0].id_catalogo_materia).toEqual(expect.any(String));
  await expect(page.locator('#usuario-correo')).toHaveText(usuario.correo);
});

for (const caso of [
  { campo: 'nombre', valor: '12345', mensaje: /nombre/i, nativo: false },
  { campo: 'contrasena', valor: 'corta', mensaje: /Revisa este campo/, nativo: true },
  { campo: 'correo', valor: 'correo-invalido', mensaje: /Revisa este campo/, nativo: true },
]) {
  test(`registro inválido: ${caso.campo} muestra un error`, async ({ page }) => {
    await prepararRegistro(page);
    await page.locator(`#form-registro [name=${caso.campo}]`).fill(caso.valor);
    await page.locator('#form-registro button[type=submit]').click();
    if (caso.nativo) await expect(page.locator('#form-registro .error-campo')).toContainText(caso.mensaje);
    else await aviso(page, caso.mensaje);
    await expect(page.locator('#acceso')).toBeVisible();
    expect(await tokenPagina(page)).toBeNull();
  });
}

test('registro sin asignatura se impide antes de enviar', async ({ page }) => {
  await prepararRegistro(page, estudiante(), { seleccionarMateria: false });
  const envios = [];
  page.on('request', r => { if (r.url().endsWith('/api/auth/registro')) envios.push(r); });
  await page.locator('#form-registro button[type=submit]').click();
  await expect(page.locator('#form-registro select')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#form-registro .error-campo')).toBeVisible();
  expect(envios).toHaveLength(0);
});

test('correo duplicado muestra el conflicto', async ({ page }) => {
  const usuario = await registrar(page);
  await salir(page);
  await prepararRegistro(page, usuario);
  await page.locator('#form-registro button[type=submit]').click();
  await aviso(page, 'El correo ya está registrado');
});

test('login, logout y revocación del token guardado en la página', async ({ page, request }) => {
  const usuario = await registrar(page);
  await salir(page);
  await iniciarSesion(page, usuario);
  const anterior = await tokenPagina(page);
  await salir(page);
  expect((await request.get('/api/auth/perfil', { headers: autorizacion(anterior) })).status()).toBe(401);
});

test('contraseña incorrecta mantiene el acceso cerrado', async ({ page }) => {
  const usuario = await registrar(page);
  await salir(page);
  expect((await enviarLogin(page, { ...usuario, contrasena: 'OtraClaveIncorrecta!' })).status()).toBe(401);
  await aviso(page, 'Credenciales inválidas');
  await expect(page.locator('#aplicacion')).toBeHidden();
});

test('desactivar desde Perfil permite cancelar y confirmar; revoca tokens', async ({ page, request }) => {
  const usuario = await registrar(page);
  const anterior = await tokenPagina(page);
  await vista(page, 'configuracion');
  await page.getByRole('button', { name: 'Desactivar mi cuenta' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('#aplicacion')).toBeVisible();
  expect((await request.get('/api/auth/perfil', { headers: autorizacion(anterior) })).status()).toBe(200);
  await page.getByRole('button', { name: 'Desactivar mi cuenta' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await page.getByRole('dialog').getByLabel(`Escribe ${usuario.correo} para confirmar`).fill(usuario.correo);
  await page.getByRole('dialog').getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(page.locator('#form-login')).toBeVisible();
  expect((await request.get('/api/auth/perfil', { headers: autorizacion(anterior) })).status()).toBe(401);
  expect((await enviarLogin(page, usuario)).status()).toBe(403);
  await aviso(page, 'La cuenta está inactiva');
});
