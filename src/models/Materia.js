/**
 * @fileoverview Modelo Sequelize para la entidad Materia.
 * Define la estructura y restricciones de la tabla `materia`, representando
 * las asignaturas académicas que cada usuario registra en la plataforma.
 *
 * Relación con Cuenta (One-to-Many / 1:N):
 * ```
 *   Cuenta (1) ──────< Materia (N)
 *   una cuenta puede tener muchas materias
 *   una materia pertenece a exactamente una cuenta
 * ```
 *
 * Al importar este modelo se configuran automáticamente las asociaciones
 * `hasMany` y `belongsTo`, por lo que debe importarse antes de realizar
 * cualquier consulta que involucre la relación Cuenta → Materia.
 *
 * @module models/Materia
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos
const Cuenta = require('./Cuenta');          // Modelo padre de la relación 1:N


/**
 * @typedef {Object} MateriaAttributes
 * @property {string}      id_materia - UUID v4 que identifica unívocamente la materia (PK).
 * @property {string}      id_cuenta  - UUID de la cuenta propietaria (FK → cuenta).
 * @property {string}      nombre     - Nombre de la asignatura (máx. 80 caracteres).
 * @property {string|null} horario    - Descripción del horario de la materia. Opcional.
 * @property {boolean}     activa     - Indica si la materia está vigente (`true`) o archivada (`false`).
 */

/**
 * Modelo Sequelize que representa la tabla `materia`.
 *
 * Cada materia es propiedad de un único usuario identificado por `id_cuenta`.
 * El campo `activa` permite archivar materias de semestres anteriores sin
 * eliminarlas, preservando el historial académico del usuario.
 *
 * Configuración relevante:
 * - `timestamps: false`     — sin columnas `createdAt`/`updatedAt` automáticas.
 * - `tableName: 'materia'`  — nombre exacto en BD, evita pluralización automática.
 *
 * @type {import('sequelize').Model}
 */
const Materia = sequelize.define('materia', {

  /**
   * Identificador primario de la materia.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * STRING(36) porque un UUID v4 tiene exactamente 36 caracteres con guiones.
   */
  id_materia: {
    type: DataTypes.STRING(36),                        // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                                  // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 automáticamente si no se provee
  },

  /**
   * Clave foránea que referencia al usuario propietario de la materia.
   * Debe corresponder a un `id_cuenta` existente en la tabla `cuenta`.
   * Garantiza que cada materia esté siempre vinculada a un usuario válido.
   */
  id_cuenta: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Cuenta
    allowNull: false            // Campo obligatorio: toda materia debe tener un propietario
  },

  /**
   * Nombre de la asignatura académica.
   * No tiene restricción UNIQUE a nivel de tabla porque dos usuarios diferentes
   * pueden tener una materia con el mismo nombre (ej: ambos cursan "Cálculo").
   * La unicidad se garantiza implícitamente por la combinación (id_cuenta, nombre).
   *
   * @example 'Bases de Datos', 'Cálculo Diferencial', 'Inglés Técnico'
   */
  nombre: {
    type: DataTypes.STRING(80), // Máximo 80 caracteres: suficiente para nombres de asignaturas
    allowNull: false            // Campo obligatorio: toda materia debe tener nombre
  },

  /**
   * Descripción del horario o agenda de la materia.
   * Campo libre donde el usuario puede registrar días, horas o cualquier
   * información de programación relevante para la asignatura.
   * Es opcional: puede definirse después de crear la materia.
   *
   * @example 'Lunes y Miércoles 10:00–12:00', 'Viernes 08:00–10:00', null
   */
  horario: {
    type: DataTypes.STRING(100), // Máximo 100 caracteres: descripción concisa del horario
    allowNull: true              // Campo opcional: el usuario puede dejarlo vacío inicialmente
  },

  /**
   * Estado de activación de la materia.
   * Permite distinguir entre materias vigentes y archivadas sin eliminar registros,
   * preservando el historial académico del usuario entre semestres.
   *
   * `true`  → materia vigente, aparece en las vistas principales del usuario.
   * `false` → materia archivada, oculta en vistas activas pero conservada en BD.
   *
   * Por defecto toda materia nueva se crea como activa.
   */
  activa: {
    type: DataTypes.BOOLEAN, // TINYINT(1) en MySQL / BOOLEAN en otros motores
    allowNull: false,        // Campo obligatorio
    defaultValue: true       // Toda materia nueva se considera vigente al crearse
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'materia' → Nombre exacto de la tabla en la BD.
   *                         Sin esto, Sequelize la llamaría 'materias' (plural automático).
   *
   * timestamps: false    → Desactiva `createdAt`/`updatedAt` automáticos.
   *                         Las materias no requieren auditoría temporal propia.
   */
  tableName: 'materia',
  timestamps: false
});


// ─────────────────────────────────────────
// ASOCIACIONES 1:N (One-to-Many)
// ─────────────────────────────────────────

/**
 * Asociación: Cuenta → Materia (una cuenta puede tener muchas materias).
 *
 * `hasMany` configura la relación desde el lado del padre (Cuenta):
 * - `foreignKey: 'id_cuenta'` → columna en la tabla `materia` que apunta a Cuenta.
 * - `onDelete: 'CASCADE'`     → si se elimina una Cuenta, se eliminan automáticamente
 *                               todas sus materias asociadas en la tabla `materia`.
 *
 * Habilita consultas como:
 * @example
 * const cuenta = await Cuenta.findByPk(id, { include: Materia });
 * // cuenta.Materias → arreglo de materias del usuario
 */
Cuenta.hasMany(Materia, {
  foreignKey: 'id_cuenta', // FK en materia que referencia a Cuenta
  onDelete: 'CASCADE'      // Elimina todas las materias si se borra la Cuenta propietaria
});

/**
 * Asociación: Materia → Cuenta (una materia pertenece a exactamente una cuenta).
 *
 * `belongsTo` configura la relación desde el lado del hijo (Materia):
 * - `foreignKey: 'id_cuenta'` → columna en la tabla `materia` que apunta a Cuenta.
 *
 * No define `onDelete` en esta dirección porque la eliminación se controla
 * desde el lado padre (`hasMany` con CASCADE).
 *
 * Habilita consultas como:
 * @example
 * const materia = await Materia.findByPk(id, { include: Cuenta });
 * // materia.Cuenta → objeto con los datos del propietario
 */
Materia.belongsTo(Cuenta, {
  foreignKey: 'id_cuenta'  // FK en materia que referencia a Cuenta
});


module.exports = Materia;