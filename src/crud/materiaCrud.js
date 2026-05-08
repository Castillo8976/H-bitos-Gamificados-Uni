/**
 * @fileoverview Controlador CRUD para la entidad Materia.
 * Gestiona la creación, lectura, actualización y eliminación de materias
 * académicas asociadas a una cuenta de usuario específica.
 *
 * Cada materia pertenece a un único usuario (relación cuenta → materia),
 * por lo que las consultas de listado siempre filtran por `id_cuenta`
 * para garantizar el aislamiento de datos entre usuarios.
 *
 * @module controllers/materiaController
 * @requires ../models/Materia
 * @requires crypto
 */

const Materia = require('../models/Materia'); // Modelo Sequelize de la entidad Materia
const crypto = require('crypto');             // Módulo nativo de Node.js para generar UUIDs


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea una nueva materia académica vinculada a una cuenta de usuario.
 *
 * La materia queda asociada al `id_cuenta` recibido, estableciendo
 * la relación de pertenencia. El campo `horario` es opcional; si no
 * se define, se almacena como `null` hasta que el usuario lo configure.
 *
 * @async
 * @function crearMateria
 * @param {string}      id_cuenta      - UUID de la cuenta propietaria de la materia.
 * @param {string}      nombre         - Nombre de la materia (ej: "Cálculo Diferencial").
 * @param {string|null} [horario=null] - Horario o descripción de la agenda de la materia.
 *                                       Es opcional; por defecto es `null`.
 * @returns {Promise<Materia>} La instancia de Materia recién creada.
 *
 * @example
 * // Con horario definido
 * const materia = await crearMateria(
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   'Bases de Datos',
 *   'Lunes y Miércoles 10:00–12:00'
 * );
 *
 * @example
 * // Sin horario (se asigna null por defecto)
 * const materia = await crearMateria(
 *   '550e8400-e29b-41d4-a716-446655440000',
 *   'Inglés Técnico'
 * );
 */
async function crearMateria(id_cuenta, nombre, horario = null) {
  const materia = await Materia.create({
    id_materia: crypto.randomUUID(), // UUID v4 como identificador primario único
    id_cuenta,                       // Clave foránea que vincula la materia con su propietario
    nombre,
    horario                          // null si el usuario aún no definió el horario
  });

  console.log('✅ Materia creada:', materia.id_materia, materia.nombre);
  return materia;
}


// ─────────────────────────────────────────
// LEER TODAS DE UNA CUENTA
// ─────────────────────────────────────────

/**
 * Obtiene todas las materias pertenecientes a una cuenta de usuario específica.
 *
 * A diferencia de un `findAll` global, esta función aplica un filtro
 * `WHERE id_cuenta = ?` para que cada usuario solo acceda a sus propias
 * materias, garantizando el aislamiento de datos entre cuentas.
 *
 * @async
 * @function listarMaterias
 * @param {string} id_cuenta - UUID de la cuenta cuyas materias se desean listar.
 * @returns {Promise<Materia[]>} Arreglo con las materias de la cuenta indicada.
 *                               Retorna un arreglo vacío `[]` si la cuenta no tiene materias.
 *
 * @example
 * const materias = await listarMaterias('550e8400-e29b-41d4-a716-446655440000');
 * // [{ id_materia: '...', nombre: 'Bases de Datos' }, ...]
 */
async function listarMaterias(id_cuenta) {
  // WHERE id_cuenta = id_cuenta: filtra solo las materias del usuario indicado
  const materias = await Materia.findAll({ where: { id_cuenta } });

  // Log reducido: solo id y nombre para diagnóstico rápido
  console.log('📋 Materias:', materias.map(m => ({
    id: m.id_materia,
    nombre: m.nombre
  })));

  return materias;
}


// ─────────────────────────────────────────
// LEER UNA
// ─────────────────────────────────────────

/**
 * Busca y retorna una materia específica por su clave primaria (UUID).
 *
 * Si no existe ninguna materia con el UUID proporcionado, Sequelize
 * retorna `null`. El encadenamiento opcional (`?.`) previene un TypeError
 * al intentar acceder a `.nombre` sobre un valor nulo.
 *
 * @async
 * @function obtenerMateria
 * @param {string} id - UUID v4 de la materia a buscar.
 * @returns {Promise<Materia|null>} La instancia de Materia encontrada, o `null` si no existe.
 *
 * @example
 * const materia = await obtenerMateria('550e8400-e29b-41d4-a716-446655440000');
 * if (!materia) console.log('La materia no existe');
 */
async function obtenerMateria(id) {
  // findByPk busca por clave primaria; retorna null si no hay coincidencia
  const materia = await Materia.findByPk(id);

  // materia?.nombre evita TypeError si el resultado es null
  console.log('🔍 Materia encontrada:', materia?.nombre ?? 'No existe');
  return materia;
}


// ─────────────────────────────────────────
// ACTUALIZAR
// ─────────────────────────────────────────

/**
 * Actualiza uno o más campos de una materia existente.
 *
 * `Materia.update` retorna un arreglo donde el primer elemento indica
 * cuántas filas fueron afectadas. Si el valor es 0, ningún registro
 * coincidió con el UUID proporcionado en el WHERE.
 *
 * @async
 * @function actualizarMateria
 * @param {string} id    - UUID v4 de la materia a modificar.
 * @param {Object} datos - Objeto con los campos a actualizar.
 * @param {string} [datos.nombre]   - Nuevo nombre de la materia.
 * @param {string} [datos.horario]  - Nuevo horario o descripción de agenda.
 * @returns {Promise<void>}
 *
 * @example
 * // Actualizar solo el horario
 * await actualizarMateria('550e8400-...', { horario: 'Viernes 08:00–10:00' });
 *
 * @example
 * // Renombrar la materia y actualizar su horario
 * await actualizarMateria('550e8400-...', {
 *   nombre: 'Programación Avanzada',
 *   horario: 'Martes y Jueves 14:00–16:00'
 * });
 */
async function actualizarMateria(id, datos) {
  // Desestructura el primer elemento del arreglo: número de filas afectadas
  const [filas] = await Materia.update(datos, {
    where: { id_materia: id }
  });

  // filas === 0 indica que el WHERE no encontró ninguna materia con ese UUID
  console.log(filas > 0 ? '✅ Materia actualizada' : '⚠️ No se encontró la materia');
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina permanentemente una materia de la base de datos.
 *
 * `Materia.destroy` retorna directamente el número de filas eliminadas
 * (no un arreglo). Si retorna 0, no existía ninguna materia con ese UUID.
 *
 * @async
 * @function eliminarMateria
 * @param {string} id - UUID v4 de la materia a eliminar.
 * @returns {Promise<void>}
 *
 * @example
 * await eliminarMateria('550e8400-e29b-41d4-a716-446655440000');
 */
async function eliminarMateria(id) {
  // destroy retorna un entero directamente (no un arreglo como update)
  const filas = await Materia.destroy({
    where: { id_materia: id }
  });

  console.log(filas > 0 ? '🗑️ Materia eliminada' : '⚠️ No se encontró la materia');
}


// ─────────────────────────────────────────
// EXPORTACIONES
// ─────────────────────────────────────────

/**
 * Exporta todas las funciones del controlador para ser consumidas
 * por el router de Express u otro módulo que gestione las rutas
 * relacionadas con materias académicas.
 */
module.exports = {
  crearMateria,
  listarMaterias,
  obtenerMateria,
  actualizarMateria,
  eliminarMateria
};