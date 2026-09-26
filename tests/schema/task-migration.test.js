'use strict';

/** RF02/RF03/RF04 · CRF-005: migración y estados con datos anteriores reales. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.DATABASE_STORAGE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-migration-')), 'database.sqlite');
const db = require('../../src/database');
const { ddlPath, dividirSentencias, inicializarEsquema } = require('../../src/config/schema');
const tareas = require('../../src/services/tareaService');
const planificador = require('../../src/services/planificadorRecordatoriosService');

async function run() {
  const anterior = fs.readFileSync(ddlPath, 'utf8').replace("'Pendiente','En progreso','Completada'", "'Pendiente','Completada'");
  for (const sentencia of dividirSentencias(anterior)) await db.query(sentencia);
  await db.query("INSERT INTO cuenta (id_cuenta,nombre,correo,contrasena_hash) VALUES ('c','Ensayo','ensayo@test.local','hash-de-prueba')");
  await db.query("INSERT INTO tarea (id_tarea,id_cuenta,nombre,fecha_entrega,prioridad) VALUES ('t','c','Tarea anterior','2028-12-30','Media')");
  await db.query("INSERT INTO recordatorio (id_recordatorio,id_tarea,id_cuenta,fecha_programada,mensaje) VALUES ('r','t','c','2028-12-29','Aviso anterior')");
  await db.query("INSERT INTO sesion_estudio (id_sesion,id_cuenta,id_tarea,duracion_minutos) VALUES ('s','c','t',25)");
  await db.query('CREATE INDEX prueba_tarea_nombre ON tarea(nombre)');
  await inicializarEsquema();
  await inicializarEsquema(); // Reiniciar no vuelve a reconstruir ni duplica datos.
  const [referencias] = await db.query("SELECT id_tarea FROM recordatorio UNION ALL SELECT id_tarea FROM sesion_estudio");
  assert.deepEqual(referencias, [{ id_tarea: 't' }, { id_tarea: 't' }]);
  const [indices] = await db.query("SELECT name FROM sqlite_master WHERE name='prueba_tarea_nombre'");
  assert.equal(indices.length, 1);
  assert.equal((await tareas.actualizarTarea('t', { estado: 'En progreso' })).estado, 'En progreso');
  await assert.rejects(tareas.actualizarTarea('t', { estado: 'Completada' }), /acción Completar/);
  assert.equal(await planificador.procesarPendientes(new Date('2028-12-29T12:00:00Z')), 1);
  await tareas.completarTarea('t');
  await assert.rejects(tareas.actualizarTarea('t', { estado: 'Pendiente' }), /reabrir/);
  assert.deepEqual((await db.query('PRAGMA foreign_key_check'))[0], []);
  const claves = await db.query('PRAGMA foreign_keys', { type: db.QueryTypes.SELECT });
  assert.equal(claves[0].foreign_keys, 1);
  console.log('✅ Migración: conserva tareas, sesiones, recordatorios e índices; estados y avisos verificados');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.close());
