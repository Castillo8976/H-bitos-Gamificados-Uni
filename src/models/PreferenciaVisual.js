/**
 * @fileoverview Modelo Sequelize para la entidad PreferenciaVisual.
 * Define la estructura y restricciones de la tabla `preferencia_visual`,
 * almacenando la configuración de apariencia personalizada de cada usuario.
 *
 * Relación con Cuenta (One-to-One / 1:1):
 * ```
 *   Cuenta (1) ──────── PreferenciaVisual (1)
 *   una cuenta tiene exactamente una preferencia visual
 *   una preferencia visual pertenece a exactamente una cuenta
 * ```
 *
 * La restricción `unique: true` en `id_cuenta` es la que enforce la
 * cardinalidad 1:1 a nivel de base de datos, garantizando que no puedan
 * existir dos registros de preferencias para el mismo usuario.
 *
 * @module models/PreferenciaVisual
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos
const Cuenta = require('./Cuenta');          // Modelo asociado en la relación 1:1


/**
 * @typedef {Object} PreferenciaVisualAttributes
 * @property {string}      id_preferencia    - UUID v4 que identifica unívocamente la preferencia (PK).
 * @property {string}      id_cuenta         - UUID único de la cuenta propietaria (FK → cuenta).
 * @property {string}      tema              - Nombre del tema de color activo. Valores: 'purple'|'teal'|'amber'|'coral'|'blue'|'green'.
 * @property {boolean}     modo_oscuro       - Indica si el modo oscuro está activado (`true`) o desactivado (`false`).
 * @property {string|null} avatar            - Nombre del archivo de avatar del usuario. Opcional.
 * @property {string}      fecha_actualizado - Fecha de la última modificación de las preferencias (YYYY-MM-DD).
 */

/**
 * Modelo Sequelize que representa la tabla `preferencia_visual`.
 *
 * Almacena un único registro de configuración visual por usuario.
 * Incluye validación a nivel de aplicación (`validate.isIn`) para el campo
 * `tema`, asegurando que solo se acepten los valores de la paleta definida,
 * sin depender exclusivamente de validaciones en el cliente.
 *
 * Configuración relevante:
 * - `timestamps: false`               — sin columnas `createdAt`/`updatedAt` automáticas;
 *                                       la auditoría se gestiona con `fecha_actualizado`.
 * - `tableName: 'preferencia_visual'` — nombre exacto en BD, evita pluralización automática.
 *
 * @type {import('sequelize').Model}
 */
const PreferenciaVisual = sequelize.define('preferencia_visual', {

  /**
   * Identificador primario de la preferencia visual.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * STRING(36) porque un UUID v4 tiene exactamente 36 caracteres con guiones.
   */
  id_preferencia: {
    type: DataTypes.STRING(36),                        // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                                  // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 automáticamente si no se provee
  },

  /**
   * Clave foránea que referencia al usuario propietario de estas preferencias.
   * La restricción `unique: true` es fundamental: convierte la relación de
   * 1:N (que `hasOne`/`belongsTo` crearían por defecto en Sequelize) en una
   * verdadera relación 1:1 a nivel de base de datos.
   *
   * Sin `unique: true`, un usuario podría tener múltiples filas de preferencias,
   * lo cual rompería la lógica de configuración única por usuario.
   */
  id_cuenta: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Cuenta
    allowNull: false,           // Campo obligatorio: toda preferencia debe tener un propietario
    unique: true                // UNIQUE en BD: garantiza máximo 1 preferencia por cuenta (1:1)
  },

  /**
   * Nombre del tema de color activo en la interfaz del usuario.
   * La validación `isIn` se ejecuta en la capa de aplicación (Sequelize)
   * antes de enviar el INSERT/UPDATE a la base de datos, rechazando
   * cualquier valor que no esté en la lista de temas permitidos.
   *
   * Temas disponibles:
   * - 'purple' → Paleta morada (valor por defecto)
   * - 'teal'   → Paleta verde azulado
   * - 'amber'  → Paleta ámbar/dorada
   * - 'coral'  → Paleta coral/rojiza
   * - 'blue'   → Paleta azul
   * - 'green'  → Paleta verde
   */
  tema: {
    type: DataTypes.STRING(20), // Máximo 20 caracteres: suficiente para los nombres de tema
    allowNull: false,           // Campo obligatorio
    defaultValue: 'purple',     // Tema inicial por defecto al crear la preferencia
    validate: {
      // Validación en capa de aplicación: lanza error si el valor no está en la lista
      isIn: [['purple', 'teal', 'amber', 'coral', 'blue', 'green']]
    }
  },

  /**
   * Indicador del modo de visualización de la interfaz.
   * `false` → modo claro (light mode), experiencia por defecto.
   * `true`  → modo oscuro (dark mode), activado por el usuario.
   */
  modo_oscuro: {
    type: DataTypes.BOOLEAN, // TINYINT(1) en MySQL / BOOLEAN en otros motores
    allowNull: false,        // Campo obligatorio
    defaultValue: false      // Por defecto la interfaz inicia en modo claro
  },

  /**
   * Nombre del archivo de avatar personalizado del usuario.
   * Almacena únicamente el nombre del archivo (no la ruta completa),
   * dejando la resolución de la URL al servicio de archivos estáticos.
   * Es opcional: si es `null`, la UI debe mostrar un avatar genérico por defecto.
   *
   * @example 'avatar_01.png', 'perfil_juan.jpg', null
   */
  avatar: {
    type: DataTypes.STRING(50), // Máximo 50 caracteres: solo nombre de archivo, no ruta completa
    allowNull: true             // Campo opcional: el usuario puede no haber definido un avatar
  },

  /**
   * Fecha de la última modificación de las preferencias visuales.
   * Debe actualizarse en el controlador cada vez que el usuario guarde cambios.
   * Usa DATEONLY para almacenar solo YYYY-MM-DD, sin componente de hora.
   * Se asigna automáticamente con la fecha del servidor al crear el registro.
   */
  fecha_actualizado: {
    type: DataTypes.DATEONLY,    // Solo fecha: YYYY-MM-DD (sin hora ni zona horaria)
    allowNull: false,            // Campo obligatorio
    defaultValue: DataTypes.NOW  // Se asigna con la fecha actual del servidor al crear
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'preferencia_visual' → Nombre exacto de la tabla en la BD.
   *                                    Sin esto, Sequelize la llamaría 'preferencia_visuals'.
   *
   * timestamps: false               → Desactiva `createdAt`/`updatedAt` automáticos.
   *                                    La auditoría temporal se gestiona con `fecha_actualizado`.
   */
  tableName: 'preferencia_visual',
  timestamps: false
});


// ─────────────────────────────────────────
// ASOCIACIONES 1:1 (One-to-One)
// ─────────────────────────────────────────

/**
 * Asociación: Cuenta → PreferenciaVisual (una cuenta tiene una sola preferencia visual).
 *
 * `hasOne` configura la relación desde el lado del padre (Cuenta):
 * - `foreignKey: 'id_cuenta'` → columna en `preferencia_visual` que apunta a Cuenta.
 * - `onDelete: 'CASCADE'`     → si se elimina una Cuenta, se elimina automáticamente
 *                               su registro de preferencias visuales.
 *
 * Habilita consultas como:
 * @example
 * const cuenta = await Cuenta.findByPk(id, { include: PreferenciaVisual });
 * // cuenta.PreferenciaVisual → objeto con el tema, modo_oscuro y avatar del usuario
 */
Cuenta.hasOne(PreferenciaVisual, {
  foreignKey: 'id_cuenta', // FK en preferencia_visual que referencia a Cuenta
  onDelete: 'CASCADE'      // Elimina la preferencia si se borra la Cuenta propietaria
});

/**
 * Asociación: PreferenciaVisual → Cuenta (una preferencia pertenece a exactamente una cuenta).
 *
 * `belongsTo` configura la relación desde el lado del hijo (PreferenciaVisual):
 * - `foreignKey: 'id_cuenta'` → columna en `preferencia_visual` que apunta a Cuenta.
 *
 * La eliminación en cascada se controla desde el padre (`hasOne`),
 * por lo que no se define `onDelete` en esta dirección.
 *
 * Habilita consultas como:
 * @example
 * const preferencia = await PreferenciaVisual.findByPk(id, { include: Cuenta });
 * // preferencia.Cuenta → objeto con los datos del propietario
 */
PreferenciaVisual.belongsTo(Cuenta, {
  foreignKey: 'id_cuenta' // FK en preferencia_visual que referencia a Cuenta
});


module.exports = PreferenciaVisual;