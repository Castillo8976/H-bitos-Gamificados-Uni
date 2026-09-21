'use strict';

const { Op } = require('sequelize');
const Cuenta = require('../models/Cuenta');
const Tarea = require('../models/Tarea');
const SesionEstudio = require('../models/SesionEstudio');
const Punto = require('../models/Punto');
const Meta = require('../models/Meta');
const Reto = require('../models/Reto');
const CuentaInsignia = require('../models/CuentaInsignia');
const Insignia = require('../models/Insignia');
const NivelCuenta = require('../models/NivelCuenta');
const { validarPeriodo, semanaIso } = require('./periodoService');

/** RF07/HU07: resuelve el nivel por puntos acumulados; devuelve null sin catálogo aplicable. */
async function nivelActual(total) {
  const nivel = await NivelCuenta.findOne({
    where: { puntos_minimos: { [Op.lte]: total } },
    order: [['puntos_minimos', 'DESC'], ['orden', 'DESC']]
  });
  return nivel ? nivel.toJSON() : null;
}

/**
 * Calcula el tablero personal sin persistir una tabla de reportes.
 * @implements RF08 @implements RF11 @implements RF15
 * @implements HU08 @implements HU11 @implements CU05
 */
async function obtenerEstadisticasSemana(idCuenta, fechaInicio, fechaFin) {
  const periodo = validarPeriodo(fechaInicio, fechaFin);
  const rango = { [Op.between]: [periodo.inicio, periodo.fin] };
  const semana = semanaIso(new Date(`${periodo.inicio}T00:00:00.000Z`));
  const [tareasRegistradas, tareasCompletadas, sesiones, pomodoros, minutos, puntos, totalPuntos, metas, retos, insignias] = await Promise.all([
    Tarea.count({ where: { id_cuenta: idCuenta } }),
    Tarea.count({ where: { id_cuenta: idCuenta, estado: 'Completada', fecha_completada: rango } }),
    SesionEstudio.count({ where: { id_cuenta: idCuenta, fecha: rango } }),
    SesionEstudio.count({ where: { id_cuenta: idCuenta, fecha: rango, modo_enfoque: true } }),
    SesionEstudio.sum('duracion_minutos', { where: { id_cuenta: idCuenta, fecha: rango } }),
    Punto.sum('cantidad', { where: { id_cuenta: idCuenta, fecha: rango } }),
    Punto.sum('cantidad', { where: { id_cuenta: idCuenta } }),
    Meta.findAll({ where: { id_cuenta: idCuenta, semana }, order: [['descripcion', 'ASC']] }),
    Reto.findAll({ where: { id_cuenta: idCuenta, semana }, order: [['descripcion', 'ASC']] }),
    CuentaInsignia.findAll({
      where: { id_cuenta: idCuenta, fecha_obtenida: rango },
      include: [{ model: Insignia, as: 'insignia', attributes: ['id_insignia', 'nombre', 'descripcion', 'condicion', 'icono'] }],
      order: [['fecha_obtenida', 'DESC']]
    })
  ]);
  const total = Number(totalPuntos || 0);
  return {
    periodo, semana,
    // E7 no contiene fecha de creación en `tarea`; por eso "creadas" significa
    // tareas registradas por la cuenta al momento de consultar el tablero.
    tareas_creadas: tareasRegistradas, tareas_registradas: tareasRegistradas,
    tareas_completadas: tareasCompletadas,
    porcentaje_cumplimiento: tareasRegistradas ? Number(((tareasCompletadas / tareasRegistradas) * 100).toFixed(2)) : 0,
    minutos_estudiados: Number(minutos || 0), horas_estudiadas: Number(((minutos || 0) / 60).toFixed(2)),
    sesiones_realizadas: sesiones, sesiones_pomodoro: pomodoros,
    puntos_obtenidos: Number(puntos || 0), puntos_totales: total,
    nivel_actual: await nivelActual(total),
    metas: metas.map(item => item.toJSON()), retos: retos.map(item => item.toJSON()),
    insignias_obtenidas: insignias.map(item => item.toJSON()),
    mensaje: tareasCompletadas === 0 && !minutos ? 'Inicia una actividad para registrar avance esta semana.' : null
  };
}

/**
 * Calcula indicadores globales y anónimos para el rol Revisor institucional.
 * No retorna nombres, correos, identificadores ni filas individuales.
 * @implements RF11 @implements HU28 @implements CU16 @implements RN21
 */
async function obtenerIndicadoresInstitucionales(fechaInicio, fechaFin) {
  const periodo = validarPeriodo(fechaInicio, fechaFin);
  const rango = { [Op.between]: [periodo.inicio, periodo.fin] };
  const cuentas = await Cuenta.findAll({ where: { rol: 'Estudiante', activa: true }, attributes: ['id_cuenta'] });
  const ids = cuentas.map(cuenta => cuenta.id_cuenta);
  if (!ids.length) {
    return { periodo, estudiantes_activos: 0, tareas_completadas: 0, minutos_estudiados: 0, sesiones_realizadas: 0, puntos_obtenidos: 0 };
  }
  const filtroCuenta = { [Op.in]: ids };
  const [tareas, sesiones, minutos, puntos] = await Promise.all([
    Tarea.count({ where: { id_cuenta: filtroCuenta, estado: 'Completada', fecha_completada: rango } }),
    SesionEstudio.count({ where: { id_cuenta: filtroCuenta, fecha: rango } }),
    SesionEstudio.sum('duracion_minutos', { where: { id_cuenta: filtroCuenta, fecha: rango } }),
    Punto.sum('cantidad', { where: { id_cuenta: filtroCuenta, fecha: rango } })
  ]);
  return {
    periodo, estudiantes_activos: ids.length, tareas_completadas: tareas,
    minutos_estudiados: Number(minutos || 0), horas_estudiadas: Number(((minutos || 0) / 60).toFixed(2)),
    sesiones_realizadas: sesiones, puntos_obtenidos: Number(puntos || 0),
    promedio_minutos_por_estudiante: Number(((minutos || 0) / ids.length).toFixed(2)),
    promedio_puntos_por_estudiante: Number(((puntos || 0) / ids.length).toFixed(2))
  };
}

/** RF11/HU08/HU28: fachada de consultas personales e institucionales. */
class EstadisticasService {
  /** Calcula P11 para la cuenta autenticada. @implements RF11 @implements HU08 */
  obtenerEstadisticasSemana(idCuenta, fechaInicio, fechaFin) {
    return obtenerEstadisticasSemana(idCuenta, fechaInicio, fechaFin);
  }

  /** Calcula P18 sin exponer datos individuales. @implements RF11 @implements HU28 */
  obtenerIndicadoresInstitucionales(fechaInicio, fechaFin) {
    return obtenerIndicadoresInstitucionales(fechaInicio, fechaFin);
  }
}

module.exports = new EstadisticasService();
