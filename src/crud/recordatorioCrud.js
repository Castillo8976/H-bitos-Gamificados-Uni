/**
 * @fileoverview Controlador CRUD para la entidad Recordatorio.
 * Gestiona las alertas automáticas programadas para las tareas académicas.
 * Incluye la lógica de activación/desactivación y marcado de enviado.
 *
 * @module crud/recordatorioCrud
 * @requires ../models/Recordatorio
 * @requires crypto
 *
 * // RF-04 | RNF-15 | E12 - RecordatorioService
 */

const Recordatorio = require('../crud-models/models/Recordatorio');
const crypto = require('crypto');


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea un recordatorio automático para una tarea.
 *
 * Se genera automáticamente al crear una tarea con fecha de entrega.
 * La fecha_programada debe ser al menos 24 horas antes de la entrega (RF-04).
 *
 * // CU-10 | RF-04 | RNF-15 | E12 - crearRecordatorio()
 *
 * @async
 * @param {string} id_tarea          - UUID de la tarea asociada.
 * @param {string} id_cuenta         - UUID de la cuenta destinataria.
 * @param {string} fecha_programada  - Fecha de envío (YYYY-MM-DD).
 * @param {string} mensaje           - Texto de la notificación.
 * @returns {Promise<Recordatorio>} El recordatorio creado.
 *
 * @example
 * // Se crea automáticamente al crear una tarea con fecha 2026-05-25
 * const rec = await crearRecordatorio(
 *   id_tarea,
 *   id_cuenta,
 *   '2026-05-24',   // 24h antes de la fecha de entrega
 *   'Entrega "Proyecto Final" mañana a las 23:59'
 * );
 */
async function crearRecordatorio(id_tarea, id_cuenta, fecha_programada, mensaje) {
  const recordatorio = await Recordatorio.create({
    id_recordatorio: crypto.randomUUID(),
    id_tarea,
    id_cuenta,
    fecha_programada,
    mensaje
  });

  console.log(`✅ Recordatorio creado: "${recordatorio.mensaje}" | Fecha: ${recordatorio.fecha_programada}`);
  return recordatorio;
}


/**
 * Genera un recordatorio automático a partir de una tarea.
 * Calcula la fecha_programada como 1 día antes de fecha_entrega.
 *
 * // CU-02 | CU-10 | RF-04 | E12 - generarRecordatorioAutomatico()
 *
 * @async
 * @param {string} id_tarea      - UUID de la tarea.
 * @param {string} id_cuenta     - UUID de la cuenta.
 * @param {string} nombre_tarea  - Nombre de la tarea para el mensaje.
 * @param {string} fecha_entrega - Fecha de entrega de la tarea (YYYY-MM-DD).
 * @returns {Promise<Recordatorio>}
 */
async function generarRecordatorioAutomatico(id_tarea, id_cuenta, nombre_tarea, fecha_entrega) {
  // Calcula la fecha programada: 1 día antes de la entrega
  const fechaEntregaDate = new Date(fecha_entrega);
  fechaEntregaDate.setDate(fechaEntregaDate.getDate() - 1);
  const fecha_programada = fechaEntregaDate.toISOString().split('T')[0];

  const mensaje = `⚠️ Recordatorio: "${nombre_tarea}" vence mañana`;

  return crearRecordatorio(id_tarea, id_cuenta, fecha_programada, mensaje);
}


// ─────────────────────────────────────────
// LEER TODOS DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Lista todos los recordatorios de una cuenta.
 * Filtra opcionalmente por estado activo/pendiente.
 *
 * // CU-10 | RF-04 | E12 - listarRecordatorios()
 *
 * @async
 * @param {string}       id_cuenta          - UUID de la cuenta.
 * @param {boolean|null} [soloActivos=null] - true = solo activos y no enviados.
 * @returns {Promise<Recordatorio[]>}
 */
async function listarRecordatorios(id_cuenta, soloActivos = null) {
  const where = { id_cuenta };
  if (soloActivos === true) {
    where.activo = true;
    where.enviado = false;
  }

  const recordatorios = await Recordatorio.findAll({ where });

  console.log('📋 Recordatorios:', recordatorios.map(r => ({
    mensaje: r.mensaje,
    fecha: r.fecha_programada,
    activo: r.activo,
    enviado: r.enviado
  })));

  return recordatorios;
}


// ─────────────────────────────────────────
// LEER UNO
// ─────────────────────────────────────────

/**
 * Obtiene un recordatorio específico por UUID.
 *
 * @async
 * @param {string} id - UUID del recordatorio.
 * @returns {Promise<Recordatorio|null>}
 */
async function obtenerRecordatorio(id) {
  const rec = await Recordatorio.findByPk(id);
  console.log('🔍 Recordatorio encontrado:', rec?.mensaje ?? 'No existe');
  return rec;
}


// ─────────────────────────────────────────
// MARCAR COMO ENVIADO
// ─────────────────────────────────────────

/**
 * Marca un recordatorio como enviado para evitar reenvíos.
 *
 * // CU-10 | RF-04 | RNF-15 | E12 - marcarEnviado()
 *
 * @async
 * @param {string} id - UUID del recordatorio.
 * @returns {Promise<void>}
 */
async function marcarRecordatorioEnviado(id) {
  const [filas] = await Recordatorio.update(
    { enviado: true },
    { where: { id_recordatorio: id } }
  );
  console.log(filas > 0 ? '✅ Recordatorio marcado como enviado' : '⚠️ No se encontró el recordatorio');
}


// ─────────────────────────────────────────
// ACTIVAR / DESACTIVAR
// ─────────────────────────────────────────

/**
 * Activa o desactiva un recordatorio sin eliminarlo.
 *
 * // CU-10 | RF-04 | E12 - toggleRecordatorio()
 *
 * @async
 * @param {string}  id     - UUID del recordatorio.
 * @param {boolean} activo - true = activar, false = desactivar.
 * @returns {Promise<void>}
 */
async function toggleRecordatorio(id, activo) {
  const [filas] = await Recordatorio.update(
    { activo },
    { where: { id_recordatorio: id } }
  );
  const estado = activo ? 'activado' : 'desactivado';
  console.log(filas > 0 ? `✅ Recordatorio ${estado}` : '⚠️ No se encontró el recordatorio');
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina un recordatorio de la base de datos.
 *
 * @async
 * @param {string} id - UUID del recordatorio.
 * @returns {Promise<void>}
 */
async function eliminarRecordatorio(id) {
  const filas = await Recordatorio.destroy({ where: { id_recordatorio: id } });
  console.log(filas > 0 ? '🗑️ Recordatorio eliminado' : '⚠️ No se encontró el recordatorio');
}


module.exports = {
  crearRecordatorio,
  generarRecordatorioAutomatico,
  listarRecordatorios,
  obtenerRecordatorio,
  marcarRecordatorioEnviado,
  toggleRecordatorio,
  eliminarRecordatorio
};
