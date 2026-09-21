'use strict';

const Cuenta = require('../models/Cuenta');
const authService = require('../services/authService');
const HttpError = require('./httpError');

/** RF01/HU01: verifica JWT y consulta cuenta activa/rol vigente en la BD en cada petición. */
async function authenticateRequest(req, _res, next) {
  try {
    const header = req.get('authorization') || '';
    if (!header.startsWith('Bearer ')) throw new HttpError(401, 'Token de acceso requerido');
    const token = header.slice(7);
    const payload = authService.verifyToken(token);
    const account = await Cuenta.findByPk(payload.sub);
    if (!account || !account.activa) throw new HttpError(401, 'La cuenta no está disponible');
    req.authToken = token;
    req.user = { id: account.id_cuenta, rol: account.rol, jti: payload.jti };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new HttpError(401, 'Token inválido o vencido'));
    }
    next(error);
  }
}

/** RF01/HU27: crea un control de roles; requiere authenticateRequest previamente. */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user.rol)) return next(new HttpError(403, 'No tiene permisos para esta operación'));
    next();
  };
}

module.exports = { authenticateRequest, authorize };
