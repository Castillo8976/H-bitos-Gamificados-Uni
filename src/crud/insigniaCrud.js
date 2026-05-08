/**
 * @fileoverview Controlador CRUD para la entidad Insignia.
 * Gestiona la creación, lectura, actualización y eliminación de insignias
 * dentro de la plataforma gamificada. Cada insignia representa un logro
 * que puede ser otorgado a los usuarios al cumplir una condición específica.
 *
 * @module controllers/insigniaController
 * @requires ../models/Insignia
 * @requires crypto
 */

const Insignia = require('../models/Insignia'); // Modelo Sequelize de la entidad Insignia
const crypto = require('crypto');               // Módulo nativo de Node.js para generar UUIDs


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea una nueva insignia en la base de datos.
 *
 * Las insignias representan logros desbloqueables dentro del sistema
 * de gamificación. El campo `icono` es opcional; si no se proporciona,
 * se almacena como `null` y la UI debería mostrar un ícono por defecto.
 *
 * @async
 * @function crearInsignia
 * @param {string}      nombre      - Nombre visible de la insignia (ej: "Primera victoria").
 * @param {string}      descripcion - Descripción detallada del logro que representa.
 * @param {string}      condicion   - Regla o criterio que debe cumplirse para obtenerla
 *                                    (ej: "completar_10_lecciones").
 * @param {string|null} [icono=null] - URL o nombre del archivo de ícono asociado.
 *                                    Es opcional; por defecto es `null`.
 * @returns {Promise<Insignia>} La instancia de Insignia recién creada.
 *
 * @example
 * const insignia = await crearInsignia(
 *   'Primera Victoria',
 *   'Otorgada al ganar por primera vez',
 *   'victorias >= 1',
 *   'trofeo_oro.png'
 * );
 *
 * @example
 * // Sin ícono (usa el valor por defecto null)
 * const insignia = await crearInsignia(
 *   'Explorador',
 *   'Visita todas las secciones',
 *   'secciones_visitadas === total_secciones'
 * );
 */
async function crearInsignia(nombre, descripcion, condicion, icono = null) {
  const insignia = await Insignia.create({
    id_insignia: crypto.randomUUID(), // UUID v4 como identificador primario único
    nombre,
    descripcion,
    condicion, // Criterio evaluable que dispara la asignación de la insignia
    icono      // null si no se proporciona imagen o ruta del recurso visual
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
 * El log muestra únicamente los campos esenciales para diagnóstico
 * (id, nombre, condicion), evitando saturar la consola con datos
 * innecesarios como la URL del ícono.
 *
 * @async
 * @function listarInsignias
 * @returns {Promise<Insignia[]>} Arreglo con todas las instancias de Insignia.
 *
 * @example
 * const todas = await listarInsignias();
 * // [{ id_insignia: '...', nombre: '...', condicion: '...' }, ...]
 */
async function listarInsignias() {
  const insignias = await Insignia.findAll();

  // Log reducido: solo campos clave para no saturar la consola
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
 * Busca y retorna una insignia específica por su clave primaria (UUID).
 *
 * Si no se encuentra ningún registro con el UUID indicado, Sequelize
 * retorna `null`. El encadenamiento opcional (`?.`) evita un TypeError
 * al intentar acceder a `.nombre` sobre un valor nulo.
 *
 * @async
 * @function obtenerInsignia
 * @param {string} id - UUID v4 de la insignia a buscar.
 * @returns {Promise<Insignia|null>} La instancia encontrada, o `null` si no existe.
 *
 * @example
 * const insignia = await obtenerInsignia('550e8400-e29b-41d4-a716-446655440000');
 * if (!insignia) console.log('La insignia no existe');
 */
async function obtenerInsignia(id) {
  // findByPk busca por clave primaria (Primary Key); retorna null si no existe
  const insignia = await Insignia.findByPk(id);

  // insignia?.nombre evita TypeError si findByPk retorna null
  console.log('🔍 Insignia encontrada:', insignia?.nombre ?? 'No existe');
  return insignia;
}


// ─────────────────────────────────────────
// ACTUALIZAR
// ─────────────────────────────────────────

/**
 * Actualiza uno o más campos de una insignia existente.
 *
 * `Insignia.update` retorna un arreglo donde el primer elemento
 * corresponde al número de filas afectadas por el UPDATE. Si es 0,
 * no se encontró ninguna insignia con ese UUID.
 *
 * @async
 * @function actualizarInsignia
 * @param {string} id    - UUID v4 de la insignia a modificar.
 * @param {Object} datos - Objeto con los campos a actualizar.
 * @param {string} [datos.nombre]      - Nuevo nombre de la insignia.
 * @param {string} [datos.descripcion] - Nueva descripción.
 * @param {string} [datos.condicion]   - Nueva condición de desbloqueo.
 * @param {string} [datos.icono]       - Nueva URL o nombre del ícono.
 * @returns {Promise<void>}
 *
 * @example
 * // Actualizar solo el ícono
 * await actualizarInsignia('550e8400-...', { icono: 'nuevo_trofeo.svg' });
 *
 * @example
 * // Actualizar nombre y condición simultáneamente
 * await actualizarInsignia('550e8400-...', {
 *   nombre: 'Maestro',
 *   condicion: 'nivel >= 50'
 * });
 */
async function actualizarInsignia(id, datos) {
  // Desestructura el primer elemento: número de filas afectadas por el UPDATE
  const [filas] = await Insignia.update(datos, {
    where: { id_insignia: id }
  });

  // filas === 0 indica que el WHERE no coincidió con ningún registro
  console.log(filas > 0 ? '✅ Insignia actualizada' : '⚠️ No se encontró la insignia');
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina permanentemente una insignia de la base de datos.
 *
 * A diferencia de `Cuenta.update`, `Insignia.destroy` retorna
 * directamente un número (no un arreglo), que indica cuántas
 * filas fueron eliminadas.
 *
 * @async
 * @function eliminarInsignia
 * @param {string} id - UUID v4 de la insignia a eliminar.
 * @returns {Promise<void>}
 *
 * @example
 * await eliminarInsignia('550e8400-e29b-41d4-a716-446655440000');
 */
async function eliminarInsignia(id) {
  // destroy retorna un número entero directamente (no un arreglo como update)
  const filas = await Insignia.destroy({
    where: { id_insignia: id }
  });

  console.log(filas > 0 ? '🗑️ Insignia eliminada' : '⚠️ No se encontró la insignia');
}


// ─────────────────────────────────────────
// EXPORTACIONES
// ─────────────────────────────────────────

/**
 * Exporta todas las funciones del controlador para ser usadas
 * por el router de Express u otro módulo que gestione las rutas
 * relacionadas con insignias.
 */
module.exports = {
  crearInsignia,
  listarInsignias,
  obtenerInsignia,
  actualizarInsignia,
  eliminarInsignia
};