'use strict';
const { test, expect } = require('@playwright/test');
const { REVISOR, semanaActual } = require('./datos');
const { iniciarSesion, tokenPagina, autorizacion, registrarAPI } = require('./ayudas');

test('Revisor solo ve Indicadores y no puede administrar ni escribir por API', async ({ page, request }) => {
  const estudiante = await registrarAPI(request);
  await iniciarSesion(page, REVISOR);
  await expect(page.locator('#vista-institucional')).toBeVisible();
  await expect(page.locator('nav [data-vista]:visible')).toHaveCount(1);
  await expect(page.locator('nav [data-vista]:visible')).toHaveText('Indicadores');
  for (const nombre of ['administracion', 'dashboard', 'materias', 'gamificacion', 'configuracion']) {
    await expect(page.locator(`#vista-${nombre}`)).toBeHidden();
  }
  const headers = autorizacion(await tokenPagina(page));
  const casos = [
    ['get', '/cuentas'], ['get', '/catalogo-materias?todas=true'], ['get', '/materias'],
    ['post', '/catalogo-materias', { nombre: 'No autorizado' }],
    ['put', `/cuentas/${estudiante.cuenta.id_cuenta}`, { activa: false }],
    ['post', '/retos', { descripcion: 'Prohibido', condicion: 'tareas:1', semana: semanaActual(), puntos_recompensa: 10 }],
    ['post', '/sesiones', { duracion_minutos: 1 }],
    ['put', '/preferencias', { tema: 'teal' }],
    ['delete', `/cuentas/${estudiante.cuenta.id_cuenta}`],
  ];
  for (const [metodo, ruta, data] of casos) {
    const respuesta = await request[metodo](`/api${ruta}`, { headers, ...(data ? { data } : {}) });
    expect(respuesta.status(), `${metodo} ${ruta}`).toBe(403);
  }
  await page.getByRole('button', { name: 'Consultar indicadores' }).click();
  await expect(page.locator('#metricas-institucionales')).toContainText('Estudiantes activos');
});
