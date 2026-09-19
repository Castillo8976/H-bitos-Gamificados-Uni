'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const bcrypt = require('bcryptjs');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-integration-'));
process.env.DATABASE_STORAGE = path.join(testDirectory, 'database.sqlite');

const sequelize = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');

// Carga explícita de los 13 modelos que conforman el esquema vigente.
[
  'Cuenta',
  'Materia',
  'Tarea',
  'SesionEstudio',
  'Insignia',
  'CuentaInsignia',
  'Punto',
  'Reto',
  'Meta',
  'Recordatorio',
  'PreferenciaVisual',
  'NivelCuenta',
  'Notificacion'
].forEach(modelo => require(`../../src/models/${modelo}`));

const cuentaCrud = require('../../src/crud/cuentaCrud');
const materiaCrud = require('../../src/crud/materiaCrud');
const tareaCrud = require('../../src/crud/tareaCrud');
const sesionCrud = require('../../src/crud/sesionEstudioCrud');
const insigniaCrud = require('../../src/crud/insigniaCrud');
const cuentaInsigniaCrud = require('../../src/crud/cuentaInsigniaCrud');
const puntoCrud = require('../../src/crud/puntoCrud');
const retoCrud = require('../../src/crud/retoCrud');
const metaCrud = require('../../src/crud/metaCrud');
const recordatorioCrud = require('../../src/crud/recordatorioCrud');
const preferenciaCrud = require('../../src/crud/preferenciaVisualCrud');
const nivelCrud = require('../../src/crud/nivelCuentaCrud');
const notificacionCrud = require('../../src/crud/notificacionCrud');

async function ejecutarPrueba() {
  await inicializarEsquema();

  const tablas = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    { type: sequelize.QueryTypes.SELECT }
  );
  assert.equal(tablas.length, 13, 'El esquema debe contener exactamente 13 tablas');

  const cuenta = await cuentaCrud.crearCuenta(
    'Usuario de prueba',
    'integracion@studyquest.local',
    'ClaveSegura123!'
  );
  assert.equal(await bcrypt.compare('ClaveSegura123!', cuenta.contrasena_hash), true);
  assert.equal((await cuentaCrud.listarCuentas()).length, 1);
  await cuentaCrud.actualizarCuenta(cuenta.id_cuenta, { nombre: 'Usuario actualizado' });
  assert.equal((await cuentaCrud.obtenerCuenta(cuenta.id_cuenta)).nombre, 'Usuario actualizado');

  const materia = await materiaCrud.crearMateria(
    cuenta.id_cuenta,
    'Ingeniería de Software III',
    'Sábado 08:00'
  );
  assert.equal((await materiaCrud.listarMaterias(cuenta.id_cuenta)).length, 1);
  await materiaCrud.actualizarMateria(materia.id_materia, { horario: 'Sábado 09:00' });

  const tarea = await tareaCrud.crearTarea(
    cuenta.id_cuenta,
    'Validar capa de datos',
    '2027-12-31',
    'Alta',
    materia.id_materia
  );
  await tareaCrud.actualizarTarea(tarea.id_tarea, { prioridad: 'Media' });
  await tareaCrud.completarTarea(tarea.id_tarea);
  assert.equal((await tareaCrud.obtenerTarea(tarea.id_tarea)).estado, 'Completada');

  await preferenciaCrud.crearPreferenciaVisual(cuenta.id_cuenta);
  await preferenciaCrud.actualizarPreferenciaVisual(cuenta.id_cuenta, { modo_oscuro: true });
  assert.equal((await preferenciaCrud.obtenerPreferenciaVisual(cuenta.id_cuenta)).modo_oscuro, true);

  const sesion = await sesionCrud.crearSesionEstudio(cuenta.id_cuenta, 25, true, tarea.id_tarea);
  await sesionCrud.actualizarSesionEstudio(sesion.id_sesion, { duracion_minutos: 30 });
  assert.equal((await sesionCrud.obtenerSesionEstudio(sesion.id_sesion)).duracion_minutos, 30);

  await insigniaCrud.sembrarInsignias();
  const insignias = await insigniaCrud.listarInsignias();
  assert.equal(insignias.length, 5, 'El catálogo aprobado debe contener 5 insignias');
  const primera = insignias.find(item => item.condicion === 'primera_tarea');
  await cuentaInsigniaCrud.desbloquearInsignia(cuenta.id_cuenta, primera.id_insignia);
  assert.equal(await cuentaInsigniaCrud.tieneInsignia(cuenta.id_cuenta, primera.id_insignia), true);
  const obtenidas = await cuentaInsigniaCrud.listarInsigniasDesbloqueadas(cuenta.id_cuenta);
  assert.equal(obtenidas[0].insignia.nombre, 'Primera tarea');

  const nuevas = await cuentaInsigniaCrud.evaluarInsignias(cuenta.id_cuenta, {
    totalTareasCompletadas: 1,
    totalPomodoros: 0,
    sesionesUltimaSemana: 0,
    sesionAntes8am: true
  });
  assert.deepEqual(nuevas, ['Madrugador']);

  await puntoCrud.otorgarPuntos(cuenta.id_cuenta, 10, 'Tarea', tarea.id_tarea);
  assert.equal(await puntoCrud.calcularTotalPuntos(cuenta.id_cuenta), 10);

  const reto = await retoCrud.crearReto(
    cuenta.id_cuenta,
    'Completar una tarea',
    'tareas_completadas >= 1',
    20,
    '2026-W38'
  );
  await retoCrud.actualizarProgresoReto(reto.id_reto, 1);
  await retoCrud.completarReto(reto.id_reto);
  assert.equal((await retoCrud.obtenerReto(reto.id_reto)).completado, true);
  assert.equal(await puntoCrud.calcularTotalPuntos(cuenta.id_cuenta), 30);

  const meta = await metaCrud.crearMeta(
    cuenta.id_cuenta,
    '2026-W38',
    'Estudiar 30 minutos',
    30
  );
  await metaCrud.actualizarProgresoMeta(meta.id_meta, 30);
  assert.equal((await metaCrud.obtenerMeta(meta.id_meta)).cumplida, true);

  const recordatorio = await recordatorioCrud.crearRecordatorio(
    tarea.id_tarea,
    cuenta.id_cuenta,
    '2027-12-30',
    'La tarea está próxima a vencer'
  );
  await recordatorioCrud.toggleRecordatorio(recordatorio.id_recordatorio, false);
  await recordatorioCrud.marcarRecordatorioEnviado(recordatorio.id_recordatorio);
  assert.equal((await recordatorioCrud.obtenerRecordatorio(recordatorio.id_recordatorio)).enviado, true);

  await nivelCrud.sembrarNiveles();
  assert.equal((await nivelCrud.listarNiveles()).length, 4);
  const nivel = await nivelCrud.evaluarNivelCuenta(await puntoCrud.calcularTotalPuntos(cuenta.id_cuenta));
  assert.ok(nivel, 'Debe determinar un nivel para el total de puntos');

  const notificacion = await notificacionCrud.crearNotificacion(
    cuenta.id_cuenta,
    'Sistema',
    'Prueba de notificación'
  );
  assert.equal(await notificacionCrud.contarNotificacionesNoLeidas(cuenta.id_cuenta), 1);
  await notificacionCrud.marcarNotificacionLeida(notificacion.id_notificacion);
  assert.equal(await notificacionCrud.contarNotificacionesNoLeidas(cuenta.id_cuenta), 0);

  const integridad = await sequelize.query('PRAGMA integrity_check', {
    type: sequelize.QueryTypes.SELECT
  });
  const llavesInvalidas = await sequelize.query('PRAGMA foreign_key_check', {
    type: sequelize.QueryTypes.SELECT
  });
  assert.equal(integridad[0].integrity_check, 'ok');
  assert.equal(llavesInvalidas.length, 0);

  console.log('\n✅ PRUEBA INTEGRAL SUPERADA');
  console.log('   13 tablas, CRUD principales, gamificación e integridad referencial verificados.');
  console.log('   La base temporal fue:', process.env.DATABASE_STORAGE);
}

(async () => {
  try {
    await ejecutarPrueba();
  } catch (error) {
    console.error('\n❌ PRUEBA INTEGRAL FALLIDA');
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    fs.rmSync(testDirectory, { recursive: true, force: true });
  }
})();
