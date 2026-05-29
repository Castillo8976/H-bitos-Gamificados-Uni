/**
 * @fileoverview Controlador CRUD para la entidad Reporte.
 * Gestiona los resúmenes semanales de rendimiento académico.
 * Incluye la regla de negocio principal: generarReporteSemanal(),
 * que consolida datos de Tarea, SesionEstudio y Punto para producir
 * el snapshot de una semana específica.
 *
 * @module crud/reporteCrud
 * @requires ../models/Reporte
 * @requires crypto
 *
 * // RF-11 | E12 - ReporteService
 */

const Reporte = require('../crud-models/models/Reporte');
const crypto = require('crypto');


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea un reporte semanal con datos precalculados.
 *
 * La restricción UNIQUE (id_cuenta, semana) garantiza 1 reporte por semana.
 *
 * // CU-05 | RF-11 | E12 - crearReporte()
 *
 * @async
 * @param {string} id_cuenta           - UUID de la cuenta propietaria.
 * @param {string} semana              - Semana en formato YYYY-WNN.
 * @param {number} tareas_completadas  - Tareas completadas en la semana.
 * @param {number} horas_estudiadas    - Horas estudiadas en la semana (decimal).
 * @param {number} puntos_obtenidos    - Puntos acumulados en la semana.
 * @returns {Promise<Reporte>} El reporte creado.
 */
async function crearReporte(id_cuenta, semana, tareas_completadas, horas_estudiadas, puntos_obtenidos) {
  const reporte = await Reporte.create({
    id_reporte: crypto.randomUUID(),
    id_cuenta,
    semana,
    tareas_completadas,
    horas_estudiadas,
    puntos_obtenidos
  });

  console.log(`✅ Reporte creado — Semana ${reporte.semana}: ${reporte.tareas_completadas} tareas | ${reporte.horas_estudiadas}h | ${reporte.puntos_obtenidos} pts`);
  return reporte;
}


// ─────────────────────────────────────────
// GENERAR REPORTE SEMANAL (REGLA DE NEGOCIO CENTRAL)
// ─────────────────────────────────────────

/**
 * Genera o actualiza el reporte semanal consolidando datos reales
 * de las tablas Tarea, SesionEstudio y Punto.
 *
 * Implementa la regla de negocio RF-11: el reporte es un snapshot
 * histórico deliberado justificado por RNF-02 (respuesta ≤2s).
 * Si ya existe un reporte para esa semana, lo actualiza en lugar de duplicarlo.
 *
 * // CU-05 | RF-11 | E12 - generarReporteSemanal()
 *
 * @async
 * @param {string} id_cuenta   - UUID de la cuenta.
 * @param {string} semana      - Semana en formato YYYY-WNN (ej: '2026-W21').
 * @param {string} fechaInicio - Inicio de la semana (YYYY-MM-DD).
 * @param {string} fechaFin    - Fin de la semana (YYYY-MM-DD).
 * @returns {Promise<Reporte>} El reporte generado o actualizado.
 *
 * @example
 * const reporte = await generarReporteSemanal(
 *   id_cuenta,
 *   '2026-W21',
 *   '2026-05-19',
 *   '2026-05-25'
 * );
 */
async function generarReporteSemanal(id_cuenta, semana, fechaInicio, fechaFin) {
  const { Op } = require('sequelize');
  const Tarea = require('../crud-models/models/Tarea');

  // Importaciones dinámicas para evitar dependencias circulares
  const { calcularHorasSemana } = require('../crud-models/crud/sesionEstudioCrud');
  const { calcularPuntosSemana } = require('../crud-models/crud/puntoCrud');

  // 1. Contar tareas completadas en el período
  const tareasCompletadas = await Tarea.count({
    where: {
      id_cuenta,
      estado: 'Completada',
      fecha_completada: { [Op.between]: [fechaInicio, fechaFin] }
    }
  });

  // 2. Calcular horas estudiadas (SUM de sesion_estudio.duracion_minutos / 60)
  const horasEstudiadas = await calcularHorasSemana(id_cuenta, fechaInicio, fechaFin);

  // 3. Sumar puntos obtenidos en el período
  const puntosObtenidos = await calcularPuntosSemana(id_cuenta, fechaInicio, fechaFin);

  // 4. Crear o actualizar el reporte (upsert por semana)
  const reporteExistente = await Reporte.findOne({ where: { id_cuenta, semana } });

  if (reporteExistente) {
    await reporteExistente.update({
      tareas_completadas: tareasCompletadas,
      horas_estudiadas: horasEstudiadas,
      puntos_obtenidos: puntosObtenidos,
      fecha_generado: new Date().toISOString().split('T')[0]
    });
    console.log(`🔄 Reporte actualizado — Semana ${semana}: ${tareasCompletadas} tareas | ${horasEstudiadas}h | ${puntosObtenidos} pts`);
    return reporteExistente;
  }

  return crearReporte(id_cuenta, semana, tareasCompletadas, horasEstudiadas, puntosObtenidos);
}


// ─────────────────────────────────────────
// LEER TODOS DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Lista todos los reportes históricos de una cuenta ordenados por semana.
 *
 * // CU-05 | RF-11 | E12 - listarReportes()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<Reporte[]>}
 */
async function listarReportes(id_cuenta) {
  const reportes = await Reporte.findAll({
    where: { id_cuenta },
    order: [['semana', 'DESC']]
  });

  console.log('📋 Reportes:', reportes.map(r => ({
    semana: r.semana,
    tareas: r.tareas_completadas,
    horas: r.horas_estudiadas,
    puntos: r.puntos_obtenidos
  })));

  return reportes;
}


// ─────────────────────────────────────────
// LEER UNO
// ─────────────────────────────────────────

/**
 * Obtiene el reporte de una semana específica para una cuenta.
 *
 * // CU-05 | RF-11 | E12 - obtenerReporte()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @param {string} semana    - Semana en formato YYYY-WNN.
 * @returns {Promise<Reporte|null>}
 */
async function obtenerReporte(id_cuenta, semana) {
  const reporte = await Reporte.findOne({ where: { id_cuenta, semana } });
  console.log('🔍 Reporte encontrado:', reporte
    ? `Semana ${reporte.semana}: ${reporte.tareas_completadas} tareas`
    : 'No existe');
  return reporte;
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina un reporte de la base de datos.
 *
 * @async
 * @param {string} id - UUID del reporte.
 * @returns {Promise<void>}
 */
async function eliminarReporte(id) {
  const filas = await Reporte.destroy({ where: { id_reporte: id } });
  console.log(filas > 0 ? '🗑️ Reporte eliminado' : '⚠️ No se encontró el reporte');
}


module.exports = {
  crearReporte,
  generarReporteSemanal,
  listarReportes,
  obtenerReporte,
  eliminarReporte
};
