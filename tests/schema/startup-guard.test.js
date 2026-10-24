'use strict';

/** Arranque seguro: una base existente con migraciones pendientes no se modifica al iniciar el
 * servidor; `npm run db:migrate` la actualiza de forma explícita. Usa SQLite temporal.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const storage = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-arranque-')), 'database.sqlite');
process.env.DATABASE_STORAGE = storage;

const sequelize = require('../../src/database');
const { inicializarEsquema, migracionesPendientes } = require('../../src/config/schema');
const raiz = path.join(__dirname, '..', '..');
const huella = () => crypto.createHash('sha256').update(fs.readFileSync(storage)).digest('hex');
const ejecutar = (args, env = {}) => spawnSync(process.execPath, args, { cwd: raiz, encoding: 'utf8', timeout: 20000, env: { ...process.env, DATABASE_STORAGE: storage, PORT: '0', ...env } });

async function run() {
  assert.deepEqual(await migracionesPendientes(), [], 'una base nueva no tiene migraciones pendientes');
  await inicializarEsquema();
  assert.deepEqual(await migracionesPendientes(), []);
  // Simula una base anterior al Bloque D.
  await sequelize.query('DROP TABLE desafio_autenticacion');
  assert.deepEqual(await migracionesPendientes(), ['tabla desafio_autenticacion']);
  await sequelize.close();

  const antes = huella();
  const arranque = ejecutar(['src/server.js']);
  assert.equal(arranque.status, 1);
  assert.match(arranque.stderr, /requiere migraciones \(tabla desafio_autenticacion\).*npm run db:migrate/);
  assert.equal(huella(), antes, 'el arranque rechazado no modifica la base');

  const migracion = ejecutar(['scripts/migrar-base.js']);
  assert.equal(migracion.status, 0, migracion.stderr);
  assert.match(migracion.stdout, /15 tablas, integridad ok/);
  const repetida = ejecutar(['scripts/migrar-base.js']);
  assert.match(repetida.stdout, /Sin migraciones pendientes/);
  console.log('✅ Arranque seguro: sin migraciones implícitas; db:migrate explícito e idempotente');
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => sequelize.close().catch(() => {}));
