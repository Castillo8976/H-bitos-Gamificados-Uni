/**
 * @fileoverview Modelo Sequelize para la entidad Tarea.
 * Define la estructura y restricciones de la tabla `tarea`, representando
 * las actividades académicas que cada usuario registra, prioriza y completa
 * dentro de la plataforma.
 *
 * Una tarea pertenece obligatoriamente a un usuario (`id_cuenta`) y
 * opcionalmente a una materia (`id_materia`). Su ciclo de vida se gestiona
 * mediante los campos `estado` y `fecha_completada`:
 * ```
 *   estado: 'Pendiente'  + fecha_completada: null → tarea activa sin completar
 *   estado: 'Completada' + fecha_completada: DATE → tarea finalizada con fecha registrada
 * ```
 *
 * Relaciones:
 * ```
 *   Cuenta  (1) ──────< Tarea (N)  [una cuenta tiene muchas tareas]
 *   Materia (1) ──────< Tarea (N)  [una materia puede tener muchas tareas]
 * ```
 *
 * Comportamiento al eliminar entidades padre:
 * ```
 *   Cuenta  eliminada → CASCADE:  las tareas del usuario se eliminan
 *   Materia eliminada → SET NULL: las tareas conservan sus datos,
 *                                 pero id_materia se establece en null
 * ```
 *
 * Este modelo es referenciado por Recordatorio y SesionEstudio como FK,
 * por lo que su eliminación activa sus propios cascades:
 * ```
 *   Tarea eliminada → Recordatorio: CASCADE  (se eliminan)
 *   Tarea eliminada → SesionEstudio: SET NULL (conservan id_tarea = null)
 * ```
 *
 * @module models/Tarea
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 * @requires ./Materia
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos
const Cuenta = require('./Cuenta');          // Modelo padre en la relación Cuenta → Tarea
const Materia = require('./Materia');        // Modelo padre opcional en la relación Materia → Tarea


/**
 * @typedef {Object} TareaAttributes
 * @property {string}      id_tarea         - UUID v4 que identifica unívocamente la tarea (PK).
 * @property {string}      id_cuenta        - UUID de la cuenta propietaria (FK → cuenta).
 * @property {string|null} id_materia       - UUID de la materia asociada (FK → materia). Opcional.
 * @property {string}      nombre           - Título descriptivo de la tarea (máx. 120 caracteres).
 * @property {string}      fecha_entrega    - Fecha límite de entrega (YYYY-MM-DD).
 * @property {string}      prioridad        - Nivel de urgencia: 'Alta' | 'Media' | 'Baja'.
 * @property {string}      estado           - Estado actual del ciclo de vida: 'Pendiente' | 'Completada'.
 * @property {string|null} fecha_completada - Fecha en que se completó la tarea (YYYY-MM-DD). null si pendiente.
 */

/**
 * Modelo Sequelize que representa la tabla `tarea`.
 *
 * Es uno de los modelos centrales del esquema relacional: otras entidades
 * como Recordatorio y SesionEstudio lo referencian como FK. Incluye
 * validaciones `isIn` en `prioridad` y `estado` para garantizar que solo
 * se almacenen valores del dominio definido, sin depender del cliente.
 *
 * Configuración relevante:
 * - `timestamps: false`   — sin columnas `createdAt`/`updatedAt` automáticas.
 * - `tableName: 'tarea'`  — nombre exacto en BD, evita pluralización automática.
 *
 * @type {import('sequelize').Model}
 */
const Tarea = sequelize.define('tarea', {

  /**
   * Identificador primario de la tarea.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * STRING(36) porque un UUID v4 tiene exactamente 36 caracteres con guiones.
   */
  id_tarea: {
    type: DataTypes.STRING(36),                        // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                                  // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 automáticamente si no se provee
  },

  /**
   * Clave foránea que referencia al usuario propietario de la tarea.
   * Debe corresponder a un `id_cuenta` existente en la tabla `cuenta`.
   * Si la cuenta se elimina, todas sus tareas se eliminan en cascada.
   */
  id_cuenta: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Cuenta
    allowNull: false            // Campo obligatorio: toda tarea debe tener un propietario
  },

  /**
   * Clave foránea opcional que vincula la tarea con una materia académica.
   * Permite organizar las tareas por asignatura en la UI.
   *
   * Es opcional (`allowNull: true`) para dos escenarios válidos:
   * 1. Tarea libre: el usuario no la asocia a ninguna materia específica.
   * 2. Materia eliminada: si la materia es borrada, este campo pasa a null
   *    (SET NULL) conservando la tarea con todos sus demás datos intactos.
   */
  id_materia: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Materia
    allowNull: true             // Opcional: null si tarea libre o si la materia fue eliminada
  },

  /**
   * Título descriptivo de la tarea que el usuario verá en la interfaz.
   * STRING(120) permite nombres más largos que los del modelo Materia (80)
   * o Insignia (80), reflejando que los títulos de tareas suelen ser
   * más descriptivos y detallados.
   *
   * @example 'Entrega Parcial 1 — Bases de Datos', 'Proyecto Final de Cálculo Diferencial'
   */
  nombre: {
    type: DataTypes.STRING(120), // Máximo 120 caracteres: títulos de tareas más descriptivos
    allowNull: false             // Campo obligatorio: toda tarea debe tener un título
  },

  /**
   * Fecha límite en que la tarea debe ser entregada o completada.
   * Usa DATEONLY para almacenar solo YYYY-MM-DD, sin componente de hora.
   * Es el campo principal para ordenar y filtrar tareas por urgencia,
   * y se usa para determinar si una tarea está vencida en la UI.
   *
   * @example '2026-05-20', '2026-06-01'
   */
  fecha_entrega: {
    type: DataTypes.DATEONLY, // Solo fecha: YYYY-MM-DD (sin hora ni zona horaria)
    allowNull: false          // Campo obligatorio: toda tarea debe tener una fecha límite
  },

  /**
   * Nivel de prioridad o urgencia de la tarea.
   * La validación `isIn` rechaza cualquier valor fuera del conjunto permitido
   * antes del INSERT/UPDATE, protegiendo la integridad del campo a nivel
   * de aplicación independientemente de las validaciones del cliente.
   *
   * Valores permitidos:
   * - 'Alta'  → tarea urgente, requiere atención inmediata.
   * - 'Media' → tarea importante pero con margen de tiempo.
   * - 'Baja'  → tarea de baja urgencia, puede posponerse.
   *
   * Se usa en el modelo Reto con la condición 'tareas_alta_completadas >= N'.
   */
  prioridad: {
    type: DataTypes.STRING(10), // Máximo 10 caracteres: 'Alta'(4), 'Media'(5), 'Baja'(4)
    allowNull: false,           // Campo obligatorio: toda tarea debe tener prioridad definida
    validate: {
      // Validación en capa de aplicación: rechaza valores fuera del dominio permitido
      isIn: [['Alta', 'Media', 'Baja']]
    }
  },

  /**
   * Estado actual del ciclo de vida de la tarea.
   * Controla la transición desde creación hasta finalización.
   * La validación `isIn` garantiza que solo existan los dos estados definidos.
   *
   * Valores permitidos:
   * - 'Pendiente'  → estado inicial; la tarea está activa y sin completar.
   * - 'Completada' → estado final; la tarea fue terminada por el usuario.
   *                  Al transicionar a este estado, `fecha_completada` debe
   *                  registrarse mediante `completarTarea()` en el controlador.
   *
   * Nota: la transición de estado debe hacerse exclusivamente a través de
   * `completarTarea()` y no por `actualizarTarea()`, para garantizar que
   * `fecha_completada` siempre se registre junto con el cambio de estado.
   */
  estado: {
    type: DataTypes.STRING(15), // Máximo 15 caracteres: 'Pendiente'(9), 'Completada'(10)
    allowNull: false,           // Campo obligatorio
    defaultValue: 'Pendiente',  // Toda tarea nueva comienza en estado Pendiente
    validate: {
      // Validación en capa de aplicación: solo acepta los dos estados del ciclo de vida
      isIn: [['Pendiente', 'Completada']]
    }
  },

  /**
   * Fecha en que la tarea fue completada por el usuario.
   * Es null mientras la tarea esté en estado 'Pendiente' y se asigna
   * automáticamente con la fecha del servidor al llamar `completarTarea()`
   * en el controlador.
   *
   * La coherencia entre `estado` y `fecha_completada` debe garantizarse
   * en el controlador:
   * ```
   *   estado: 'Pendiente'  → fecha_completada: null  (invariante)
   *   estado: 'Completada' → fecha_completada: DATE  (invariante)
   * ```
   *
   * @example null (tarea pendiente), '2026-05-08' (fecha de completado)
   */
  fecha_completada: {
    type: DataTypes.DATEONLY, // Solo fecha: YYYY-MM-DD (sin hora ni zona horaria)
    allowNull: true           // null mientras la tarea esté Pendiente; DATE al completarla
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'tarea'   → Nombre exacto de la tabla en la BD.
   *                         Sin esto, Sequelize la llamaría 'tareas' (plural automático).
   *
   * timestamps: false    → Desactiva `createdAt`/`updatedAt` automáticos.
   *                         El ciclo de vida temporal se gestiona con
   *                         `fecha_entrega` y `fecha_completada`.
   */
  tableName: 'tarea',
  timestamps: false
});


// ─────────────────────────────────────────
// ASOCIACIONES 1:N (One-to-Many)
// ─────────────────────────────────────────

/**
 * Asociación: Cuenta → Tarea (una cuenta puede tener muchas tareas).
 *
 * `hasMany` con `onDelete: 'CASCADE'`: si se elimina la Cuenta, se eliminan
 * todas sus tareas. Al eliminarse una tarea, sus Recordatorios también se
 * eliminan en cascada (definido en el modelo Recordatorio).
 *
 * Habilita consultas como:
 * @example
 * // Obtener tareas pendientes ordenadas por fecha de entrega
 * const tareas = await Tarea.findAll({
 *   where: { id_cuenta: id, estado: 'Pendiente' },
 *   order: [['fecha_entrega', 'ASC']]
 * });
 */
Cuenta.hasMany(Tarea, {
  foreignKey: 'id_cuenta', // FK en tarea que referencia a Cuenta
  onDelete: 'CASCADE'      // Elimina todas las tareas si se borra la Cuenta propietaria
});

/**
 * Asociación: Tarea → Cuenta (cada tarea pertenece a exactamente una cuenta).
 *
 * `belongsTo` configura la relación desde el lado del hijo (Tarea).
 * La eliminación en cascada se controla desde el padre (`hasMany`).
 *
 * Habilita consultas como:
 * @example
 * const tarea = await Tarea.findByPk(id, { include: Cuenta });
 * // tarea.Cuenta → datos del usuario propietario de la tarea
 */
Tarea.belongsTo(Cuenta, {
  foreignKey: 'id_cuenta' // FK en tarea que referencia a Cuenta
});

/**
 * Asociación: Materia → Tarea (una materia puede agrupar muchas tareas).
 *
 * `hasMany` con `onDelete: 'SET NULL'`: si se elimina la Materia, el campo
 * `id_materia` de todas sus tareas se establece en null en lugar de eliminar
 * las filas. Las tareas conservan todos sus datos (nombre, fecha, estado)
 * y pasan a ser tareas "libres" sin materia asignada.
 *
 * Habilita consultas como:
 * @example
 * // Obtener todas las tareas de una materia específica
 * const materia = await Materia.findByPk(id, { include: Tarea });
 * // materia.Tareas → arreglo de tareas asociadas a esa materia
 */
Materia.hasMany(Tarea, {
  foreignKey: 'id_materia', // FK en tarea que referencia a Materia
  onDelete: 'SET NULL'      // Preserva las tareas con id_materia = null si se borra la Materia
});

/**
 * Asociación: Tarea → Materia (cada tarea puede pertenecer a una sola materia).
 *
 * `belongsTo` configura la relación desde el lado del hijo (Tarea).
 * `id_materia` puede ser null (tarea libre o materia eliminada).
 *
 * Habilita consultas como:
 * @example
 * const tarea = await Tarea.findByPk(id, { include: Materia });
 * // tarea.Materia → datos de la materia asociada, o null si es tarea libre
 */
Tarea.belongsTo(Materia, {
  foreignKey: 'id_materia' // FK nullable en tarea que referencia a Materia
});


module.exports = Tarea;