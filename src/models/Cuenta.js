/**
 * @fileoverview Modelo Sequelize para la entidad Cuenta.
 * Define la estructura y restricciones de la tabla `cuenta` en la base
 * de datos, representando a los usuarios registrados en la plataforma.
 *
 * Este modelo es la raíz del esquema relacional: otras entidades como
 * Materia y Tarea referencian `id_cuenta` como clave foránea.
 *
 * @module models/Cuenta
 * @requires sequelize
 * @requires ../database
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos


/**
 * @typedef {Object} CuentaAttributes
 * @property {string}  id_cuenta       - UUID v4 que identifica unívocamente la cuenta (PK).
 * @property {string}  nombre          - Nombre completo del usuario (máx. 60 caracteres).
 * @property {string}  correo          - Correo electrónico único del usuario (máx. 100 caracteres).
 * @property {string}  contrasena_hash - Hash bcrypt de la contraseña (nunca texto plano).
 * @property {string}  fecha_registro  - Fecha de creación de la cuenta (YYYY-MM-DD).
 * @property {boolean} activa          - Indica si la cuenta está habilitada (`true`) o suspendida (`false`).
 */

/**
 * Modelo Sequelize que representa la tabla `cuenta`.
 *
 * Configuración relevante:
 * - `timestamps: false` — Sequelize no agrega las columnas `createdAt`/`updatedAt`
 *   automáticamente, ya que la auditoría de fecha se maneja con `fecha_registro`.
 * - `tableName: 'cuenta'` — Fuerza el nombre exacto de la tabla en SQL,
 *   evitando la pluralización automática que Sequelize aplica por defecto.
 *
 * @type {import('sequelize').Model}
 */
const Cuenta = sequelize.define('cuenta', {

  /**
   * Identificador primario de la cuenta.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * Tipo STRING(36) porque un UUID v4 tiene exactamente 36 caracteres
   * (ej: '550e8400-e29b-41d4-a716-446655440000').
   */
  id_cuenta: {
    type: DataTypes.STRING(36),       // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                 // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 si no se provee
  },

  /**
   * Nombre completo del usuario.
   * No puede ser nulo; debe proporcionarse en el momento del registro.
   */
  nombre: {
    type: DataTypes.STRING(60),       // Máximo 60 caracteres
    allowNull: false                  // Campo obligatorio
  },

  /**
   * Dirección de correo electrónico del usuario.
   * Debe ser única en toda la tabla para evitar registros duplicados.
   * Se usa como identificador de inicio de sesión junto con la contraseña.
   */
  correo: {
    type: DataTypes.STRING(100),      // Máximo 100 caracteres
    allowNull: false,                 // Campo obligatorio
    unique: true                      // Restricción UNIQUE en BD: no permite correos duplicados
  },

  /**
   * Hash bcrypt de la contraseña del usuario.
   * Nunca se almacena la contraseña en texto plano.
   * El hash generado por bcrypt con salt tiene aproximadamente 60 caracteres,
   * pero se define STRING(255) para compatibilidad con otros algoritmos de hash.
   */
  contrasena_hash: {
    type: DataTypes.STRING(255),      // Espacio suficiente para hashes bcrypt y similares
    allowNull: false                  // Campo obligatorio: toda cuenta debe tener contraseña
  },

  /**
   * Fecha en que se creó la cuenta (solo fecha, sin hora).
   * Se asigna automáticamente con la fecha actual del servidor si no se indica.
   * Usa DATEONLY para almacenar únicamente YYYY-MM-DD, sin componente de tiempo.
   */
  fecha_registro: {
    type: DataTypes.DATEONLY,         // Solo fecha: YYYY-MM-DD (sin hora ni zona horaria)
    allowNull: false,                 // Campo obligatorio
    defaultValue: DataTypes.NOW       // Se asigna automáticamente con la fecha actual del servidor
  },

  /**
   * Estado de activación de la cuenta.
   * `true`  → cuenta habilitada, el usuario puede iniciar sesión.
   * `false` → cuenta suspendida o desactivada, acceso denegado.
   * Por defecto toda cuenta nueva se crea como activa.
   */
  activa: {
    type: DataTypes.BOOLEAN,          // Columna TINYINT(1) en MySQL / BOOLEAN en otros motores
    allowNull: false,                 // Campo obligatorio
    defaultValue: true                // Toda cuenta nueva se activa automáticamente
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'cuenta'  → Nombre exacto de la tabla en la BD.
   *                         Sin esto, Sequelize la buscaría como 'cuentas' (plural automático).
   *
   * timestamps: false    → Desactiva las columnas `createdAt` y `updatedAt` que
   *                         Sequelize agrega por defecto. La auditoría de fecha se
   *                         gestiona manualmente con `fecha_registro`.
   */
  tableName: 'cuenta',
  timestamps: false
});


module.exports = Cuenta;