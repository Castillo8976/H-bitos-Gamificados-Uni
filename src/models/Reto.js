/**
 * @fileoverview Modelo Sequelize para la entidad Reto.
 * Define la estructura y restricciones de la tabla `reto`, representando
 * los desafíos semanales personalizados que cada usuario debe superar
 * dentro del sistema de gamificación de la plataforma.
 *
 * Un reto es un objetivo con recompensa de puntos, similar a una Meta
 * pero orientado al desafío y la superación. La diferencia clave es:
 * ```
 *   Meta  → objetivo cuantitativo con valor_objetivo numérico explícito
 *   Reto  → desafío con condición textual evaluable y recompensa en puntos
 * ```
 *
 * El flujo de vida de un reto es:
 * ```
 *   completado: false + progreso: 0   → reto recién creado, sin avance
 *   completado: false + progreso: N   → reto en curso, avanzando
 *   completado: true  + progreso: N   → reto superado, puntos otorgados
 * ```
 *
 * Relación con Cuenta (One-to-Many / 1:N):
 * ```
 *   Cuenta (1) ──────< Reto (N)
 *   una cuenta puede tener muchos retos (uno o más por semana)
 *   cada reto pertenece a exactamente una cuenta
 * ```
 *
 * @module models/Reto
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos
const Cuenta = require('./Cuenta');          // Modelo padre de la relación 1:N


/**
 * @typedef {Object} RetoAttributes
 * @property {string}  id_reto           - UUID v4 que identifica unívocamente el reto (PK).
 * @property {string}  id_cuenta         - UUID de la cuenta propietaria del reto (FK → cuenta).
 * @property {string}  descripcion       - Descripción del desafío a superar (máx. 200 caracteres).
 * @property {string}  condicion         - Criterio evaluable que determina cuándo el reto está superado (máx. 100 caracteres).
 * @property {number}  puntos_recompensa - Cantidad de puntos que se otorgan al completar el reto.
 * @property {string}  semana            - Identificador ISO 8601 de la semana del reto (ej: '2026-W19').
 * @property {number}  progreso          - Avance acumulado del usuario hacia la condición del reto. Inicia en 0.
 * @property {boolean} completado        - Indica si el reto fue superado (`true`) y los puntos otorgados.
 */

/**
 * Modelo Sequelize que representa la tabla `reto`.
 *
 * Cada reto combina una descripción narrativa del desafío, una condición
 * evaluable por el sistema y una recompensa en puntos que se otorga al
 * completarlo. El campo `progreso` permite mostrar al usuario su avance
 * en tiempo real antes de alcanzar la condición de completado.
 *
 * Al marcarse como `completado: true`, el controlador debe crear un
 * registro en la tabla `Punto` con `origen: 'Reto'` e `id_origen: id_reto`
 * para acreditar la recompensa en el historial de puntos del usuario.
 *
 * Configuración relevante:
 * - `timestamps: false`  — sin columnas `createdAt`/`updatedAt` automáticas.
 * - `tableName: 'reto'`  — nombre exacto en BD, evita pluralización automática.
 *
 * @type {import('sequelize').Model}
 */
const Reto = sequelize.define('reto', {

  /**
   * Identificador primario del reto.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * STRING(36) porque un UUID v4 tiene exactamente 36 caracteres con guiones.
   */
  id_reto: {
    type: DataTypes.STRING(36),                        // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                                  // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 automáticamente si no se provee
  },

  /**
   * Clave foránea que referencia al usuario propietario del reto.
   * Debe corresponder a un `id_cuenta` existente en la tabla `cuenta`.
   * Si la cuenta se elimina, todos sus retos se eliminan en cascada.
   */
  id_cuenta: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Cuenta
    allowNull: false            // Campo obligatorio: todo reto debe tener un propietario
  },

  /**
   * Descripción narrativa del desafío que el usuario debe superar.
   * Explica en lenguaje natural qué debe hacer el usuario para ganar
   * los puntos de recompensa. Se muestra en la UI como título del reto.
   *
   * @example 'Completa 3 tareas de Alta prioridad esta semana'
   * @example 'Inicia sesión 5 días seguidos antes del domingo'
   */
  descripcion: {
    type: DataTypes.STRING(200), // Máximo 200 caracteres: descripción concisa para la UI
    allowNull: false             // Campo obligatorio: todo reto debe describir el desafío
  },

  /**
   * Criterio evaluable que el sistema usa para determinar cuándo el reto
   * ha sido superado. A diferencia de `descripcion` (texto para el usuario),
   * `condicion` es una referencia técnica o expresión que el motor de
   * gamificación puede interpretar para actualizar el progreso y completar
   * el reto automáticamente.
   *
   * A diferencia del campo `condicion` en Insignia (que es UNIQUE global),
   * aquí no hay restricción UNIQUE porque distintos usuarios pueden tener
   * retos con la misma condición en la misma semana.
   *
   * @example 'tareas_alta_completadas >= 3'
   * @example 'dias_sesion_consecutivos >= 5'
   * @example 'puntos_semana >= 100'
   */
  condicion: {
    type: DataTypes.STRING(100), // Máximo 100 caracteres: expresión o identificador de condición
    allowNull: false             // Campo obligatorio: sin condición no hay criterio de superación
  },

  /**
   * Cantidad de puntos que se acreditan al usuario al completar el reto.
   * Este valor debe usarse en el controlador para crear el registro
   * correspondiente en la tabla `Punto` cuando `completado` cambia a `true`.
   *
   * Se recomienda validar en el controlador que el valor sea positivo (> 0),
   * ya que Sequelize no aplica restricciones de rango en INTEGER por defecto.
   *
   * @example 25 (reto fácil), 50 (reto medio), 100 (reto difícil)
   */
  puntos_recompensa: {
    type: DataTypes.INTEGER, // Número entero: los puntos de recompensa no tienen decimales
    allowNull: false         // Campo obligatorio: todo reto debe tener un valor de recompensa definido
  },

  /**
   * Identificador de la semana académica a la que pertenece el reto.
   * Se recomienda el formato ISO 8601 (`YYYY-Www`) para garantizar
   * consistencia con los modelos Meta y Reporte que usan el mismo campo,
   * facilitando el cruce de datos entre las tres tablas.
   *
   * @example '2026-W19', '2026-W20', '2026-W01'
   */
  semana: {
    type: DataTypes.STRING(10), // Máximo 10 caracteres: formato recomendado 'YYYY-Www' (8 chars)
    allowNull: false            // Campo obligatorio: todo reto debe pertenecer a una semana
  },

  /**
   * Avance acumulado del usuario hacia la condición de superación del reto.
   * Se incrementa desde el controlador conforme el usuario realiza acciones
   * relacionadas con la condición del reto. Permite mostrar barras de
   * progreso en la UI antes de que el reto sea completado.
   *
   * No tiene un techo explícito definido en el modelo; el controlador debe
   * comparar `progreso` contra el umbral implícito en `condicion` para
   * decidir cuándo marcar el reto como `completado: true`.
   *
   * @example 0 (reto sin avance), 2 (avanzando), 3 (condición alcanzada → completar)
   */
  progreso: {
    type: DataTypes.INTEGER, // Número entero: contador de unidades de progreso
    allowNull: false,        // Campo obligatorio
    defaultValue: 0          // Todo reto nuevo comienza sin progreso registrado
  },

  /**
   * Indicador de si el reto fue superado y la recompensa fue otorgada.
   * `false` → reto activo, pendiente de completar (estado inicial).
   * `true`  → reto superado; el controlador debe haber creado el registro
   *            en `Punto` con `origen: 'Reto'` e `id_origen: id_reto`.
   *
   * Una vez marcado como `true`, el reto no debería modificarse para
   * preservar la integridad del historial de logros del usuario.
   */
  completado: {
    type: DataTypes.BOOLEAN, // TINYINT(1) en MySQL / BOOLEAN en otros motores
    allowNull: false,        // Campo obligatorio
    defaultValue: false      // Todo reto nuevo comienza como no completado
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'reto'   → Nombre exacto de la tabla en la BD.
   *                        Sin esto, Sequelize la llamaría 'retos' (plural automático).
   *
   * timestamps: false   → Desactiva `createdAt`/`updatedAt` automáticos.
   *                        Los retos no requieren auditoría temporal propia;
   *                        su contexto temporal se gestiona con el campo `semana`.
   */
  tableName: 'reto',
  timestamps: false
});


// ─────────────────────────────────────────
// ASOCIACIONES 1:N (One-to-Many)
// ─────────────────────────────────────────

/**
 * Asociación: Cuenta → Reto (una cuenta puede tener muchos retos).
 *
 * `hasMany` configura la relación desde el lado del padre (Cuenta):
 * - `foreignKey: 'id_cuenta'` → columna en la tabla `reto` que apunta a Cuenta.
 * - `onDelete: 'CASCADE'`     → si se elimina una Cuenta, se eliminan automáticamente
 *                               todos sus retos, incluyendo los ya completados.
 *
 * Habilita consultas como:
 * @example
 * // Obtener todos los retos activos de un usuario en la semana actual
 * const retos = await Reto.findAll({
 *   where: { id_cuenta: id, semana: '2026-W19', completado: false }
 * });
 */
Cuenta.hasMany(Reto, {
  foreignKey: 'id_cuenta', // FK en reto que referencia a Cuenta
  onDelete: 'CASCADE'      // Elimina todos los retos si se borra la Cuenta propietaria
});

/**
 * Asociación: Reto → Cuenta (cada reto pertenece a exactamente una cuenta).
 *
 * `belongsTo` configura la relación desde el lado del hijo (Reto):
 * - `foreignKey: 'id_cuenta'` → columna en la tabla `reto` que apunta a Cuenta.
 *
 * La eliminación en cascada se controla desde el padre (`hasMany`),
 * por lo que no se define `onDelete` en esta dirección.
 *
 * Habilita consultas como:
 * @example
 * const reto = await Reto.findByPk(id, { include: Cuenta });
 * // reto.Cuenta → datos del usuario propietario del reto
 */
Reto.belongsTo(Cuenta, {
  foreignKey: 'id_cuenta' // FK en reto que referencia a Cuenta
});


module.exports = Reto;