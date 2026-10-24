'use strict';

/** RF01/HU27/HU30/RN27 · Decisión #08: los JWT anteriores a una desactivación siguen
 * inválidos tras reactivar y tras reiniciar el servidor; desactivaciones simultáneas
 * incrementan `version_sesion` una sola vez. Usa SQLite temporal.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const esHijo = process.argv[2] === 'reinicio';
if (!esHijo) {
  process.env.DATABASE_STORAGE = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-sesiones-')), 'database.sqlite');
  process.env.JWT_SECRET = 'secreto-pruebas-version-sesion';
}

const request = require('supertest');
const sequelize = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const app = require('../../src/app');
const Cuenta = require('../../src/models/Cuenta');
const cuentas = require('../../src/services/cuentaService');

const auth = token => ({ Authorization: `Bearer ${token}` });
const perfil = async token => (await request(app).get('/api/auth/perfil').set(auth(token))).status;
const login = async correo => (await request(app).post('/api/auth/login').send({ correo, contrasena: 'ClaveSegura123!' }).expect(200)).body.token;

/** Proceso nuevo: memoria vacía (sin revocaciones) y misma BD; simula un reinicio del servidor. */
async function verificarTrasReinicio() {
  const tokens = JSON.parse(process.argv[3]);
  const estados = {};
  for (const [nombre, token] of Object.entries(tokens)) estados[nombre] = await perfil(token);
  process.stdout.write(JSON.stringify(estados));
}

async function run() {
  await inicializarEsquema();
  for (const [nombre, correo] of [['Estudiante Sesiones', 'sesiones@test.local'], ['Admin Sesiones', 'admin-sesiones@test.local']]) {
    await request(app).post('/api/auth/registro').send({ nombre, correo, contrasena: 'ClaveSegura123!', materia: { nombre: 'Materia' } }).expect(201);
  }
  await Cuenta.update({ rol: 'Administrador' }, { where: { correo: 'admin-sesiones@test.local' } });
  const id = (await Cuenta.findOne({ where: { correo: 'sesiones@test.local' } })).id_cuenta;
  const admin = await login('admin-sesiones@test.local');

  // Dos sesiones: desactivar desde una invalida ambas, también después de reactivar.
  const sesionA = await login('sesiones@test.local');
  const sesionB = await login('sesiones@test.local');
  await request(app).delete(`/api/cuentas/${id}`).set(auth(sesionA)).expect(204);
  await request(app).put(`/api/cuentas/${id}`).set(auth(admin)).send({ activa: true }).expect(200);
  assert.deepEqual([await perfil(sesionA), await perfil(sesionB)], [401, 401]);
  const sesionNueva = await login('sesiones@test.local');
  assert.equal(await perfil(sesionNueva), 200);

  // Reinicio: un proceso nuevo rechaza los tokens anteriores y acepta el emitido tras reactivar.
  const salida = execFileSync(process.execPath, [__filename, 'reinicio', JSON.stringify({ sesionA, sesionB, sesionNueva })], {
    env: { ...process.env }, encoding: 'utf8'
  });
  assert.deepEqual(JSON.parse(salida.trim().split('\n').pop()), { sesionA: 401, sesionB: 401, sesionNueva: 200 });

  // Concurrencia: varias desactivaciones simultáneas realizan una sola transición.
  const versionAntes = (await Cuenta.findByPk(id)).version_sesion;
  const resultados = await Promise.all(Array.from({ length: 10 }, () => cuentas.desactivarCuenta(id)));
  assert.equal(resultados.filter(Boolean).length, 1);
  assert.equal((await Cuenta.findByPk(id)).version_sesion, versionAntes + 1);
  await request(app).delete(`/api/cuentas/${id}`).set(auth(admin)).expect(204);
  assert.equal((await Cuenta.findByPk(id)).version_sesion, versionAntes + 1, 'una cuenta ya inactiva no incrementa de nuevo');

  console.log('✅ Versión de sesión: dos sesiones, reactivación, reinicio y concurrencia verificados');
}

(esHijo ? verificarTrasReinicio() : run())
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => sequelize.close());
