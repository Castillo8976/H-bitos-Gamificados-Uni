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

const Reto = require('../models/Reto');
const Punto = require('../models/Punto');
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
  // RN28: un reto inactivo o ya completado no acumula progreso.
  if (!reto.activo || reto.completado) return null;

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
  // RN10/RN28 (Decisión #09): una sola transacción; el UPDATE condicionado elige un único ganador
  // y uq_punto_evento (id_cuenta, origen, id_origen) respalda la acreditación única del reto.
  return Reto.sequelize.transaction(async transaction => {
    const [filas] = await Reto.update(
      { completado: true },
      { where: { id_reto: id, completado: false, activo: true }, transaction }
    );
    if (!filas) {
      console.log('⚠️ Reto inexistente, inactivo o ya completado');
      return null;
    }
    const reto = await Reto.findByPk(id, { transaction });
    await Punto.create({
      id_punto: crypto.randomUUID(), id_cuenta: reto.id_cuenta, cantidad: reto.puntos_recompensa,
      origen: 'Reto', id_origen: reto.id_reto
    }, { transaction });
    console.log(`🎯 ¡Reto completado! "${reto.descripcion}" | +${reto.puntos_recompensa} pts`);
    return { reto, puntosOtorgados: reto.puntos_recompensa };
  });
}

/**
 * Cambia el estado de un reto (RF06/HU18/HU31/RN28, Decisión #09; E12 activarReto/desactivarReto).
 * No altera progreso, recompensa, completado ni puntos acreditados.
 *
 * @async
 * @param {string}  id     - UUID del reto.
 * @param {boolean} activo - Nuevo estado.
 * @returns {Promise<void>}
 */
async function cambiarEstadoReto(id, activo) {
  await Reto.update({ activo }, { where: { id_reto: id } });
}

/** RF06/HU31/RN28: reactiva el reto sin reiniciar progreso ni volver a acreditar. */
const activarReto = id => cambiarEstadoReto(id, true);
/** RF06/HU31/RN28: detiene el progreso automático y las nuevas recompensas del reto. */
const desactivarReto = id => cambiarEstadoReto(id, false);


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
  // Decisión #09: recompensa, progreso y semana solo cambian si el reto sigue sin completar (atómico).
  const protegido = CAMPOS_PROTEGIDOS.some(campo => Object.hasOwn(datos, campo));
  const [filas] = await Reto.update(datos, { where: { id_reto: id, ...(protegido && { completado: false }) } });
  console.log(filas > 0 ? '✅ Reto actualizado' : '⚠️ Reto inexistente o completado');
  return filas;
}

/** Campos que un reto completado conserva tal como se acreditó (Decisión #09). */
const CAMPOS_PROTEGIDOS = ['puntos_recompensa', 'progreso', 'semana'];


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
  // Decisión #09: un reto completado nunca se elimina, aunque la comprobación previa compita con un completado.
  const filas = await Reto.destroy({ where: { id_reto: id, completado: false } });
  console.log(filas > 0 ? '🗑️ Reto eliminado' : '⚠️ No se encontró el reto');
}


module.exports = {
  crearReto,
  listarRetos,
  obtenerReto,
  actualizarProgresoReto,
  completarReto,
  activarReto,
  desactivarReto,
  actualizarReto,
  CAMPOS_PROTEGIDOS,
  eliminarReto
};
