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
  for (const id of ['modal-codigo-correo', 'form-codigo-correo', 'codigo-correo', 'estado-codigo-correo', 'reenviar-codigo-correo', 'form-mfa-correo', 'form-cambio-correo', 'form-reenviar-verificacion']) {
    assert.ok(pagina.text.includes(`id="${id}"`));
  }
  assert.match(pagina.text, /inputmode="numeric" autocomplete="one-time-code" maxlength="6"/);
  assert.match(pagina.text, /id="estado-codigo-correo"[^>]*aria-live="polite"/);
  // RF01/HU20: evita seleccionar formularios duplicados u obsoletos.
  const ids = [...pagina.text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, 'Cada identificador HTML debe ser único');
  assert.match(pagina.text, /name="notificaciones_recordatorios"/);
  assert.match(pagina.text, /name="notificaciones_retos"/);
  assert.match(pagina.text, /id="form-registro"/);
  assert.match(pagina.text, /Materia inicial<select name="id_catalogo_materia"[^>]*required/);
  assert.doesNotMatch(pagina.text, /<input name="materia"/);
  assert.match(pagina.text, /id="aviso-catalogo-registro"[^>]*role="status"/);
  // RF01/HU30: la desactivación propia exige confirmación explícita con Cancelar y Confirmar.
  assert.match(pagina.text, /id="desactivar-cuenta"/);
  assert.match(pagina.text, /<dialog id="modal-desactivar-cuenta"[^>]*aria-labelledby="titulo-desactivar-cuenta"/);
  assert.match(pagina.text, /¿Estás seguro de que deseas desactivar tu cuenta\?/);
  assert.match(pagina.text, /id="cancelar-desactivar-cuenta"[^>]*>Cancelar</);
  assert.match(pagina.text, /id="confirmar-desactivar-cuenta"[^>]*>Confirmar</);
  assert.match(pagina.text, /data-seccion="dashboard"/);
  assert.match(pagina.text, /data-seccion="tareas"/);
  assert.match(pagina.text, /data-seccion="pomodoro"/);
  assert.match(pagina.text, /data-seccion="estadisticas"/);
  assert.match(pagina.text, /data-seccion="exportacion"/);
  assert.match(pagina.text, /data-seccion="administracion"/);
  assert.match(pagina.text, /data-seccion="institucional"/);
  assert.match(pagina.text, /id="modal-recompensa"/);

  // RF01/RN26/HU29: bloque administrativo P17 publicado.
  assert.match(pagina.text, /id="panel-catalogo-materias"/);
  assert.match(pagina.text, /id="form-admin-catalogo"/);
  assert.match(pagina.text, /id="lista-catalogo-materias"/);
  const estilos = await request(app).get('/styles.css').expect(200).expect('Content-Type', /css/);
  assert.match(estilos.text, /--primario:#534ab7/);
  assert.match(estilos.text, /@media\(max-width:720px\)/);

  const cliente = await request(app).get('/app.js').expect(200).expect('Content-Type', /javascript/);
  assert.match(cliente.text, /sessionStorage/);
  assert.match(cliente.text, /async function api/);
  assert.match(cliente.text, /\/estadisticas\/semanales/);
  assert.match(cliente.text, /\/estadisticas\/institucionales/);
  assert.match(cliente.text, /\/exportacion\/datos/);
  assert.match(cliente.text, /function htmlSelectorHorarioCompleto/);
  assert.match(cliente.text, /data-horario-dia/);
  assert.match(cliente.text, /data-horario-inicio/);
  assert.match(cliente.text, /data-horario-fin/);
  assert.match(cliente.text, /data-agregar-horario/);
  assert.match(cliente.text, /data-horario-legado/);
  // RF06/HU18/HU31/RN28: estado del reto visible y cambiado solo mediante PATCH /retos/:id/estado.
  assert.match(cliente.text, /data-accion="estado-reto"/);
  assert.match(cliente.text, /\/retos\/\$\{id\}\/estado`, \{ method: 'PATCH'/);
  assert.match(cliente.text, /reto\.completado \? '' : `<button[^`]*data-accion="eliminar-reto"/);
  assert.match(pagina.text, /name="puntos_recompensa" type="number" min="1" max="10000"/);
  // HU06/HU18: editor accesible con límites y acción explícita de completado.
  const formularioReto = pagina.text.match(/<form id="form-reto"[\s\S]*?<\/form>/)?.[0];
  assert.ok(formularioReto);
  assert.match(formularioReto, /aria-labelledby="titulo-form-reto"/);
  assert.match(formularioReto, /name="descripcion" required maxlength="200"/);
  assert.match(formularioReto, /name="tipo_condicion" required/);
  for (const tipo of ['tareas', 'sesiones', 'minutos', 'pomodoros']) assert.ok(formularioReto.includes(`value="${tipo}"`));
  assert.match(formularioReto, /name="objetivo" type="number" min="1" step="1" required/);
  assert.match(formularioReto, /name="puntos_recompensa" type="number" min="1" max="10000" step="1" required/);
  assert.match(formularioReto, /name="semana" type="week" required/);
  assert.match(formularioReto, /name="progreso" type="number" min="0"/);
  assert.match(cliente.text, /data-accion="completar-reto"/);
  assert.match(cliente.text, /\/retos\/\$\{id\}\/completar`, \{ method: 'PATCH'/);
  assert.match(cliente.text, /mostrarRecompensa/);
  assert.match(cliente.text, /catalogo-materias\?todas=true/);
  for (const accion of ['editar-catalogo', 'estado-catalogo', 'eliminar-catalogo']) assert.ok(cliente.text.includes(accion));
  assert.match(pagina.text, /id="alternar-navegacion"/);
  assert.match(pagina.text, /id="nav-mas"/);
  assert.match(pagina.text, /role="group" aria-labelledby="nav-grupo-principal"/);
  assert.match(pagina.text, /viewport-fit=cover/);
  assert.match(cliente.text, /studyquest_nav_colapsada/);
  assert.equal((cliente.text.match(/localStorage\.(?:setItem|getItem)\(/g) || []).length, 2);

  console.log('✅ Frontend: acceso, pantallas, estilos responsive y cliente API publicados');
}

run().catch(error => {
  console.error('❌ Falló la prueba estática del frontend');
  console.error(error.stack || error);
  process.exitCode = 1;
});
