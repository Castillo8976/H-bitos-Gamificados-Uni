'use strict';

/** RF01/HU30/RN27 · Decisión #08: una SQLite anterior recibe `cuenta.version_sesion` sin perder datos. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
process.env.DATABASE_STORAGE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-version-sesion-')), 'database.sqlite');
const bcrypt = require('bcryptjs');
const db = require('../../src/database');
const { ddlPath, dividirSentencias, inicializarEsquema } = require('../../src/config/schema');
const authService = require('../../src/services/authService');
const cuentas = require('../../src/services/cuentaService');

const columna = '  version_sesion INTEGER NOT NULL DEFAULT 0 CHECK (version_sesion >= 0),\n';
const contar = async tabla => (await db.query(`SELECT COUNT(*) AS n FROM ${tabla}`, { plain: true })).n;

async function run() {
  const ddl = fs.readFileSync(ddlPath, 'utf8');
  assert.ok(ddl.includes(columna), 'E11 debe declarar version_sesion');
  for (const sentencia of dividirSentencias(ddl.replace(columna, ''))) await db.query(sentencia);
  const columnasAntes = await db.query('PRAGMA table_info(cuenta)', { type: db.QueryTypes.SELECT });
  assert.equal(columnasAntes.some(c => c.name === 'version_sesion'), false, 'la base de ensayo debe ser anterior');

  const hash = await bcrypt.hash('ClaveSegura123!', 10);
  await db.query("INSERT INTO cuenta (id_cuenta,nombre,correo,contrasena_hash) VALUES ('c1','Activa','activa@test.local',:hash)", { replacements: { hash } });
  await db.query("INSERT INTO cuenta (id_cuenta,nombre,correo,contrasena_hash,activa) VALUES ('c2','Inactiva','inactiva@test.local',:hash,0)", { replacements: { hash } });
  await db.query("INSERT INTO preferencia_visual (id_preferencia,id_cuenta) VALUES ('p1','c1'),('p2','c2')");
  await db.query("INSERT INTO materia (id_materia,id_cuenta,nombre) VALUES ('m1','c1','Materia anterior')");
  await db.query("INSERT INTO tarea (id_tarea,id_cuenta,id_materia,nombre,fecha_entrega,prioridad) VALUES ('t1','c1','m1','Tarea anterior','2028-12-30','Media')");
  await db.query("INSERT INTO punto (id_punto,id_cuenta,cantidad,origen,id_origen) VALUES ('pt1','c1',10,'Tarea','t1')");
  const tablas = ['cuenta', 'preferencia_visual', 'materia', 'tarea', 'punto'];
  const conteosAntes = await Promise.all(tablas.map(contar));
  const cuentasAntes = await db.query('SELECT id_cuenta, nombre, correo, contrasena_hash, activa, rol FROM cuenta ORDER BY id_cuenta', { type: db.QueryTypes.SELECT });

  await inicializarEsquema();
  await inicializarEsquema(); // Un segundo arranque no vuelve a añadir la columna ni altera datos.

  const definicion = (await db.query('PRAGMA table_info(cuenta)', { type: db.QueryTypes.SELECT })).find(c => c.name === 'version_sesion');
  assert.ok(definicion, 'la migración debe añadir version_sesion');
  assert.equal(definicion.type, 'INTEGER');
  assert.equal(definicion.notnull, 1);
  assert.equal(definicion.dflt_value, '0');
  assert.deepEqual(await db.query('SELECT version_sesion FROM cuenta ORDER BY id_cuenta', { type: db.QueryTypes.SELECT }), [{ version_sesion: 0 }, { version_sesion: 0 }]);
  assert.deepEqual(await Promise.all(tablas.map(contar)), conteosAntes);
  assert.deepEqual(await db.query('SELECT id_cuenta, nombre, correo, contrasena_hash, activa, rol FROM cuenta ORDER BY id_cuenta', { type: db.QueryTypes.SELECT }), cuentasAntes);
  assert.equal((await db.query("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", { plain: true })).n, 13);
  // Sequelize agrupa SQLITE_CONSTRAINT en UniqueConstraintError; el motivo real está en el error original.
  await assert.rejects(db.query("UPDATE cuenta SET version_sesion = -1 WHERE id_cuenta = 'c1'"),
    error => /CHECK constraint failed/.test(error.original?.message || error.message));

  // Las cuentas migradas operan con el nuevo mecanismo: login con ver 0 y desactivación que incrementa una vez.
  const { token } = await authService.authenticate({ correo: 'activa@test.local', contrasena: 'ClaveSegura123!' });
  assert.equal(JSON.parse(Buffer.from(token.split('.')[1], 'base64url')).ver, 0);
  assert.equal(await cuentas.desactivarCuenta('c1'), true);
  assert.equal(await cuentas.desactivarCuenta('c1'), false);
  assert.equal((await db.query("SELECT version_sesion FROM cuenta WHERE id_cuenta = 'c1'", { plain: true })).version_sesion, 1);

  assert.equal((await db.query('PRAGMA integrity_check', { plain: true })).integrity_check, 'ok');
  assert.deepEqual(await db.query('PRAGMA foreign_key_check', { type: db.QueryTypes.SELECT }), []);
  console.log('✅ Migración version_sesion: columna aditiva, 13 tablas, datos e integridad conservados');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.close());
