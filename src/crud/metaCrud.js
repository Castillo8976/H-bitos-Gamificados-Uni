/**
 * @fileoverview Controlador CRUD para la entidad Meta.
 * Gestiona los objetivos semanales de rendimiento de cada usuario.
 * Incluye la lógica de actualización de progreso y verificación
 * automática de cumplimiento (valor_actual >= valor_objetivo).
 *
 * @module crud/metaCrud
 * @requires ../models/Meta
 * @requires crypto
 *
 * // RF-15 | E12 - MetaService
 */

const Meta = require('../crud-models/models/Meta');
const crypto = require('crypto');


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea un nuevo objetivo semanal para una cuenta.
 *
 * La restricción UNIQUE (id_cuenta, semana) garantiza 1 meta por semana.
 *
 * // CU-05 | RF-15 | E12 - crearMeta()
 *
 * @async
 * @param {string} id_cuenta      - UUID de la cuenta destinataria.
 * @param {string} semana         - Semana en formato YYYY-WNN.
 * @param {string} descripcion    - Texto del objetivo a alcanzar.
 * @param {number} valor_objetivo - Valor numérico objetivo (debe ser > 0).
 * @returns {Promise<Meta>} La meta creada.
 *
 * @example
 * const meta = await crearMeta(
 *   id_cuenta,
 *   '2026-W21',
 *   'Completar 5 tareas esta semana',
 *   5
 * );
 */
async function crearMeta(id_cuenta, semana, descripcion, valor_objetivo) {
  const meta = await Meta.create({
    id_meta: crypto.randomUUID(),
    id_cuenta,
    semana,
    descripcion,
    valor_objetivo
  });

  console.log(`✅ Meta creada: "${meta.descripcion}" | Objetivo: ${meta.valor_objetivo} | Semana: ${meta.semana}`);
  return meta;
}


// ─────────────────────────────────────────
// LEER TODAS DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Lista todas las metas de una cuenta, opcionalmente por semana.
 *
 * // CU-05 | RF-15 | E12 - listarMetas()
 *
 * @async
 * @param {string}      id_cuenta     - UUID de la cuenta.
 * @param {string|null} [semana=null] - Filtrar por semana. null = todas.
 * @returns {Promise<Meta[]>}
 */
async function listarMetas(id_cuenta, semana = null) {
  const where = { id_cuenta };
  if (semana) where.semana = semana;

  const metas = await Meta.findAll({ where });

  console.log('📋 Metas:', metas.map(m => ({
    semana: m.semana,
    descripcion: m.descripcion,
    progreso: `${m.valor_actual}/${m.valor_objetivo}`,
    cumplida: m.cumplida
  })));

  return metas;
}


// ─────────────────────────────────────────
// LEER UNA
// ─────────────────────────────────────────

/**
 * Obtiene una meta específica por UUID.
 *
 * @async
 * @param {string} id - UUID de la meta.
 * @returns {Promise<Meta|null>}
 */
async function obtenerMeta(id) {
  const meta = await Meta.findByPk(id);
  console.log('🔍 Meta encontrada:', meta?.descripcion ?? 'No existe');
  return meta;
}


// ─────────────────────────────────────────
// ACTUALIZAR PROGRESO (REGLA DE NEGOCIO)
// ─────────────────────────────────────────

/**
 * Incrementa el progreso de una meta y la marca como cumplida
 * automáticamente cuando valor_actual >= valor_objetivo.
 *
 * Implementa la regla de negocio RF-15: el progreso se actualiza
 * automáticamente y cumplida se mantiene explícita para consistencia histórica.
 *
 * // CU-05 | RF-15 | E12 - actualizarProgresoMeta()
 *
 * @async
 * @param {string} id         - UUID de la meta.
 * @param {number} incremento - Cantidad a sumar al valor_actual.
 * @returns {Promise<{meta: Meta, recienCumplida: boolean}|null>}
 *
 * @example
 * const resultado = await actualizarProgresoMeta(id_meta, 1);
 * if (resultado.recienCumplida) {
 *   console.log('¡Meta de la semana cumplida!');
 * }
 */
async function actualizarProgresoMeta(id, incremento) {
  const meta = await Meta.findByPk(id);
  if (!meta) {
    console.log('⚠️ No se encontró la meta');
    return null;
  }

  if (meta.cumplida) {
    console.log('ℹ️ La meta ya estaba cumplida');
    return { meta, recienCumplida: false };
  }

  const nuevoValor = meta.valor_actual + incremento;
  const ahora_cumplida = nuevoValor >= meta.valor_objetivo;

  await meta.update({
    valor_actual: nuevoValor,
    cumplida: ahora_cumplida
  });

  if (ahora_cumplida) {
    console.log(`🎯 ¡Meta cumplida! "${meta.descripcion}" (${nuevoValor}/${meta.valor_objetivo})`);
  } else {
    console.log(`📈 Progreso meta: ${nuevoValor}/${meta.valor_objetivo} | "${meta.descripcion}"`);
  }

  return { meta, recienCumplida: ahora_cumplida };
}


// ─────────────────────────────────────────
// ACTUALIZAR
// ─────────────────────────────────────────

/**
 * Actualiza campos generales de una meta.
 *
 * @async
 * @param {string} id    - UUID de la meta.
 * @param {Object} datos - Campos a actualizar.
 * @returns {Promise<void>}
 */
async function actualizarMeta(id, datos) {
  const [filas] = await Meta.update(datos, { where: { id_meta: id } });
  console.log(filas > 0 ? '✅ Meta actualizada' : '⚠️ No se encontró la meta');
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina una meta de la base de datos.
 *
 * @async
 * @param {string} id - UUID de la meta.
 * @returns {Promise<void>}
 */
async function eliminarMeta(id) {
  const filas = await Meta.destroy({ where: { id_meta: id } });
  console.log(filas > 0 ? '🗑️ Meta eliminada' : '⚠️ No se encontró la meta');
}


module.exports = {
  crearMeta,
  listarMetas,
  obtenerMeta,
  actualizarProgresoMeta,
  actualizarMeta,
  eliminarMeta
};
