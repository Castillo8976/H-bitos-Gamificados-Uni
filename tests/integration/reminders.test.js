'use strict';

/** RF04/HU04/HU25: creación, reprogramación, recuperación y envío único.
 * Pruebas con SQLite temporal y reloj explícito; no inician el servidor real.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-recordatorios-'));
process.env.DATABASE_STORAGE = path.join(directory, 'database.sqlite');
const sequelize = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const auth = require('../../src/services/authService');
const tareas = require('../../src/services/tareaService');
const planificador = require('../../src/services/planificadorRecordatoriosService');
const gamificacion = require('../../src/services/gamificacionService');
const Recordatorio = require('../../src/models/Recordatorio');
const Tarea = require('../../src/models/Tarea');
const Notificacion = require('../../src/models/Notificacion');

/** RF04/HU25: verifica todos los estados del aviso con transacciones reales. */
async function run() {
  await inicializarEsquema();
  const cuenta = await auth.register({ nombre: 'Recordatorios', correo: 'avisos@test.local', contrasena: 'Clave123!', materia: { nombre: 'Materia' } });
  const tarea = await tareas.crearTarea(cuenta.id_cuenta, 'Entrega', '2028-03-01', 'Alta');
  const id = planificador.idAutomatico(tarea.id_tarea);
  assert.equal(id.length, 36);
  let rec = await Recordatorio.findByPk(id);
  assert.equal(rec.fecha_programada, '2028-02-29');
  assert.equal(await planificador.procesarPendientes(new Date('2028-02-28T23:59:59Z')), 0);

  // Fallo al persistir aviso: no marca enviado ni duplica cuando reintentamos.
  await sequelize.query("CREATE TRIGGER fallo_aviso BEFORE INSERT ON notificacion BEGIN SELECT RAISE(ABORT, 'fallo de prueba'); END");
  await assert.rejects(planificador.procesarPendientes(new Date('2028-02-29T12:00:00Z')));
  await sequelize.query('DROP TRIGGER fallo_aviso');
  assert.equal((await Recordatorio.findByPk(id)).enviado, false);
  assert.equal(await Notificacion.count(), 0);
  assert.equal(await planificador.procesarPendientes(new Date('2028-02-29T12:00:00Z')), 1);
  assert.equal(await planificador.procesarPendientes(new Date('2028-03-03T12:00:00Z')), 0);
  assert.equal(await Notificacion.count(), 1);

  // Renombrar no reenvía. Cambiar fecha sí reprograma, pero respeta desactivación.
  await tareas.actualizarTarea(tarea.id_tarea, { nombre: 'Nombre actualizado' });
  assert.equal((await Recordatorio.findByPk(id)).enviado, true);
  await Recordatorio.update({ activo: false }, { where: { id_recordatorio: id } });
  await tareas.actualizarTarea(tarea.id_tarea, { fecha_entrega: '2028-03-05' });
  rec = await Recordatorio.findByPk(id);
  assert.equal(rec.fecha_programada, '2028-03-04');
  assert.equal(rec.enviado, false);
  assert.equal(rec.activo, false);
  assert.equal(await planificador.procesarPendientes(new Date('2028-03-06T12:00:00Z')), 0);
  await Recordatorio.update({ activo: true }, { where: { id_recordatorio: id } });
  assert.equal(await planificador.procesarPendientes(new Date('2028-03-06T12:00:00Z')), 1);
  assert.equal(await Notificacion.count(), 2);

  // Crear o editar tarea sin poder guardar recordatorio debe revertir la tarea.
  await sequelize.query("CREATE TRIGGER fallo_programacion BEFORE INSERT ON recordatorio BEGIN SELECT RAISE(ABORT, 'fallo programacion'); END");
  await assert.rejects(tareas.crearTarea(cuenta.id_cuenta, 'No debe quedar', '2028-04-01', 'Alta'));
  await sequelize.query('DROP TRIGGER fallo_programacion');
  assert.equal(await Tarea.count(), 1);
  await sequelize.query("CREATE TRIGGER fallo_edicion BEFORE UPDATE ON recordatorio BEGIN SELECT RAISE(ABORT, 'fallo edicion'); END");
  await assert.rejects(tareas.actualizarTarea(tarea.id_tarea, { fecha_entrega: '2028-04-02' }));
  await sequelize.query('DROP TRIGGER fallo_edicion');
  assert.equal((await Tarea.findByPk(tarea.id_tarea)).fecha_entrega, '2028-03-05');

  const pendiente = await tareas.crearTarea(cuenta.id_cuenta, 'Completar antes del aviso', '2028-04-01', 'Media');
  await gamificacion.completarTareaConGamificacion(cuenta.id_cuenta, pendiente.id_tarea, { ahora: new Date('2028-03-01T12:00:00Z') });
  assert.equal((await Recordatorio.findByPk(planificador.idAutomatico(pendiente.id_tarea))).activo, false);
  const antes = await Notificacion.count();
  assert.equal(await planificador.procesarPendientes(new Date('2028-05-01T12:00:00Z')), 0);
  assert.equal(await Notificacion.count(), antes);
  await tareas.eliminarTarea(tarea.id_tarea);
  assert.equal(await Recordatorio.findByPk(id), null);
  // Ciclo periódico real: ejecuta pendientes y se detiene sin dejar trabajo activo.
  const ciclica = await tareas.crearTarea(cuenta.id_cuenta, 'Procesamiento periódico', '2028-05-01', 'Baja');
  await Recordatorio.update({ fecha_programada: '2000-01-01' }, {
    where: { id_recordatorio: planificador.idAutomatico(ciclica.id_tarea) }
  });
  planificador.iniciar(10);
  try {
    for (let intento = 0; intento < 50; intento += 1) {
      if ((await Recordatorio.findByPk(planificador.idAutomatico(ciclica.id_tarea))).enviado) break;
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  } finally { await planificador.detener(); }
  assert.equal((await Recordatorio.findByPk(planificador.idAutomatico(ciclica.id_tarea))).enviado, true);
  assert.equal(planificador.activo, false);
  assert.equal(planificador.pendiente, null);
  assert.deepEqual(await sequelize.query('PRAGMA foreign_key_check', { type: sequelize.QueryTypes.SELECT }), []);
  console.log('✅ RF04: programación atómica, reprogramación, recuperación, envío único y cascada');
}

(async () => {
  try { await run(); }
  catch (error) { console.error(error); process.exitCode = 1; }
  finally { await planificador.detener(); await sequelize.close(); fs.rmSync(directory, { recursive: true, force: true }); }
})();
