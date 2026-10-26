'use strict';
const { randomUUID } = require('node:crypto');
const { test, expect } = require('@playwright/test');
const { ADMIN, semanaActual } = require('./datos');
const { iniciarSesion, registrarAPI, api, tokenPagina, aviso, vista, item, dialogo } = require('./ayudas');

const modal = page => page.locator('#modal-accion');
async function buscarUsuario(page, correo) {
  await vista(page, 'usuarios');
  await page.locator('#herramientas-usuarios input[type=search]').fill(correo);
  const fila = page.locator('#lista-usuarios-admin .item').filter({ hasText: correo });
  await expect(fila).toHaveCount(1);
  return fila;
}

for (const paso of [1, 2]) {
  test(`cancelar desactivación en paso ${paso} no envía solicitudes`, async ({ page, request }) => {
    const estudiante = await registrarAPI(request);
    await iniciarSesion(page, ADMIN);
    const fila = await buscarUsuario(page, estudiante.correo), escrituras = [];
    page.on('request', r => { if (r.url().endsWith(`/api/cuentas/${estudiante.cuenta.id_cuenta}`) && ['PUT','DELETE'].includes(r.method())) escrituras.push(r); });
    await fila.getByRole('button', { name: 'Desactivar', exact: true }).click();
    await expect(modal(page)).toContainText(`¿Estás seguro de que deseas desactivar la cuenta de ${estudiante.nombre}?`);
    await expect(modal(page)).toContainText(estudiante.correo);
    await expect(modal(page)).toContainText('Sus datos se conservan');
    if (paso === 2) {
      await modal(page).locator('[type=submit]').click();
      const campo = modal(page).getByLabel(`Escribe ${estudiante.correo} para confirmar`);
      await campo.fill(`${estudiante.correo} `);
      await expect(modal(page).locator('[type=submit]')).toBeDisabled();
      await campo.fill(estudiante.correo);
      await expect(modal(page).locator('[type=submit]')).toBeEnabled();
    }
    await modal(page).getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(modal(page)).not.toBeVisible();
    await expect(fila.locator('[data-etiqueta=Estado]')).toHaveText('Activa');
    await expect(fila.getByRole('button', { name: 'Desactivar', exact: true })).toBeFocused();
    expect(escrituras).toHaveLength(0);
    expect((await api(request, await tokenPagina(page), 'get', `/cuentas/${estudiante.cuenta.id_cuenta}`)).dato.activa).toBe(true);
  });
}

test('desactivar cuenta exige dos pasos y actualiza solo tras respuesta exitosa', async ({ page, request }) => {
  const estudiante = await registrarAPI(request);
  await iniciarSesion(page, ADMIN);
  const fila = await buscarUsuario(page, estudiante.correo);
  await fila.getByRole('button', { name: 'Desactivar', exact: true }).click();
  await modal(page).locator('[type=submit]').click();
  await expect(fila.locator('[data-etiqueta=Estado]')).toHaveText('Activa');
  await expect(modal(page).locator('[type=submit]')).toBeDisabled();
  await modal(page).getByLabel(`Escribe ${estudiante.correo} para confirmar`).fill(estudiante.correo);
  const respuesta = page.waitForResponse(r => r.url().endsWith(`/api/cuentas/${estudiante.cuenta.id_cuenta}`) && r.request().method() === 'PUT');
  await modal(page).locator('[type=submit]').click();
  expect((await respuesta).status()).toBe(200);
  await expect(fila.locator('[data-etiqueta=Estado]')).toHaveText('Inactiva');
  expect((await api(request, await tokenPagina(page), 'get', `/cuentas/${estudiante.cuenta.id_cuenta}`)).dato.activa).toBe(false);
  expect((await request.post('/api/auth/login', { data: { correo: estudiante.correo, contrasena: estudiante.contrasena } })).status()).toBe(403);
});

test('último administrador conserva rol y estado ante 409 del backend', async ({ page, request }) => {
  await iniciarSesion(page, ADMIN);
  const fila = await buscarUsuario(page, ADMIN.correo);
  await fila.getByRole('button', { name: 'Cambiar rol', exact: true }).click();
  await expect(modal(page)).toContainText('Rol actual: Administrador');
  await modal(page).getByLabel('Nuevo rol').selectOption('Estudiante');
  const respuesta = page.waitForResponse(r => /\/api\/cuentas\/[^/]+$/.test(r.url()) && r.request().method() === 'PUT');
  await modal(page).locator('[type=submit]').click();
  expect((await respuesta).status()).toBe(409);
  const mensaje = (await (await respuesta).json()).error;
  expect(mensaje).toMatch(/último Administrador activo/);
  await aviso(page, mensaje);
  await expect(modal(page)).toContainText(mensaje);
  await expect(fila.locator('[data-etiqueta=Rol]')).toHaveText('Administrador');
  await expect(fila.locator('[data-etiqueta=Estado]')).toHaveText('Activa');
  const cuentas = (await api(request, await tokenPagina(page), 'get', '/cuentas')).datos;
  expect(cuentas.find(c => c.correo === ADMIN.correo)).toMatchObject({ rol: 'Administrador', activa: true });
});

test('asignaturas: búsqueda, orden y paginación de más de diez registros', async ({ page, request }) => {
  await iniciarSesion(page, ADMIN);
  const token = await tokenPagina(page), prefijo = `Paginación ${randomUUID()}`, ids = [];
  try {
    for (let i = 0; i < 12; i++) ids.push((await api(request, token, 'post', '/catalogo-materias', { nombre: `${prefijo} ${String(i).padStart(2,'0')}` }, 201)).dato.id_catalogo_materia);
    await page.locator('#recargar-admin').click(); await aviso(page, 'Datos administrativos actualizados.');
    await vista(page, 'asignaturas');
    const herramientas = page.locator('#herramientas-asignaturas');
    await herramientas.getByLabel('Buscar', { exact: true }).fill(prefijo);
    await expect(herramientas).toContainText('12 resultados');
    await expect(page.locator('#lista-catalogo-materias .item')).toHaveCount(10);
    await herramientas.getByRole('button', { name: 'Siguiente' }).click();
    await expect(herramientas).toContainText('Página 2 de 2');
    await expect(page.locator('#lista-catalogo-materias .item')).toHaveCount(2);
    await herramientas.getByLabel('Buscar', { exact: true }).fill(`${prefijo} 00`);
    await expect(page.locator('#lista-catalogo-materias .item')).toHaveCount(1);
    await expect(herramientas).toContainText('Página 1 de 1');
    await herramientas.getByLabel('Buscar', { exact: true }).fill(prefijo);
    await herramientas.getByLabel('Por página').selectOption('20');
    await expect(page.locator('#lista-catalogo-materias .item')).toHaveCount(12);
    await herramientas.getByLabel('Por página').selectOption('50');
    await expect(page.locator('#lista-catalogo-materias .item')).toHaveCount(12);
    await herramientas.getByLabel('Orden', { exact: true }).selectOption('desc');
    await expect(page.locator('#lista-catalogo-materias .item').first()).toContainText(`${prefijo} 11`);
  } finally { for (const id of ids) await api(request, token, 'delete', `/catalogo-materias/${id}`, undefined, 204); }
});

test('cada módulo administrativo es una vista independiente y abre desde arriba', async ({ page }) => {
  await iniciarSesion(page, ADMIN);
  for (const nombre of ['administracion','usuarios','asignaturas','insignias','niveles','retos','correcciones','institucional']) {
    await vista(page, nombre);
    await expect(page.locator('.vista:visible')).toHaveCount(1);
    await expect(page.locator(`#vista-${nombre}`)).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    if (nombre !== 'institucional') await expect(page.locator(`#vista-${nombre} form:visible`)).toHaveCount(0);
  }
});

test('insignia: crear regla legible y editar todos sus datos en diálogo', async ({ page, request }) => {
  await iniciarSesion(page, ADMIN); await vista(page, 'insignias');
  const nombre = `Insignia rediseño ${randomUUID()}`, regla = `e2e_${randomUUID().slice(0, 8)}`, f = page.locator('#form-admin-insignia');
  // Las reglas semilla ya tienen insignia (condicion UNIQUE) y se muestran legibles.
  await page.locator('#herramientas-insignias input[type=search]').fill('Primera');
  await expect(page.locator('#lista-insignias-admin')).toContainText('Primera tarea completada');
  await page.locator('#herramientas-insignias input[type=search]').fill('');
  await page.getByRole('button', { name: 'Nueva insignia', exact: true }).click();
  await expect(f.locator('select[name=condicion] option[value=primera_tarea]')).toHaveJSProperty('disabled', true);
  await expect(f.getByLabel('Condición', { exact: true })).toHaveValue('personalizada');
  await f.getByLabel('Nombre', { exact: true }).fill(nombre);
  await f.getByLabel('Descripción', { exact: true }).fill('Descripción inicial');
  await f.getByLabel('Regla personalizada').fill(regla);
  await f.getByRole('button', { name: 'Crear insignia', exact: true }).click();
  await aviso(page, 'Insignia creada.');
  await page.locator('#herramientas-insignias input[type=search]').fill(nombre);
  const fila = item(page, '#lista-insignias-admin', nombre);
  await fila.getByRole('button', { name: 'Editar', exact: true }).click();
  await f.getByLabel('Descripción', { exact: true }).fill('Descripción revisada');
  await f.getByLabel('Regla personalizada').fill(`${regla}_v2`);
  await f.getByLabel('Ícono').fill('logro.svg');
  await f.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
  await aviso(page, 'Insignia actualizada.');
  await expect(fila).toContainText('Descripción revisada');
  const id = await fila.locator('[data-accion=editar-insignia-admin]').getAttribute('data-id');
  expect((await api(request, await tokenPagina(page), 'get', `/insignias/${id}`)).dato).toMatchObject({ nombre, descripcion: 'Descripción revisada', condicion: `${regla}_v2`, icono: 'logro.svg' });
});

test('asignar, filtrar y desactivar un reto sin acreditar recompensas', async ({ page, request }) => {
  const estudiante = await registrarAPI(request);
  await iniciarSesion(page, ADMIN); await vista(page, 'retos');
  await page.getByRole('button', { name: 'Asignar reto', exact: true }).click();
  const f = page.locator('#form-admin-reto'), nombre = `Reto ${randomUUID()}`;
  await f.getByLabel('Cuenta', { exact: true }).selectOption(estudiante.cuenta.id_cuenta);
  await f.getByLabel('Descripción', { exact: true }).fill(nombre);
  await f.getByLabel('Métrica', { exact: true }).selectOption('tareas'); await f.getByLabel('Objetivo').fill('5');
  await f.getByLabel('Recompensa').fill('50'); await f.getByLabel('Semana', { exact: true }).fill(semanaActual());
  await f.getByRole('button', { name: 'Asignar reto', exact: true }).click(); await aviso(page, 'Reto semanal asignado.');
  const herramientas = page.locator('#herramientas-retos');
  await herramientas.getByLabel('Estudiante', { exact: true }).selectOption(estudiante.cuenta.id_cuenta);
  await herramientas.getByLabel('Semana ISO').fill(semanaActual());
  await herramientas.getByLabel('Cumplimiento').selectOption('false'); await herramientas.getByLabel('Estado', { exact: true }).selectOption('true');
  const fila = item(page, '#lista-retos-admin', nombre);
  await expect(fila).toContainText('Completar 5 tareas'); await expect(herramientas).toContainText('1 resultado');
  await expect(page.locator('#vista-retos [data-accion=completar-reto]')).toHaveCount(0);
  await dialogo(page, () => fila.getByRole('button', { name: 'Desactivar', exact: true }).click());
  await expect(herramientas).toContainText('0 resultados');
  await herramientas.getByLabel('Estado', { exact: true }).selectOption('false');
  await expect(fila.locator('.chip')).toHaveText('Inactivo');
  expect((await api(request, estudiante.token, 'get', '/retos')).datos[0]).toMatchObject({ activo: false, completado: false, condicion: 'tareas:5', puntos_recompensa: 50 });
  expect((await api(request, estudiante.token, 'get', '/puntos')).total).toBe(0);
});

test('corrección: otorgar puntos conserva motivo y notifica al estudiante', async ({ page, request }) => {
  const estudiante = await registrarAPI(request);
  await iniciarSesion(page, ADMIN); await vista(page, 'correcciones');
  await page.locator('#admin-correccion-cuenta').selectOption(estudiante.cuenta.id_cuenta);
  await page.locator('#tipo-correccion').selectOption('punto');
  const f = page.locator('#form-admin-punto');
  await expect(page.locator('#paso-form-correccion form:visible')).toHaveCount(1);
  await f.getByLabel('Cantidad').fill('37'); await f.getByLabel('Origen').selectOption('Tarea');
  const motivo = `Corrección documentada ${randomUUID()}`;
  await f.getByLabel('Motivo').fill(motivo); await f.getByRole('button', { name: 'Registrar corrección' }).click();
  await expect(modal(page)).toContainText(estudiante.correo); await expect(modal(page)).toContainText('Otorgar 37 puntos'); await expect(modal(page)).toContainText(motivo);
  const respuesta = page.waitForResponse(r => r.url().endsWith('/api/puntos') && r.request().method() === 'POST');
  await modal(page).getByRole('button', { name: 'Confirmar corrección' }).click();
  const r = await respuesta; expect(r.status()).toBe(201);
  expect(r.request().postDataJSON()).toEqual({ id_cuenta: estudiante.cuenta.id_cuenta, cantidad: 37, origen: 'Tarea', motivo });
  await expect(page.locator('#resultado-correccion')).toContainText('Puntos registrados y estudiante notificado.');
  expect((await api(request, estudiante.token, 'get', '/puntos')).total).toBe(37);
  expect((await api(request, estudiante.token, 'get', '/notificaciones')).datos.some(n => n.mensaje.includes(motivo))).toBe(true);
});

for (const ancho of [375,390,768,1024,1440]) {
  test(`administración sin desbordamiento a ${ancho}px en seis temas y ambos modos`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 }); await iniciarSesion(page, ADMIN);
    for (const nombre of ['usuarios','asignaturas','insignias','niveles','retos','correcciones','institucional']) {
      await vista(page, nombre);
      for (const tema of ['purple','teal','amber','coral','blue','green']) for (const oscuro of [false,true]) {
        await page.locator('html').evaluate((e, datos) => { e.dataset.tema = datos.tema; e.classList.toggle('modo-oscuro', datos.oscuro); }, { tema, oscuro });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${nombre}, ${tema}, oscuro=${oscuro}`).toBe(true);
      }
    }
  });
}
