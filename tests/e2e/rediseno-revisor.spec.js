'use strict';
const { test, expect } = require('@playwright/test');
const { ADMIN, REVISOR } = require('./datos');
const { iniciarSesion, registrar, vista } = require('./ayudas');

const ruta = '**/api/estadisticas/institucionales?*';
const vacio = { estudiantes_activos: 0, tareas_completadas: 0, minutos_estudiados: 0, sesiones_realizadas: 0, puntos_obtenidos: 0 };
const datos = { estudiantes_activos: 2, tareas_completadas: 0, minutos_estudiados: 60, horas_estudiadas: 1, sesiones_realizadas: 2, puntos_obtenidos: 0, promedio_minutos_por_estudiante: 30, promedio_puntos_por_estudiante: 0 };

test('revisor consulta agregados sin navegación ni controles de administración', async ({ page }) => {
  await iniciarSesion(page, REVISOR);
  await expect(page.locator('#vista-institucional')).toBeVisible();
  await expect(page.locator('.nav-grupo:visible .nav-grupo-titulo')).toHaveText('Consulta');
  await expect(page.locator('nav [data-vista]:visible')).toHaveCount(1);
  await expect(page.locator('#usuario-rol')).toHaveText('Revisor institucional · Solo lectura');
  await expect(page.locator('#vista-institucional')).toContainText('Vista de solo lectura · Datos agregados y anónimos');
  await expect(page.locator('nav [data-roles="Administrador"]:visible')).toHaveCount(0);
  await expect(page.locator('[data-editor-admin]:visible,[data-accion]:visible,#tipo-correccion:visible')).toHaveCount(0);
  await expect(page.locator('#vista-institucional button')).toHaveCount(1);
  await expect(page.locator('#vista-institucional')).not.toContainText(REVISOR.correo);
  await expect(page.locator('#vista-institucional')).not.toContainText(REVISOR.nombre);
});

test('estudiante no ve módulos administrativos ni indicadores', async ({ page }) => {
  await registrar(page);
  await expect(page.locator('nav [data-roles*="Administrador"]:visible')).toHaveCount(0);
  for (const nombre of ['administracion','usuarios','asignaturas','insignias','niveles','retos','correcciones','institucional']) await expect(page.locator(`#vista-${nombre}`)).toBeHidden();
});

for (const rol of [REVISOR, ADMIN]) {
  test(`${rol.rol}: periodo vacío sin promedios inventados y periodo con ceros reales`, async ({ page }) => {
    await page.route(ruta, r => r.fulfill({ json: { dato: vacio } }));
    await iniciarSesion(page, rol);
    if (rol === ADMIN) await vista(page, 'institucional');
    const panel = page.locator('#metricas-institucionales');
    await expect(panel.locator('.estado-vacio')).toContainText('Sin datos en el periodo');
    await expect(panel.locator('.metrica')).toHaveCount(0);
    await expect(panel).not.toContainText('undefined');
    await expect(panel).not.toContainText('Promedio');
    await page.unroute(ruta);
    await page.route(ruta, r => r.fulfill({ json: { dato: datos } }));
    const f = page.locator('#form-institucional');
    await f.getByLabel('Desde').fill('2026-01-01'); await f.getByLabel('Hasta').fill('2026-01-31');
    const respuesta = page.waitForResponse(r => r.url().includes('/api/estadisticas/institucionales'));
    await f.getByRole('button', { name: 'Consultar indicadores' }).click();
    const url = new URL((await respuesta).url());
    expect(url.searchParams.get('fecha_inicio')).toBe('2026-01-01'); expect(url.searchParams.get('fecha_fin')).toBe('2026-01-31');
    await expect(panel.locator('.estado-vacio')).toHaveCount(0); await expect(panel.locator('.metrica')).toHaveCount(8);
    for (const [etiqueta, valor, unidad] of [['Estudiantes activos','2','estudiantes'],['Tareas completadas','0','tareas'],['Horas estudiadas','1','horas'],['Minutos estudiados','60','minutos'],['Sesiones realizadas','2','sesiones'],['Puntos obtenidos','0','puntos'],['Promedio de minutos por estudiante','30','minutos / estudiante'],['Promedio de puntos por estudiante','0','puntos / estudiante']]) {
      const tarjeta = panel.locator('.metrica').filter({ has: page.getByText(etiqueta, { exact: true }) });
      await expect(tarjeta.locator('strong')).toHaveText(valor);
      await expect(tarjeta.locator('small')).toContainText(unidad);
      await expect(tarjeta.locator('small')).toContainText('2026');
    }
    await expect(page.locator('#periodo-institucional')).toContainText('2026');
    await expect(panel).not.toContainText('Sin datos');
  });
}

test('indicadores: carga visible, ausencia de un campo y rango inválido sin petición', async ({ page }) => {
  await page.route(ruta, r => r.fulfill({ json: { dato: datos } })); await iniciarSesion(page, REVISOR);
  await page.unroute(ruta);
  let liberar;
  const bloqueo = new Promise(resolve => { liberar = resolve; });
  await page.route(ruta, async r => { await bloqueo; const incompleto = { ...datos }; delete incompleto.horas_estudiadas; await r.fulfill({ json: { dato: incompleto } }); });
  const f = page.locator('#form-institucional'), panel = page.locator('#metricas-institucionales');
  await f.getByRole('button', { name: 'Consultar indicadores' }).click();
  await expect(panel).toHaveAttribute('aria-busy', 'true'); await expect(panel).toContainText('Cargando indicadores');
  await expect(f.getByRole('button', { name: 'Consultar indicadores' })).toBeDisabled();
  liberar(); await expect(panel).not.toHaveAttribute('aria-busy', 'true');
  await expect(panel.locator('.metrica').filter({ hasText: 'Horas estudiadas' }).locator('strong')).toHaveText('Sin datos');
  const peticiones = []; page.on('request', r => { if (r.url().includes('/api/estadisticas/institucionales')) peticiones.push(r); });
  await f.getByLabel('Desde').fill('2026-02-02'); await f.getByLabel('Hasta').fill('2026-01-01');
  await f.getByRole('button', { name: 'Consultar indicadores' }).click();
  await expect(f.getByLabel('Hasta')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#error-periodo-institucional')).toContainText('Hasta debe ser igual o posterior');
  expect(peticiones).toHaveLength(0);
});
