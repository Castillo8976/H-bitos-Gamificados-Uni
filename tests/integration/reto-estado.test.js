'use strict';

/** RF06/HU18/HU31/RN10/RN23/RN28 · Decisión #09: un reto inactivo no recibe progreso automático
 * ni recompensas; reactivar conserva progreso y puntos; el completado manual acredita una sola vez
 * incluso con llamadas simultáneas y se revierte completo si falla. Usa SQLite temporal.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.DATABASE_STORAGE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-retos-')), 'database.sqlite');

const sequelize = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const authService = require('../../src/services/authService');
const tarea = require('../../src/services/tareaService');
const reto = require('../../src/services/retoService');
const gamificacion = require('../../src/services/gamificacionService');
const { semanaIso } = require('../../src/services/periodoService');

const ahora = new Date('2026-09-21T13:00:00.000Z');
const semana = semanaIso(ahora);
const creditos = async idReto => sequelize.query(
  "SELECT COUNT(*) AS n, COALESCE(SUM(cantidad),0) AS total FROM punto WHERE origen = 'Reto' AND id_origen = :idReto",
  { replacements: { idReto }, plain: true });

async function completarTareaNueva(idCuenta, nombre) {
  const nueva = await tarea.crearTarea(idCuenta, nombre, '2027-12-31', 'Media');
  return gamificacion.completarTareaConGamificacion(idCuenta, nueva.id_tarea, { ahora });
}

async function run() {
  await inicializarEsquema();
  const { id_catalogo_materia } = await require('../helpers/catalogo').sembrarCatalogo();
  const cuenta = await authService.register({ nombre: 'Estudiante Retos', correo: 'retos@test.local', contrasena: 'ClaveSegura123!', materia: { id_catalogo_materia } });
  const id = cuenta.id_cuenta;

  // Inactivo: completar tareas no suma progreso ni acredita.
  const automatico = await reto.crearReto(id, 'Dos tareas', 'tareas:2', 40, semana);
  await reto.desactivarReto(automatico.id_reto);
  const resultado = await completarTareaNueva(id, 'Tarea con reto inactivo');
  assert.deepEqual(resultado.retos_completados, []);
  assert.equal((await reto.obtenerReto(automatico.id_reto)).progreso, 0);
  assert.equal(await reto.actualizarProgresoReto(automatico.id_reto, 1), null, 'el progreso manual tampoco avanza un reto inactivo');

  // Reactivado: conserva el progreso y vuelve a acumular; acredita una sola vez al alcanzar el objetivo.
  await reto.activarReto(automatico.id_reto);
  assert.equal((await reto.obtenerReto(automatico.id_reto)).activo, true);
  await completarTareaNueva(id, 'Primera tarea activa');
  assert.equal((await reto.obtenerReto(automatico.id_reto)).progreso, 1);
  const final = await completarTareaNueva(id, 'Segunda tarea activa');
  assert.deepEqual(final.retos_completados, ['Dos tareas']);
  assert.deepEqual(await creditos(automatico.id_reto), { n: 1, total: 40 });
  // Desactivar y reactivar un reto completado no retira ni repite la recompensa.
  await reto.desactivarReto(automatico.id_reto);
  await reto.activarReto(automatico.id_reto);
  await completarTareaNueva(id, 'Tarea posterior');
  assert.deepEqual(await creditos(automatico.id_reto), { n: 1, total: 40 });

  // Concurrencia: diez completados manuales simultáneos producen un único crédito.
  const manual = await reto.crearReto(id, 'Manual', 'sesiones:3', 25, '2026-W40');
  const intentos = await Promise.allSettled(Array.from({ length: 10 }, () => reto.completarReto(manual.id_reto)));
  assert.equal(intentos.filter(i => i.status === 'fulfilled' && i.value).length, 1);
  assert.deepEqual(await creditos(manual.id_reto), { n: 1, total: 25 });

  // Un reto inactivo no se completa manualmente.
  const inactivo = await reto.crearReto(id, 'Inactivo', 'minutos:30', 15, '2026-W41');
  await reto.desactivarReto(inactivo.id_reto);
  assert.equal(await reto.completarReto(inactivo.id_reto), null);
  assert.equal((await reto.obtenerReto(inactivo.id_reto)).completado, false);
  assert.deepEqual(await creditos(inactivo.id_reto), { n: 0, total: 0 });

  // Rollback: si falla la acreditación, el reto no queda completado.
  const fallido = await reto.crearReto(id, 'Fallido', 'pomodoros:2', 30, '2026-W42');
  await sequelize.query("CREATE TRIGGER fallo_punto_reto BEFORE INSERT ON punto WHEN NEW.origen = 'Reto' BEGIN SELECT RAISE(ABORT, 'fallo de prueba'); END");
  try {
    await assert.rejects(reto.completarReto(fallido.id_reto));
  } finally {
    await sequelize.query('DROP TRIGGER IF EXISTS fallo_punto_reto');
  }
  assert.equal((await reto.obtenerReto(fallido.id_reto)).completado, false);
  assert.deepEqual(await creditos(fallido.id_reto), { n: 0, total: 0 });
  assert.ok(await reto.completarReto(fallido.id_reto), 'tras el fallo el reto puede completarse una vez');
  assert.deepEqual(await creditos(fallido.id_reto), { n: 1, total: 30 });

  // Un reto completado no se elimina, ni siquiera desde el CRUD.
  await reto.eliminarReto(manual.id_reto);
  assert.ok(await reto.obtenerReto(manual.id_reto));

  assert.equal((await sequelize.query('PRAGMA integrity_check', { plain: true })).integrity_check, 'ok');
  console.log('✅ Estado de retos: inactivo sin progreso, reactivación, concurrencia, rollback y eliminación protegida');
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => sequelize.close());
