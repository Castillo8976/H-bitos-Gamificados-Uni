'use strict';

/** RF09/HU16/RN26 · D-2: asociaciones serializadas frente a desactivaciones, sin HTTP. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-materia-concurrencia-'));
process.env.DATABASE_STORAGE = path.join(directory, 'prueba.sqlite');
process.env.SQLITE_BUSY_TIMEOUT_MS = '0';

const sqlite3 = require('sqlite3');
const db = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const materia = require('../../src/services/materiaService');
const catalogo = require('../../src/services/catalogoMateriaService');
const materiaCrud = require('../../src/crud/materiaCrud');
const catalogoCrud = require('../../src/crud/catalogoMateriaCrud');
const HttpError = require('../../src/middlewares/httpError');

// El watchdog también limita las esperas de limpieza si un driver no devuelve su callback.
const watchdog = setTimeout(() => {
  console.error('Tiempo máximo excedido en la prueba de concurrencia');
  process.exit(1);
}, 40000);
async function limite(promesa, etiqueta) {
  let timer;
  try {
    return await Promise.race([promesa, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Tiempo excedido: ${etiqueta}`)), 8000);
    })]);
  } finally { clearTimeout(timer); }
}
const select = sql => limite(db.query(sql, { type: db.QueryTypes.SELECT }), sql);
const sql = (consulta, replacements) => limite(db.query(consulta, { replacements }), consulta);
const conteos = async () => ({
  materias: (await select('SELECT COUNT(*) AS n FROM materia'))[0].n,
  catalogo: (await select('SELECT COUNT(*) AS n FROM catalogo_materia'))[0].n
});
const fila = async id => (await limite(db.query(
  'SELECT nombre,id_catalogo_materia,horario,activa FROM materia WHERE id_materia = :id',
  { replacements: { id }, type: db.QueryTypes.SELECT }), 'leer materia'))[0];
const conflicto = operacion => assert.rejects(limite(operacion, 'conflicto 409'), error =>
  error instanceof HttpError && error.status === 409);
const diferida = () => {
  let resolver;
  const promesa = new Promise(resolve => { resolver = resolve; });
  return { promesa, resolver };
};

async function run() {
  assert.equal(db.options.storage, process.env.DATABASE_STORAGE);
  assert.notEqual(path.resolve(db.options.storage), path.resolve('database.sqlite'));
  await limite(inicializarEsquema(), 'inicializar esquema temporal');
  assert.equal((await select('PRAGMA journal_mode'))[0].journal_mode, 'delete');
  await sql("INSERT INTO cuenta (id_cuenta,nombre,correo,contrasena_hash) VALUES ('cuenta','Prueba','concurrencia@test.local','hash')");
  await sql("INSERT INTO catalogo_materia (id_catalogo_materia,nombre,activo) VALUES ('activa','Activa',1),('inactiva','Inactiva',0),('otra','Otra',1)");

  const creada = await limite(materia.crearDesdeCatalogo('cuenta', 'activa', 'Lunes'), 'crear activa');
  assert.deepEqual(await fila(creada.id_materia), {
    nombre: 'Activa', id_catalogo_materia: 'activa', horario: 'Lunes', activa: 1
  });
  const iniciales = await conteos();
  await conflicto(materia.crearDesdeCatalogo('cuenta', 'inactiva'));
  await conflicto(materia.actualizarDesdeCatalogo(creada.id_materia, { id_catalogo_materia: 'inactiva', horario: 'No guardar' }));
  assert.deepEqual(await conteos(), iniciales);
  assert.equal((await fila(creada.id_materia)).horario, 'Lunes');
  await limite(materia.actualizarDesdeCatalogo(creada.id_materia, { id_catalogo_materia: 'otra', horario: 'Martes' }), 'cambiar asignatura activa');
  assert.deepEqual(await fila(creada.id_materia), {
    nombre: 'Otra', id_catalogo_materia: 'otra', horario: 'Martes', activa: 1
  });

  await sql("INSERT INTO materia (id_materia,id_cuenta,nombre,id_catalogo_materia,horario) VALUES ('historica','cuenta','Nombre histórico',NULL,'Anterior')");
  await limite(materia.actualizarDesdeCatalogo('historica', { horario: 'Viernes' }), 'editar horario histórico');
  assert.deepEqual(await fila('historica'), {
    nombre: 'Nombre histórico', id_catalogo_materia: null, horario: 'Viernes', activa: 1
  });
  await limite(materia.actualizarDesdeCatalogo('historica', { activa: false }), 'archivar histórica');
  assert.deepEqual(await fila('historica'), {
    nombre: 'Nombre histórico', id_catalogo_materia: null, horario: 'Viernes', activa: 0
  });
  await limite(catalogo.cambiarEstado('otra', false), 'desactivar existente');
  await limite(materia.actualizarDesdeCatalogo(creada.id_materia, { id_catalogo_materia: 'otra', horario: 'Jueves' }), 'conservar vínculo inactivo');
  assert.deepEqual(await fila(creada.id_materia), {
    nombre: 'Otra', id_catalogo_materia: 'otra', horario: 'Jueves', activa: 1
  });
  await limite(catalogo.cambiarEstado('otra', true), 'reactivar');
  assert.equal((await catalogo.obtener('otra')).activo, true);

  // Fallo DESPUÉS de escribir: demuestra rollback real y propagación de errores ajenos a BUSY.
  // Las sustituciones se restauran antes de continuar y no cambian módulos de producción.
  const fallo = new Error('Fallo controlado posterior a escritura');
  for (const [crud, metodo, operacion] of [
    [materiaCrud, 'crearMateria', () => materia.crearDesdeCatalogo('cuenta', 'activa')],
    [materiaCrud, 'actualizarMateria', () => materia.actualizarDesdeCatalogo(creada.id_materia, { id_catalogo_materia: 'activa' })],
    [catalogoCrud, 'actualizar', () => catalogo.cambiarEstado('activa', false)]
  ]) {
    const antes = await conteos();
    const anterior = await fila(creada.id_materia);
    const original = crud[metodo];
    crud[metodo] = async (...args) => { await original(...args); throw fallo; };
    try {
      await assert.rejects(limite(operacion(), `rollback ${metodo}`), error => error === fallo);
    } finally { crud[metodo] = original; }
    assert.deepEqual(await conteos(), antes);
    assert.deepEqual(await fila(creada.id_materia), anterior);
    assert.equal((await catalogo.obtener('activa')).activo, true);
  }

  let conexionB;
  let transaccionB = false;
  const consultaB = consulta => limite(new Promise((resolve, reject) => {
    conexionB.all(consulta, (error, rows) => error ? reject(error) : resolve(rows));
  }), `B: ${consulta}`);
  try {
    await limite(new Promise((resolve, reject) => {
      conexionB = new sqlite3.Database(process.env.DATABASE_STORAGE, error => error ? reject(error) : resolve());
    }), 'abrir conexión independiente B');
    // Sin espera de bloqueo en B; no se activa WAL ni se cambia la configuración de la app.
    conexionB.configure('busyTimeout', 0);
    assert.equal((await consultaB('PRAGMA busy_timeout'))[0].timeout, 0);
    assert.equal((await consultaB('PRAGMA journal_mode'))[0].journal_mode, 'delete');
    const antes = await conteos();
    const ordenA = [];
    await consultaB('BEGIN IMMEDIATE');
    transaccionB = true;
    ordenA.push('B BEGIN IMMEDIATE');
    await consultaB("UPDATE catalogo_materia SET activo=0 WHERE id_catalogo_materia='activa'");
    ordenA.push('B UPDATE sin COMMIT');
    await conflicto(materia.crearDesdeCatalogo('cuenta', 'activa'));
    ordenA.push('app crear → 409 por bloqueo');
    await conflicto(materia.actualizarDesdeCatalogo(creada.id_materia, { id_catalogo_materia: 'activa' }));
    await conflicto(catalogo.cambiarEstado('otra', false));
    assert.deepEqual(await conteos(), antes);
    await consultaB('COMMIT');
    transaccionB = false;
    ordenA.push('B COMMIT');
    await assert.rejects(limite(materia.crearDesdeCatalogo('cuenta', 'activa'), 'rechazar inactiva confirmada'), error =>
      error instanceof HttpError && error.status === 409 && /inactiva/.test(error.message));
    ordenA.push('app crear → 409 por inactiva');
    assert.deepEqual(await conteos(), antes);
    console.log('Orden a):', ordenA.join(' → '));

    await limite(catalogo.cambiarEstado('activa', true), 'preparar orden b');
    const ordenB = [];
    const entrada = diferida();
    const continuar = diferida();
    const original = catalogo.obtenerActiva;
    let pendiente;
    catalogo.obtenerActiva = async (id, transaction, ...args) => {
      assert.equal(transaction.options.type, 'IMMEDIATE');
      const asignatura = await original(id, transaction, ...args);
      ordenB.push('app BEGIN IMMEDIATE y lectura activa');
      entrada.resolver();
      await limite(continuar.promesa, 'liberar asociación');
      return asignatura;
    };
    try {
      pendiente = materia.crearDesdeCatalogo('cuenta', 'activa', 'Miércoles');
      // Registrar el rechazo inmediatamente evita rechazos no manejados si falla la barrera.
      pendiente.catch(() => {});
      await limite(Promise.race([entrada.promesa, pendiente.then(() => {
        throw new Error('La creación terminó sin alcanzar el punto de espera');
      })]), 'esperar transacción IMMEDIATE de app');
      await assert.rejects(consultaB("UPDATE catalogo_materia SET activo=0 WHERE id_catalogo_materia='activa'"), error => error.code === 'SQLITE_BUSY');
      ordenB.push('B UPDATE → SQLITE_BUSY');
      assert.equal((await consultaB("SELECT activo FROM catalogo_materia WHERE id_catalogo_materia='activa'"))[0].activo, 1);
      continuar.resolver();
      const asociada = await limite(pendiente, 'confirmar asociación');
      ordenB.push('app INSERT y COMMIT');
      const guardada = await fila(asociada.id_materia);
      assert.deepEqual(guardada, {
        nombre: 'Activa', id_catalogo_materia: 'activa', horario: 'Miércoles', activa: 1
      });
      assert.deepEqual(await conteos(), { ...antes, materias: antes.materias + 1 });
      await consultaB("UPDATE catalogo_materia SET activo=0 WHERE id_catalogo_materia='activa'");
      ordenB.push('B UPDATE confirmado');
      assert.equal((await catalogo.obtener('activa')).activo, false);
      assert.deepEqual(await fila(asociada.id_materia), guardada, 'desactivar no invalida la materia existente');
      await limite(materia.actualizarDesdeCatalogo(asociada.id_materia, { horario: 'Sábado', activa: false }), 'editar tras desactivación');
      assert.deepEqual(await fila(asociada.id_materia), { ...guardada, horario: 'Sábado', activa: 0 });
      console.log('Orden b):', ordenB.join(' → '));
    } finally {
      continuar.resolver();
      catalogo.obtenerActiva = original;
      if (pendiente) await limite(pendiente.catch(() => {}), 'terminar asociación pendiente');
    }
  } finally {
    if (conexionB) {
      try { if (transaccionB) await consultaB('ROLLBACK'); }
      finally {
        await limite(new Promise((resolve, reject) => {
          conexionB.close(error => error ? reject(error) : resolve());
        }), 'cerrar conexión B');
      }
    }
  }
  assert.equal((await select('PRAGMA integrity_check'))[0].integrity_check, 'ok');
  assert.deepEqual(await select('PRAGMA foreign_key_check'), []);
  console.log('✅ Catálogo/materias: reglas, ambos órdenes de concurrencia, rollback e integridad');
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  try {
    await limite(db.close(), 'cerrar app');
    fs.rmSync(directory, { recursive: true, force: true });
  } finally { clearTimeout(watchdog); }
});
