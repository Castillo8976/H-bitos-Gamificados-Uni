'use strict';
/** Bloque D: ampliación opcional, sin asignar RF/HU aprobados inexistentes. */
const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const Cuenta = require('../models/Cuenta');
const crud = require('../crud/desafioAutenticacionCrud');
const mail = require('./mailService');
const { configuration } = require('../config/authEmail');
const HttpError = require('../middlewares/httpError');
const GENERICO = { mensaje: 'Si corresponde, recibirás instrucciones en tu correo' };
function habilitado(proposito) {
  const config = configuration();
  if (proposito === 'segundo_factor' ? config.segundo_factor !== 'optional' : !config.verificacion_correo) {
    throw new HttpError(404, 'Función de correo no disponible');
  }
}
function hash(id, proposito, codigo) {
  return crypto.createHmac('sha256', configuration().secret).update(`${id}:${proposito}:${codigo}`).digest('hex');
}
async function enviar(desafio, cuenta, codigo) {
  await mail.enviar({ to: desafio.destino || cuenta.correo, subject: 'StudyQuest: código de acceso',
    text: `Tu código de StudyQuest es ${codigo}. Caduca en ${configuration().ttl} minutos.\nDesafío: ${desafio.id_desafio}` });
}
async function nuevoEnTransaccion(cuenta, proposito, destino, transaction) {
  await crud.invalidar(cuenta.id_cuenta, proposito, transaction);
  const id = crypto.randomUUID();
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const now = new Date();
  const desafio = await crud.crear({ id_desafio: id, id_cuenta: cuenta.id_cuenta, proposito,
    codigo_hash: hash(id, proposito, codigo), destino: destino || null,
    ultimo_envio: now, creado_en: now, expira_en: new Date(now.getTime() + configuration().ttl * 60000)
  }, transaction);
  await enviar(desafio, cuenta, codigo); // Fallo: rollback, incluido el desafío anterior.
  return { desafio: id };
}
async function crear(cuenta, proposito, destino) {
  habilitado(proposito);
  return crud.transaccion(transaction => nuevoEnTransaccion(cuenta, proposito, destino, transaction));
}
/** Los fallos de código se guardan antes de lanzar el error para no revertir los intentos. */
async function consumir(id, codigo, proposito, idCuenta, efecto, correo) {
  habilitado(proposito);
  const result = await crud.transaccion(async transaction => {
    let desafio;
    if (!id && proposito === 'verificar_correo' && correo) {
      const cuenta = await Cuenta.findOne({ where: { correo: correo.trim().toLowerCase(), activa: true, correo_verificado: false }, transaction });
      if (cuenta) {
        const Desafio = require('../models/DesafioAutenticacion');
        desafio = await Desafio.findOne({ where: { id_cuenta: cuenta.id_cuenta, proposito, consumido_en: null }, order: [['creado_en', 'DESC']], transaction });
        id = desafio?.id_desafio;
      }
    } else if (id) desafio = await crud.obtener(id, transaction);
    if (!desafio || desafio.proposito !== proposito || (idCuenta && desafio.id_cuenta !== idCuenta)) {
      return { error: new HttpError(400, 'Código incorrecto o desafío no disponible') };
    }
    const cuenta = await Cuenta.findByPk(desafio.id_cuenta, { transaction });
    if (!cuenta || !cuenta.activa || desafio.consumido_en || desafio.intentos >= configuration().attempts) {
      return { error: new HttpError(400, 'Desafío no disponible o demasiados intentos; solicita otro código') };
    }
    if (desafio.expira_en.getTime() <= Date.now()) return { error: new HttpError(400, 'Código vencido; solicita otro código') };
    const esperado = Buffer.from(desafio.codigo_hash, 'hex');
    const recibido = Buffer.from(hash(id, proposito, codigo), 'hex');
    if (esperado.length !== recibido.length || !crypto.timingSafeEqual(esperado, recibido)) {
      const intentos = desafio.intentos + 1;
      await desafio.update({ intentos, ...(intentos >= configuration().attempts ? { consumido_en: new Date() } : {}) }, { transaction });
      return { error: new HttpError(400, intentos >= configuration().attempts ? 'Demasiados intentos; solicita otro código' : 'Código incorrecto') };
    }
    await efecto(cuenta, desafio, transaction);
    await desafio.update({ consumido_en: new Date() }, { transaction });
    return { cuenta };
  });
  if (result.error) throw result.error;
  return result.cuenta;
}
async function reenviar({ desafio: id, correo }, proposito) {
  habilitado(proposito);
  const generico = proposito === 'verificar_correo';
  await crud.transaccion(async transaction => {
    let desafio;
    if (id) desafio = await crud.obtener(id, transaction);
    else if (correo) {
      const cuenta = await Cuenta.findOne({ where: { correo: correo.trim().toLowerCase(), correo_verificado: false, activa: true }, transaction });
      if (!cuenta) return;
      const Desafio = require('../models/DesafioAutenticacion');
      desafio = await Desafio.findOne({ where: { id_cuenta: cuenta.id_cuenta, proposito }, order: [['creado_en', 'DESC']], transaction });
      if (!desafio) { await nuevoEnTransaccion(cuenta, proposito, null, transaction); return; }
    }
    if (!desafio || desafio.proposito !== proposito || desafio.consumido_en || desafio.intentos >= configuration().attempts) {
      if (!generico) throw new HttpError(400, 'Desafío no disponible');
      return;
    }
    const cuenta = await Cuenta.findByPk(desafio.id_cuenta, { transaction });
    if (!cuenta?.activa || (generico && cuenta.correo_verificado)) return;
    const config = configuration();
    if (desafio.reenvios >= config.resends || Date.now() - desafio.ultimo_envio.getTime() < config.cooldown * 1000) {
      if (!generico) throw new HttpError(429, 'Espera antes de reenviar o solicita un desafío nuevo');
      return;
    }
    let codigo;
    do { codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }
    while (hash(desafio.id_desafio, proposito, codigo) === desafio.codigo_hash);
    await desafio.update({ codigo_hash: hash(desafio.id_desafio, proposito, codigo), reenvios: desafio.reenvios + 1,
      ultimo_envio: new Date(), expira_en: new Date(Date.now() + config.ttl * 60000) }, { transaction });
    await enviar(desafio, cuenta, codigo);
  });
  return GENERICO;
}
async function conContrasena(id, contrasena, transaction) {
  const cuenta = await Cuenta.findByPk(id, { transaction });
  if (!cuenta?.activa || !(await bcrypt.compare(contrasena, cuenta.contrasena_hash))) throw new HttpError(401, 'Credenciales inválidas');
  return cuenta;
}
async function configurarMfa(id, { activar, contrasena }) {
  if (activar) habilitado('segundo_factor');
  return crud.transaccion(async transaction => {
    const cuenta = await conContrasena(id, contrasena, transaction);
    if (activar && !cuenta.correo_verificado) throw new HttpError(403, 'Verifica tu correo antes de activar el segundo paso');
    await cuenta.update({ mfa_correo: activar }, { transaction });
    await crud.invalidar(id, 'segundo_factor', transaction);
    return require('./authService').safeAccount(cuenta);
  });
}
async function cambiarCorreo(id, { correo_nuevo, contrasena }) {
  habilitado('cambiar_correo');
  return crud.transaccion(async transaction => {
    const cuenta = await conContrasena(id, contrasena, transaction);
    const correo = correo_nuevo.trim().toLowerCase();
    if (await Cuenta.findOne({ where: { correo }, transaction })) throw new HttpError(409, 'El correo ya está registrado');
    return nuevoEnTransaccion(cuenta, 'cambiar_correo', correo, transaction);
  });
}
async function confirmarCambio(id, codigo, idCuenta) {
  return consumir(id, codigo, 'cambiar_correo', idCuenta, async (cuenta, desafio, transaction) => {
    if (await Cuenta.findOne({ where: { correo: desafio.destino }, transaction })) throw new HttpError(409, 'El correo ya está registrado');
    const anterior = cuenta.correo;
    await cuenta.update({ correo: desafio.destino, correo_verificado: true, version_sesion: cuenta.version_sesion + 1 }, { transaction });
    await crud.invalidar(cuenta.id_cuenta, null, transaction);
    // Aviso sin código; si falla, se revierte también el cambio y el consumo.
    await mail.enviar({ to: anterior, subject: 'StudyQuest: correo actualizado', text: 'Se cambió el correo de tu cuenta. Si no lo solicitaste, contacta al administrador.' });
  });
}
async function recuperar(id, datos) {
  return crud.transaccion(async transaction => {
    const cuenta = await Cuenta.findByPk(id, { transaction });
    if (!cuenta) throw new HttpError(404, 'Cuenta no encontrada');
    await cuenta.update({ ...datos, version_sesion: cuenta.version_sesion + 1 }, { transaction });
    await crud.invalidar(id, null, transaction);
    return require('./authService').safeAccount(cuenta);
  });
}
/** Confirma la propiedad del correo en la misma transacción que consume el código. */
function verificarCorreo(id, codigo, correo) {
  return consumir(id, codigo, 'verificar_correo', null,
    (cuenta, _desafio, transaction) => cuenta.update({ correo_verificado: true }, { transaction }), correo);
}
/** La cuenta debe seguir enrolada y activa al completar el segundo paso. */
function completarLogin(id, codigo) {
  return consumir(id, codigo, 'segundo_factor', null, async cuenta => {
    if (!cuenta.mfa_correo) throw new HttpError(400, 'Desafío no disponible');
  });
}
module.exports = { crear, consumir, reenviar, configurarMfa, cambiarCorreo, confirmarCambio, recuperar, verificarCorreo, completarLogin };
