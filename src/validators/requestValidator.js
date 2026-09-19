'use strict';

const HttpError = require('../middlewares/httpError');

function requireFields(...fields) {
  return (req, _res, next) => {
    const missing = fields.filter(field => req.body[field] === undefined || req.body[field] === null || req.body[field] === '');
    if (missing.length) return next(new HttpError(400, 'Faltan campos obligatorios', missing));
    next();
  };
}

function validateRegistration(req, _res, next) {
  const { nombre, correo, contrasena, materia } = req.body;
  if (!nombre || !correo || !contrasena || !materia?.nombre) {
    return next(new HttpError(400, 'Nombre, correo, contraseña y materia inicial son obligatorios'));
  }
  if (!/^\S+@\S+\.\S+$/.test(correo)) return next(new HttpError(400, 'El correo no es válido'));
  if (contrasena.length < 8) return next(new HttpError(400, 'La contraseña debe tener mínimo 8 caracteres'));
  next();
}

function allowFields(...allowed) {
  return (req, _res, next) => {
    const unexpected = Object.keys(req.body).filter(field => !allowed.includes(field));
    if (unexpected.length) return next(new HttpError(400, 'La solicitud contiene campos no permitidos', unexpected));
    next();
  };
}

function enumField(field, values) {
  return (req, _res, next) => {
    if (req.body[field] !== undefined && !values.includes(req.body[field])) {
      return next(new HttpError(400, `${field} debe ser uno de: ${values.join(', ')}`));
    }
    next();
  };
}

function positiveInteger(field) {
  return (req, _res, next) => {
    if (req.body[field] !== undefined && (!Number.isInteger(req.body[field]) || req.body[field] <= 0)) {
      return next(new HttpError(400, `${field} debe ser un entero mayor que cero`));
    }
    next();
  };
}

function nonNegativeInteger(field) {
  return (req, _res, next) => {
    if (req.body[field] !== undefined && (!Number.isInteger(req.body[field]) || req.body[field] < 0)) {
      return next(new HttpError(400, `${field} debe ser un entero mayor o igual que cero`));
    }
    next();
  };
}

function booleanField(field) {
  return (req, _res, next) => {
    if (req.body[field] !== undefined && typeof req.body[field] !== 'boolean') {
      return next(new HttpError(400, `${field} debe ser booleano`));
    }
    next();
  };
}

module.exports = { requireFields, validateRegistration, allowFields, enumField, positiveInteger, nonNegativeInteger, booleanField };
