/**
 * @fileoverview Modelo Sequelize para la entidad Recordatorio.
 * Define la estructura y restricciones de la tabla `recordatorio`,
 * representando las notificaciones programadas asociadas a las tareas
 * académicas de cada usuario en la plataforma.
 *
 * Un recordatorio es una alerta vinculada simultáneamente a una Tarea
 * y a una Cuenta, programada para enviarse en una fecha específica.
 * Los campos `enviado` y `activo` permiten gestionar su ciclo de vida
 * sin necesidad de eliminar registros del historial:
 *
 * ```
 *   activo: true  + enviado: false → pendiente de envío
 *   activo: true  + enviado: true  → enviado correctamente
 *   activo: false + enviado: false → cancelado antes de enviarse
 *   activo: false + enviado: true  → enviado y desactivado
 * ```
 *
 * Relaciones:
 * ```
 *   Tarea  (1) ──────< Recordatorio (N)  [una tarea puede tener varios recordatorios]
 *   Cuenta (1) ──────< Recordatorio (N)  [una cuenta puede tener varios recordatorios]
 * ```
 *
 * Ambas relaciones usan CASCADE: si se elimina la Tarea o la Cuenta,
 * todos sus recordatorios asociados se eliminan automáticamente.
 *
 * @module models/Recordatorio
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 * @requires ./Tarea
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos
const Cuenta = require('./Cuenta');          // Modelo asociado en la relación Cuenta → Recordatorio
const Tarea = require('./Tarea');            // Modelo asociado en la relación Tarea → Recordatorio


/**
 * @typedef {Object} RecordatorioAttributes
 * @property {string}  id_recordatorio  - UUID v4 que identifica unívocamente el recordatorio (PK).
 * @property {string}  id_tarea         - UUID de la tarea a la que pertenece el recordatorio (FK → tarea).
 * @property {string}  id_cuenta        - UUID de la cuenta propietaria del recordatorio (FK → cuenta).
 * @property {string}  fecha_programada - Fecha en que debe enviarse la notificación (YYYY-MM-DD).
 * @property {string}  mensaje          - Texto del recordatorio a mostrar al usuario (máx. 200 caracteres).
 * @property {boolean} enviado          - Indica si la notificación ya fue enviada (`true`) o está pendiente (`false`).
 * @property {boolean} activo           - Indica si el recordatorio está habilitado (`true`) o cancelado (`false`).
 */

/**
 * Modelo Sequelize que representa la tabla `recordatorio`.
 *
 * Cada recordatorio tiene dos claves foráneas independientes: `id_tarea`
 * e `id_cuenta`. Aunque en una relación bien normalizada `id_cuenta`
 * podría inferirse a través de la tarea, se almacena directamente para
 * simplificar las consultas de recordatorios por usuario sin necesidad
 * de hacer JOIN con la tabla `tarea`.
 *
 * Configuración relevante:
 * - `timestamps: false`         — sin columnas `createdAt`/`updatedAt` automáticas.
 * - `tableName: 'recordatorio'` — nombre exacto en BD, evita pluralización automática.
 *
 * @type {import('sequelize').Model}
 */
const Recordatorio = sequelize.define('recordatorio', {

  /**
   * Identificador primario del recordatorio.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * STRING(36) porque un UUID v4 tiene exactamente 36 caracteres con guiones.
   */
  id_recordatorio: {
    type: DataTypes.STRING(36),                        // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                                  // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 automáticamente si no se provee
  },

  /**
   * Clave foránea que referencia la tarea a la que está vinculado el recordatorio.
   * Si la tarea es eliminada, todos sus recordatorios se eliminan en cascada,
   * evitando recordatorios huérfanos sin contexto académico.
   */
  id_tarea: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Tarea
    allowNull: false            // Campo obligatorio: todo recordatorio debe estar ligado a una tarea
  },

  /**
   * Clave foránea que referencia al usuario propietario del recordatorio.
   * Se almacena de forma redundante (podría inferirse desde id_tarea → id_cuenta)
   * para optimizar consultas directas por usuario sin JOIN adicionales.
   * Si la cuenta es eliminada, todos sus recordatorios se eliminan en cascada.
   */
  id_cuenta: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Cuenta
    allowNull: false            // Campo obligatorio: todo recordatorio debe tener un propietario
  },

  /**
   * Fecha en que el sistema debe enviar o mostrar la notificación al usuario.
   * Usa DATEONLY para almacenar solo YYYY-MM-DD, sin componente de hora.
   * El servicio de notificaciones debe consultar esta fecha para determinar
   * qué recordatorios despachar cada día.
   *
   * @example '2026-05-15' (un día antes de la entrega de la tarea)
   */
  fecha_programada: {
    type: DataTypes.DATEONLY, // Solo fecha: YYYY-MM-DD (sin hora ni zona horaria)
    allowNull: false          // Campo obligatorio: todo recordatorio debe tener fecha de envío
  },

  /**
   * Texto del recordatorio que se mostrará o enviará al usuario.
   * Debe ser descriptivo y conciso para que el usuario identifique
   * rápidamente a qué tarea hace referencia.
   *
   * @example 'Entrega de Parcial 1 de Bases de Datos mañana a las 10:00'
   * @example 'Faltan 3 días para entregar el proyecto final de Cálculo'
   */
  mensaje: {
    type: DataTypes.STRING(200), // Máximo 200 caracteres: mensaje conciso para notificaciones
    allowNull: false             // Campo obligatorio: sin mensaje no hay contenido que notificar
  },

  /**
   * Indicador de si la notificación ya fue despachada al usuario.
   * El servicio de notificaciones debe actualizar este campo a `true`
   * tras enviar exitosamente el recordatorio, evitando envíos duplicados
   * en ejecuciones posteriores del job de notificaciones.
   *
   * `false` → pendiente de envío (estado inicial).
   * `true`  → notificación ya enviada al usuario.
   */
  enviado: {
    type: DataTypes.BOOLEAN, // TINYINT(1) en MySQL / BOOLEAN en otros motores
    allowNull: false,        // Campo obligatorio
    defaultValue: false      // Todo recordatorio nuevo comienza como no enviado
  },

  /**
   * Indicador de si el recordatorio está habilitado para ser procesado.
   * Permite cancelar un recordatorio sin eliminarlo de la base de datos,
   * preservando el historial de notificaciones configuradas por el usuario.
   *
   * `true`  → recordatorio activo, será procesado por el servicio de notificaciones.
   * `false` → recordatorio cancelado, ignorado por el servicio aunque no esté enviado.
   *
   * El servicio de notificaciones debe filtrar: `WHERE activo = true AND enviado = false`.
   */
  activo: {
    type: DataTypes.BOOLEAN, // TINYINT(1) en MySQL / BOOLEAN en otros motores
    allowNull: false,        // Campo obligatorio
    defaultValue: true       // Todo recordatorio nuevo se crea habilitado por defecto
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'recordatorio' → Nombre exacto de la tabla en la BD.
   *                              Sin esto, Sequelize la llamaría 'recordatorios'.
   *
   * timestamps: false         → Desactiva `createdAt`/`updatedAt` automáticos.
   *                              La auditoría temporal se gestiona con `fecha_programada`.
   */
  tableName: 'recordatorio',
  timestamps: false
});


// ─────────────────────────────────────────
// ASOCIACIONES 1:N (One-to-Many)
// ─────────────────────────────────────────

/**
 * Asociación: Tarea → Recordatorio (una tarea puede tener muchos recordatorios).
 *
 * `hasMany` configura la relación desde el lado del padre (Tarea):
 * - `foreignKey: 'id_tarea'` → columna en `recordatorio` que apunta a Tarea.
 * - `onDelete: 'CASCADE'`    → si se elimina una Tarea, se eliminan automáticamente
 *                              todos sus recordatorios, evitando registros huérfanos.
 *
 * Habilita consultas como:
 * @example
 * const tarea = await Tarea.findByPk(id, { include: Recordatorio });
 * // tarea.Recordatorios → arreglo de recordatorios programados para esa tarea
 */
Tarea.hasMany(Recordatorio, {
  foreignKey: 'id_tarea', // FK en recordatorio que referencia a Tarea
  onDelete: 'CASCADE'     // Elimina recordatorios huérfanos si se borra la Tarea
});

/**
 * Asociación: Recordatorio → Tarea (cada recordatorio pertenece a una sola tarea).
 *
 * `belongsTo` configura la relación desde el lado del hijo (Recordatorio).
 * La eliminación en cascada se controla desde el padre (`hasMany`).
 *
 * Habilita consultas como:
 * @example
 * const recordatorio = await Recordatorio.findByPk(id, { include: Tarea });
 * // recordatorio.Tarea → datos de la tarea a la que pertenece el recordatorio
 */
Recordatorio.belongsTo(Tarea, {
  foreignKey: 'id_tarea' // FK en recordatorio que referencia a Tarea
});

/**
 * Asociación: Cuenta → Recordatorio (una cuenta puede tener muchos recordatorios).
 *
 * `hasMany` configura la relación desde el lado del padre (Cuenta):
 * - `foreignKey: 'id_cuenta'` → columna en `recordatorio` que apunta a Cuenta.
 * - `onDelete: 'CASCADE'`     → si se elimina una Cuenta, se eliminan automáticamente
 *                               todos sus recordatorios.
 *
 * Habilita consultas como:
 * @example
 * // Obtener todos los recordatorios pendientes de un usuario
 * const pendientes = await Recordatorio.findAll({
 *   where: { id_cuenta: id, activo: true, enviado: false }
 * });
 */
Cuenta.hasMany(Recordatorio, {
  foreignKey: 'id_cuenta', // FK en recordatorio que referencia a Cuenta
  onDelete: 'CASCADE'      // Elimina todos los recordatorios si se borra la Cuenta
});

/**
 * Asociación: Recordatorio → Cuenta (cada recordatorio pertenece a una sola cuenta).
 *
 * `belongsTo` configura la relación desde el lado del hijo (Recordatorio).
 * La eliminación en cascada se controla desde el padre (`hasMany`).
 *
 * Habilita consultas como:
 * @example
 * const recordatorio = await Recordatorio.findByPk(id, { include: Cuenta });
 * // recordatorio.Cuenta → datos del usuario propietario del recordatorio
 */
Recordatorio.belongsTo(Cuenta, {
  foreignKey: 'id_cuenta' // FK en recordatorio que referencia a Cuenta
});


module.exports = Recordatorio;