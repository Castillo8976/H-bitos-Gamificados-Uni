'use strict';

const HttpError = require('../middlewares/httpError');
const { fechaIso, semanaIso } = require('../services/periodoService');

// RF01–RF15/HU01–HU27: usamos los atributos de los modelos alineados con E7.
// Las listas de campos editables y los permisos siguen definidos en las rutas.
const modelos = {
  cuentas: require('../models/Cuenta'), materias: require('../models/Materia'),
  tareas: require('../models/Tarea'), sesiones: require('../models/SesionEstudio'),
  preferencias: require('../models/PreferenciaVisual'), recordatorios: require('../models/Recordatorio'),
  notificaciones: require('../models/Notificacion'), puntos: require('../models/Punto'),
  insignias: require('../models/Insignia'), 'cuenta-insignias': require('../models/CuentaInsignia'),
  niveles: require('../models/NivelCuenta'), retos: require('../models/Reto'), metas: require('../models/Meta')
};

/** RF02/HU02: valida contratos de entrada sin confiar en conversiones del ORM.
 * No sustituye las restricciones de E11 ni las comprobaciones de propiedad.
 */
class EntityValidator {
  /** RF02/HU02: exige un objeto JSON, no arreglos, null ni valores primitivos. */
  objeto(valor, campo = 'solicitud') {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) {
      throw new HttpError(400, `${campo} debe ser un objeto JSON`);
    }
  }

  /** RF02/HU02: rechaza días inexistentes; conserva fechas DATE como texto UTC. */
  fecha(valor, campo) {
    if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
      throw new HttpError(400, `${campo} debe usar YYYY-MM-DD`);
    }
    const parsed = new Date(`${valor}T00:00:00.000Z`);
    if (!Number.isFinite(parsed.getTime()) || fechaIso(parsed) !== valor) {
      throw new HttpError(400, `${campo} no es una fecha válida`);
    }
  }

  /** RF15/HU15: comprueba la semana ISO, incluido si existe W53 en ese año. */
  semana(valor) {
    const match = /^(\d{4})-W(\d{2})$/.exec(valor);
    if (!match) throw new HttpError(400, 'semana debe usar YYYY-Www');
    const jueves = new Date(`${match[1]}-01-04T00:00:00.000Z`);
    jueves.setUTCDate(jueves.getUTCDate() - ((jueves.getUTCDay() || 7) - 1) + (Number(match[2]) - 1) * 7);
    if (semanaIso(jueves) !== valor) throw new HttpError(400, 'semana no es una semana ISO válida');
  }

  /** RF01–RF15/HU01–HU27: valida los campos presentes usando tipos y límites de E7.
   * Devuelve una copia normalizada; nunca normaliza contraseñas ni concede permisos.
   */
  validar(recurso, datos, { crear = false, ahora = new Date() } = {}) {
    this.objeto(datos);
    const modelo = modelos[recurso];
    if (!modelo) return { ...datos };
    const resultado = { ...datos };
    for (const [campo, valor] of Object.entries(datos)) {
      const atributo = modelo.rawAttributes[campo];
      if (!atributo) continue; // La lista de campos de la ruta rechaza los desconocidos.
      if (valor === null) {
        if (atributo.allowNull === false) throw new HttpError(400, `${campo} no admite null`);
        continue;
      }
      const tipo = atributo.type.key;
      if (['STRING', 'TEXT', 'ENUM', 'DATEONLY'].includes(tipo)) {
        if (typeof valor !== 'string') throw new HttpError(400, `${campo} debe ser texto`);
        const texto = valor.trim();
        const maximo = atributo.type.options?.length;
        if (!texto || (maximo && [...texto].length > maximo)) {
          throw new HttpError(400, `${campo} debe contener texto${maximo ? ` de máximo ${maximo} caracteres` : ''}`);
        }
        resultado[campo] = texto;
        if (tipo === 'DATEONLY') this.fecha(texto, campo);
      }
      if (tipo === 'BOOLEAN' && typeof valor !== 'boolean') throw new HttpError(400, `${campo} debe ser booleano`);
      if (tipo === 'INTEGER' && !Number.isSafeInteger(valor)) throw new HttpError(400, `${campo} debe ser un entero seguro`);
    }
    if (resultado.correo !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resultado.correo)) throw new HttpError(400, 'correo no es válido');
      resultado.correo = resultado.correo.toLowerCase();
    }
    if (resultado.semana !== undefined) this.semana(resultado.semana);
    if (crear && recurso === 'tareas' && resultado.fecha_entrega < fechaIso(ahora)) {
      throw new HttpError(400, 'fecha_entrega no puede estar en el pasado (RN04)');
    }
    return resultado;
  }
}

const validator = new EntityValidator();

/** RF02/HU02: aplica validación a recursos mutables después de autenticar. */
function validateEntityRequest(req, _res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  try {
    req.body = validator.validar(req.path.split('/')[1], req.body ?? {}, { crear: req.method === 'POST' });
    next();
  } catch (error) { next(error); }
}

module.exports = { EntityValidator, validateEntityRequest };
