'use strict';

/** RF01/HU01: registros concurrentes, espera de bloqueo y respuesta segura sin abrir puertos. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const sqlite3 = require('sqlite3');
const { Transaction, TimeoutError } = require('sequelize');

const agotamiento = process.argv[2] === 'agotamiento';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-registro-concurrencia-'));
process.env.DATABASE_STORAGE = path.join(directory, 'prueba.sqlite');
if (agotamiento) process.env.SQLITE_BUSY_TIMEOUT_MS = '40';
else delete process.env.SQLITE_BUSY_TIMEOUT_MS; // Verifica también el valor predeterminado.
process.env.AUTH_EMAIL_VERIFICATION = 'false';
process.env.AUTH_EMAIL_MFA = 'off';

const db = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const auth = require('../../src/services/authService');
const router = require('../../src/routes/authRoutes');
const { errorHandler } = require('../../src/middlewares/errorHandler');
const watchdog = setTimeout(() => {
  console.error('Tiempo máximo excedido en concurrencia de registro');
  process.exit(1);
}, 45000);

async function limite(promesa, etiqueta) {
  let timer;
  try {
    return await Promise.race([promesa, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Tiempo excedido: ${etiqueta}`)), 15000);
    })]);
  } finally { clearTimeout(timer); }
}
const select = (sql, options = {}) => limite(db.query(sql, { ...options, type: db.QueryTypes.SELECT }), sql);
const datos = correo => ({
  nombre: 'Prueba Concurrente', correo, contrasena: 'ClaveSegura123!',
  materia: { id_catalogo_materia: 'catalogo-prueba' }
});
const conteos = async () => {
  const result = {};
  for (const tabla of ['cuenta', 'materia', 'preferencia_visual']) {
    result[tabla] = (await select(`SELECT COUNT(*) AS n FROM ${tabla}`))[0].n;
  }
  return result;
};

// Ejecuta la ruta real (validadores, controlador, servicio y middleware de errores)
// con petición/respuesta en memoria; no requiere listen ni sockets.
const registroApi = body => limite(new Promise((resolve, reject) => {
  const req = { method: 'POST', url: '/registro', body, headers: {} };
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(value) { resolve({ status: this.statusCode, body: value }); return this; }
  };
  router.handle(req, res, error => {
    if (!error) return reject(new Error('La ruta de registro no respondió'));
    errorHandler(error, req, res, reject);
  });
}), 'respuesta API registro');

async function conBloqueo(operacion) {
  let connection;
  let transaction = false;
  const query = sql => limite(new Promise((resolve, reject) => {
    connection.all(sql, (error, rows) => error ? reject(error) : resolve(rows));
  }), `conexión B: ${sql}`);
  const commit = async () => { await query('COMMIT'); transaction = false; };
  try {
    await limite(new Promise((resolve, reject) => {
      connection = new sqlite3.Database(process.env.DATABASE_STORAGE, error => error ? reject(error) : resolve());
    }), 'abrir conexión B');
    connection.configure('busyTimeout', 1000);
    await query('BEGIN IMMEDIATE');
    transaction = true;
    await query("INSERT INTO catalogo_materia (id_catalogo_materia,nombre,activo) VALUES ('bloqueo','Bloqueo trivial',1)");
    await operacion(commit);
  } finally {
    if (connection) {
      try { if (transaction) await query('ROLLBACK'); }
      finally {
        await limite(new Promise((resolve, reject) => {
          connection.close(error => error ? reject(error) : resolve());
        }), 'cerrar conexión B');
      }
    }
  }
}

async function hijoAgotamiento() {
  await limite(new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [__filename, 'agotamiento'], { stdio: 'inherit' });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Tiempo excedido: proceso hijo')); }, 18000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', (code, signal) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new Error(`Proceso de agotamiento: exit ${code}, señal ${signal}`));
    });
  }), 'proceso con timeout pequeño');
}

async function run() {
  assert.equal(db.options.storage, path.join(directory, 'prueba.sqlite'));
  assert.notEqual(path.resolve(db.options.storage), path.resolve('database.sqlite'));
  await limite(inicializarEsquema(), 'esquema temporal');
  assert.equal((await select('PRAGMA journal_mode'))[0].journal_mode, 'delete');
  const timeout = agotamiento ? 40 : 5000;
  assert.equal((await select('PRAGMA busy_timeout'))[0].timeout, timeout);
  await limite(db.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    assert.equal((await select('PRAGMA busy_timeout', { transaction }))[0].timeout, timeout);
  }), 'timeout de conexión transaccional');
  await db.query("INSERT INTO catalogo_materia (id_catalogo_materia,nombre,activo) VALUES ('catalogo-prueba','Prueba',1)");

  if (agotamiento) {
    const antes = await conteos();
    await conBloqueo(async () => {
      const respuesta = await registroApi(datos('agotado@test.local'));
      assert.deepEqual(respuesta, {
        status: 503, body: { error: 'La base de datos está ocupada; inténtalo de nuevo' }
      });
      assert.deepEqual(await conteos(), antes, 'sin cuenta, materia ni preferencias parciales durante bloqueo');
    });
    assert.deepEqual(await conteos(), antes, 'sin registros parciales después del bloqueo');
    const recuperado = await registroApi(datos('recuperado@test.local'));
    assert.equal(recuperado.status, 201, 'la cola sigue funcionando después del rechazo');
    assert.deepEqual(await conteos(), { cuenta: 1, materia: 1, preferencia_visual: 1 });
    // Cubre las formas residuales del driver y conserva los conflictos explícitos.
    for (const error of [new TimeoutError(new Error('detalle interno')), { code: 'SQLITE_BUSY' },
      { original: { code: 'SQLITE_BUSY' } }, { parent: { code: 'SQLITE_BUSY' } }]) {
      const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
      errorHandler(error, {}, res, () => {});
      assert.equal(res.code, 503);
      assert.deepEqual(res.body, { error: 'La base de datos está ocupada; inténtalo de nuevo' });
    }
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; } };
    errorHandler({ status: 409, message: 'Conflicto de catálogo', original: { code: 'SQLITE_BUSY' } }, {}, res, () => {});
    assert.equal(res.code, 409);
    assert.equal(res.body.error, 'Conflicto de catálogo');
    console.log('✅ Registro: bloqueo agotado → API 503 sin escrituras parciales');
  } else {
    await conBloqueo(async commit => {
      const logging = db.options.logging;
      let timer;
      let intentos = 0;
      let confirmado = false;
      let liberar;
      const liberacion = new Promise((resolve, reject) => {
        liberar = () => { commit().then(() => { confirmado = true; resolve(); }, reject); };
      });
      liberacion.catch(() => {});
      // Mantiene el bloqueo ~300 ms desde el intento de BEGIN, después de bcrypt.
      db.options.logging = sql => {
        if (/BEGIN IMMEDIATE/.test(sql)) {
          intentos++;
          if (!timer) timer = setTimeout(liberar, 300);
        }
      };
      try {
        const account = await limite(auth.register(datos('espera@test.local')), 'registro espera COMMIT');
        assert.equal(confirmado, true, 'el registro esperó al COMMIT de B');
        assert.equal(account.correo, 'espera@test.local');
        assert.equal(intentos, 1, 'busy_timeout espera sin reintentar BEGIN');
        await limite(liberacion, 'COMMIT diferido');
      } finally {
        clearTimeout(timer);
        db.options.logging = logging;
      }
    });
    const resultados = await limite(Promise.allSettled(Array.from({ length: 10 }, (_, i) =>
      auth.register(datos(`simultaneo-${i}@test.local`)))), '10 registros simultáneos');
    assert.ok(resultados.every(result => result.status === 'fulfilled'),
      `Todos los registros deben terminar bien: ${resultados.filter(result => result.status === 'rejected').map(result => result.reason)}`);
    const registros = resultados.map(result => result.value);
    assert.equal(new Set(registros.map(account => account.id_cuenta)).size, 10);
    assert.deepEqual(await conteos(), { cuenta: 11, materia: 11, preferencia_visual: 11 });
    await hijoAgotamiento();
    console.log('✅ Registro: espera de bloqueo y 10 registros simultáneos correctos');
  }
  assert.equal((await select('PRAGMA integrity_check'))[0].integrity_check, 'ok');
  assert.deepEqual(await select('PRAGMA foreign_key_check'), []);
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  try {
    await limite(db.close(), 'cerrar Sequelize');
    fs.rmSync(directory, { recursive: true, force: true });
  } finally { clearTimeout(watchdog); }
});
