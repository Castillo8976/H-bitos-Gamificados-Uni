'use strict';

/** RF01–RF15/HU01–HU28: verifica publicación de HTML/CSS/JS y controles.
 * No sustituye interacción real ni aceptación de todos los prototipos.
 */

/**
 * Prueba básica de entrega del frontend.
 * Verifica que Express publique los tres recursos necesarios y que la pantalla
 * conserve los flujos mínimos aprobados. No modifica la base de datos real.
 */
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../../src/app');

async function run() {
  const pagina = await request(app).get('/').expect(200).expect('Content-Type', /html/);
  await request(app).get('/admin').expect(200).expect('Content-Type', /html/);
  await request(app).get('/revisor').expect(200).expect('Content-Type', /html/);
  assert.match(pagina.text, /id="form-login"/);
  assert.match(pagina.text, /id="form-registro"/);
  assert.match(pagina.text, /data-seccion="dashboard"/);
  assert.match(pagina.text, /data-seccion="tareas"/);
  assert.match(pagina.text, /data-seccion="pomodoro"/);
  assert.match(pagina.text, /data-seccion="estadisticas"/);
  assert.match(pagina.text, /data-seccion="exportacion"/);
  assert.match(pagina.text, /data-seccion="administracion"/);
  assert.match(pagina.text, /data-seccion="institucional"/);
  assert.match(pagina.text, /id="modal-recompensa"/);

  const estilos = await request(app).get('/styles.css').expect(200).expect('Content-Type', /css/);
  assert.match(estilos.text, /--primario:#534ab7/);
  assert.match(estilos.text, /@media\(max-width:720px\)/);

  const cliente = await request(app).get('/app.js').expect(200).expect('Content-Type', /javascript/);
  assert.match(cliente.text, /sessionStorage/);
  assert.match(cliente.text, /async function api/);
  assert.match(cliente.text, /\/estadisticas\/semanales/);
  assert.match(cliente.text, /\/estadisticas\/institucionales/);
  assert.match(cliente.text, /\/exportacion\/datos/);
  assert.match(cliente.text, /mostrarRecompensa/);
  assert.doesNotMatch(cliente.text, /localStorage/);

  console.log('✅ Frontend: acceso, pantallas, estilos responsive y cliente API publicados');
}

run().catch(error => {
  console.error('❌ Falló la prueba estática del frontend');
  console.error(error.stack || error);
  process.exitCode = 1;
});
