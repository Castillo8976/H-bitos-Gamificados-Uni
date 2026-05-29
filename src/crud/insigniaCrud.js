/**
 * @fileoverview Controlador CRUD para la entidad Insignia.
 * Gestiona la creación, lectura, actualización y eliminación de insignias
 * dentro de la plataforma gamificada. Cada insignia representa un logro
 * que puede ser otorgado a los usuarios al cumplir una condición específica.
 *
 * @module crud/insigniaController
 * @requires ../models/Insignia
 * @requires crypto
 */

const Insignia = require('../crud-models/models/Insignia');
const crypto = require('crypto');


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea una nueva insignia en la base de datos.
 *
 * // CU-06 | RF-05 | E12 - crearInsignia()
 *
 * @async
 * @param {string}      nombre      - Nombre visible de la insignia.
 * @param {string}      descripcion - Descripción detallada del logro.
 * @param {string}      condicion   - Criterio evaluable de desbloqueo.
 * @param {string|null} [icono=null] - Nombre del archivo de ícono.
 * @returns {Promise<Insignia>} La instancia de Insignia recién creada.
 */
async function crearInsignia(nombre, descripcion, condicion, icono = null) {
  const insignia = await Insignia.create({
    id_insignia: crypto.randomUUID(),
    nombre,
    descripcion,
    condicion,
    icono
  });

  console.log('✅ Insignia creada:', insignia.id_insignia, insignia.nombre);
  return insignia;
}


// ─────────────────────────────────────────
// LEER TODAS
// ─────────────────────────────────────────

/**
 * Obtiene todas las insignias registradas en la base de datos.
 *
 * // RF-05 | E12 - listarInsignias()
 *
 * @async
 * @returns {Promise<Insignia[]>}
 */
async function listarInsignias() {
  const insignias = await Insignia.findAll();

  console.log('📋 Insignias:', insignias.map(i => ({
    id: i.id_insignia,
    nombre: i.nombre,
    condicion: i.condicion
  })));

  return insignias;
}


// ─────────────────────────────────────────
// LEER UNA
// ─────────────────────────────────────────

/**
 * Busca y retorna una insignia específica por su UUID.
 *
 * // RF-05 | E12 - obtenerInsignia()
 *
 * @async
 * @param {string} id - UUID de la insignia.
 * @returns {Promise<Insignia|null>}
 */
async function obtenerInsignia(id) {
  const insignia = await Insignia.findByPk(id);
  console.log('🔍 Insignia encontrada:', insignia?.nombre ?? 'No existe');
  return insignia;
}


// ─────────────────────────────────────────
// ACTUALIZAR
// ─────────────────────────────────────────

/**
 * Actualiza uno o más campos de una insignia existente.
 *
 * // RF-05 | E12 - actualizarInsignia()
 *
 * @async
 * @param {string} id    - UUID de la insignia.
 * @param {Object} datos - Campos a actualizar.
 * @returns {Promise<void>}
 */
async function actualizarInsignia(id, datos) {
  const [filas] = await Insignia.update(datos, {
    where: { id_insignia: id }
  });
  console.log(filas > 0 ? '✅ Insignia actualizada' : '⚠️ No se encontró la insignia');
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina permanentemente una insignia de la base de datos.
 *
 * // RF-05 | E12 - eliminarInsignia()
 *
 * @async
 * @param {string} id - UUID de la insignia.
 * @returns {Promise<void>}
 */
async function eliminarInsignia(id) {
  const filas = await Insignia.destroy({
    where: { id_insignia: id }
  });
  console.log(filas > 0 ? '🗑️ Insignia eliminada' : '⚠️ No se encontró la insignia');
}


// ─────────────────────────────────────────
// SEMBRAR CATÁLOGO BASE
// ─────────────────────────────────────────

/**
 * Siembra el catálogo de insignias base de la plataforma.
 * Solo inserta si la tabla está vacía (idempotente).
 *
 * Las condiciones deben coincidir exactamente con las evaluadas
 * en cuentaInsigniaCrud.evaluarInsignias().
 *
 * // RF-05 | E12 - sembrarInsignias()
 *
 * @async
 * @returns {Promise<void>}
 */
async function sembrarInsignias() {
  const existentes = await Insignia.count();
  if (existentes > 0) {
    console.log('ℹ️ Las insignias ya están sembradas');
    return;
  }

  const catalogo = [
    {
      nombre: 'Primera tarea',
      descripcion: 'Completaste tu primera tarea antes de la fecha límite.',
      condicion: 'primera_tarea',
      icono: 'insignia_primera_tarea.svg'
    },
    {
      nombre: 'Racha de 5 tareas',
      descripcion: 'Completaste 5 tareas en total. ¡Eres constante!',
      condicion: '5_tareas_seguidas',
      icono: 'insignia_5_tareas.svg'
    },
    {
      nombre: 'Semana perfecta',
      descripcion: 'Iniciaste sesión de estudio 7 días seguidos en una semana.',
      condicion: '7_sesiones_semana',
      icono: 'insignia_semana_perfecta.svg'
    },
    {
      nombre: 'Maestro Pomodoro',
      descripcion: 'Completaste 10 sesiones en modo enfoque (Pomodoro).',
      condicion: '10_pomodoros',
      icono: 'insignia_pomodoro.svg'
    }
  ];

  for (const datos of catalogo) {
    await crearInsignia(datos.nombre, datos.descripcion, datos.condicion, datos.icono);
  }

  console.log('🌱 Catálogo de insignias sembrado (4 insignias base)');
}


module.exports = {
  crearInsignia,
  listarInsignias,
  obtenerInsignia,
  actualizarInsignia,
  eliminarInsignia,
  sembrarInsignias
};
