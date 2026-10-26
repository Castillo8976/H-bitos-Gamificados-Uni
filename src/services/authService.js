'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Transaction } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('../models/Cuenta');
const Materia = require('../models/Materia');
const PreferenciaVisual = require('../models/PreferenciaVisual');
const HttpError = require('../middlewares/httpError');

const { configuration } = require('../config/authEmail');
const desafios = require('./desafioAutenticacionService');
const revokedTokens = new Set();
// shortcut: memoria de un solo proceso, usar almacén compartido si se escala.
const fallosLogin = new Map();

/** RF01/HU01: exige secreto en producción; el valor de desarrollo no es seguro para despliegue público. */
function jwtSecret() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET es obligatoria en producción');
  }
  return process.env.JWT_SECRET || 'studyquest-desarrollo-cambiar-en-produccion';
}

/** RF01/HU20/HU30: excluye el hash de contraseña y la versión de sesión de la representación HTTP. */
function safeAccount(account) {
  const value = account.toJSON ? account.toJSON() : { ...account };
  delete value.contrasena_hash;
  delete value.version_sesion;
  if (!configuration().verificacion_correo && configuration().segundo_factor === 'off') {
    delete value.correo_verificado;
    delete value.mfa_correo;
  }
  return value;
}

/** @implements RF01 @implements HU01 */
async function register({ nombre, correo, contrasena, materia }) {
  const normalizedEmail = correo.trim().toLowerCase();
  const existing = await Cuenta.findOne({ where: { correo: normalizedEmail } });
  if (existing) throw new HttpError(409, 'El correo ya está registrado');
  const passwordHash = await bcrypt.hash(contrasena, 10);
  const account = await sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const asignatura = await require('./catalogoMateriaService').obtenerActiva(materia.id_catalogo_materia, transaction, true);
    const created = await Cuenta.create({
      id_cuenta: crypto.randomUUID(),
      nombre: nombre.trim(),
      correo: normalizedEmail,
      contrasena_hash: passwordHash,
      rol: 'Estudiante',
      correo_verificado: !configuration().verificacion_correo
    }, { transaction });
    await PreferenciaVisual.create({
      id_preferencia: crypto.randomUUID(),
      id_cuenta: created.id_cuenta
    }, { transaction });
    await Materia.create({
      id_materia: crypto.randomUUID(),
      id_cuenta: created.id_cuenta,
      id_catalogo_materia: asignatura.id_catalogo_materia,
      nombre: asignatura.nombre,
      horario: materia.horario || null
    }, { transaction });
    return created;
  });
  return safeAccount(account);
}

/** @implements RF01 @implements HU01 @implements RNF12 */
function emitirToken(account) {
  const token = jwt.sign({ sub: account.id_cuenta, rol: account.rol, jti: crypto.randomUUID(), ver: account.version_sesion }, jwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h'
  });
  return { token, cuenta: safeAccount(account) };
}
async function authenticate({ correo, contrasena }, ip = 'interno') {
  const ahora = Date.now();
  for (const [key, value] of fallosLogin) if (value.hasta <= ahora) fallosLogin.delete(key);
  const clave = `${ip}:${correo.trim().toLowerCase()}`;
  const fallo = fallosLogin.get(clave);
  if (fallo?.cantidad >= 10) throw new HttpError(429, 'Demasiados intentos de acceso; intenta más tarde');
  const account = await Cuenta.findOne({ where: { correo: correo.trim().toLowerCase() } });
  if (!account || !(await bcrypt.compare(contrasena, account.contrasena_hash))) {
    const actual = fallosLogin.get(clave); // Leer tras bcrypt también cuenta fallos concurrentes.
    if (actual?.cantidad >= 10) throw new HttpError(429, 'Demasiados intentos de acceso; intenta más tarde');
    fallosLogin.set(clave, { cantidad: (actual?.cantidad || 0) + 1, hasta: actual?.hasta || ahora + 15 * 60000 });
    throw new HttpError(401, 'Credenciales inválidas');
  }
  if (!account.activa) throw new HttpError(403, 'La cuenta está inactiva');

  fallosLogin.delete(clave);
  if (configuration().verificacion_correo && !account.correo_verificado) {
    return { requiere_verificacion: true, ...await desafios.crear(account, 'verificar_correo') };
  }
  if (configuration().segundo_factor === 'optional' && account.mfa_correo) {
    return { requiere_codigo: true, ...await desafios.crear(account, 'segundo_factor') };
  }
  // RN27/Decisión #08: siempre emitir el claim `ver` vigente.
  return emitirToken(account);
}

/** RF01/HU01: verifica firma, expiración y revocación en memoria. */
function verifyToken(token) {
  const payload = jwt.verify(token, jwtSecret());
  if (revokedTokens.has(payload.jti)) throw new HttpError(401, 'La sesión fue cerrada');
  return payload;
}

/** RF01/HU01: revoca jti en este proceso; se pierde al reiniciar, pendiente documentado en M17. */
function revokeToken(payload) {
  if (payload?.jti) revokedTokens.add(payload.jti);
}

/** RF01/HU20: consulta perfil seguro o produce error 404. */
async function getProfile(id) {
  const account = await Cuenta.findByPk(id);
  if (!account) throw new HttpError(404, 'Cuenta no encontrada');
  return safeAccount(account);
}

module.exports = { register, authenticate, verifyToken, revokeToken, getProfile, safeAccount, emitirToken };
