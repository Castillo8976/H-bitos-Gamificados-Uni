'use strict';

const HttpError = require('../middlewares/httpError');
const { EntityValidator } = require('./entityValidator');
const entityValidator = new EntityValidator();

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
  try {
    entityValidator.objeto(req.body);
    const { nombre, correo, contrasena, materia } = req.body;
    if (!nombre || !correo || !contrasena || !materia?.nombre) {
      throw new HttpError(400, 'Nombre, correo, contraseña y materia inicial son obligatorios');
    }
    validatePassword(contrasena, 8);
    entityValidator.objeto(materia, 'materia');
    if (Object.keys(materia).some(key => !['nombre', 'horario'].includes(key))) {
      throw new HttpError(400, 'materia contiene campos no permitidos');
    }
    req.body = entityValidator.validar('cuentas', req.body);
    req.body.materia = entityValidator.validar('materias', materia);
    next();
  } catch (error) { next(error); }
}

/** RF01/HU01: evita tipos inválidos y truncamiento silencioso de bcrypt (72 bytes). */
function validatePassword(valor, minimo = 1) {
  if (typeof valor !== 'string' || valor.length < minimo || Buffer.byteLength(valor, 'utf8') > 72) {
    throw new HttpError(400, `contrasena debe tener mínimo ${minimo} caracteres y máximo 72 bytes UTF-8`);
  }
}

/** RF01/HU01: valida credenciales sin alterar la contraseña. */
function validateLogin(req, _res, next) {
  try {
    entityValidator.objeto(req.body);
    validatePassword(req.body.contrasena);
    req.body = entityValidator.validar('cuentas', req.body);
    next();
  } catch (error) { next(error); }
}

/** RF01/HU27: rechaza campos fuera del contrato de cada ruta; no concede permisos por sí solo. */
function allowFields(...allowed) {
  return (req, _res, next) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return next(new HttpError(400, 'La solicitud debe ser un objeto JSON'));
    }
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
    if (req.body[field] !== undefined && (!Number.isSafeInteger(req.body[field]) || req.body[field] <= 0)) {
      return next(new HttpError(400, `${field} debe ser un entero mayor que cero`));
    }
    next();
  };
}

/** RF15/HU15: permite progreso cero, pero no valores negativos. */
function nonNegativeInteger(field) {
  return (req, _res, next) => {
    if (req.body[field] !== undefined && (!Number.isSafeInteger(req.body[field]) || req.body[field] < 0)) {
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

module.exports = { requireFields, validateRegistration, validateLogin, allowFields, enumField, positiveInteger, nonNegativeInteger, booleanField, nonBlankText };
