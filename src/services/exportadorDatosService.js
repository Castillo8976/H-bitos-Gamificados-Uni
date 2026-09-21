'use strict';

const Cuenta = require('../models/Cuenta');
const Materia = require('../models/Materia');
const Tarea = require('../models/Tarea');
const SesionEstudio = require('../models/SesionEstudio');
const Punto = require('../models/Punto');
const CuentaInsignia = require('../models/CuentaInsignia');
const Insignia = require('../models/Insignia');
const Reto = require('../models/Reto');
const Meta = require('../models/Meta');
const Recordatorio = require('../models/Recordatorio');
const Notificacion = require('../models/Notificacion');
const PreferenciaVisual = require('../models/PreferenciaVisual');
const HttpError = require('../middlewares/httpError');

/** RF14/HU14: convierte resultados ORM ya filtrados en objetos serializables. */
const planos = elementos => elementos.map(elemento => elemento.toJSON());

/**
 * Reúne exclusivamente los datos de la cuenta autenticada en un objeto JSON.
 * @implements RF14 @implements HU14 @implements CU09
 */
async function exportarDatosPersonales(idCuenta) {
  const cuenta = await Cuenta.findByPk(idCuenta, {
    attributes: ['id_cuenta', 'nombre', 'correo', 'rol', 'activa']
  });
  if (!cuenta) throw new HttpError(404, 'Cuenta no encontrada');
  const [materias, tareas, sesiones, puntos, insignias, retos, metas, recordatorios, notificaciones, preferencias] = await Promise.all([
    Materia.findAll({ where: { id_cuenta: idCuenta } }),
    Tarea.findAll({ where: { id_cuenta: idCuenta } }),
    SesionEstudio.findAll({ where: { id_cuenta: idCuenta } }),
    Punto.findAll({ where: { id_cuenta: idCuenta } }),
    CuentaInsignia.findAll({ where: { id_cuenta: idCuenta }, include: [{ model: Insignia, as: 'insignia' }] }),
    Reto.findAll({ where: { id_cuenta: idCuenta } }),
    Meta.findAll({ where: { id_cuenta: idCuenta } }),
    Recordatorio.findAll({ where: { id_cuenta: idCuenta } }),
    Notificacion.findAll({ where: { id_cuenta: idCuenta } }),
    PreferenciaVisual.findOne({ where: { id_cuenta: idCuenta } })
  ]);
  return {
    version_exportacion: 1,
    generado_en: new Date().toISOString(),
    cuenta: cuenta.toJSON(), materias: planos(materias), tareas: planos(tareas),
    sesiones_estudio: planos(sesiones), puntos: planos(puntos), insignias: planos(insignias),
    retos: planos(retos), metas: planos(metas), recordatorios: planos(recordatorios),
    notificaciones: planos(notificaciones), preferencia_visual: preferencias?.toJSON() || null
  };
}

/** RF14/HU14: fachada de exportación personal; no persiste una tabla reporte. */
class ExportadorDatos {
  /** Genera el archivo lógico de P14 para su propietario. @implements RF14 @implements HU14 */
  exportarDatosPersonales(idCuenta) {
    return exportarDatosPersonales(idCuenta);
  }
}

module.exports = new ExportadorDatos();
