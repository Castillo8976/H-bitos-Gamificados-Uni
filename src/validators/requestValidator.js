'use strict';

const HttpError = require('../middlewares/httpError');

/** RF02/HU02: exige campos en altas; reutilizado por las rutas CRUD de M15. */
function requireFields(...fields) {
  return (req, _res, next) => {
    const missing = fields.filter(field => req.body[field] === undefined || req.body[field] === null || req.body[field] === '');
    if (missing.length) return next(new HttpError(400, 'Faltan campos obligatorios', missing));
    next();
  };
}

/** RF01/HU01: valida datos básicos de registro y materia inicial; no sustituye restricciones de BD. */
function validateRegistration(req, _res, next) {
  const { nombre, correo, contrasena, materia } = req.body;
  if (!nombre || !correo || !contrasena || !materia?.nombre) {
    return next(new HttpError(400, 'Nombre, correo, contraseña y materia inicial son obligatorios'));
  }
  if (!/^\S+@\S+\.\S+$/.test(correo)) return next(new HttpError(400, 'El correo no es válido'));
  if (contrasena.length < 8) return next(new HttpError(400, 'La contraseña debe tener mínimo 8 caracteres'));
  next();
}

/** RF01/HU27: rechaza campos fuera del contrato de cada ruta; no concede permisos por sí solo. */
function allowFields(...allowed) {
  return (req, _res, next) => {
    const unexpected = Object.keys(req.body).filter(field => !allowed.includes(field));
    if (unexpected.length) return next(new HttpError(400, 'La solicitud contiene campos no permitidos', unexpected));
    next();
  };
}

/** RF02/HU02: comprueba valores del catálogo declarados en la ruta. */
function enumField(field, values) {
  return (req, _res, next) => {
    if (req.body[field] !== undefined && !values.includes(req.body[field])) {
      return next(new HttpError(400, `${field} debe ser uno de: ${values.join(', ')}`));
    }
    next();
  };
}

/** RF10/HU10: exige duraciones positivas; reutilizado en umbrales y recompensas. */
function positiveInteger(field) {
  return (req, _res, next) => {
    if (req.body[field] !== undefined && (!Number.isInteger(req.body[field]) || req.body[field] <= 0)) {
      return next(new HttpError(400, `${field} debe ser un entero mayor que cero`));
    }
    next();
  };
}

/** RF15/HU15: permite progreso cero, pero no valores negativos. */
function nonNegativeInteger(field) {
  return (req, _res, next) => {
    if (req.body[field] !== undefined && (!Number.isInteger(req.body[field]) || req.body[field] < 0)) {
      return next(new HttpError(400, `${field} debe ser un entero mayor o igual que cero`));
    }
    next();
  };
}

/** RF13/HU13: comprueba booleanos reales; evita interpretar cadenas como permisos o preferencias. */
function booleanField(field) {
  return (req, _res, next) => {
    if (req.body[field] !== undefined && typeof req.body[field] !== 'boolean') {
      return next(new HttpError(400, `${field} debe ser booleano`));
    }
    next();
  };
}

/** RF07/HU26: normaliza y limita el motivo de corrección; omisiones se controlan con requireFields. */
function nonBlankText(field, maxLength = 200) {
  return (req, _res, next) => {
    if (req.body[field] === undefined) return next();
    if (typeof req.body[field] !== 'string' || !req.body[field].trim() || req.body[field].trim().length > maxLength) {
      return next(new HttpError(400, `${field} debe contener entre 1 y ${maxLength} caracteres`));
    }
    req.body[field] = req.body[field].trim();
    next();
  };
}

module.exports = { requireFields, validateRegistration, allowFields, enumField, positiveInteger, nonNegativeInteger, booleanField, nonBlankText };
