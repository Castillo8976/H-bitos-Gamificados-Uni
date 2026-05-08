/**
 * @fileoverview Controlador CRUD para la entidad Cuenta.
 * Provee operaciones de creación, lectura, actualización y eliminación
 * usando Sequelize ORM, con hashing de contraseñas mediante bcrypt
 * y generación de UUID v4 para identificadores únicos.
 *
 * @module controllers/cuentaController
 * @requires ../models/Cuenta
 * @requires crypto
 * @requires bcryptjs
 */

const Cuenta = require('../models/Cuenta'); // Modelo Sequelize de la entidad Cuenta
const crypto = require('crypto');            // Módulo nativo de Node.js para generar UUIDs
const bcrypt = require('bcryptjs');          // Librería para hash seguro de contraseñas


// ─────────────────────────────────────────
// CREAR
// ─────────────────────────────────────────

/**
 * Crea una nueva cuenta de usuario en la base de datos.
 *
 * La contraseña nunca se almacena en texto plano; se genera un hash
 * con bcrypt usando un salt de 10 rondas antes de persistir el registro.
 *
 * @async
 * @function crearCuenta
 * @param {string} nombre     - Nombre completo del usuario.
 * @param {string} correo     - Dirección de correo electrónico (debe ser única).
 * @param {string} contrasena - Contraseña en texto plano (se hashea antes de guardar).
 * @returns {Promise<Cuenta>} La instancia de Cuenta recién creada.
 *
 * @example
 * const nueva = await crearCuenta('Juan Pérez', 'juan@email.com', 'miClave123');
 */
async function crearCuenta(nombre, correo, contrasena) {
  // Genera el hash de la contraseña con 10 rondas de sal (balance seguridad/rendimiento)
  const hash = await bcrypt.hash(contrasena, 10);

  // Persiste la cuenta con un UUID v4 como identificador primario
  const cuenta = await Cuenta.create({
    id_cuenta: crypto.randomUUID(), // UUID v4 aleatorio, garantiza unicidad global
    nombre,
    correo,
    contrasena_hash: hash           // Solo se guarda el hash, nunca la contraseña original
  });

  console.log('✅ Cuenta creada:', cuenta.id_cuenta, cuenta.nombre);
  return cuenta;
}


// ─────────────────────────────────────────
// LEER TODAS
// ─────────────────────────────────────────

/**
 * Obtiene todas las cuentas registradas en la base de datos.
 *
 * Retorna la lista completa de instancias Cuenta. En el log solo se
 * imprimen campos no sensibles (id, nombre, correo) para evitar
 * exponer hashes de contraseñas en los registros del servidor.
 *
 * @async
 * @function listarCuentas
 * @returns {Promise<Cuenta[]>} Arreglo con todas las instancias de Cuenta.
 *
 * @example
 * const cuentas = await listarCuentas();
 * // [{ id_cuenta: '...', nombre: '...', correo: '...' }, ...]
 */
async function listarCuentas() {
  const cuentas = await Cuenta.findAll();

  // Se loguean solo campos no sensibles para no exponer hashes en consola
  console.log('📋 Cuentas:', cuentas.map(c => ({
    id: c.id_cuenta,
    nombre: c.nombre,
    correo: c.correo
  })));

  return cuentas;
}


// ─────────────────────────────────────────
// LEER UNA
// ─────────────────────────────────────────

/**
 * Busca y retorna una cuenta específica por su clave primaria (UUID).
 *
 * Usa el operador de encadenamiento opcional (`?.`) para manejar de forma
 * segura el caso en que la cuenta no exista, evitando un TypeError.
 *
 * @async
 * @function obtenerCuenta
 * @param {string} id - UUID v4 de la cuenta a buscar.
 * @returns {Promise<Cuenta|null>} La instancia de Cuenta encontrada, o `null` si no existe.
 *
 * @example
 * const cuenta = await obtenerCuenta('550e8400-e29b-41d4-a716-446655440000');
 * if (!cuenta) console.log('No encontrada');
 */
async function obtenerCuenta(id) {
  // findByPk busca por clave primaria; retorna null si no existe el registro
  const cuenta = await Cuenta.findByPk(id);

  // El operador ?. evita un TypeError si cuenta es null
  console.log('🔍 Cuenta encontrada:', cuenta?.nombre ?? 'No existe');
  return cuenta;
}


// ─────────────────────────────────────────
// ACTUALIZAR
// ─────────────────────────────────────────

/**
 * Actualiza los campos de una cuenta existente identificada por su UUID.
 *
 * `Cuenta.update` retorna un arreglo donde el primer elemento indica
 * cuántas filas fueron afectadas. Si es 0, la cuenta no fue encontrada.
 *
 * @async
 * @function actualizarCuenta
 * @param {string} id     - UUID v4 de la cuenta a actualizar.
 * @param {Object} datos  - Objeto con los campos a modificar (ej: `{ nombre: 'Nuevo' }`).
 *                          No se debe incluir `contrasena_hash` directamente aquí;
 *                          si se cambia la contraseña, hashearla antes de pasar el objeto.
 * @returns {Promise<void>}
 *
 * @example
 * await actualizarCuenta('550e8400-...', { nombre: 'Pedro López' });
 */
async function actualizarCuenta(id, datos) {
  // Desestructura el primer elemento del arreglo que indica filas afectadas
  const [filas] = await Cuenta.update(datos, {
    where: { id_cuenta: id }
  });

  // Si filas === 0, ninguna fila coincidió con el WHERE (cuenta inexistente)
  console.log(filas > 0 ? '✅ Cuenta actualizada' : '⚠️ No se encontró la cuenta');
}


// ─────────────────────────────────────────
// ELIMINAR
// ─────────────────────────────────────────

/**
 * Elimina de forma permanente una cuenta de la base de datos.
 *
 * `Cuenta.destroy` retorna el número de filas eliminadas. Si es 0,
 * significa que no se encontró ninguna cuenta con el UUID indicado.
 *
 * @async
 * @function eliminarCuenta
 * @param {string} id - UUID v4 de la cuenta a eliminar.
 * @returns {Promise<void>}
 *
 * @example
 * await eliminarCuenta('550e8400-e29b-41d4-a716-446655440000');
 */
async function eliminarCuenta(id) {
  // destroy retorna directamente el número de filas eliminadas (no un arreglo)
  const filas = await Cuenta.destroy({
    where: { id_cuenta: id }
  });

  console.log(filas > 0 ? '🗑️ Cuenta eliminada' : '⚠️ No se encontró la cuenta');
}


// ─────────────────────────────────────────
// EXPORTACIONES
// ─────────────────────────────────────────

/**
 * Exporta todas las funciones del controlador para ser consumidas
 * por las rutas del servidor (Express u otro framework).
 */
module.exports = {
  crearCuenta,
  listarCuentas,
  obtenerCuenta,
  actualizarCuenta,
  eliminarCuenta
};