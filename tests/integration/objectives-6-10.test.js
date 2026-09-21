'use strict';

/** RF03/HU03, RF05–RF07/HU05–HU07, RF11/HU08/HU28 y RF14/HU14:
 * prueba eventos, rollback, duplicidad, agregados y exportación en SQLite temporal.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-objectives-'));
process.env.DATABASE_STORAGE = path.join(directory, 'database.sqlite');
process.env.JWT_SECRET = 'secreto-pruebas-objetivos-6-10';

const sequelize = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const authService = require('../../src/services/authService');
const gamificacion = require('../../src/services/gamificacionService');
const estadisticas = require('../../src/services/estadisticasService');
const exportador = require('../../src/services/exportadorDatosService');
const tarea = require('../../src/services/tareaService');
const reto = require('../../src/services/retoService');
const meta = require('../../src/services/metaService');
const Punto = require('../../src/models/Punto');
const Tarea = require('../../src/models/Tarea');
const Cuenta = require('../../src/models/Cuenta');
const Notificacion = require('../../src/models/Notificacion');
const CuentaInsignia = require('../../src/models/CuentaInsignia');
const { semanaIso, fechaIso } = require('../../src/services/periodoService');

async function run() {
  await inicializarEsquema();
  const cuenta = await authService.register({
    nombre: 'Estudiante Objetivos', correo: 'objetivos@test.local', contrasena: 'ClaveSegura123!',
    materia: { nombre: 'Ingeniería de Software III' }
  });
  const ahora = new Date('2026-09-21T13:00:00.000Z');
  const semana = semanaIso(ahora);
  const unaTarea = await tarea.crearTarea(cuenta.id_cuenta, 'Completar flujo', '2027-12-31', 'Alta');
  const retoTarea = await reto.crearReto(cuenta.id_cuenta, 'Completar una tarea', 'tareas:1', 20, semana);
  await meta.crearMeta(cuenta.id_cuenta, semana, 'Completar una tarea semanal', 1);

  // TC-O6-TAREA: el evento confirma todas las operaciones relacionadas.
  const resultado = await gamificacion.completarTareaConGamificacion(cuenta.id_cuenta, unaTarea.id_tarea, { ahora });
  assert.equal(resultado.tarea.estado, 'Completada');
  assert.equal(resultado.puntos_otorgados, 30);
  assert.deepEqual(resultado.retos_completados, ['Completar una tarea']);
  assert.deepEqual(resultado.metas_cumplidas, ['Completar una tarea semanal']);
  assert.ok(resultado.insignias_desbloqueadas.includes('Primera tarea'));
  assert.equal(resultado.nivel, 'Principiante');
  assert.equal(resultado.total_puntos, 30);
  assert.equal(await Punto.count({ where: { id_cuenta: cuenta.id_cuenta, origen: 'Tarea', id_origen: unaTarea.id_tarea } }), 1);
  assert.equal(await Punto.count({ where: { id_cuenta: cuenta.id_cuenta, origen: 'Reto', id_origen: retoTarea.id_reto } }), 1);
  assert.equal(await CuentaInsignia.count({ where: { id_cuenta: cuenta.id_cuenta, id_insignia: 'ins-001' } }), 1);
  assert.ok(await Notificacion.count({ where: { id_cuenta: cuenta.id_cuenta } }) >= 3);
  // TC-O6-DUPLICADO: el mismo evento no vuelve a entregar recompensas.
  await assert.rejects(
    gamificacion.completarTareaConGamificacion(cuenta.id_cuenta, unaTarea.id_tarea, { ahora }),
    error => error.status === 409
  );
  assert.equal(await Punto.count({ where: { id_cuenta: cuenta.id_cuenta, origen: 'Tarea', id_origen: unaTarea.id_tarea } }), 1);
  assert.equal(await Punto.count({ where: { id_cuenta: cuenta.id_cuenta, origen: 'Reto', id_origen: retoTarea.id_reto } }), 1);
  assert.equal(await CuentaInsignia.count({ where: { id_cuenta: cuenta.id_cuenta, id_insignia: 'ins-001' } }), 1);

  // TC-O6-SESION: una sesión se guarda y recompensa una sola vez.
  const cuentaSesion = await authService.register({
    nombre: 'Estudiante Sesiones', correo: 'sesiones@test.local', contrasena: 'ClaveSegura123!',
    materia: { nombre: 'Pruebas de sesión' }
  });
  const retoSesiones = await reto.crearReto(cuentaSesion.id_cuenta, 'Completar dos sesiones', 'sesiones:2', 15, semana);
  const metaPomodoros = await meta.crearMeta(cuentaSesion.id_cuenta, semana, 'Completar dos Pomodoros', 2);
  const sesion = await gamificacion.registrarSesionConGamificacion(cuentaSesion.id_cuenta, {
    duracion_minutos: 25, modo_enfoque: true
  }, { ahora });
  assert.equal(sesion.puntos_otorgados, gamificacion.PUNTOS_SESION);
  assert.equal(await Punto.count({ where: { origen: 'Sesion', id_origen: sesion.sesion.id_sesion } }), 1);
  assert.equal((await reto.obtenerReto(retoSesiones.id_reto)).progreso, 1);
  assert.equal((await meta.obtenerMeta(metaPomodoros.id_meta)).valor_actual, 1);

  // TC-O7-LIMITES: ambos extremos del rango semanal son inclusivos.
  const tareaDomingo = await tarea.crearTarea(cuenta.id_cuenta, 'Cerrar semana', '2027-12-31', 'Baja');
  await gamificacion.completarTareaConGamificacion(cuenta.id_cuenta, tareaDomingo.id_tarea, {
    ahora: new Date('2026-09-27T13:00:00.000Z')
  });

  // TC-O7-SEMANA: agregados en tiempo real para ambos límites inclusivos.
  const tablero = await estadisticas.obtenerEstadisticasSemana(cuenta.id_cuenta, '2026-09-21', '2026-09-27');
  assert.equal(tablero.tareas_creadas, 2);
  assert.equal(tablero.tareas_registradas, 2);
  assert.equal(tablero.tareas_completadas, 2);
  assert.equal(tablero.porcentaje_cumplimiento, 100);
  assert.equal(tablero.minutos_estudiados, 0);
  assert.equal(tablero.sesiones_pomodoro, 0);
  assert.equal(tablero.puntos_obtenidos, 40);
  assert.equal(tablero.nivel_actual.nombre, 'Principiante');
  assert.equal(tablero.metas[0].cumplida, true);
  assert.equal(tablero.retos[0].completado, true);
  assert.ok(tablero.insignias_obtenidas.some(item => item.id_insignia === 'ins-001'));

  const tableroSesion = await estadisticas.obtenerEstadisticasSemana(cuentaSesion.id_cuenta, '2026-09-21', '2026-09-27');
  assert.equal(tableroSesion.minutos_estudiados, 25);
  assert.equal(tableroSesion.sesiones_realizadas, 1);
  assert.equal(tableroSesion.sesiones_pomodoro, 1);
  assert.equal(tableroSesion.retos[0].progreso, 1);
  assert.equal(tableroSesion.metas[0].valor_actual, 1);

  // TC-O8-PRIVACIDAD: la exportación propia no incluye el hash.
  const datos = await exportador.exportarDatosPersonales(cuenta.id_cuenta);
  assert.deepEqual(Object.keys(datos).sort(), [
    'cuenta', 'generado_en', 'insignias', 'materias', 'metas', 'notificaciones',
    'puntos', 'preferencia_visual', 'recordatorios', 'retos', 'sesiones_estudio',
    'tareas', 'version_exportacion'
  ].sort());
  assert.equal(datos.cuenta.correo, 'objetivos@test.local');
  assert.equal('contrasena_hash' in datos.cuenta, false);
  assert.equal(datos.tareas.length, 2);
  assert.equal(datos.sesiones_estudio.length, 0);
  for (const coleccion of ['materias', 'tareas', 'sesiones_estudio', 'puntos', 'insignias', 'retos', 'metas', 'recordatorios', 'notificaciones']) {
    assert.ok(datos[coleccion].every(item => item.id_cuenta === cuenta.id_cuenta));
  }

  const tareaRollback = await tarea.crearTarea(cuenta.id_cuenta, 'Comprobar rollback', '2027-12-31', 'Media');
  const puntosAntesRollback = await Punto.count({ where: { id_cuenta: cuenta.id_cuenta } });
  const notificacionesAntesRollback = await Notificacion.count({ where: { id_cuenta: cuenta.id_cuenta } });
  // TC-O6-ROLLBACK: incluso una falla final revierte tarea, punto y notificación.
  await assert.rejects(
    gamificacion.completarTareaConGamificacion(cuenta.id_cuenta, tareaRollback.id_tarea, { ahora, fallarEn: 'antes_confirmar' }),
    /antes de confirmar/
  );
  assert.equal((await Tarea.findByPk(tareaRollback.id_tarea)).estado, 'Pendiente');
  assert.equal(await Punto.count({ where: { origen: 'Tarea', id_origen: tareaRollback.id_tarea } }), 0);
  assert.equal(await Punto.count({ where: { id_cuenta: cuenta.id_cuenta } }), puntosAntesRollback);
  assert.equal(await Notificacion.count({ where: { id_cuenta: cuenta.id_cuenta } }), notificacionesAntesRollback);

  const revisor = await authService.register({
    nombre: 'Revisor', correo: 'revisor-objetivos@test.local', contrasena: 'ClaveSegura123!',
    materia: { nombre: 'Auditoría' }
  });
  await Cuenta.update({ rol: 'Revisor institucional' }, { where: { id_cuenta: revisor.id_cuenta } });
  // TC-O10-REVISOR: solo se entregan cifras agregadas y anónimas.
  const institucional = await estadisticas.obtenerIndicadoresInstitucionales('2026-09-21', '2026-09-27');
  assert.equal(institucional.estudiantes_activos, 2);
  assert.equal(institucional.tareas_completadas, 2);
  assert.equal('cuentas' in institucional, false);
  assert.equal('correos' in institucional, false);
  await assert.rejects(
    estadisticas.obtenerEstadisticasSemana(cuenta.id_cuenta, '2026-09-28', '2026-09-21'),
    error => error.status === 400
  );

  const integridad = await sequelize.query('PRAGMA integrity_check', { type: sequelize.QueryTypes.SELECT });
  assert.equal(integridad[0].integrity_check, 'ok');
  assert.equal(fechaIso(ahora), '2026-09-21');
  console.log('✅ Objetivos 6–10: transacción, idempotencia, estadísticas, exportación y privacidad verificadas');
}

(async () => {
  try { await run(); }
  catch (error) { console.error('❌ Fallaron los objetivos 6–10'); console.error(error.stack || error); process.exitCode = 1; }
  finally { await sequelize.close(); fs.rmSync(directory, { recursive: true, force: true }); }
})();
