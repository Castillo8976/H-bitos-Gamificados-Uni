/**
 * @fileoverview Controlador CRUD para la entidad Reto.
 * Gestiona los desafíos semanales gamificados. Incluye la regla de
 * negocio que garantiza 1 reto por semana por usuario (UNIQUE id_cuenta+semana)
 * y la lógica de completado que acredita puntos automáticamente.
 *
 * @module crud/retoCrud
 * @requires ../models/Reto
 * @requires crypto
 *
 * // RF-06 | RF-07 | E12 - RetoService
 */

const Reto = require('../crud-models/models/Reto');
const crypto = require('crypto');


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea un nuevo reto semanal para una cuenta.
 *
 * La restricción UNIQUE (id_cuenta, semana) en la BD garantiza que
 * no puedan existir dos retos para el mismo usuario en la misma semana.
 *
 * // CU-06 | RF-06 | E12 - crearReto()
 *
 * @async
 * @param {string} id_cuenta         - UUID de la cuenta asignada.
 * @param {string} descripcion       - Texto legible del desafío.
 * @param {string} condicion         - Regla evaluable por el sistema.
 * @param {number} puntos_recompensa - Puntos al completar (debe ser > 0).
 * @param {string} semana            - Semana en formato YYYY-WNN (ej: '2026-W21').
 * @returns {Promise<Reto>} El reto creado.
 *
 * @example
 * const reto = await crearReto(
 *   id_cuenta,
 *   'Completa 3 tareas de Alta prioridad esta semana',
 *   'tareas_alta_completadas >= 3',
 *   50,
 *   '2026-W21'
 * );
 */
async function crearReto(id_cuenta, descripcion, condicion, puntos_recompensa, semana) {
  const reto = await Reto.create({
    id_reto: crypto.randomUUID(),
    id_cuenta,
    descripcion,
    condicion,
    puntos_recompensa,
    semana
  });

  console.log(`✅ Reto creado: "${reto.descripcion}" | Semana: ${reto.semana} | ${reto.puntos_recompensa} pts`);
  return reto;
}


// ─────────────────────────────────────────
// LEER TODOS DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Lista todos los retos de una cuenta, opcionalmente filtrado por semana.
 *
 * // CU-06 | RF-06 | E12 - listarRetos()
 *
 * @async
 * @param {string}      id_cuenta        - UUID de la cuenta.
 * @param {string|null} [semana=null]    - Filtrar por semana específica. null = todos.
 * @returns {Promise<Reto[]>} Arreglo de retos.
 */
async function listarRetos(id_cuenta, semana = null) {
  const where = { id_cuenta };
  if (semana) where.semana = semana;

  const retos = await Reto.findAll({ where });

  console.log('📋 Retos:', retos.map(r => ({
    semana: r.semana,
    descripcion: r.descripcion,
    progreso: r.progreso,
    completado: r.completado
  })));

  return retos;
}


// ─────────────────────────────────────────
// LEER UNO
// ─────────────────────────────────────────

/**
 * Obtiene un reto específico por UUID.
 *
 * @async
 * @param {string} id - UUID del reto.
 * @returns {Promise<Reto|null>}
 */
async function obtenerReto(id) {
  const reto = await Reto.findByPk(id);
  console.log('🔍 Reto encontrado:', reto?.descripcion ?? 'No existe');
  return reto;
}


// ─────────────────────────────────────────
// ACTUALIZAR PROGRESO
// ─────────────────────────────────────────

/**
 * Actualiza el progreso de un reto incrementando su valor actual.
 *
 * // CU-06 | RF-06 | E12 - actualizarProgreso()
 *
 * @async
 * @param {string} id       - UUID del reto.
 * @param {number} incremento - Cantidad a sumar al progreso actual.
 * @returns {Promise<Reto|null>} El reto actualizado.
 */
async function actualizarProgresoReto(id, incremento) {
  const reto = await Reto.findByPk(id);
  if (!reto) {
    console.log('⚠️ No se encontró el reto');
    return null;
  }

  const nuevoProgreso = reto.progreso + incremento;
  await reto.update({ progreso: nuevoProgreso });

  console.log(`📈 Progreso del reto actualizado: ${reto.progreso} pts | "${reto.descripcion}"`);
  return reto;
}


// ─────────────────────────────────────────
// COMPLETAR RETO (REGLA DE NEGOCIO)
// ─────────────────────────────────────────

/**
 * Marca un reto como completado y acredita los puntos de recompensa.
 *
 * Implementa la regla de negocio RF-06: al completar el reto, el sistema
 * crea automáticamente un registro en Punto con origen='Reto'.
 *
 * // CU-06 | RF-06 | RF-07 | E12 - completarReto()
 *
 * @async
 * @param {string} id - UUID del reto a completar.
 * @returns {Promise<{reto: Reto, puntosOtorgados: number}|null>}
 *
 * @example
 * const resultado = await completarReto(id_reto);
 * // → { reto: {...}, puntosOtorgados: 50 }
 * // → Crea automáticamente registro en tabla punto
 */
async function completarReto(id) {
  const reto = await Reto.findByPk(id);

  if (!reto) {
    console.log('⚠️ No se encontró el reto');
    return null;
  }

  if (reto.completado) {
    console.log('⚠️ Este reto ya fue completado anteriormente');
    return null;
  }

  // Marca el reto como completado
  await reto.update({ completado: true });

  // Acredita los puntos — importación dinámica para evitar dependencia circular
  const { otorgarPuntos } = require('../crud-models/crud/puntoCrud');
  await otorgarPuntos(reto.id_cuenta, reto.puntos_recompensa, 'Reto', reto.id_reto);

  console.log(`🎯 ¡Reto completado! "${reto.descripcion}" | +${reto.puntos_recompensa} pts`);
  return { reto, puntosOtorgados: reto.puntos_recompensa };
}


// ─────────────────────────────────────────
// ACTUALIZAR
// ─────────────────────────────────────────

/**
 * Actualiza campos generales de un reto.
 *
 * @async
 * @param {string} id    - UUID del reto.
 * @param {Object} datos - Campos a actualizar.
 * @returns {Promise<void>}
 */
async function actualizarReto(id, datos) {
  const [filas] = await Reto.update(datos, { where: { id_reto: id } });
  console.log(filas > 0 ? '✅ Reto actualizado' : '⚠️ No se encontró el reto');
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina un reto de la base de datos.
 *
 * @async
 * @param {string} id - UUID del reto.
 * @returns {Promise<void>}
 */
async function eliminarReto(id) {
  const filas = await Reto.destroy({ where: { id_reto: id } });
  console.log(filas > 0 ? '🗑️ Reto eliminado' : '⚠️ No se encontró el reto');
}


module.exports = {
  crearReto,
  listarRetos,
  obtenerReto,
  actualizarProgresoReto,
  completarReto,
  actualizarReto,
  eliminarReto
};
