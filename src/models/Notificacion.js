/**
 * @fileoverview Modelo Sequelize para la entidad Notificacion.
 * Define la estructura de la tabla `notificacion`, registrando cada
 * notificación in-app generada por el sistema para un usuario específico.
 *
 * A diferencia de Recordatorio (vinculado a una Tarea específica),
 * Notificacion es una entidad transaccional más general que puede
 * originarse de cualquier evento del sistema: insignia desbloqueada,
 * reto completado, meta alcanzada, subida de nivel, etc.
 *
 * Relación con Cuenta (One-to-Many / 1:N):
 * ```
 *   Cuenta (1) ──────< Notificacion (N)
 *   una cuenta puede recibir muchas notificaciones
 *   cada notificación pertenece a exactamente una cuenta
 * ```
 *
 * @module models/Notificacion
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');

/**
 * @typedef {Object} NotificacionAttributes
 * @property {string}  id_notificacion - UUID v4 que identifica unívocamente la notificación (PK).
 * @property {string}  id_cuenta       - UUID de la cuenta destinataria (FK → cuenta).
 * @property {string}  tipo            - Categoría del evento: 'Insignia'|'Reto'|'Meta'|'Nivel'|'Sistema'.
 * @property {string}  mensaje         - Texto de la notificación mostrado al usuario (máx. 200 caracteres).
 * @property {boolean} leida           - Indica si el usuario ya leyó la notificación. Por defecto false.
 * @property {string}  fecha           - Fecha en que se generó la notificación (YYYY-MM-DD).
 */

/**
 * Modelo Sequelize que representa la tabla `notificacion`.
 *
 * Implementa un historial de notificaciones in-app. Cada evento
 * relevante del sistema genera una fila aquí. El campo `leida`
 * permite mostrar el contador de notificaciones no leídas en la UI.
 *
 * Configuración relevante:
 * - `timestamps: false`        — sin columnas automáticas createdAt/updatedAt.
 * - `tableName: 'notificacion'` — nombre exacto en BD.
 *
 * @type {import('sequelize').Model}
 */
const Notificacion = sequelize.define('notificacion', {

  /**
   * Identificador primario de la notificación.
   * UUID v4 generado automáticamente.
   */
  id_notificacion: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },

  /**
   * Clave foránea que referencia al usuario destinatario.
   * Si la cuenta se elimina, todas sus notificaciones se eliminan en cascada.
   */
  id_cuenta: {
    type: DataTypes.STRING(36),
    allowNull: false
  },

  /**
   * Categoría del evento que originó la notificación.
   * Permite filtrar y mostrar íconos distintos según el tipo en la UI.
   *
   * Valores permitidos:
   * - 'Insignia' → el usuario desbloqueó una insignia.
   * - 'Reto'     → el usuario completó un reto semanal.
   * - 'Meta'     → el usuario alcanzó su meta semanal.
   * - 'Nivel'    → el usuario subió de nivel.
   * - 'Sistema'  → mensaje genérico del sistema.
   */
  tipo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      isIn: [['Insignia', 'Reto', 'Meta', 'Nivel', 'Sistema']]
    }
  },

  /**
   * Texto de la notificación que se muestra al usuario en la UI.
   * Debe ser descriptivo y conciso.
   * @example '¡Desbloqueaste la insignia "Primera tarea"!'
   * @example '¡Completaste tu reto de la semana y ganaste 50 puntos!'
   */
  mensaje: {
    type: DataTypes.STRING(200),
    allowNull: false
  },

  /**
   * Indica si el usuario ya vio/leyó esta notificación.
   * false → notificación nueva, se cuenta en el badge de la UI.
   * true  → notificación leída, no suma al contador.
   */
  leida: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },

  /**
   * Fecha en que se generó la notificación.
   * Se asigna automáticamente con la fecha actual del servidor.
   */
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }

}, {
  tableName: 'notificacion',
  timestamps: false
});

// ─────────────────────────────────────────
// ASOCIACIONES 1:N
// ─────────────────────────────────────────

/**
 * Asociación: Cuenta → Notificacion (una cuenta puede recibir muchas notificaciones).
 * onDelete CASCADE: si se elimina la cuenta, se eliminan todas sus notificaciones.
 */
Cuenta.hasMany(Notificacion, {
  foreignKey: 'id_cuenta',
  onDelete: 'CASCADE'
});

/**
 * Asociación: Notificacion → Cuenta (cada notificación pertenece a una sola cuenta).
 */
Notificacion.belongsTo(Cuenta, {
  foreignKey: 'id_cuenta'
});

module.exports = Notificacion;
