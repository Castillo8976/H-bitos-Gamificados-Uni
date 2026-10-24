'use strict';
const { test, expect } = require('@playwright/test');
const { registrar, vista, aviso, salir, enviarLogin, tokenPagina } = require('./ayudas');

async function mensajes(request, correo) {
  const respuesta = await request.get(`http://127.0.0.1:4051/correos?para=${encodeURIComponent(correo)}`);
  expect(respuesta.status()).toBe(200);
  return respuesta.json();
}
async function ultimoCodigo(request, correo, minimo = 1) {
  await expect.poll(async () => (await mensajes(request, correo)).length).toBeGreaterThanOrEqual(minimo);
  const ultimo = (await mensajes(request, correo)).at(-1);
  const codigo = /es (\d{6})\./.exec(ultimo.text)?.[1];
  const desafio = /Desafío: ([\w-]+)/.exec(ultimo.text)?.[1];
  expect(codigo).toMatch(/^\d{6}$/);
  expect(desafio).toBeTruthy();
  return { codigo, desafio };
}
async function confirmar(page, codigo) {
  await page.getByLabel('Código de seis dígitos').fill(codigo);
  await page.getByRole('button', { name: 'Confirmar código' }).click();
}
async function verificar(page, request, usuario) {
  const datos = await ultimoCodigo(request, usuario.correo);
  await confirmar(page, datos.codigo);
  await expect(page.locator('#modal-codigo-correo')).toBeHidden();
  await expect(page.locator('#usuario-correo')).toHaveText(usuario.correo);
  await expect(page.locator('#aplicacion')).toBeVisible();
  return datos;
}

test('registro, código incorrecto, código correcto y rechazo de reutilización', async ({ page, request }) => {
  const usuario = await registrar(page, undefined, { correo: true });
  const datos = await ultimoCodigo(request, usuario.correo);
  expect(await tokenPagina(page)).toBeNull();
  const incorrecto = datos.codigo === '000000' ? '111111' : '000000';
  await confirmar(page, incorrecto);
  await expect(page.locator('#estado-codigo-correo')).toHaveText('Código incorrecto');
  await verificar(page, request, usuario);
  const reutilizado = await request.post('/api/auth/correo/verificar', { data: datos });
  expect(reutilizado.status()).toBe(400);
  expect((await reutilizado.json()).error).toMatch(/no disponible|intentos/i);
});

test('activar segundo paso en Perfil exige código en el siguiente login', async ({ page, request }) => {
  const usuario = await registrar(page, undefined, { correo: true });
  await verificar(page, request, usuario);
  await vista(page, 'configuracion');
  const form = page.locator('#form-mfa-correo');
  await form.getByLabel('Activar segundo paso').check();
  await form.getByLabel('Contraseña actual').fill(usuario.contrasena);
  await form.getByRole('button', { name: 'Guardar segundo paso' }).click();
  await aviso(page, 'Segundo paso actualizado.');
  await salir(page);
  const respuesta = await enviarLogin(page, usuario);
  expect((await respuesta.json()).requiere_codigo).toBe(true);
  await expect(page.getByRole('dialog', { name: 'Segundo paso de acceso' })).toBeVisible();
  expect(await tokenPagina(page)).toBeNull();
  const datos = await ultimoCodigo(request, usuario.correo, 2);
  await confirmar(page, datos.codigo);
  await expect(page.locator('#aplicacion')).toBeVisible();
  const repetido = await request.post('/api/auth/login/codigo', { data: datos });
  expect(repetido.status()).toBe(400);
});

test('reenvío controlado rota el código y respeta el límite', async ({ page, request }) => {
  await page.clock.install();
  const usuario = await registrar(page, undefined, { correo: true });
  const original = await ultimoCodigo(request, usuario.correo);
  const boton = page.locator('#reenviar-codigo-correo');
  await expect(boton).toBeDisabled();
  // Regresión: la cuenta regresiva usa el cooldown configurado (1 s en el servidor E2E), no 60 s fijos.
  await expect(boton).toHaveText('Reenviar en 1 s');
  // El sondeo espera el servidor, sin alterar Date.now del backend ni exponer escrituras de control.
  await expect.poll(async () => {
    const r = await request.post('/api/auth/correo/reenviar', { data: { desafio: original.desafio } });
    expect(r.status()).toBe(202);
    return (await mensajes(request, usuario.correo)).length;
  }, { timeout: 5000, intervals: [250, 500, 1000] }).toBe(2);
  const nuevo = await ultimoCodigo(request, usuario.correo, 2);
  expect(nuevo.codigo).not.toBe(original.codigo);
  await confirmar(page, original.codigo);
  await expect(page.locator('#estado-codigo-correo')).toHaveText('Código incorrecto');
  await page.clock.runFor(61_000);
  await expect(boton).toBeEnabled();
  await boton.click();
  await expect(page.locator('#estado-codigo-correo')).toContainText('recibirás un código nuevo');
  await expect(boton).toBeDisabled();
  // Agotar los tres reenvíos permitidos y comprobar que no se generan más mensajes.
  await expect.poll(async () => {
    await request.post('/api/auth/correo/reenviar', { data: { desafio: original.desafio } });
    return (await mensajes(request, usuario.correo)).length;
  }, { timeout: 8000, intervals: [500, 1000] }).toBe(4);
  for (let i = 0; i < 2; i++) {
    expect((await request.post('/api/auth/correo/reenviar', { data: { desafio: original.desafio } })).status()).toBe(202);
  }
  expect(await mensajes(request, usuario.correo)).toHaveLength(4);
  await confirmar(page, (await ultimoCodigo(request, usuario.correo, 4)).codigo);
  await expect(page.locator('#aplicacion')).toBeVisible();
});

test('código vencido se rechaza', async () => {
  test.skip(true, 'TTL mínimo de un minuto en el backend; page.clock solo afecta al navegador y el control E2E es de solo lectura.');
  // El TTL mínimo del servidor es un minuto. page.clock solo altera el navegador;
  // el control autorizado es de solo lectura y no altera reloj ni desafíos del servidor.
  // Se omite para evitar esperas reales de un minuto o cambios en src/.
});
