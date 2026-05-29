/**
 * @fileoverview Controlador CRUD para la entidad Notificacion.
 * Gestiona el historial de notificaciones in-app generadas por eventos
 * del sistema: insignias, retos, metas, subidas de nivel y mensajes del sistema.
 *
 * @module crud/notificacionCrud
 * @requires ../models/Notificacion
 * @requires crypto
 *
 * // RF-04 | RNF-13 | RNF-15 | E12 - NotificacionService
 */

const Notificacion = require('../crud-models/models/Notificacion');
const crypto = require('crypto');


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea una nueva notificación in-app para una cuenta.
 *
 * Esta función es llamada por otros controladores cuando ocurren
 * eventos relevantes (completar reto, desbloquear insignia, subir nivel).
 *
 * // CU-10 | RF-04 | RNF-13 | E12 - crearNotificacion()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta destinataria.
 * @param {string} tipo      - Categoría: 'Insignia'|'Reto'|'Meta'|'Nivel'|'Sistema'.
 * @param {string} mensaje   - Texto a mostrar al usuario (máx. 200 caracteres).
 * @returns {Promise<Notificacion>} La notificación creada.
 *
 * @example
 * await crearNotificacion(id_cuenta, 'Insignia', '¡Desbloqueaste "Primera tarea"! 🏅');
 * await crearNotificacion(id_cuenta, 'Reto', '¡Completaste tu reto semanal! +50 pts 🎯');
 * await crearNotificacion(id_cuenta, 'Nivel', '¡Subiste al nivel "Estudiante"! 🎖️');
 */
async function crearNotificacion(id_cuenta, tipo, mensaje) {
  const notificacion = await Notificacion.create({
    id_notificacion: crypto.randomUUID(),
    id_cuenta,
    tipo,
    mensaje
  });

  console.log(`🔔 Notificación creada [${notificacion.tipo}]: "${notificacion.mensaje}"`);
  return notificacion;
}


// ─────────────────────────────────────────
// LEER TODAS DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Lista las notificaciones de una cuenta, opcionalmente filtrando
 * solo las no leídas (para el badge del contador en la UI).
 *
 * // CU-10 | RF-04 | E12 - listarNotificaciones()
 *
 * @async
 * @param {string}       id_cuenta         - UUID de la cuenta.
 * @param {boolean|null} [soloNoLeidas=null] - true = solo no leídas, null = todas.
 * @returns {Promise<Notificacion[]>}
 */
async function listarNotificaciones(id_cuenta, soloNoLeidas = null) {
  const where = { id_cuenta };
  if (soloNoLeidas === true) where.leida = false;

  const notificaciones = await Notificacion.findAll({
    where,
    order: [['fecha', 'DESC']] // Más recientes primero
  });

  console.log(`📋 Notificaciones (${soloNoLeidas ? 'no leídas' : 'todas'}):`,
    notificaciones.map(n => ({
      tipo: n.tipo,
      mensaje: n.mensaje,
      leida: n.leida,
      fecha: n.fecha
    }))
  );

  return notificaciones;
}


// ─────────────────────────────────────────
// CONTAR NO LEÍDAS (BADGE UI)
// ─────────────────────────────────────────

/**
 * Cuenta las notificaciones no leídas de una cuenta.
 * Se usa para mostrar el badge numérico en el ícono de notificaciones.
 *
 * // CU-10 | RF-04 | E12 - contarNoLeidas()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<number>} Cantidad de notificaciones no leídas.
 *
 * @example
 * const pendientes = await contarNotificacionesNoLeidas(id_cuenta);
 * // → 3 (mostrar badge "3" en la campana de notificaciones)
 */
async function contarNotificacionesNoLeidas(id_cuenta) {
  const cantidad = await Notificacion.count({
    where: { id_cuenta, leida: false }
  });
  console.log(`🔔 Notificaciones no leídas: ${cantidad}`);
  return cantidad;
}


// ─────────────────────────────────────────
// MARCAR COMO LEÍDA
// ─────────────────────────────────────────

/**
 * Marca una notificación específica como leída.
 *
 * // CU-10 | RF-04 | E12 - marcarLeida()
 *
 * @async
 * @param {string} id - UUID de la notificación.
 * @returns {Promise<void>}
 */
async function marcarNotificacionLeida(id) {
  const [filas] = await Notificacion.update(
    { leida: true },
    { where: { id_notificacion: id } }
  );
  console.log(filas > 0 ? '✅ Notificación marcada como leída' : '⚠️ No se encontró la notificación');
}


// ─────────────────────────────────────────
// MARCAR TODAS COMO LEÍDAS
// ─────────────────────────────────────────

/**
 * Marca todas las notificaciones no leídas de una cuenta como leídas.
 * Se usa cuando el usuario abre el panel de notificaciones.
 *
 * // CU-10 | RF-04 | E12 - marcarTodasLeidas()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<number>} Cantidad de notificaciones marcadas.
 */
async function marcarTodasLeidas(id_cuenta) {
  const [filas] = await Notificacion.update(
    { leida: true },
    { where: { id_cuenta, leida: false } }
  );
  console.log(`✅ ${filas} notificaciones marcadas como leídas`);
  return filas;
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina una notificación específica.
 *
 * @async
 * @param {string} id - UUID de la notificación.
 * @returns {Promise<void>}
 */
async function eliminarNotificacion(id) {
  const filas = await Notificacion.destroy({ where: { id_notificacion: id } });
  console.log(filas > 0 ? '🗑️ Notificación eliminada' : '⚠️ No se encontró la notificación');
}


/**
 * Elimina todas las notificaciones leídas de una cuenta.
 * Útil para limpiar el historial de notificaciones antiguas.
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<number>} Cantidad de notificaciones eliminadas.
 */
async function limpiarNotificacionesLeidas(id_cuenta) {
  const filas = await Notificacion.destroy({
    where: { id_cuenta, leida: true }
  });
  console.log(`🗑️ ${filas} notificaciones leídas eliminadas`);
  return filas;
}


module.exports = {
  crearNotificacion,
  listarNotificaciones,
  contarNotificacionesNoLeidas,
  marcarNotificacionLeida,
  marcarTodasLeidas,
  eliminarNotificacion,
  limpiarNotificacionesLeidas
};
