/**
 * @fileoverview Controlador CRUD para la entidad Punto.
 * Gestiona el historial de transacciones de puntos gamificados.
 * Cada fila representa un evento de ganancia (ledger inmutable).
 * El total de puntos se obtiene con SUM().
 *
 * @module crud/puntoCrud
 * @requires ../models/Punto
 * @requires crypto
 *
 * // RF-03 | RF-07 | E12 - PuntoService
 */

const Punto = require('../crud-models/models/Punto');
const crypto = require('crypto');


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Registra una nueva transacción de puntos para una cuenta.
 *
 * Esta función es la única vía para acreditar puntos. Siempre crea
 * una nueva fila (append-only), nunca modifica registros existentes.
 *
 * // CU-03 | RF-03 | RF-07 | E12 - otorgarPuntos()
 *
 * @async
 * @param {string}      id_cuenta  - UUID de la cuenta receptora.
 * @param {number}      cantidad   - Puntos a otorgar (debe ser > 0).
 * @param {string}      origen     - Fuente: 'Tarea' | 'Reto' | 'Sesion'.
 * @param {string|null} [id_origen=null] - UUID de la entidad que generó los puntos.
 * @returns {Promise<Punto>} La transacción de puntos creada.
 *
 * @example
 * // Puntos por completar una tarea
 * await otorgarPuntos(id_cuenta, 10, 'Tarea', id_tarea);
 *
 * @example
 * // Puntos por completar un reto
 * await otorgarPuntos(id_cuenta, 50, 'Reto', id_reto);
 *
 * @example
 * // Puntos por sesión de estudio (sin entidad específica)
 * await otorgarPuntos(id_cuenta, 5, 'Sesion', null);
 */
async function otorgarPuntos(id_cuenta, cantidad, origen, id_origen = null) {
  if (cantidad <= 0) {
    console.error('❌ La cantidad de puntos debe ser mayor a 0');
    return null;
  }

  const punto = await Punto.create({
    id_punto: crypto.randomUUID(),
    id_cuenta,
    cantidad,
    origen,
    id_origen
  });

  console.log(`✅ Puntos otorgados: +${cantidad} pts | Origen: ${origen} | Cuenta: ${id_cuenta}`);
  return punto;
}


// ─────────────────────────────────────────
// LEER TODAS DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Lista el historial completo de puntos de una cuenta.
 *
 * // CU-05 | RF-07 | E12 - listarPuntos()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<Punto[]>} Historial de transacciones de puntos.
 */
async function listarPuntos(id_cuenta) {
  const puntos = await Punto.findAll({ where: { id_cuenta } });

  console.log('📋 Historial de puntos:', puntos.map(p => ({
    id: p.id_punto,
    cantidad: p.cantidad,
    origen: p.origen,
    fecha: p.fecha
  })));

  return puntos;
}


// ─────────────────────────────────────────
// LEER UNO
// ─────────────────────────────────────────

/**
 * Obtiene un registro de puntos específico por UUID.
 *
 * @async
 * @param {string} id - UUID del registro de puntos.
 * @returns {Promise<Punto|null>}
 */
async function obtenerPunto(id) {
  const punto = await Punto.findByPk(id);
  console.log('🔍 Punto encontrado:', punto
    ? `${punto.cantidad} pts — ${punto.origen}`
    : 'No existe');
  return punto;
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina un registro de puntos (uso administrativo).
 * En producción los puntos son inmutables; este método es solo
 * para correcciones administrativas o pruebas.
 *
 * @async
 * @param {string} id - UUID del registro a eliminar.
 * @returns {Promise<void>}
 */
async function eliminarPunto(id) {
  const filas = await Punto.destroy({ where: { id_punto: id } });
  console.log(filas > 0 ? '🗑️ Punto eliminado' : '⚠️ No se encontró el registro');
}


// ─────────────────────────────────────────
// CALCULAR TOTAL (REGLA DE NEGOCIO)
// ─────────────────────────────────────────

/**
 * Calcula el total de puntos acumulados por una cuenta.
 *
 * Implementa la regla de negocio RF-07: el puntaje total es la
 * suma de todos los registros de la tabla punto para esa cuenta.
 *
 * // CU-05 | RF-07 | E12 - calcularTotalPuntos()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<number>} Total de puntos acumulados.
 *
 * @example
 * const total = await calcularTotalPuntos(id_cuenta);
 * // → 285 (puntos acumulados)
 */
async function calcularTotalPuntos(id_cuenta) {
  const total = await Punto.sum('cantidad', { where: { id_cuenta } });
  const resultado = total || 0;
  console.log(`🏆 Total de puntos de la cuenta ${id_cuenta}: ${resultado} pts`);
  return resultado;
}


/**
 * Calcula los puntos acumulados por una cuenta en un rango de fechas.
 * Se usa para calcular puntos_obtenidos en el Reporte semanal (RF-11).
 *
 * // CU-05 | RF-11 | E12 - calcularPuntosSemana()
 *
 * @async
 * @param {string} id_cuenta   - UUID de la cuenta.
 * @param {string} fechaInicio - Inicio del período (YYYY-MM-DD).
 * @param {string} fechaFin    - Fin del período (YYYY-MM-DD).
 * @returns {Promise<number>} Total de puntos en el período.
 */
async function calcularPuntosSemana(id_cuenta, fechaInicio, fechaFin) {
  const { Op } = require('sequelize');

  const total = await Punto.sum('cantidad', {
    where: {
      id_cuenta,
      fecha: { [Op.between]: [fechaInicio, fechaFin] }
    }
  });

  const resultado = total || 0;
  console.log(`📊 Puntos semana (${fechaInicio} → ${fechaFin}): ${resultado} pts`);
  return resultado;
}


module.exports = {
  otorgarPuntos,
  listarPuntos,
  obtenerPunto,
  eliminarPunto,
  calcularTotalPuntos,
  calcularPuntosSemana
};
