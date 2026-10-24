'use strict';
const { test, expect } = require('@playwright/test');
const { ADMIN, semanaActual } = require('./datos');
const { prepararRegistro, registrar, iniciarSesion, salir, vista, tokenPagina, api } = require('./ayudas');

async function comprobarVista(page, testInfo, nombre) {
  const ancho = await page.evaluate(() => ({ contenido: document.documentElement.scrollWidth, ventana: innerWidth }));
  expect(ancho.contenido, `${nombre}: contenido ${ancho.contenido}, viewport ${ancho.ventana}`).toBeLessThanOrEqual(ancho.ventana);
  const campos = page.locator('input:visible, select:visible, textarea:visible');
  for (let i = 0; i < await campos.count(); i++) {
    await expect(campos.nth(i), `${nombre}: campo ${i} necesita nombre accesible`).toHaveAccessibleName(/\S/);
  }
  const archivo = testInfo.outputPath(`${nombre}.png`);
  await page.screenshot({ path: archivo, fullPage: true, animations: 'disabled' });
  await testInfo.attach(nombre, { path: archivo, contentType: 'image/png' });
}

for (const viewport of [{ width: 375, height: 812 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
  test.describe(`${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });
    test('recorrido responsive, nombres accesibles, foco, vacíos y errores', async ({ page, request }, testInfo) => {
      await page.goto('/');
      await expect(page.locator('#form-login')).toBeVisible();
      await comprobarVista(page, testInfo, 'login');
      // Tab real: el foco entra al formulario y todos sus controles muestran :focus-visible.
      await page.getByRole('tab', { name: 'Ingresar', exact: true }).focus();
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('Tab');
        const foco = page.locator('#form-login :focus-visible');
        await expect(foco).toHaveCount(1);
        const estilo = await foco.evaluate(e => ({ estilo: getComputedStyle(e).outlineStyle, ancho: parseFloat(getComputedStyle(e).outlineWidth) }));
        expect(estilo.estilo).not.toBe('none');
        expect(estilo.ancho).toBeGreaterThan(0);
      }
      await page.locator('#form-login button[type=submit]').click();
      await expect(page.locator('#form-login .error-campo').first()).toBeVisible();
      await comprobarVista(page, testInfo, 'login-error');
      await prepararRegistro(page);
      await comprobarVista(page, testInfo, 'registro');
      // registrar crea un usuario nuevo: no se reutiliza ninguno entre resoluciones.
      await registrar(page);
      await expect(page.locator('#dashboard-tareas .estado-vacio')).toBeVisible();
      await comprobarVista(page, testInfo, 'dashboard');
      const estiloInicial = await page.locator('html').evaluate(e => ({ tema: e.dataset.tema, oscuro: e.classList.contains('modo-oscuro') }));
      for (const nombre of ['materias', 'tareas', 'gamificacion', 'pomodoro', 'estadisticas']) {
        await vista(page, nombre);
        if (nombre === 'tareas') {
          await expect(page.locator('#lista-tareas .estado-vacio')).toBeVisible();
          await page.getByRole('button', { name: 'Nueva tarea', exact: true }).click();
        }
        if (nombre === 'gamificacion') await expect(page.locator('#lista-retos-metas .estado-vacio')).toBeVisible();
        if (nombre === 'estadisticas') await expect(page.locator('#estadisticas-metas .estado-vacio')).toBeVisible();
        await comprobarVista(page, testInfo, nombre);
      }
      // Metas solo tienen edición por prompt; crear por API permite observar una meta real.
      await api(request, await tokenPagina(page), 'post', '/metas', { descripcion: 'Meta visual', semana: semanaActual(), valor_objetivo: 180 }, 201);
      await page.reload();
      await expect(page.locator('#aplicacion')).toBeVisible();
      await vista(page, 'gamificacion');
      await expect(page.locator('#lista-retos-metas')).toContainText('Meta visual');
      await comprobarVista(page, testInfo, 'metas');
      expect(await page.locator('html').evaluate(e => ({ tema: e.dataset.tema, oscuro: e.classList.contains('modo-oscuro') }))).toEqual(estiloInicial);
      await salir(page);
      await iniciarSesion(page, ADMIN);
      await expect(page.locator('#panel-catalogo-materias')).toBeVisible();
      await comprobarVista(page, testInfo, 'p17-admin');
    });
  });
}
