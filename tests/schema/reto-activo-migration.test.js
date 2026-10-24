'use strict';

/** RF06/HU31/RN28 · Decisión #09: una SQLite anterior recibe `reto.activo` sin perder retos ni puntos. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.DATABASE_STORAGE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-reto-activo-')), 'database.sqlite');
const db = require('../../src/database');
const { ddlPath, dividirSentencias, inicializarEsquema } = require('../../src/config/schema');

const columna = '  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),\n';
const contar = async tabla => (await db.query(`SELECT COUNT(*) AS n FROM ${tabla}`, { plain: true })).n;

async function run() {
  const ddl = fs.readFileSync(ddlPath, 'utf8');
  const posicionReto = ddl.indexOf('CREATE TABLE IF NOT EXISTS reto');
  assert.ok(ddl.indexOf(columna, posicionReto) > posicionReto, 'E11 debe declarar reto.activo');
  const anterior = ddl.slice(0, posicionReto) + ddl.slice(posicionReto).replace(columna, '');
  for (const sentencia of dividirSentencias(anterior)) await db.query(sentencia);
  const antes = await db.query('PRAGMA table_info(reto)', { type: db.QueryTypes.SELECT });
  assert.equal(antes.some(c => c.name === 'activo'), false, 'la base de ensayo debe ser anterior');

  await db.query("INSERT INTO cuenta (id_cuenta,nombre,correo,contrasena_hash) VALUES ('c','Ensayo','ensayo@test.local','hash')");
  await db.query("INSERT INTO reto (id_reto,id_cuenta,descripcion,condicion,puntos_recompensa,semana,progreso,completado) VALUES ('r1','c','Pendiente','tareas:3',20,'2026-W39',1,0),('r2','c','Cerrado','api >= 1',50,'2026-W40',1,1)");
  await db.query("INSERT INTO punto (id_punto,id_cuenta,cantidad,origen,id_origen) VALUES ('p','c',50,'Reto','r2')");
  const tablas = ['cuenta', 'reto', 'punto'];
  const conteos = await Promise.all(tablas.map(contar));
  const retosAntes = await db.query('SELECT id_reto, descripcion, condicion, puntos_recompensa, semana, progreso, completado FROM reto ORDER BY id_reto', { type: db.QueryTypes.SELECT });

  await inicializarEsquema();
  await inicializarEsquema(); // Idempotente: un segundo arranque no vuelve a añadir la columna.

  const definicion = (await db.query('PRAGMA table_info(reto)', { type: db.QueryTypes.SELECT })).find(c => c.name === 'activo');
  assert.ok(definicion, 'la migración debe añadir reto.activo');
  assert.equal(definicion.type, 'INTEGER');
  assert.equal(definicion.notnull, 1);
  assert.equal(definicion.dflt_value, '1');
  assert.deepEqual(await db.query('SELECT activo FROM reto ORDER BY id_reto', { type: db.QueryTypes.SELECT }), [{ activo: 1 }, { activo: 1 }]);
  assert.deepEqual(await Promise.all(tablas.map(contar)), conteos);
  assert.deepEqual(await db.query('SELECT id_reto, descripcion, condicion, puntos_recompensa, semana, progreso, completado FROM reto ORDER BY id_reto', { type: db.QueryTypes.SELECT }), retosAntes);
  assert.equal((await db.query("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", { plain: true })).n, 13);
  // Sequelize agrupa SQLITE_CONSTRAINT en UniqueConstraintError; el motivo real está en el error original.
  await assert.rejects(db.query("UPDATE reto SET activo = 2 WHERE id_reto = 'r1'"),
    error => /CHECK constraint failed/.test(error.original?.message || error.message));
  assert.equal((await db.query('PRAGMA integrity_check', { plain: true })).integrity_check, 'ok');
  assert.deepEqual(await db.query('PRAGMA foreign_key_check', { type: db.QueryTypes.SELECT }), []);
  console.log('✅ Migración reto.activo: columna aditiva, 13 tablas, retos y puntos conservados');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.close());
