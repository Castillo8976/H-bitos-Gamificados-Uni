'use strict';
const { test, expect } = require('@playwright/test');
const { randomUUID } = require('node:crypto');
const { ADMIN, estudiante } = require('./datos');
const { registrar, registrarAPI, iniciarSesion, vista, crearTarea, tokenPagina, api } = require('./ayudas');

test('drawer a 390px: foco atrapado, Escape, fondo, cierre y destino devuelven foco', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await registrar(page);
  const menu = page.locator('#abrir-menu'), panel = page.locator('#navegacion-principal');
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toHaveCSS('width', '280px');
  await expect(panel.locator('[data-vista=dashboard].nav-item')).toBeFocused();
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden');
  await panel.locator('[data-vista=exportacion]').focus();
  await page.keyboard.press('Tab');
  await expect(panel.locator('.marca-boton')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(panel.locator('[data-vista=exportacion]')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  await menu.click();
  await page.locator('#velo-menu').click({ position: { x: 350, y: 100 } });
  await expect(menu).toBeFocused();
  await menu.click();
  await page.locator('#cerrar-menu').click();
  await expect(menu).toBeFocused();
  await menu.click();
  await panel.locator('[data-vista=tareas]').click();
  await expect(page.locator('#vista-tareas')).toBeVisible();
  await expect(menu).toBeFocused();
  await expect(panel.locator('[data-vista=tareas]')).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
});

test('sidebar a 1440px: contraer, ampliar y persistir la preferencia', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await registrar(page);
  const panel = page.locator('#navegacion-principal'), toggle = page.locator('#contraer-menu');
  await expect(panel).toHaveCSS('width', '248px');
  const margenInicial = await page.locator('#contenido').boundingBox();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toHaveCSS('width', '72px');
  await expect(panel.locator('[data-vista=tareas]')).toHaveAccessibleName('Tareas');
  await expect(panel.locator('[data-vista=tareas]')).toHaveAttribute('title', 'Tareas');
  expect((await page.locator('#contenido').boundingBox()).x).toBeLessThan(margenInicial.x);
  await page.reload();
  await expect(page.locator('#aplicacion')).toBeVisible();
  await expect(panel).toHaveCSS('width', '72px');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(panel).toHaveCSS('width', '248px');
});

test('eliminar tarea: Cancelar y Escape no escriben; confirmar elimina una sola vez', async ({ page, request }) => {
  await registrar(page);
  const fila = await crearTarea(page, 'Tarea con confirmación');
  const id = await fila.locator('[data-accion=eliminar-tarea]').getAttribute('data-id');
  const token = await tokenPagina(page);
  let eliminaciones = 0;
  page.on('request', r => { if (r.method() === 'DELETE' && r.url().endsWith(`/api/tareas/${id}`)) eliminaciones++; });
  const modal = page.locator('#modal-accion'), trigger = fila.locator('[data-accion=eliminar-tarea]');
  await trigger.click();
  await expect(modal).toContainText('Tarea con confirmación');
  await expect(modal.getByRole('button', { name: 'Cancelar' })).toBeFocused();
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await expect(trigger).toBeFocused();
  await expect(fila).toBeVisible();
  expect(eliminaciones).toBe(0);
  expect((await api(request, token, 'get', `/tareas/${id}`)).dato.nombre).toBe('Tarea con confirmación');
  await trigger.click(); await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused(); expect(eliminaciones).toBe(0);
  await trigger.click();
  await modal.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(fila).toHaveCount(0);
  expect(eliminaciones).toBe(1);
  const respuesta = await request.get(`/api/tareas/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  expect(respuesta.status()).toBe(404);
});

test('confirmación crítica: correo exacto y cancelación en el segundo paso', async ({ page, request }) => {
  const usuario = await registrar(page), token = await tokenPagina(page);
  await vista(page, 'configuracion');
  await page.locator('#eliminar-datos').click();
  const modal = page.locator('#modal-accion'), confirmar = modal.locator('button[type=submit]');
  await expect(modal).toContainText(usuario.correo);
  await confirmar.click();
  await expect(confirmar).toBeDisabled();
  const input = modal.getByLabel(`Escribe ${usuario.correo} para confirmar`);
  await input.fill(`${usuario.correo} `); await expect(confirmar).toBeDisabled();
  await input.fill(usuario.correo); await expect(confirmar).toBeEnabled();
  await modal.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.locator('#eliminar-datos')).toBeFocused();
  expect((await api(request, token, 'get', '/auth/perfil')).cuenta.correo).toBe(usuario.correo);
});

test('lista de usuarios: búsqueda, filtros, orden y páginas 10/20/50', async ({ page, request }) => {
  const prefijo = `Lista ${randomUUID().slice(0, 8).replace(/[0-9]/g, 'a')}`;
  for (let i = 0; i < 11; i++) await registrarAPI(request, { ...estudiante(), nombre: `${prefijo} ${String.fromCharCode(65+i)}`.replace(/[0-9]/g, 'a') });
  await iniciarSesion(page, ADMIN);
  await vista(page, 'usuarios');
  const herramientas = page.locator('#herramientas-usuarios');
  // El mismo prefijo normalizado que los nombres enviados (el backend solo admite letras).
  await herramientas.getByLabel('Buscar', { exact: true }).fill(prefijo.replace(/[0-9]/g, 'a'));
  await expect(herramientas.getByText('11 resultados', { exact: true })).toBeVisible();
  await expect(page.locator('#lista-usuarios-admin .item')).toHaveCount(10);
  await expect(herramientas.getByText('Página 1 de 2', { exact: true })).toBeVisible();
  await herramientas.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.locator('#lista-usuarios-admin .item')).toHaveCount(1);
  await herramientas.getByLabel('Estado', { exact: true }).selectOption('inactiva');
  await expect(herramientas.getByText('0 resultados', { exact: true })).toBeVisible();
  await expect(herramientas.getByText('Página 1 de 1', { exact: true })).toBeVisible();
  await herramientas.getByLabel('Estado', { exact: true }).selectOption('activa');
  await herramientas.getByLabel('Rol', { exact: true }).selectOption('Estudiante');
  await herramientas.getByLabel('Orden', { exact: true }).selectOption('desc');
  await expect(page.locator('#lista-usuarios-admin .item').first().locator('strong')).toContainText('K');
  await herramientas.getByLabel('Por página', { exact: true }).selectOption('20');
  await expect(page.locator('#lista-usuarios-admin .item')).toHaveCount(11);
  await herramientas.getByLabel('Por página', { exact: true }).selectOption('50');
  await expect(page.locator('#lista-usuarios-admin .item')).toHaveCount(11);
  await expect(herramientas.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
});

for (const tema of ['purple', 'blue']) {
  for (const oscuro of [false, true]) {
    test(`shell sin desbordamiento: ${tema}, oscuro=${oscuro}`, async ({ page }) => {
      await registrar(page);
      await page.evaluate(({ tema, oscuro }) => {
        document.documentElement.dataset.tema = tema;
        document.documentElement.classList.toggle('modo-oscuro', oscuro);
      }, { tema, oscuro });
      for (const width of [375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        expect(await page.locator('.barra-superior').evaluate(e => { const muestra = document.createElement('span'); muestra.style.backgroundColor = 'var(--superficie)'; e.append(muestra); const correcto = getComputedStyle(e).backgroundColor === getComputedStyle(muestra).backgroundColor; muestra.remove(); return correcto; })).toBe(true);
      }
    });
  }
}
