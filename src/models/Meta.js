/**
 * @fileoverview Modelo Sequelize para la entidad Meta.
 * Define la estructura y restricciones de la tabla `meta`, representando
 * los objetivos semanales de progreso que cada usuario establece dentro
 * del sistema de gamificación de la plataforma.
 *
 * Una meta cuantifica el avance del usuario durante una semana específica:
 * define un valor objetivo a alcanzar y registra el progreso actual,
 * marcándose como cumplida cuando `valor_actual >= valor_objetivo`.
 *
 * Relación con Cuenta (One-to-Many / 1:N):
 * ```
 *   Cuenta (1) ──────< Meta (N)
 *   una cuenta puede tener muchas metas (una o más por semana)
 *   una meta pertenece a exactamente una cuenta
 * ```
 *
 * @module models/Meta
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos
const Cuenta = require('./Cuenta');          // Modelo padre de la relación 1:N


/**
 * @typedef {Object} MetaAttributes
 * @property {string}  id_meta         - UUID v4 que identifica unívocamente la meta (PK).
 * @property {string}  id_cuenta       - UUID de la cuenta propietaria (FK → cuenta).
 * @property {string}  semana          - Identificador de la semana a la que pertenece la meta (ej: '2026-W19').
 * @property {string}  descripcion     - Descripción del objetivo a alcanzar (máx. 200 caracteres).
 * @property {number}  valor_objetivo  - Cantidad numérica que define la meta a cumplir.
 * @property {number}  valor_actual    - Progreso acumulado actual hacia el objetivo. Inicia en 0.
 * @property {boolean} cumplida        - Indica si el usuario alcanzó el `valor_objetivo`. Por defecto `false`.
 */

/**
 * Modelo Sequelize que representa la tabla `meta`.
 *
 * Cada meta es un objetivo cuantificable asociado a una semana específica
 * y a un usuario. El progreso se mide comparando `valor_actual` contra
 * `valor_objetivo`; cuando se igualan o superan, la meta debe marcarse
 * como `cumplida: true` (esta lógica se maneja en el controlador).
 *
 * Configuración relevante:
 * - `timestamps: false`  — sin columnas `createdAt`/`updatedAt` automáticas.
 * - `tableName: 'meta'`  — nombre exacto en BD, evita pluralización automática.
 *
 * @type {import('sequelize').Model}
 */
const Meta = sequelize.define('meta', {

  /**
   * Identificador primario de la meta.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * STRING(36) porque un UUID v4 tiene exactamente 36 caracteres con guiones.
   */
  id_meta: {
    type: DataTypes.STRING(36),                        // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                                  // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 automáticamente si no se provee
  },

  /**
   * Clave foránea que referencia al usuario propietario de la meta.
   * Debe corresponder a un `id_cuenta` existente en la tabla `cuenta`.
   * Si la cuenta se elimina, todas sus metas se eliminan en cascada.
   */
  id_cuenta: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Cuenta
    allowNull: false            // Campo obligatorio: toda meta debe tener un propietario
  },

  /**
   * Identificador de la semana a la que corresponde la meta.
   * Se recomienda usar el formato ISO 8601 de semana (`YYYY-Www`)
   * para garantizar consistencia y facilitar filtros temporales.
   * STRING(10) es suficiente para el formato estándar de 8 caracteres.
   *
   * @example '2026-W19', '2026-W20', '2026-W01'
   */
  semana: {
    type: DataTypes.STRING(10), // Máximo 10 caracteres: formato recomendado 'YYYY-Www' (8 chars)
    allowNull: false            // Campo obligatorio: toda meta debe estar asociada a una semana
  },

  /**
   * Descripción del objetivo que el usuario desea alcanzar durante la semana.
   * Texto libre que explica qué representa el valor numérico a lograr.
   *
   * @example 'Completar 5 tareas esta semana', 'Estudiar 10 horas de Bases de Datos'
   */
  descripcion: {
    type: DataTypes.STRING(200), // Máximo 200 caracteres: descripción concisa del objetivo
    allowNull: false             // Campo obligatorio: toda meta debe describir qué se quiere lograr
  },

  /**
   * Cantidad numérica que representa el 100% de cumplimiento de la meta.
   * Define el techo a alcanzar; cuando `valor_actual >= valor_objetivo`,
   * la meta puede marcarse como cumplida.
   *
   * @example 5 (completar 5 tareas), 10 (estudiar 10 horas), 3 (entregar 3 trabajos)
   */
  valor_objetivo: {
    type: DataTypes.INTEGER, // Número entero: contadores de unidades discretas (tareas, horas, etc.)
    allowNull: false         // Campo obligatorio: sin objetivo no hay meta cuantificable
  },

  /**
   * Progreso acumulado actual del usuario hacia el `valor_objetivo`.
   * Se incrementa conforme el usuario completa acciones relacionadas con la meta.
   * Inicia en 0 al crear la meta y no debería superar `valor_objetivo`
   * (validación recomendada en el controlador o en la capa de negocio).
   *
   * @example 0 (sin progreso), 3 (a mitad de camino si objetivo es 5), 5 (meta alcanzada)
   */
  valor_actual: {
    type: DataTypes.INTEGER, // Número entero: misma unidad que valor_objetivo
    allowNull: false,        // Campo obligatorio
    defaultValue: 0          // Toda meta nueva comienza sin progreso registrado
  },

  /**
   * Indicador de cumplimiento de la meta.
   * `false` → meta en progreso o pendiente.
   * `true`  → meta completada: el usuario alcanzó o superó el `valor_objetivo`.
   *
   * Este campo debe actualizarse desde el controlador cuando
   * `valor_actual >= valor_objetivo`, no de forma automática en el modelo.
   */
  cumplida: {
    type: DataTypes.BOOLEAN, // TINYINT(1) en MySQL / BOOLEAN en otros motores
    allowNull: false,        // Campo obligatorio
    defaultValue: false      // Toda meta nueva comienza como no cumplida
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'meta'  → Nombre exacto de la tabla en la BD.
   *                       Sin esto, Sequelize la llamaría 'metas' (plural automático).
   *
   * timestamps: false  → Desactiva `createdAt`/`updatedAt` automáticos.
   *                       El contexto temporal de la meta se gestiona con el campo `semana`.
   */
  tableName: 'meta',
  timestamps: false
});

// Agregar en las opciones del modelo (mismo nivel que tableName)
indexes: [
  { unique: true, fields: ['id_cuenta', 'semana'] }
]

// ─────────────────────────────────────────
// ASOCIACIONES 1:N (One-to-Many)
// ─────────────────────────────────────────

/**
 * Asociación: Cuenta → Meta (una cuenta puede tener muchas metas).
 *
 * `hasMany` configura la relación desde el lado del padre (Cuenta):
 * - `foreignKey: 'id_cuenta'` → columna en la tabla `meta` que apunta a Cuenta.
 * - `onDelete: 'CASCADE'`     → si se elimina una Cuenta, se eliminan automáticamente
 *                               todas sus metas asociadas en la tabla `meta`.
 *
 * Habilita consultas como:
 * @example
 * const cuenta = await Cuenta.findByPk(id, { include: Meta });
 * // cuenta.Metas → arreglo con todas las metas del usuario
 */
Cuenta.hasMany(Meta, {
  foreignKey: 'id_cuenta', // FK en meta que referencia a Cuenta
  onDelete: 'CASCADE'      // Elimina todas las metas si se borra la Cuenta propietaria
});

/**
 * Asociación: Meta → Cuenta (una meta pertenece a exactamente una cuenta).
 *
 * `belongsTo` configura la relación desde el lado del hijo (Meta):
 * - `foreignKey: 'id_cuenta'` → columna en la tabla `meta` que apunta a Cuenta.
 *
 * La eliminación en cascada se controla desde el padre (`hasMany`),
 * por lo que no se define `onDelete` en esta dirección.
 *
 * Habilita consultas como:
 * @example
 * const meta = await Meta.findByPk(id, { include: Cuenta });
 * // meta.Cuenta → objeto con los datos del propietario de la meta
 */
Meta.belongsTo(Cuenta, {
  foreignKey: 'id_cuenta' // FK en meta que referencia a Cuenta
});


module.exports = Meta;