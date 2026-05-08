/**
 * @fileoverview Modelo Sequelize para la tabla de unión `cuenta_insignia`.
 * Representa la relación Many-to-Many (N:M) entre Cuenta e Insignia,
 * registrando qué insignias ha obtenido cada usuario y en qué fecha.
 *
 * Estructura relacional:
 * ```
 *   Cuenta (1) ──────< CuentaInsignia >────── (N) Insignia
 *              una cuenta puede tener muchas insignias
 *              una insignia puede ser obtenida por muchas cuentas
 * ```
 *
 * Al importar este modelo se configuran automáticamente las asociaciones
 * `belongsToMany` en ambas direcciones, por lo que debe importarse en el
 * punto de entrada de la aplicación (ej: `app.js` o `database.js`) para
 * garantizar que las asociaciones queden registradas antes de cualquier consulta.
 *
 * @module models/CuentaInsignia
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 * @requires ./Insignia
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos
const Cuenta = require('./Cuenta');          // Modelo del extremo 1 de la relación N:M
const Insignia = require('./Insignia');      // Modelo del extremo 2 de la relación N:M


/**
 * @typedef {Object} CuentaInsigniaAttributes
 * @property {string} id_cuenta      - UUID de la cuenta que obtuvo la insignia (FK → cuenta).
 * @property {string} id_insignia    - UUID de la insignia obtenida (FK → insignia).
 * @property {string} fecha_obtenida - Fecha en que se otorgó la insignia (YYYY-MM-DD).
 */

/**
 * Modelo Sequelize que representa la tabla de unión `cuenta_insignia`.
 *
 * Actúa como tabla pivote de la relación N:M entre `Cuenta` e `Insignia`.
 * Además de las dos claves foráneas, almacena `fecha_obtenida` como
 * campo extra que enriquece la relación con información temporal.
 *
 * La clave primaria compuesta (id_cuenta + id_insignia) la gestiona
 * Sequelize automáticamente al usarse como tabla `through` en `belongsToMany`.
 *
 * Configuración relevante:
 * - `timestamps: false` — sin columnas `createdAt`/`updatedAt`; la fecha
 *   se audita manualmente con `fecha_obtenida`.
 * - `tableName: 'cuenta_insignia'` — nombre exacto en BD, sin pluralización.
 *
 * @type {import('sequelize').Model}
 */
const CuentaInsignia = sequelize.define('cuenta_insignia', {

  /**
   * Clave foránea que referencia al usuario que obtuvo la insignia.
   * Debe corresponder a un `id_cuenta` existente en la tabla `cuenta`.
   * Si la cuenta es eliminada, la fila se elimina en cascada (CASCADE).
   */
  id_cuenta: {
    type: DataTypes.STRING(36),  // UUID v4: siempre 36 caracteres
    allowNull: false             // Campo obligatorio: toda fila debe tener un propietario
  },

  /**
   * Clave foránea que referencia la insignia otorgada.
   * Debe corresponder a un `id_insignia` existente en la tabla `insignia`.
   * Si la insignia es eliminada, la fila se elimina en cascada (CASCADE).
   */
  id_insignia: {
    type: DataTypes.STRING(36),  // UUID v4: siempre 36 caracteres
    allowNull: false             // Campo obligatorio: toda fila debe tener una insignia
  },

  /**
   * Fecha en que la insignia fue otorgada al usuario.
   * Se asigna automáticamente con la fecha actual del servidor al crear el registro.
   * Usa DATEONLY para almacenar solo YYYY-MM-DD, sin componente de hora.
   */
  fecha_obtenida: {
    type: DataTypes.DATEONLY,    // Solo fecha: YYYY-MM-DD
    allowNull: false,            // Campo obligatorio
    defaultValue: DataTypes.NOW  // Se asigna automáticamente con la fecha actual del servidor
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'cuenta_insignia' → Nombre exacto de la tabla en la BD.
   *                                Sin esto, Sequelize la llamaría 'cuenta_insignias'.
   *
   * timestamps: false            → Desactiva `createdAt`/`updatedAt` automáticos.
   *                                La auditoría temporal se hace con `fecha_obtenida`.
   */
  tableName: 'cuenta_insignia',
  timestamps: false
});


// ─────────────────────────────────────────
// ASOCIACIONES N:M (Many-to-Many)
// ─────────────────────────────────────────

/**
 * Asociación: Cuenta → Insignia (una cuenta puede tener muchas insignias).
 *
 * `belongsToMany` configura la relación desde el lado de Cuenta:
 * - `through: CuentaInsignia` → tabla pivote que almacena la relación.
 * - `foreignKey: 'id_cuenta'` → columna en la tabla pivote que apunta a Cuenta.
 * - `onDelete: 'CASCADE'`     → si se elimina una Cuenta, se eliminan automáticamente
 *                               todas sus filas en `cuenta_insignia`.
 *
 * Habilita consultas como:
 * @example
 * const cuenta = await Cuenta.findByPk(id, { include: Insignia });
 * // cuenta.Insignias → arreglo de insignias obtenidas por ese usuario
 */
Cuenta.belongsToMany(Insignia, {
  through: CuentaInsignia,       // Tabla de unión que contiene la relación
  foreignKey: 'id_cuenta',       // FK en cuenta_insignia que apunta a Cuenta
  onDelete: 'CASCADE'            // Elimina las filas pivote si se borra la Cuenta
});

/**
 * Asociación: Insignia → Cuenta (una insignia puede ser obtenida por muchas cuentas).
 *
 * `belongsToMany` configura la relación desde el lado de Insignia:
 * - `through: CuentaInsignia` → misma tabla pivote compartida.
 * - `foreignKey: 'id_insignia'` → columna en la tabla pivote que apunta a Insignia.
 * - `onDelete: 'CASCADE'`      → si se elimina una Insignia, se eliminan automáticamente
 *                                todas sus filas en `cuenta_insignia`.
 *
 * Habilita consultas como:
 * @example
 * const insignia = await Insignia.findByPk(id, { include: Cuenta });
 * // insignia.Cuentas → arreglo de usuarios que obtuvieron esa insignia
 */
Insignia.belongsToMany(Cuenta, {
  through: CuentaInsignia,       // Tabla de unión que contiene la relación
  foreignKey: 'id_insignia',     // FK en cuenta_insignia que apunta a Insignia
  onDelete: 'CASCADE'            // Elimina las filas pivote si se borra la Insignia
});


module.exports = CuentaInsignia;