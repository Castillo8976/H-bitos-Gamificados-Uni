/**
 * @fileoverview Controlador CRUD para la entidad Tarea.
 * Gestiona la creación, lectura, actualización, completado y eliminación
 * de tareas académicas vinculadas a una cuenta de usuario.
 *
 * Cada tarea pertenece obligatoriamente a un usuario (`id_cuenta`) y
 * opcionalmente a una materia (`id_materia`). Incluye una operación
 * especializada `completarTarea` que registra la fecha de completado
 * automáticamente usando la fecha actual del servidor.
 *
 * @module controllers/tareaController
 * @requires ../models/Tarea
 * @requires crypto
 */

const Tarea = require('../models/Tarea'); // Modelo Sequelize de la entidad Tarea
const crypto = require('crypto');         // Módulo nativo de Node.js para generar UUIDs


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea una nueva tarea académica vinculada a una cuenta de usuario.
 *
 * La tarea puede estar asociada a una materia específica mediante
 * `id_materia`, o ser independiente si se omite ese parámetro.
 * El estado inicial de la tarea lo define el modelo (generalmente 'Pendiente').
 *
 * @async
 * @function crearTarea
 * @param {string}      id_cuenta      - UUID de la cuenta propietaria de la tarea.
 * @param {string}      nombre         - Nombre o título descriptivo de la tarea.
 * @param {string}      fecha_entrega  - Fecha límite de entrega en formato ISO 8601 (YYYY-MM-DD).
 * @param {string}      prioridad      - Nivel de prioridad de la tarea (ej: 'Alta', 'Media', 'Baja').
 * @param {string|null} [id_materia=null] - UUID de la materia a la que pertenece la tarea.
 *                                         Es opcional; `null` si la tarea no está vinculada a ninguna materia.
 * @returns {Promise<Tarea>} La instancia de Tarea recién creada.
 *
 * @example
 * // Tarea vinculada a una materia
 * const tarea = await crearTarea(
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   'Entrega Parcial 1',
 *   '2026-05-20',
 *   'Alta',
 *   'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
 * );
 *
 * @example
 * // Tarea general sin materia asignada
 * const tarea = await crearTarea(
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   'Renovar carnet estudiantil',
 *   '2026-05-15',
 *   'Baja'
 * );
 */
async function crearTarea(id_cuenta, nombre, fecha_entrega, prioridad, id_materia = null) {
  const tarea = await Tarea.create({
    id_tarea: crypto.randomUUID(), // UUID v4 como identificador primario único
    id_cuenta,                     // Clave foránea: propietario de la tarea
    nombre,
    fecha_entrega,                 // Formato esperado: YYYY-MM-DD
    prioridad,                     // Valores esperados según el modelo: 'Alta', 'Media', 'Baja'
    id_materia                     // Clave foránea opcional; null si la tarea es independiente
  });

  console.log('✅ Tarea creada:', tarea.id_tarea, tarea.nombre);
  return tarea;
}


// ─────────────────────────────────────────
// LEER TODAS DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Obtiene todas las tareas pertenecientes a una cuenta de usuario específica.
 *
 * Aplica un filtro `WHERE id_cuenta = ?` para que cada usuario acceda
 * únicamente a sus propias tareas. El log incluye `estado` y `prioridad`
 * además del id y nombre, ya que son los campos más relevantes para
 * diagnóstico en una lista de tareas.
 *
 * @async
 * @function listarTareas
 * @param {string} id_cuenta - UUID de la cuenta cuyas tareas se desean listar.
 * @returns {Promise<Tarea[]>} Arreglo con las tareas de la cuenta indicada.
 *                             Retorna `[]` si la cuenta no tiene tareas registradas.
 *
 * @example
 * const tareas = await listarTareas('550e8400-e29b-41d4-a716-446655440000');
 * // [{ id_tarea: '...', nombre: '...', estado: 'Pendiente', prioridad: 'Alta' }, ...]
 */
async function listarTareas(id_cuenta) {
  // WHERE id_cuenta = id_cuenta: garantiza aislamiento de datos entre usuarios
  const tareas = await Tarea.findAll({ where: { id_cuenta } });

  // Log extendido: incluye estado y prioridad para diagnóstico más completo
  console.log('📋 Tareas:', tareas.map(t => ({
    id: t.id_tarea,
    nombre: t.nombre,
    estado: t.estado,
    prioridad: t.prioridad
  })));

  return tareas;
}


// ─────────────────────────────────────────
// LEER UNA
// ─────────────────────────────────────────

/**
 * Busca y retorna una tarea específica por su clave primaria (UUID).
 *
 * Retorna `null` si no existe ninguna tarea con el UUID indicado.
 * El encadenamiento opcional (`?.`) evita un TypeError al acceder
 * a `.nombre` sobre un posible valor nulo.
 *
 * @async
 * @function obtenerTarea
 * @param {string} id - UUID v4 de la tarea a buscar.
 * @returns {Promise<Tarea|null>} La instancia de Tarea encontrada, o `null` si no existe.
 *
 * @example
 * const tarea = await obtenerTarea('550e8400-e29b-41d4-a716-446655440000');
 * if (!tarea) console.log('La tarea no existe');
 */
async function obtenerTarea(id) {
  // findByPk busca por clave primaria; retorna null si no hay coincidencia
  const tarea = await Tarea.findByPk(id);

  // tarea?.nombre evita TypeError si findByPk retorna null
  console.log('🔍 Tarea encontrada:', tarea?.nombre ?? 'No existe');
  return tarea;
}


// ─────────────────────────────────────────
// ACTUALIZAR
// ─────────────────────────────────────────

/**
 * Actualiza uno o más campos de una tarea existente.
 *
 * Para marcar una tarea como completada y registrar su fecha de finalización
 * de forma automática, usar `completarTarea` en lugar de este método.
 *
 * @async
 * @function actualizarTarea
 * @param {string} id    - UUID v4 de la tarea a modificar.
 * @param {Object} datos - Objeto con los campos a actualizar.
 * @param {string} [datos.nombre]         - Nuevo nombre o título de la tarea.
 * @param {string} [datos.fecha_entrega]  - Nueva fecha límite (formato YYYY-MM-DD).
 * @param {string} [datos.prioridad]      - Nueva prioridad ('Alta', 'Media', 'Baja').
 * @param {string} [datos.id_materia]     - UUID de la nueva materia asociada.
 * @param {string} [datos.estado]         - Nuevo estado manual (usar `completarTarea` para completar).
 * @returns {Promise<void>}
 *
 * @example
 * // Cambiar la fecha de entrega y la prioridad
 * await actualizarTarea('550e8400-...', {
 *   fecha_entrega: '2026-05-25',
 *   prioridad: 'Alta'
 * });
 */
async function actualizarTarea(id, datos) {
  // Desestructura el primer elemento: número de filas afectadas por el UPDATE
  const [filas] = await Tarea.update(datos, {
    where: { id_tarea: id }
  });

  // filas === 0 indica que el WHERE no encontró ninguna tarea con ese UUID
  console.log(filas > 0 ? '✅ Tarea actualizada' : '⚠️ No se encontró la tarea');
}


// ─────────────────────────────────────────
// MARCAR COMPLETADA
// ─────────────────────────────────────────

/**
 * Marca una tarea como completada y registra la fecha actual como
 * fecha de completado.
 *
 * Esta función es una operación especializada que automatiza dos acciones
 * simultáneas en un solo `UPDATE`:
 * 1. Cambia el `estado` a `'Completada'`.
 * 2. Registra `fecha_completada` con la fecha del servidor en el momento
 *    exacto en que se llama la función (formato YYYY-MM-DD).
 *
 * Se recomienda usar este método en lugar de `actualizarTarea` para
 * completar tareas, ya que garantiza consistencia en la fecha registrada.
 *
 * @async
 * @function completarTarea
 * @param {string} id - UUID v4 de la tarea a marcar como completada.
 * @returns {Promise<void>}
 *
 * @example
 * await completarTarea('550e8400-e29b-41d4-a716-446655440000');
 * // Resultado en BD: estado = 'Completada', fecha_completada = '2026-05-08'
 */
async function completarTarea(id) {
  // Obtiene la fecha actual del servidor en formato YYYY-MM-DD
  // .toISOString() → '2026-05-08T21:54:00.000Z'
  // .split('T')[0]  → '2026-05-08'
  const hoy = new Date().toISOString().split('T')[0];

  // Actualiza estado y fecha_completada en un solo UPDATE atómico
  const [filas] = await Tarea.update(
    { estado: 'Completada', fecha_completada: hoy },
    { where: { id_tarea: id } }
  );

  console.log(filas > 0 ? '✅ Tarea marcada como completada' : '⚠️ No se encontró la tarea');
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina permanentemente una tarea de la base de datos.
 *
 * `Tarea.destroy` retorna directamente el número de filas eliminadas
 * (no un arreglo como `Tarea.update`). Si el valor es 0, no existía
 * ninguna tarea con el UUID proporcionado.
 *
 * @async
 * @function eliminarTarea
 * @param {string} id - UUID v4 de la tarea a eliminar.
 * @returns {Promise<void>}
 *
 * @example
 * await eliminarTarea('550e8400-e29b-41d4-a716-446655440000');
 */
async function eliminarTarea(id) {
  // destroy retorna un entero directamente (no un arreglo como update)
  const filas = await Tarea.destroy({
    where: { id_tarea: id }
  });

  console.log(filas > 0 ? '🗑️ Tarea eliminada' : '⚠️ No se encontró la tarea');
}


// ─────────────────────────────────────────
// EXPORTACIONES
// ─────────────────────────────────────────

/**
 * Exporta todas las funciones del controlador para ser consumidas
 * por el router de Express u otro módulo que gestione las rutas
 * relacionadas con tareas académicas.
 */
module.exports = {
  crearTarea,
  listarTareas,
  obtenerTarea,
  actualizarTarea,
  completarTarea, // Operación especializada: no reemplaza a actualizarTarea
  eliminarTarea
};