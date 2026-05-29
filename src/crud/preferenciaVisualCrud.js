/**
 * @fileoverview Controlador CRUD para la entidad PreferenciaVisual.
 * Gestiona la configuración de apariencia 1:1 de cada usuario.
 * Incluye la lógica de creación automática al registrarse y
 * actualización de tema, modo oscuro y avatar.
 *
 * @module crud/preferenciaVisualCrud
 * @requires ../models/PreferenciaVisual
 * @requires crypto
 *
 * // RF-13 | RNF-04 | E12 - PreferenciaVisualService
 */

const PreferenciaVisual = require('../crud-models/models/PreferenciaVisual');
const crypto = require('crypto');


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea las preferencias visuales iniciales para una cuenta.
 *
 * Se llama automáticamente al registrar una nueva cuenta (CU-01).
 * La restricción UNIQUE en id_cuenta garantiza relación 1:1 con Cuenta.
 *
 * // CU-01 | CU-08 | RF-13 | RNF-04 | E12 - crearPreferencia()
 *
 * @async
 * @param {string}      id_cuenta       - UUID de la cuenta propietaria.
 * @param {string}      [tema='purple'] - Tema de color inicial.
 * @param {boolean}     [modo_oscuro=false] - Modo oscuro activo.
 * @param {string|null} [avatar=null]   - Nombre del archivo de avatar.
 * @returns {Promise<PreferenciaVisual>} La preferencia creada.
 *
 * @example
 * // Creación automática al registrar cuenta (valores por defecto)
 * const pref = await crearPreferenciaVisual(id_cuenta);
 *
 * @example
 * // Creación con configuración inicial personalizada
 * const pref = await crearPreferenciaVisual(id_cuenta, 'teal', true, 'avatar_01.png');
 */
async function crearPreferenciaVisual(id_cuenta, tema = 'purple', modo_oscuro = false, avatar = null) {
  const preferencia = await PreferenciaVisual.create({
    id_preferencia: crypto.randomUUID(),
    id_cuenta,
    tema,
    modo_oscuro,
    avatar
  });

  console.log(`✅ Preferencias visuales creadas: tema=${preferencia.tema} | modo_oscuro=${preferencia.modo_oscuro}`);
  return preferencia;
}


// ─────────────────────────────────────────
// LEER DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Obtiene las preferencias visuales de una cuenta.
 *
 * // CU-08 | RF-13 | E12 - obtenerPreferencias()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<PreferenciaVisual|null>} La preferencia de esa cuenta.
 */
async function obtenerPreferenciaVisual(id_cuenta) {
  const preferencia = await PreferenciaVisual.findOne({ where: { id_cuenta } });
  console.log('🔍 Preferencia visual:', preferencia
    ? `tema=${preferencia.tema} | oscuro=${preferencia.modo_oscuro}`
    : 'No existe');
  return preferencia;
}


// ─────────────────────────────────────────
// ACTUALIZAR
// ─────────────────────────────────────────

/**
 * Actualiza las preferencias visuales de una cuenta.
 * Registra automáticamente la fecha de modificación.
 *
 * // CU-08 | RF-13 | RNF-04 | E12 - actualizarPreferencias()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @param {Object} datos     - Campos a actualizar.
 * @param {string}  [datos.tema]        - Nuevo tema ('purple'|'teal'|'amber'|'coral'|'blue'|'green').
 * @param {boolean} [datos.modo_oscuro] - Activar/desactivar modo oscuro.
 * @param {string}  [datos.avatar]      - Nuevo nombre de archivo de avatar.
 * @returns {Promise<void>}
 *
 * @example
 * await actualizarPreferenciaVisual(id_cuenta, { tema: 'teal', modo_oscuro: true });
 */
async function actualizarPreferenciaVisual(id_cuenta, datos) {
  // Actualiza también la fecha de modificación
  const hoy = new Date().toISOString().split('T')[0];

  const [filas] = await PreferenciaVisual.update(
    { ...datos, fecha_actualizado: hoy },
    { where: { id_cuenta } }
  );

  console.log(filas > 0 ? '✅ Preferencias visuales actualizadas' : '⚠️ No se encontraron preferencias para esta cuenta');
}


// ─────────────────────────────────────────
// OBTENER O CREAR (UPSERT)
// ─────────────────────────────────────────

/**
 * Obtiene las preferencias de una cuenta o las crea con valores por defecto
 * si no existen. Útil para garantizar que siempre haya una preferencia disponible.
 *
 * // CU-01 | RF-13 | E12 - obtenerOCrearPreferencia()
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<PreferenciaVisual>}
 */
async function obtenerOCrearPreferenciaVisual(id_cuenta) {
  const existente = await obtenerPreferenciaVisual(id_cuenta);
  if (existente) return existente;

  console.log(`ℹ️ No había preferencias para la cuenta ${id_cuenta}. Creando con valores por defecto...`);
  return crearPreferenciaVisual(id_cuenta);
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina las preferencias visuales de una cuenta.
 * En producción esto ocurre automáticamente vía ON DELETE CASCADE al eliminar la cuenta.
 *
 * @async
 * @param {string} id_cuenta - UUID de la cuenta.
 * @returns {Promise<void>}
 */
async function eliminarPreferenciaVisual(id_cuenta) {
  const filas = await PreferenciaVisual.destroy({ where: { id_cuenta } });
  console.log(filas > 0 ? '🗑️ Preferencias eliminadas' : '⚠️ No se encontraron preferencias');
}


module.exports = {
  crearPreferenciaVisual,
  obtenerPreferenciaVisual,
  actualizarPreferenciaVisual,
  obtenerOCrearPreferenciaVisual,
  eliminarPreferenciaVisual
};
