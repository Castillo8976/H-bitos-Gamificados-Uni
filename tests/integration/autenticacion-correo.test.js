'use strict';
/** Bloque D opcional: SQLite aislado, transporte memoria, nunca SMTP real. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-correo-'));
process.env.DATABASE_STORAGE = path.join(directory, 'pruebas.sqlite');
process.env.AUTH_EMAIL_VERIFICATION = 'true';
process.env.AUTH_EMAIL_MFA = 'optional';
process.env.MAIL_TRANSPORT = 'memoria';
process.env.AUTH_CODE_SECRET = 'pepper-exclusivo-pruebas-correo';
process.env.JWT_SECRET = 'jwt-exclusivo-pruebas-correo';
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const Cuenta = require('../../src/models/Cuenta');
const Desafio = require('../../src/models/DesafioAutenticacion');
const auth = require('../../src/services/authService');
const desafios = require('../../src/services/desafioAutenticacionService');
const mail = require('../../src/services/mailService');
const responses = [];
const logs = [];
const originals = { log: console.log, error: console.error };
const password = 'ClaveSegura123!';
const header = token => ({ Authorization: `Bearer ${token}` });
const ultimo = () => mail.mensajes.at(-1);
const codigo = () => /\b\d{6}\b/.exec(ultimo().text)[0];
const post = async (ruta, body, status = 200, token) => {
  const result = await request(app).post(`/api/auth${ruta}`).set(token ? header(token) : {}).send(body);
  responses.push(JSON.stringify(result.body));
  assert.equal(result.status, status, `${ruta}: ${JSON.stringify(result.body)}`);
  assert.equal(Object.hasOwn(result.body, 'codigo'), false);
  assert.equal(Object.hasOwn(result.body, 'codigo_hash'), false);
  return result.body;
};
const login = (correo, status = 200) => post('/login', { correo, contrasena: password }, status);
const verificar = (desafio, code = codigo(), status = 200) => post('/correo/verificar', { desafio, codigo: code }, status);
async function run() {
  assert.ok(db.options.storage.startsWith(directory));
  assert.notEqual(path.resolve(db.options.storage), path.resolve('database.sqlite'));
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => logs.push(args.join(' '));
  await inicializarEsquema();
  await inicializarEsquema();
  const { id_catalogo_materia } = await require('../helpers/catalogo').sembrarCatalogo();
  const registro = correo => post('/registro', { nombre: 'Prueba Correo', correo, contrasena: password, materia: { id_catalogo_materia } }, 201);
  assert.deepEqual((await request(app).get('/api/auth/configuracion')).body, { verificacion_correo: true, segundo_factor: 'optional', reenvio_segundos: Number(process.env.AUTH_CODE_RESEND_COOLDOWN_SECONDS || 60) });
  // Producción falla al cargar configuración antes de abrir BD o puertos.
  assert.throws(() => execFileSync(process.execPath, ['-e', "require('./src/config/authEmail')"], {
    cwd: path.resolve(__dirname, '../..'), stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'production', AUTH_CODE_SECRET: '', MAIL_TRANSPORT: 'memoria' }
  }), error => /MAIL_TRANSPORT=smtp/.test(error.stderr.toString()));
  const primera = await registro('primera@test.local');
  assert.equal(primera.requiere_verificacion, true); assert.equal(primera.token, undefined);
  assert.equal((await Cuenta.findOne({ where: { correo: 'primera@test.local' } })).correo_verificado, false);
  const primerCodigo = codigo();
  const fila = await Desafio.findByPk(primera.desafio);
  assert.match(fila.codigo_hash, /^[a-f0-9]{64}$/);
  assert.equal(fila.codigo_hash, require('node:crypto').createHmac('sha256', process.env.AUTH_CODE_SECRET).update(`${primera.desafio}:verificar_correo:${primerCodigo}`).digest('hex'));
  const sesion = await verificar(primera.desafio, primerCodigo);
  assert.equal(typeof auth.verifyToken(sesion.token).ver, 'number');
  await verificar(primera.desafio, primerCodigo, 400); // un solo uso
  const id = sesion.cuenta.id_cuenta;
  assert.equal(sesion.cuenta.correo_verificado, true);
  await post('/registro', { nombre: 'Prueba Correo', correo: 'primera@test.local', contrasena: password, materia: { id_catalogo_materia } }, 409);
  // Sin verificar: contraseña incorrecta no envía, correcta responde 403 sin token.
  const segunda = await registro('segunda@test.local');
  const cantidad = mail.mensajes.length;
  await post('/login', { correo: 'segunda@test.local', contrasena: 'incorrecta' }, 401);
  assert.equal(mail.mensajes.length, cantidad);
  const pendiente = await login('segunda@test.local', 403);
  assert.equal(pendiente.token, undefined); assert.equal(pendiente.requiere_verificacion, true);
  await verificar(segunda.desafio, /\b\d{6}\b/.exec(mail.mensajes[cantidad - 1].text)[0], 400);
  const noVerificada = await Cuenta.findOne({ where: { correo: 'segunda@test.local' } });
  const tokenNoVerificada = auth.emitirToken(noVerificada).token; // Simula sesión anterior al activar la bandera.
  await post('/mfa', { activar: true, contrasena: password }, 403, tokenNoVerificada);
  const correcto = codigo();
  const incorrecto = correcto === '000000' ? '111111' : '000000';
  for (let i = 0; i < 5; i++) await verificar(pendiente.desafio, incorrecto, 400);
  await verificar(pendiente.desafio, correcto, 400);
  assert.ok((await Desafio.findByPk(pendiente.desafio)).consumido_en);
  assert.equal((await Desafio.findByPk(pendiente.desafio)).intentos, 5);
  const vencido = await login('segunda@test.local', 403);
  const vencidoCodigo = codigo();
  await db.query("UPDATE desafio_autenticacion SET expira_en='2000-01-01 00:00:00.000 +00:00' WHERE id_desafio=:id", { replacements: { id: vencido.desafio } });
  await verificar(vencido.desafio, vencidoCodigo, 400);
  const reenvio = await login('segunda@test.local', 403);
  let anterior = codigo(); const antesReenvio = mail.mensajes.length;
  const generico = await post('/correo/reenviar', { desafio: reenvio.desafio }, 202);
  assert.equal(mail.mensajes.length, antesReenvio); // cooldown
  assert.deepEqual(await post('/correo/reenviar', { correo: 'ausente@test.local' }, 202), generico);
  assert.deepEqual(await post('/correo/reenviar', { desafio: require('node:crypto').randomUUID() }, 202), generico);
  for (let i = 0; i < 3; i++) {
    await Desafio.update({ ultimo_envio: new Date(0) }, { where: { id_desafio: reenvio.desafio } });
    await post('/correo/reenviar', { correo: 'segunda@test.local' }, 202);
    assert.equal(mail.mensajes.length, antesReenvio + i + 1);
    assert.notEqual(codigo(), anterior);
    await verificar(reenvio.desafio, anterior, 400);
    anterior = codigo();
  }
  const ultimoCodigo = codigo();
  await Desafio.update({ ultimo_envio: new Date(0) }, { where: { id_desafio: reenvio.desafio } });
  await post('/correo/reenviar', { desafio: reenvio.desafio }, 202);
  assert.equal(mail.mensajes.length, antesReenvio + 3);
  const sesionSegunda = await verificar(reenvio.desafio, ultimoCodigo);
  // MFA: autorización, contraseña y correo verificado.
  await post('/mfa', { activar: true, contrasena: 'mala' }, 401, sesion.token);
  await post('/mfa', { activar: true, contrasena: password }, 200, sesion.token);
  const mfa = await login('primera@test.local');
  assert.equal(mfa.requiere_codigo, true); assert.equal(mfa.token, undefined);
  const codigoMfa = codigo();
  await verificar(mfa.desafio, codigoMfa, 400); // propósito incorrecto
  const acceso = await post('/login/codigo', { desafio: mfa.desafio, codigo: codigoMfa });
  assert.equal(auth.verifyToken(acceso.token).ver, 0);
  await post('/login/codigo', { desafio: mfa.desafio, codigo: codigoMfa }, 400);
  const mfaReenvio = await login('primera@test.local');
  await post('/login/codigo/reenviar', { desafio: mfaReenvio.desafio }, 429);
  await Desafio.update({ ultimo_envio: new Date(0) }, { where: { id_desafio: mfaReenvio.desafio } });
  await post('/login/codigo/reenviar', { desafio: mfaReenvio.desafio }, 202);
  // Desactivar la cuenta invalida el token final con ver.
  await request(app).delete(`/api/cuentas/${id}`).set(header(acceso.token)).expect(204);
  await request(app).get('/api/auth/perfil').set(header(acceso.token)).expect(401);
  await Cuenta.update({ activa: true }, { where: { id_cuenta: id } });
  await request(app).get('/api/auth/perfil').set(header(acceso.token)).expect(401);
  await Cuenta.update({ rol: 'Administrador' }, { where: { id_cuenta: sesionSegunda.cuenta.id_cuenta } });
  const admin = (await login('segunda@test.local')).token;
  await request(app).patch(`/api/cuentas/${id}/seguridad`).set(header(admin)).send({ mfa_correo: true }).expect(400);
  const recuperacion = await request(app).patch(`/api/cuentas/${id}/seguridad`).set(header(admin)).send({ mfa_correo: false, correo_verificado: true }).expect(200);
  assert.equal(recuperacion.body.dato.mfa_correo, false);
  const recuperado = (await login('primera@test.local')).token;
  await post('/mfa', { activar: false, contrasena: 'mala' }, 401, recuperado);
  await post('/mfa', { activar: false, contrasena: password }, 200, recuperado);
  await request(app).patch(`/api/cuentas/${id}/seguridad`).set(header(recuperado)).send({ mfa_correo: false }).expect(403);
  await request(app).put(`/api/cuentas/${id}`).set(header(recuperado)).send({ correo: 'nuevo@test.local' }).expect(400);
  // Duplicados sin desafío ni cambios parciales.
  const count = await Desafio.count();
  await post('/correo/cambio', { correo_nuevo: 'segunda@test.local', contrasena: password }, 409, recuperado);
  assert.equal(await Desafio.count(), count);
  const cambio = await post('/correo/cambio', { correo_nuevo: 'nuevo@test.local', contrasena: password }, 202, recuperado);
  const codigoCambio = codigo();
  assert.equal(ultimo().to, 'nuevo@test.local');
  await post('/correo/cambio/confirmar', { desafio: cambio.desafio, codigo: codigoCambio }, 400, admin); // cuenta ajena
  await post('/login/codigo', { desafio: cambio.desafio, codigo: codigoCambio }, 400);
  // Carrera: dirección ocupada después de iniciar el desafío, rollback del consumo.
  await Cuenta.update({ correo: 'nuevo@test.local' }, { where: { id_cuenta: sesionSegunda.cuenta.id_cuenta } });
  await post('/correo/cambio/confirmar', { desafio: cambio.desafio, codigo: codigoCambio }, 409, recuperado);
  assert.equal((await Desafio.findByPk(cambio.desafio)).consumido_en, null);
  assert.equal((await Cuenta.findByPk(id)).correo, 'primera@test.local');
  await Cuenta.update({ correo: 'segunda@test.local' }, { where: { id_cuenta: sesionSegunda.cuenta.id_cuenta } });
  const cambiado = await post('/correo/cambio/confirmar', { desafio: cambio.desafio, codigo: codigoCambio }, 200, recuperado);
  assert.equal(cambiado.cuenta.correo, 'nuevo@test.local');
  assert.equal(ultimo().to, 'primera@test.local'); assert.doesNotMatch(ultimo().text, /\b\d{6}\b/);
  await request(app).get('/api/auth/perfil').set(header(recuperado)).expect(401);
  await request(app).get('/api/auth/perfil').set(header(cambiado.token)).expect(200);
  // Fallo del adaptador memoria: ejercita la traducción segura del proveedor sin SMTP ni Internet.
  const guardarMensaje = mail.mensajes.push;
  const envioFallido = () => { throw new Error('proveedor caído: detalle privado que no debe salir'); };
  mail.mensajes.push = envioFallido;
  try {
    const antes = await Desafio.count();
    await post('/registro', { nombre: 'Fallo Proveedor', correo: 'fallo@test.local', contrasena: password, materia: { id_catalogo_materia } }, 503);
    assert.equal(await Desafio.count(), antes);
    assert.equal((await Cuenta.findOne({ where: { correo: 'fallo@test.local' } })).correo_verificado, false);
    const falloLogin = await login('fallo@test.local', 503); assert.equal(falloLogin.token, undefined);
    assert.equal(await Desafio.count(), antes);
    assert.equal(await Desafio.count({ where: { id_cuenta: (await Cuenta.findOne({ where: { correo: 'fallo@test.local' } })).id_cuenta, consumido_en: null } }), 0);
    await post('/mfa', { activar: true, contrasena: password }, 200, cambiado.token);
    await login('nuevo@test.local', 503);
    assert.equal(await Desafio.count(), antes);
    assert.equal(await Desafio.count({ where: { id_cuenta: id, consumido_en: null } }), 0);
    // Fallo de aviso revierte correo, versión y consumo.
    mail.mensajes.push = guardarMensaje;
    const porFallar = await post('/correo/cambio', { correo_nuevo: 'rollback@test.local', contrasena: password }, 202, cambiado.token);
    const codigoPorFallar = codigo();
    mail.mensajes.push = envioFallido;
    await post('/correo/cambio/confirmar', { desafio: porFallar.desafio, codigo: codigoPorFallar }, 503, cambiado.token);
    assert.equal((await Cuenta.findByPk(id)).correo, 'nuevo@test.local');
    assert.equal((await Desafio.findByPk(porFallar.desafio)).consumido_en, null);
    await request(app).get('/api/auth/perfil').set(header(cambiado.token)).expect(200);
  } finally { mail.mensajes.push = guardarMensaje; }
  // Reenvío recupera un registro cuyo primer envío falló.
  await post('/correo/reenviar', { correo: 'fallo@test.local' }, 202);
  assert.equal(ultimo().to, 'fallo@test.local');
  // Un nuevo desafío invalida los previos; consumo concurrente entrega un único token.
  const falloCuenta = await Cuenta.findOne({ where: { correo: 'fallo@test.local' } });
  const nuevo = await desafios.crear(falloCuenta, 'verificar_correo'); const nuevoCodigo = codigo();
  const resultados = await Promise.allSettled([1, 2].map(() => desafios.consumir(nuevo.desafio, nuevoCodigo, 'verificar_correo', falloCuenta.id_cuenta,
    (cuenta, _d, transaction) => cuenta.update({ correo_verificado: true }, { transaction }))));
  assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
  // Rate limit por IP+correo.
  for (let i = 0; i < 10; i++) await post('/login', { correo: 'limite@test.local', contrasena: 'incorrecta' }, 401);
  await post('/login', { correo: 'limite@test.local', contrasena: 'incorrecta' }, 429);
  // Apagar banderas conserva el login tradicional incluso con MFA enrolado.
  process.env.AUTH_EMAIL_VERIFICATION = 'false'; process.env.AUTH_EMAIL_MFA = 'off';
  assert.ok((await login('nuevo@test.local')).token);
  assert.ok((await login('fallo@test.local')).token);
  assert.deepEqual((await request(app).get('/api/auth/configuracion')).body, { verificacion_correo: false, segundo_factor: 'off', reenvio_segundos: Number(process.env.AUTH_CODE_RESEND_COOLDOWN_SECONDS || 60) });
  await post('/correo/verificar', { desafio: nuevo.desafio, codigo: nuevoCodigo }, 404);
  assert.deepEqual(await db.query('PRAGMA foreign_key_check', { type: db.QueryTypes.SELECT }), []);
  for (const mensaje of mail.mensajes) {
    const code = /\b\d{6}\b/.exec(mensaje.text)?.[0];
    if (code) {
      assert.ok(responses.every(response => !response.includes(code)), 'código en respuesta HTTP');
      assert.ok(logs.every(line => !line.includes(code)), 'código en consola');
    }
  }
  assert.ok(responses.every(response => !response.includes('codigo_hash') && !response.includes('detalle privado')));
  assert.ok(logs.every(line => !line.includes('detalle privado')));
}
run().then(() => originals.log('✅ Bloque D: verificación, MFA, cambio, recuperación, límites y rollback verificados'))
  .catch(error => { originals.error(error); process.exitCode = 1; })
  .finally(async () => { console.log = originals.log; console.error = originals.error; await db.close(); fs.rmSync(directory, { recursive: true, force: true }); });
