/**
 * @fileoverview Modelo Sequelize para la entidad SesionEstudio.
 * Define la estructura y restricciones de la tabla `sesion_estudio`,
 * registrando cada bloque de tiempo que un usuario dedica al estudio
 * dentro de la plataforma.
 *
 * Cada sesión representa un intervalo de estudio cronometrado, que puede
 * estar vinculado opcionalmente a una tarea específica. Las sesiones son
 * la fuente de datos para calcular `horas_estudiadas` en el modelo Reporte
 * y generan puntos con `origen: 'Sesion'` en el modelo Punto.
 *
 * Relaciones:
 * ```
 *   Cuenta (1) ──────< SesionEstudio (N)  [una cuenta tiene muchas sesiones]
 *   Tarea  (1) ──────< SesionEstudio (N)  [una tarea puede tener varias sesiones]
 * ```
 *
 * Comportamiento al eliminar entidades padre:
 * ```
 *   Cuenta eliminada → CASCADE:  las sesiones del usuario se eliminan
 *   Tarea  eliminada → SET NULL: las sesiones conservan sus datos,
 *                                pero id_tarea se establece en null
 * ```
 * El uso de SET NULL en la relación con Tarea es intencional: preserva
 * el historial de horas estudiadas aunque la tarea asociada ya no exista.
 *
 * @module models/SesionEstudio
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 * @requires ./Tarea
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos
const Cuenta = require('./Cuenta');          // Modelo asociado en la relación Cuenta → SesionEstudio
const Tarea = require('./Tarea');            // Modelo asociado en la relación Tarea → SesionEstudio


/**
 * @typedef {Object} SesionEstudioAttributes
 * @property {string}      id_sesion         - UUID v4 que identifica unívocamente la sesión (PK).
 * @property {string}      id_cuenta         - UUID de la cuenta propietaria de la sesión (FK → cuenta).
 * @property {string|null} id_tarea          - UUID de la tarea vinculada a la sesión. Opcional; null si es estudio libre.
 * @property {string}      fecha             - Fecha en que se realizó la sesión (YYYY-MM-DD).
 * @property {number}      duracion_minutos  - Duración total de la sesión en minutos enteros.
 * @property {boolean}     modo_enfoque      - Indica si la sesión se realizó con modo de enfoque activo (Pomodoro u otro).
 */

/**
 * Modelo Sequelize que representa la tabla `sesion_estudio`.
 *
 * Cada fila es un registro inmutable de un bloque de estudio completado.
 * La duración se almacena en minutos (INTEGER) para facilitar operaciones
 * aritméticas; la conversión a horas se realiza en el controlador o en
 * las consultas al generar reportes:
 * ```
 *   horas = SUM(duracion_minutos) / 60
 * ```
 *
 * El campo `id_tarea` usa `allowNull: true` y `onDelete: SET NULL` para
 * soportar sesiones de estudio libre (sin tarea asociada) y preservar
 * el historial cuando una tarea es eliminada.
 *
 * Configuración relevante:
 * - `timestamps: false`          — sin columnas `createdAt`/`updatedAt` automáticas.
 * - `tableName: 'sesion_estudio'` — nombre exacto en BD, evita pluralización automática.
 *
 * @type {import('sequelize').Model}
 */
const SesionEstudio = sequelize.define('sesion_estudio', {

  /**
   * Identificador primario de la sesión de estudio.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * STRING(36) porque un UUID v4 tiene exactamente 36 caracteres con guiones.
   */
  id_sesion: {
    type: DataTypes.STRING(36),                        // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                                  // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 automáticamente si no se provee
  },

  /**
   * Clave foránea que referencia al usuario que realizó la sesión.
   * Debe corresponder a un `id_cuenta` existente en la tabla `cuenta`.
   * Si la cuenta se elimina, todas sus sesiones se eliminan en cascada,
   * ya que sin usuario el historial de sesiones pierde su contexto.
   */
  id_cuenta: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Cuenta
    allowNull: false            // Campo obligatorio: toda sesión debe tener un propietario
  },

  /**
   * Clave foránea opcional que vincula la sesión con una tarea específica.
   * Permite asociar el tiempo de estudio a una asignatura o entrega concreta.
   *
   * Es opcional (`allowNull: true`) para dos escenarios válidos:
   * 1. Estudio libre: el usuario estudia sin vincular la sesión a una tarea.
   * 2. Tarea eliminada: si la tarea asociada se borra, este campo pasa a null
   *    (SET NULL) conservando el registro de la sesión con su duración intacta.
   *
   * @example 'a1b2c3d4-...' (sesión vinculada a una tarea), null (estudio libre)
   */
  id_tarea: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Tarea
    allowNull: true             // Opcional: null si estudio libre o si la tarea fue eliminada
  },

  /**
   * Fecha en que se realizó la sesión de estudio.
   * Se asigna automáticamente con la fecha actual del servidor al registrar la sesión.
   * Usa DATEONLY para almacenar solo YYYY-MM-DD, sin componente de hora.
   * Permite agrupar sesiones por día, semana o mes en los reportes.
   *
   * @example '2026-05-08'
   */
  fecha: {
    type: DataTypes.DATEONLY,    // Solo fecha: YYYY-MM-DD (sin hora ni zona horaria)
    allowNull: false,            // Campo obligatorio: toda sesión debe tener fecha de realización
    defaultValue: DataTypes.NOW  // Se asigna automáticamente con la fecha actual del servidor
  },

  /**
   * Duración total de la sesión de estudio expresada en minutos enteros.
   * Se almacena en minutos en lugar de horas para evitar pérdida de precisión
   * con números decimales en sesiones cortas (ej: 25 min, 45 min).
   *
   * Para calcular horas al generar reportes:
   * ```
   *   horas = SUM(duracion_minutos) / 60
   * ```
   *
   * Se recomienda validar en el controlador que el valor sea positivo (> 0),
   * ya que Sequelize no aplica restricciones de rango en INTEGER por defecto.
   *
   * @example 25 (sesión Pomodoro estándar), 45, 60, 90
   */
  duracion_minutos: {
    type: DataTypes.INTEGER, // Número entero: minutos sin decimales
    allowNull: false         // Campo obligatorio: toda sesión debe tener duración registrada
  },

  /**
   * Indicador de si la sesión se realizó con el modo de enfoque activado.
   * El modo de enfoque puede corresponder a técnicas como Pomodoro, Deep Work
   * u otras modalidades de estudio sin distracciones implementadas en la UI.
   *
   * `false` → sesión de estudio regular (estado por defecto).
   * `true`  → sesión realizada con modo de enfoque activo; puede otorgar
   *            multiplicadores de puntos o bonificaciones según la lógica
   *            de gamificación del controlador.
   */
  modo_enfoque: {
    type: DataTypes.BOOLEAN, // TINYINT(1) en MySQL / BOOLEAN en otros motores
    allowNull: false,        // Campo obligatorio
    defaultValue: false      // Por defecto las sesiones se registran en modo regular
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'sesion_estudio' → Nombre exacto de la tabla en la BD.
   *                               Sin esto, Sequelize la llamaría 'sesion_estudios'.
   *
   * timestamps: false           → Desactiva `createdAt`/`updatedAt` automáticos.
   *                               La auditoría temporal se gestiona con el campo `fecha`.
   */
  tableName: 'sesion_estudio',
  timestamps: false
});


// ─────────────────────────────────────────
// ASOCIACIONES 1:N (One-to-Many)
// ─────────────────────────────────────────

/**
 * Asociación: Cuenta → SesionEstudio (una cuenta puede tener muchas sesiones).
 *
 * `hasMany` con `onDelete: 'CASCADE'`: si se elimina la Cuenta, se eliminan
 * todas sus sesiones. El historial de sesiones no tiene valor sin el usuario
 * que las realizó, por lo que CASCADE es el comportamiento correcto aquí.
 *
 * Habilita consultas como:
 * @example
 * // Calcular horas estudiadas en la semana para el Reporte
 * const minutos = await SesionEstudio.sum('duracion_minutos', {
 *   where: { id_cuenta: id, fecha: { [Op.between]: [inicioSemana, finSemana] } }
 * });
 * const horas = minutos / 60; // → valor para Reporte.horas_estudiadas
 */
Cuenta.hasMany(SesionEstudio, {
  foreignKey: 'id_cuenta', // FK en sesion_estudio que referencia a Cuenta
  onDelete: 'CASCADE'      // Elimina todas las sesiones si se borra la Cuenta propietaria
});

/**
 * Asociación: SesionEstudio → Cuenta (cada sesión pertenece a una sola cuenta).
 *
 * `belongsTo` configura la relación desde el lado del hijo (SesionEstudio).
 * La eliminación en cascada se controla desde el padre (`hasMany`).
 *
 * Habilita consultas como:
 * @example
 * const sesion = await SesionEstudio.findByPk(id, { include: Cuenta });
 * // sesion.Cuenta → datos del usuario que realizó la sesión
 */
SesionEstudio.belongsTo(Cuenta, {
  foreignKey: 'id_cuenta' // FK en sesion_estudio que referencia a Cuenta
});

/**
 * Asociación: Tarea → SesionEstudio (una tarea puede tener varias sesiones de estudio).
 *
 * `hasMany` con `onDelete: 'SET NULL'`: si se elimina la Tarea, el campo
 * `id_tarea` de todas sus sesiones se establece en null en lugar de eliminar
 * las filas. Esto preserva el historial de tiempo estudiado aunque la tarea
 * ya no exista, garantizando que los reportes de horas no pierdan datos.
 *
 * Habilita consultas como:
 * @example
 * const tarea = await Tarea.findByPk(id, { include: SesionEstudio });
 * // tarea.SesionEstudios → sesiones de estudio asociadas a esa tarea
 */
Tarea.hasMany(SesionEstudio, {
  foreignKey: 'id_tarea', // FK en sesion_estudio que referencia a Tarea
  onDelete: 'SET NULL'    // Preserva las sesiones con id_tarea = null si se borra la Tarea
});

/**
 * Asociación: SesionEstudio → Tarea (cada sesión puede estar vinculada a una tarea).
 *
 * `belongsTo` configura la relación desde el lado del hijo (SesionEstudio).
 * `id_tarea` puede ser null (estudio libre o tarea eliminada).
 *
 * Habilita consultas como:
 * @example
 * const sesion = await SesionEstudio.findByPk(id, { include: Tarea });
 * // sesion.Tarea → datos de la tarea vinculada, o null si es estudio libre
 */
SesionEstudio.belongsTo(Tarea, {
  foreignKey: 'id_tarea' // FK nullable en sesion_estudio que referencia a Tarea
});


module.exports = SesionEstudio;