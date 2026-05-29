/**
 * @fileoverview Controlador CRUD para la entidad SesionEstudio.
 * Gestiona la creación, lectura, actualización y eliminación de sesiones
 * de estudio (Pomodoro o cronómetro libre) vinculadas a una cuenta.
 *
 * @module crud/sesionEstudioCrud
 * @requires ../models/SesionEstudio
 * @requires crypto
 *
 * // RF-10 | RF-11 | RF-12 | E12 - SesionEstudioService
 */

const SesionEstudio = require('../crud-models/models/SesionEstudio');
const crypto = require('crypto');


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Registra una nueva sesión de estudio para una cuenta.
 *
 * Una sesión puede estar vinculada a una tarea específica (estudio
 * dirigido) o ser libre (id_tarea = null). El campo modo_enfoque
 * indica si fue una sesión Pomodoro (true) o cronómetro libre (false).
 *
 * // CU-04 | RF-10 | RF-12 | E12 - registrarSesion()
 *
 * @async
 * @param {string}      id_cuenta        - UUID de la cuenta propietaria.
 * @param {number}      duracion_minutos - Duración en minutos (debe ser > 0).
 * @param {boolean}     [modo_enfoque=false] - true = sesión Pomodoro.
 * @param {string|null} [id_tarea=null]  - UUID de la tarea asociada. Opcional.
 * @returns {Promise<SesionEstudio>} La instancia creada.
 *
 * @example
 * // Sesión Pomodoro vinculada a una tarea
 * const sesion = await crearSesionEstudio(id_cuenta, 25, true, id_tarea);
 *
 * @example
 * // Sesión de estudio libre sin tarea
 * const sesion = await crearSesionEstudio(id_cuenta, 60, false);
 */
async function crearSesionEstudio(id_cuenta, duracion_minutos, modo_enfoque = false, id_tarea = null) {
  const sesion = await SesionEstudio.create({
    id_sesion: crypto.randomUUID(),
    id_cuenta,
    id_tarea,
    duracion_minutos,
    modo_enfoque
  });

  console.log('✅ Sesión de estudio registrada:', sesion.id_sesion,
    `| ${sesion.duracion_minutos} min | Pomodoro: ${sesion.modo_enfoque}`);
  return sesion;
}


// ─────────────────────────────────────────
// LEER TODAS DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Lista todas las sesiones de estudio de una cuenta específica.
 *
 * Filtra por id_cuenta para garantizar aislamiento de datos entre usuarios.
 *
 * // CU-05 | RF-11 | E12 - listarSesiones()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<SesionEstudio[]>} Arreglo de sesiones de la cuenta.
 */
async function listarSesionesEstudio(id_cuenta) {
  const sesiones = await SesionEstudio.findAll({ where: { id_cuenta } });

  console.log('📋 Sesiones de estudio:', sesiones.map(s => ({
    id: s.id_sesion,
    fecha: s.fecha,
    minutos: s.duracion_minutos,
    pomodoro: s.modo_enfoque
  })));

  return sesiones;
}


// ─────────────────────────────────────────
// LEER UNA
// ─────────────────────────────────────────

/**
 * Obtiene una sesión de estudio específica por su UUID.
 *
 * // RF-11 | E12 - obtenerSesion()
 *
 * @async
 * @param {string} id - UUID de la sesión.
 * @returns {Promise<SesionEstudio|null>} La instancia encontrada o null.
 */
async function obtenerSesionEstudio(id) {
  const sesion = await SesionEstudio.findByPk(id);
  console.log('🔍 Sesión encontrada:', sesion
    ? `${sesion.duracion_minutos} min — ${sesion.fecha}`
    : 'No existe');
  return sesion;
}


// ─────────────────────────────────────────
// ACTUALIZAR
// ─────────────────────────────────────────

/**
 * Actualiza campos de una sesión de estudio existente.
 *
 * // RF-10 | E12 - actualizarSesion()
 *
 * @async
 * @param {string} id    - UUID de la sesión.
 * @param {Object} datos - Campos a actualizar (duracion_minutos, modo_enfoque, id_tarea).
 * @returns {Promise<void>}
 */
async function actualizarSesionEstudio(id, datos) {
  const [filas] = await SesionEstudio.update(datos, {
    where: { id_sesion: id }
  });
  console.log(filas > 0 ? '✅ Sesión actualizada' : '⚠️ No se encontró la sesión');
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina una sesión de estudio de la base de datos.
 *
 * // RF-10 | E12 - eliminarSesion()
 *
 * @async
 * @param {string} id - UUID de la sesión a eliminar.
 * @returns {Promise<void>}
 */
async function eliminarSesionEstudio(id) {
  const filas = await SesionEstudio.destroy({ where: { id_sesion: id } });
  console.log(filas > 0 ? '🗑️ Sesión eliminada' : '⚠️ No se encontró la sesión');
}


// ─────────────────────────────────────────
// CALCULAR HORAS POR SEMANA (REGLA DE NEGOCIO)
// ─────────────────────────────────────────

/**
 * Calcula el total de horas estudiadas por una cuenta en un rango de fechas.
 *
 * Esta función implementa la lógica de negocio para calcular las
 * horas_estudiadas del Reporte semanal (RF-11).
 *
 * Fórmula: horas = SUM(duracion_minutos) / 60
 *
 * // CU-05 | RF-11 | E12 - calcularHorasSemana()
 *
 * @async
 * @param {string} id_cuenta   - UUID de la cuenta.
 * @param {string} fechaInicio - Fecha inicio del período (YYYY-MM-DD).
 * @param {string} fechaFin    - Fecha fin del período (YYYY-MM-DD).
 * @returns {Promise<number>} Total de horas (decimal con 2 cifras).
 *
 * @example
 * const horas = await calcularHorasSemana(id, '2026-05-19', '2026-05-25');
 * // → 12.50 (horas y media estudiadas en esa semana)
 */
async function calcularHorasSemana(id_cuenta, fechaInicio, fechaFin) {
  const { Op } = require('sequelize');

  const totalMinutos = await SesionEstudio.sum('duracion_minutos', {
    where: {
      id_cuenta,
      fecha: { [Op.between]: [fechaInicio, fechaFin] }
    }
  });

  const horas = parseFloat(((totalMinutos || 0) / 60).toFixed(2));
  console.log(`⏱️ Horas estudiadas (${fechaInicio} → ${fechaFin}): ${horas}h`);
  return horas;
}


module.exports = {
  crearSesionEstudio,
  listarSesionesEstudio,
  obtenerSesionEstudio,
  actualizarSesionEstudio,
  eliminarSesionEstudio,
  calcularHorasSemana
};
