/**
 * @fileoverview Modelo Sequelize para la entidad Punto.
 * Define la estructura y restricciones de la tabla `punto`, registrando
 * cada transacción de puntos que un usuario acumula dentro del sistema
 * de gamificación de la plataforma.
 *
 * Cada fila representa un evento de ganancia de puntos (no un total),
 * funcionando como un historial o ledger inmutable de transacciones.
 * El puntaje total del usuario se obtiene sumando todas sus filas:
 * ```
 *   SELECT SUM(cantidad) FROM punto WHERE id_cuenta = ?
 * ```
 *
 * Relación con Cuenta (One-to-Many / 1:N):
 * ```
 *   Cuenta (1) ──────< Punto (N)
 *   una cuenta puede acumular muchos registros de puntos
 *   cada registro de puntos pertenece a exactamente una cuenta
 * ```
 *
 * El campo `origen` actúa como discriminador polimórfico: identifica
 * qué tipo de entidad generó los puntos, mientras que `id_origen`
 * almacena el UUID de esa entidad específica.
 *
 * @module models/Punto
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos
const Cuenta = require('./Cuenta');          // Modelo padre de la relación 1:N


/**
 * @typedef {Object} PuntoAttributes
 * @property {string}      id_punto  - UUID v4 que identifica unívocamente la transacción (PK).
 * @property {string}      id_cuenta - UUID de la cuenta que recibió los puntos (FK → cuenta).
 * @property {number}      cantidad  - Número de puntos otorgados en esta transacción.
 * @property {string}      origen    - Tipo de entidad que generó los puntos: 'Tarea'|'Reto'|'Sesion'.
 * @property {string|null} id_origen - UUID de la entidad específica que originó los puntos. Opcional.
 * @property {string}      fecha     - Fecha en que se otorgaron los puntos (YYYY-MM-DD).
 */

/**
 * Modelo Sequelize que representa la tabla `punto`.
 *
 * Implementa un patrón de registro de transacciones (append-only ledger):
 * cada vez que el usuario gana puntos se inserta una nueva fila en lugar
 * de actualizar un contador global. Esto preserva el historial completo
 * de actividad y permite auditar el origen de cada punto ganado.
 *
 * El campo `id_origen` es una referencia polimórfica no enforced por FK
 * en la base de datos, ya que puede apuntar a tablas distintas según
 * el valor de `origen` ('Tarea', 'Reto' o 'Sesion').
 *
 * Configuración relevante:
 * - `timestamps: false`    — sin columnas `createdAt`/`updatedAt` automáticas;
 *                            la auditoría temporal se gestiona con `fecha`.
 * - `tableName: 'punto'`   — nombre exacto en BD, evita pluralización automática.
 *
 * @type {import('sequelize').Model}
 */
const Punto = sequelize.define('punto', {

  /**
   * Identificador primario de la transacción de puntos.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * STRING(36) porque un UUID v4 tiene exactamente 36 caracteres con guiones.
   */
  id_punto: {
    type: DataTypes.STRING(36),                        // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                                  // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 automáticamente si no se provee
  },

  /**
   * Clave foránea que referencia al usuario que recibió los puntos.
   * Debe corresponder a un `id_cuenta` existente en la tabla `cuenta`.
   * Si la cuenta se elimina, todos sus registros de puntos se eliminan en cascada.
   */
  id_cuenta: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Cuenta
    allowNull: false            // Campo obligatorio: todo punto debe tener un receptor
  },

  /**
   * Cantidad de puntos otorgados en esta transacción específica.
   * Representa un delta (incremento), no el total acumulado del usuario.
   * El puntaje global se calcula con SUM() sobre todas las filas del usuario.
   * Se recomienda validar en el controlador que el valor sea positivo (> 0).
   *
   * @example 10 (completar tarea), 25 (ganar reto), 5 (iniciar sesión)
   */
  cantidad: {
    type: DataTypes.INTEGER, // Número entero: los puntos no tienen decimales
    allowNull: false         // Campo obligatorio: toda transacción debe especificar cuántos puntos
  },

  /**
   * Discriminador que identifica el tipo de entidad que generó los puntos.
   * Junto con `id_origen`, forma una referencia polimórfica que permite
   * rastrear exactamente qué acción del usuario fue recompensada.
   *
   * La validación `isIn` rechaza cualquier valor fuera del conjunto permitido
   * antes de ejecutar el INSERT, protegiendo la integridad del historial.
   *
   * Valores permitidos:
   * - 'Tarea'   → puntos otorgados por completar una tarea académica.
   * - 'Reto'    → puntos otorgados por superar un reto o desafío.
   * - 'Sesion'  → puntos otorgados por iniciar sesión o actividad diaria.
   */
  origen: {
    type: DataTypes.STRING(20), // Máximo 20 caracteres: suficiente para los identificadores de origen
    allowNull: false,           // Campo obligatorio: todo punto debe tener un origen identificado
    validate: {
      // Validación en capa de aplicación: rechaza valores fuera del conjunto permitido
      isIn: [['Tarea', 'Reto', 'Sesion']]
    }
  },

  /**
   * UUID de la entidad específica que originó esta transacción de puntos.
   * Se interpreta en conjunto con el campo `origen`:
   *
   * | origen    | id_origen apunta a        |
   * |-----------|---------------------------|
   * | 'Tarea'   | tarea.id_tarea            |
   * | 'Reto'    | reto.id_reto              |
   * | 'Sesion'  | null (sin entidad ligada) |
   *
   * Es una referencia polimórfica: no existe una FK formal en la BD porque
   * puede apuntar a tablas distintas. La integridad referencial debe
   * validarse en el controlador antes de insertar el registro.
   *
   * Es opcional (`allowNull: true`) para cubrir casos como 'Sesion',
   * donde no hay una entidad específica que referenciar.
   */
  id_origen: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que las PKs de las entidades origen
    allowNull: true             // Opcional: 'Sesion' y otros orígenes sin entidad concreta usan null
  },

  /**
   * Fecha en que se otorgaron los puntos al usuario.
   * Se asigna automáticamente con la fecha actual del servidor al insertar el registro.
   * Usa DATEONLY para almacenar solo YYYY-MM-DD, sin componente de hora.
   * Permite filtrar el historial de puntos por día, semana o mes.
   *
   * @example '2026-05-08'
   */
  fecha: {
    type: DataTypes.DATEONLY,    // Solo fecha: YYYY-MM-DD (sin hora ni zona horaria)
    allowNull: false,            // Campo obligatorio: toda transacción debe tener fecha
    defaultValue: DataTypes.NOW  // Se asigna automáticamente con la fecha actual del servidor
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'punto'   → Nombre exacto de la tabla en la BD.
   *                         Sin esto, Sequelize la llamaría 'puntos' (plural automático).
   *
   * timestamps: false    → Desactiva `createdAt`/`updatedAt` automáticos.
   *                         La auditoría temporal se gestiona con el campo `fecha`.
   */
  tableName: 'punto',
  timestamps: false
});


// ─────────────────────────────────────────
// ASOCIACIONES 1:N (One-to-Many)
// ─────────────────────────────────────────

/**
 * Asociación: Cuenta → Punto (una cuenta puede tener muchos registros de puntos).
 *
 * `hasMany` configura la relación desde el lado del padre (Cuenta):
 * - `foreignKey: 'id_cuenta'` → columna en la tabla `punto` que apunta a Cuenta.
 * - `onDelete: 'CASCADE'`     → si se elimina una Cuenta, se elimina automáticamente
 *                               todo su historial de puntos.
 *
 * Habilita consultas como:
 * @example
 * const cuenta = await Cuenta.findByPk(id, { include: Punto });
 * // cuenta.Puntos → historial completo de transacciones de puntos del usuario
 *
 * @example
 * // Calcular puntaje total del usuario con Sequelize
 * const total = await Punto.sum('cantidad', { where: { id_cuenta: id } });
 */
Cuenta.hasMany(Punto, {
  foreignKey: 'id_cuenta', // FK en punto que referencia a Cuenta
  onDelete: 'CASCADE'      // Elimina todo el historial de puntos si se borra la Cuenta
});

/**
 * Asociación: Punto → Cuenta (cada registro de puntos pertenece a una sola cuenta).
 *
 * `belongsTo` configura la relación desde el lado del hijo (Punto):
 * - `foreignKey: 'id_cuenta'` → columna en la tabla `punto` que apunta a Cuenta.
 *
 * La eliminación en cascada se controla desde el padre (`hasMany`),
 * por lo que no se define `onDelete` en esta dirección.
 *
 * Habilita consultas como:
 * @example
 * const punto = await Punto.findByPk(id, { include: Cuenta });
 * // punto.Cuenta → datos del usuario que recibió estos puntos
 */
Punto.belongsTo(Cuenta, {
  foreignKey: 'id_cuenta' // FK en punto que referencia a Cuenta
});


module.exports = Punto;