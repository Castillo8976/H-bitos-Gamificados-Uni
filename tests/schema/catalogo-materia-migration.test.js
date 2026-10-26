'use strict';

/** RF01/RN26/HU29, Decisión #10: M1 preserva las 13 tablas anteriores y no empareja nombres. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-catalogo-'));
process.env.DATABASE_STORAGE = path.join(directory, 'migration.sqlite');
const db = require('../../src/database');
const { ddlPath, dividirSentencias, inicializarEsquema } = require('../../src/config/schema');
const { sinCatalogo } = require('../helpers/catalogo');
const select = sql => db.query(sql, { type: db.QueryTypes.SELECT });
const tablas = () => select("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
const contar = async nombres => Promise.all(nombres.map(async ({ name }) => (await select(`SELECT COUNT(*) AS n FROM ${name}`))[0].n));

async function run() {
  assert.notEqual(path.resolve(db.options.storage), path.resolve('database.sqlite'));
  for (const sentencia of dividirSentencias(sinCatalogo(fs.readFileSync(ddlPath, 'utf8')))) await db.query(sentencia);
  const anteriores = await tablas();
  assert.equal(anteriores.length, 13);
  assert.equal((await select('PRAGMA table_info(materia)')).some(c => c.name === 'id_catalogo_materia'), false);
  await db.query("INSERT INTO cuenta (id_cuenta,nombre,correo,contrasena_hash) VALUES ('c1','Primera','primera@test.local','hash'),('c2','Segunda','segunda@test.local','hash')");
  const nombres = ['Ingeria de Software', 'ingenieria de software 3', 'Administración de StudyQuest'];
  for (let i = 0; i < 6; i++) {
    await db.query('INSERT INTO materia (id_materia,id_cuenta,nombre,horario,activa) VALUES (:id,:cuenta,:nombre,:horario,:activa)', {
      replacements: { id: `m${i}`, cuenta: i < 3 ? 'c1' : 'c2', nombre: nombres[i % 3], horario: i % 2 ? null : 'Lunes 10:00', activa: i % 2 }
    });
    await db.query("INSERT INTO tarea (id_tarea,id_cuenta,id_materia,nombre,fecha_entrega,prioridad) VALUES (:id,:cuenta,:materia,'Anterior','2028-12-30','Media')", {
      replacements: { id: `t${i}`, cuenta: i < 3 ? 'c1' : 'c2', materia: `m${i}` }
    });
  }
  const conteos = await contar(anteriores);
  const consultaMaterias = 'SELECT id_materia,id_cuenta,nombre,horario,activa FROM materia ORDER BY id_materia';
  const materias = await select(consultaMaterias);
  const tareas = await select('SELECT * FROM tarea ORDER BY id_tarea');
  let esquema;
  for (let arranque = 0; arranque < 2; arranque++) {
    await inicializarEsquema();
    assert.equal((await tablas()).length, 15);
    assert.deepEqual(await contar(anteriores), conteos);
    assert.deepEqual(await select(consultaMaterias), materias);
    assert.deepEqual(await select('SELECT * FROM tarea ORDER BY id_tarea'), tareas);
    assert.deepEqual(await select('SELECT id_catalogo_materia FROM materia'), Array.from({ length: 6 }, () => ({ id_catalogo_materia: null })));
    assert.equal((await select('SELECT COUNT(*) AS n FROM catalogo_materia'))[0].n, 0);
    const actual = await select("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name");
    if (esquema) assert.deepEqual(actual, esquema);
    esquema = actual;
    assert.equal((await select('PRAGMA integrity_check'))[0].integrity_check, 'ok');
    assert.deepEqual(await select('PRAGMA foreign_key_check'), []);
  }
  const columna = (await select('PRAGMA table_info(materia)')).find(c => c.name === 'id_catalogo_materia');
  assert.equal(columna.type, 'VARCHAR(36)');
  assert.equal(columna.notnull, 0);
  const fk = (await select('PRAGMA foreign_key_list(materia)')).find(c => c.from === 'id_catalogo_materia');
  assert.equal(fk.on_delete, 'RESTRICT');
  assert.equal(fk.on_update, 'CASCADE');
  await db.query("INSERT INTO catalogo_materia (id_catalogo_materia,nombre) VALUES ('cat','Asignatura de ensayo')");
  await db.query("UPDATE materia SET id_catalogo_materia='cat' WHERE id_materia='m0'");
  await assert.rejects(db.query("DELETE FROM catalogo_materia WHERE id_catalogo_materia='cat'"), /FOREIGN KEY/i);
  await assert.rejects(db.query("INSERT INTO catalogo_materia (id_catalogo_materia,nombre,activo) VALUES ('mal','Inválida',2)"), /constraint/i);
  await assert.rejects(db.query("INSERT INTO catalogo_materia (id_catalogo_materia,nombre) VALUES ('dup','ASIGNATURA DE ENSAYO')"), /constraint/i);
  assert.deepEqual(await select('PRAGMA foreign_key_check'), []);
  console.log('✅ M1: 13 → 15 tablas; datos intactos, FK opcional, idempotencia y RESTRICT verificados');
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await db.close(); fs.rmSync(directory, { recursive: true, force: true });
});
