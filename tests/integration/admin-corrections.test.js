'use strict';

/** RF05/RF07/HU26: correcciones autorizadas, duplicados y rollback real en SQLite.
 * El trigger de fallo existe únicamente en la BD temporal de esta prueba.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-correcciones-'));
process.env.DATABASE_STORAGE = path.join(directory, 'database.sqlite');
const sequelize = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const auth = require('../../src/services/authService');
const correcciones = require('../../src/services/correccionAdministrativaService');
const Cuenta = require('../../src/models/Cuenta');
const Punto = require('../../src/models/Punto');
const CuentaInsignia = require('../../src/models/CuentaInsignia');
const Notificacion = require('../../src/models/Notificacion');

/** RF05/RF07/HU26: confirma estado completo antes/después de un fallo del aviso. */
async function fallaSinCambiar(operacion) {
  const snapshot = async () => ({
    puntos: await Punto.findAll({ raw: true, order: [['id_punto', 'ASC']] }),
    insignias: await CuentaInsignia.findAll({ raw: true, order: [['id_insignia', 'ASC']] }),
    avisos: await Notificacion.findAll({ raw: true, order: [['id_notificacion', 'ASC']] })
  });
  const antes = await snapshot();
  await sequelize.query("CREATE TRIGGER fallo_aviso BEFORE INSERT ON notificacion BEGIN SELECT RAISE(ABORT, 'fallo controlado aviso'); END");
  try { await assert.rejects(operacion); }
  finally { await sequelize.query('DROP TRIGGER fallo_aviso'); }
  assert.deepEqual(await snapshot(), antes);
}

/** RF05/RF07/HU26: cubre las cuatro correcciones expuestas por la API. */
async function run() {
  await inicializarEsquema();
  const estudiante = await auth.register({ nombre: 'Estudiante', correo: 'estudiante@test.local', contrasena: 'Clave123!', materia: { nombre: 'Materia' } });
  const administrador = await auth.register({ nombre: 'Admin', correo: 'admin@test.local', contrasena: 'Clave123!', materia: { nombre: 'Materia' } });
  await Cuenta.update({ rol: 'Administrador' }, { where: { id_cuenta: administrador.id_cuenta } });
  const actor = administrador.id_cuenta;
  const destino = estudiante.id_cuenta;
  const datos = { id_cuenta: destino, cantidad: 10, origen: 'Sesion', motivo: 'Corregir omisión comprobada' };

  await assert.rejects(correcciones.otorgarPuntos(destino, datos), error => error.status === 403);
  await assert.rejects(correcciones.otorgarPuntos(actor, { ...datos, motivo: ' ' }), error => error.status === 400);
  await assert.rejects(correcciones.otorgarPuntos(actor, { ...datos, motivo: 'x'.repeat(200) }), error => error.status === 400);
  await assert.rejects(correcciones.otorgarPuntos(actor, { ...datos, cantidad: -1 }), error => error.status === 400);
  await assert.rejects(correcciones.otorgarPuntos(actor, { ...datos, id_cuenta: 'no-existe' }), error => error.status === 404);
  assert.equal(await Notificacion.count(), 0);

  await fallaSinCambiar(() => correcciones.otorgarPuntos(actor, datos));
  const punto = await correcciones.otorgarPuntos(actor, datos);
  assert.equal(await Punto.count(), 1);
  let aviso = await Notificacion.findOne();
  assert.ok(aviso.mensaje.includes(actor));
  assert.ok(aviso.mensaje.endsWith(datos.motivo));
  await fallaSinCambiar(() => correcciones.retirarPuntos(actor, punto.id_punto, 'Duplicidad verificada'));
  await correcciones.retirarPuntos(actor, punto.id_punto, 'Duplicidad verificada');
  assert.equal(await Punto.count(), 0);
  assert.equal(await Notificacion.count(), 2);
  await assert.rejects(correcciones.retirarPuntos(actor, punto.id_punto, 'Ya retirado'), error => error.status === 404);
  assert.equal(await Notificacion.count(), 2);

  await fallaSinCambiar(() => correcciones.asignarInsignia(actor, destino, 'ins-001', 'Omisión verificada'));
  const resultado = await correcciones.asignarInsignia(actor, destino, 'ins-001', 'Omisión verificada');
  assert.equal(resultado.desbloqueada, true);
  assert.equal(await CuentaInsignia.count(), 1);
  await assert.rejects(correcciones.asignarInsignia(actor, destino, 'ins-001', 'Duplicada'), error => error.status === 409);
  assert.equal(await Notificacion.count(), 3);
  await fallaSinCambiar(() => correcciones.revocarInsignia(actor, destino, 'ins-001', 'Asignación incorrecta'));
  await correcciones.revocarInsignia(actor, destino, 'ins-001', 'Asignación incorrecta');
  assert.equal(await CuentaInsignia.count(), 0);
  assert.equal(await Notificacion.count(), 4);
  await assert.rejects(correcciones.revocarInsignia(actor, destino, 'ins-001', 'Ya retirada'), error => error.status === 404);
  await Cuenta.update({ activa: false }, { where: { id_cuenta: actor } });
  await assert.rejects(correcciones.otorgarPuntos(actor, datos), error => error.status === 403);
  assert.equal(await Notificacion.count(), 4);
  const errores = await sequelize.query('PRAGMA foreign_key_check', { type: sequelize.QueryTypes.SELECT });
  assert.deepEqual(errores, []);
  console.log('✅ HU26: cuatro correcciones atómicas, rollback, permisos y duplicados');
}

(async () => {
  try { await run(); }
  catch (error) { console.error(error); process.exitCode = 1; }
  finally { await sequelize.close(); fs.rmSync(directory, { recursive: true, force: true }); }
})();
