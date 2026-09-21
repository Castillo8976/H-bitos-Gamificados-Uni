'use strict';

const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sequelize = require('../database');
const Cuenta = require('../models/Cuenta');
const Materia = require('../models/Materia');
const PreferenciaVisual = require('../models/PreferenciaVisual');
const HttpError = require('../middlewares/httpError');

const revokedTokens = new Set();

/** RF01/HU01: exige secreto en producción; el valor de desarrollo no es seguro para despliegue público. */
function jwtSecret() {
  if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET es obligatoria en producción');
  }
  return process.env.JWT_SECRET || 'studyquest-desarrollo-cambiar-en-produccion';
}

/** RF01/HU20: excluye el hash de contraseña de la representación HTTP. */
function safeAccount(account) {
  const value = account.toJSON ? account.toJSON() : { ...account };
  delete value.contrasena_hash;
  return value;
}

/** @implements RF01 @implements HU01 */
async function register({ nombre, correo, contrasena, materia }) {
  const normalizedEmail = correo.trim().toLowerCase();
  const existing = await Cuenta.findOne({ where: { correo: normalizedEmail } });
  if (existing) throw new HttpError(409, 'El correo ya está registrado');
  const passwordHash = await bcrypt.hash(contrasena, 10);
  const account = await sequelize.transaction(async transaction => {
    const created = await Cuenta.create({
      id_cuenta: crypto.randomUUID(),
      nombre: nombre.trim(),
      correo: normalizedEmail,
      contrasena_hash: passwordHash,
      rol: 'Estudiante'
    }, { transaction });
    await PreferenciaVisual.create({
      id_preferencia: crypto.randomUUID(),
      id_cuenta: created.id_cuenta
    }, { transaction });
    await Materia.create({
      id_materia: crypto.randomUUID(),
      id_cuenta: created.id_cuenta,
      nombre: materia.nombre.trim(),
      horario: materia.horario || null
    }, { transaction });
    return created;
  });
  return safeAccount(account);
}

/** @implements RF01 @implements HU01 @implements RNF12 */
async function authenticate({ correo, contrasena }) {
  const account = await Cuenta.findOne({ where: { correo: correo.trim().toLowerCase() } });
  if (!account || !(await bcrypt.compare(contrasena, account.contrasena_hash))) {
    throw new HttpError(401, 'Credenciales inválidas');
  }
  if (!account.activa) throw new HttpError(403, 'La cuenta está inactiva');

  const jti = crypto.randomUUID();
  const token = jwt.sign({ sub: account.id_cuenta, rol: account.rol, jti }, jwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '2h'
  });
  return { token, cuenta: safeAccount(account) };
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

module.exports = { register, authenticate, verifyToken, revokeToken, getProfile, safeAccount };
