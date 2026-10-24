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
    if (!nombre || !correo || !contrasena || !materia) {
      throw new HttpError(400, 'Nombre, correo, contraseña y materia inicial son obligatorios');
    }
    if (Object.keys(req.body).some(key => !['nombre', 'correo', 'contrasena', 'materia'].includes(key))) {
      throw new HttpError(400, 'La solicitud contiene campos no permitidos');
    }
    validatePassword(contrasena, 8);
    entityValidator.objeto(materia, 'materia');
    req.body = entityValidator.validar('cuentas', req.body);
    try {
      if (Object.keys(materia).some(key => !['id_catalogo_materia', 'horario'].includes(key))) {
        throw new HttpError(400, 'RN26: selecciona una asignatura mediante id_catalogo_materia; no se permite nombre libre ni campos extra');
      }
      if (!materia.id_catalogo_materia) throw new HttpError(400, 'id_catalogo_materia es obligatorio');
      if (typeof materia.id_catalogo_materia !== 'string') throw new HttpError(400, 'id_catalogo_materia debe ser texto');
      req.body.materia = entityValidator.validar('materias', materia);
    } catch (error) {
      throw new HttpError(error.status || 400, `Materia inicial: ${error.message}`);
    }
    next();
  } catch (error) { next(error); }
}

/** RF01/HU01: evita tipos inválidos y truncamiento silencioso de bcrypt (72 bytes). */
function validatePassword(valor, minimo = 1) {
  if (typeof valor !== 'string' || valor.length < minimo || Buffer.byteLength(valor, 'utf8') > 72) {
    throw new HttpError(400, `La contraseña debe tener mínimo ${minimo} ${minimo === 1 ? 'carácter' : 'caracteres'} y máximo 72 bytes UTF-8 (las tildes y la ñ ocupan 2 bytes)`);
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

/** RNF-16 (E7): exige un entero dentro de los límites aprobados cuando el campo está presente. */
function integerRange(field, min, max) {
  return (req, _res, next) => {
    const valor = req.body[field];
    if (valor !== undefined && (!Number.isSafeInteger(valor) || valor < min || valor > max)) {
      return next(new HttpError(400, `${field} debe ser un entero entre ${min.toLocaleString('es-CO')} y ${max.toLocaleString('es-CO')}`));
    }
    next();
  };
}

/** RF06/RN24: una condición nueva o modificada usa `metrica:objetivo`; no revalida registros antiguos. */
function challengeCondition(req, _res, next) {
  const condicion = req.body.condicion;
  const formato = typeof condicion === 'string' && /^(tareas|sesiones|pomodoros|minutos):([1-9]\d*)$/.exec(condicion.trim());
  if (condicion !== undefined && (!formato || !Number.isSafeInteger(Number(formato[2])))) {
    return next(new HttpError(400, 'condicion debe usar metrica:objetivo con tareas, sesiones, pomodoros o minutos (por ejemplo, tareas:5)'));
  }
  next();
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

module.exports = { requireFields, validateRegistration, validateLogin, allowFields, enumField, positiveInteger, integerRange, challengeCondition, nonNegativeInteger, booleanField, nonBlankText };
