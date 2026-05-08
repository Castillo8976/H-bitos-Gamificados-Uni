/**
 * @fileoverview Modelo Sequelize para la entidad Insignia.
 * Define la estructura y restricciones de la tabla `insignia` en la base
 * de datos, representando los logros desbloqueables dentro del sistema
 * de gamificación de la plataforma.
 *
 * Las insignias son entidades independientes (catálogo global) que luego
 * se asocian a usuarios específicos a través de la tabla pivote
 * `cuenta_insignia` mediante una relación N:M.
 *
 * @module models/Insignia
 * @requires sequelize
 * @requires ../database
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos


/**
 * @typedef {Object} InsigniaAttributes
 * @property {string}      id_insignia  - UUID v4 que identifica unívocamente la insignia (PK).
 * @property {string}      nombre       - Nombre visible y único de la insignia (máx. 80 caracteres).
 * @property {string}      descripcion  - Texto explicativo del logro que representa (máx. 200 caracteres).
 * @property {string}      condicion    - Criterio único de desbloqueo evaluable por el sistema (máx. 100 caracteres).
 * @property {string|null} icono        - Nombre del archivo de ícono asociado (máx. 50 caracteres). Opcional.
 */

/**
 * Modelo Sequelize que representa la tabla `insignia`.
 *
 * Almacena el catálogo global de insignias disponibles en la plataforma.
 * Cada insignia tiene un nombre y una condición únicos para garantizar
 * que no existan logros duplicados ni criterios de desbloqueo ambiguos.
 *
 * Configuración relevante:
 * - `timestamps: false`      — sin columnas `createdAt`/`updatedAt` automáticas.
 * - `tableName: 'insignia'`  — nombre exacto en BD, evita pluralización automática.
 *
 * @type {import('sequelize').Model}
 */
const Insignia = sequelize.define('insignia', {

  /**
   * Identificador primario de la insignia.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * STRING(36) porque un UUID v4 tiene exactamente 36 caracteres incluyendo guiones.
   */
  id_insignia: {
    type: DataTypes.STRING(36),                        // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                                  // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 automáticamente si no se provee
  },

  /**
   * Nombre visible de la insignia mostrado en la interfaz de usuario.
   * La restricción UNIQUE impide crear dos insignias con el mismo nombre,
   * evitando confusión entre logros del catálogo.
   *
   * @example 'Primera Victoria', 'Explorador', 'Maestro del Tiempo'
   */
  nombre: {
    type: DataTypes.STRING(80), // Máximo 80 caracteres: suficiente para nombres descriptivos
    allowNull: false,           // Campo obligatorio: toda insignia debe tener nombre
    unique: true                // UNIQUE en BD: no puede haber dos insignias con el mismo nombre
  },

  /**
   * Descripción detallada del logro que representa la insignia.
   * Se muestra al usuario como texto explicativo al desbloquear o visualizar la insignia.
   * Limitado a 200 caracteres para mantener descripciones concisas en la UI.
   *
   * @example 'Otorgada al completar tu primera tarea antes de la fecha límite.'
   */
  descripcion: {
    type: DataTypes.STRING(200), // Máximo 200 caracteres: descripción concisa para la UI
    allowNull: false             // Campo obligatorio: toda insignia debe explicar su significado
  },

  /**
   * Criterio de desbloqueo evaluable por el sistema de gamificación.
   * Define la regla lógica o identificador de evento que activa la asignación
   * automática de la insignia al usuario cuando se cumple la condición.
   * La restricción UNIQUE garantiza que cada insignia tenga un criterio exclusivo,
   * evitando que dos insignias se otorguen por exactamente la misma acción.
   *
   * @example 'tareas_completadas >= 10', 'racha_dias >= 7', 'primer_login'
   */
  condicion: {
    type: DataTypes.STRING(100), // Máximo 100 caracteres: identificador o expresión de condición
    allowNull: false,            // Campo obligatorio: sin condición no hay criterio de desbloqueo
    unique: true                 // UNIQUE en BD: cada condición debe pertenecer a una sola insignia
  },

  /**
   * Nombre del archivo de ícono visual asociado a la insignia.
   * Se usa para renderizar la imagen del logro en la interfaz de usuario.
   * Es opcional (`allowNull: true`): si no se define, la UI debe mostrar
   * un ícono genérico por defecto.
   *
   * @example 'trofeo_oro.png', 'estrella_plata.svg', null
   */
  icono: {
    type: DataTypes.STRING(50), // Máximo 50 caracteres: solo el nombre del archivo, no la ruta completa
    allowNull: true             // Campo opcional: una insignia puede no tener ícono personalizado
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'insignia' → Nombre exacto de la tabla en la BD.
   *                          Sin esto, Sequelize la llamaría 'insignias' (plural automático).
   *
   * timestamps: false     → Desactiva las columnas `createdAt` y `updatedAt` automáticas.
   *                          Las insignias son entidades de catálogo que no requieren
   *                          auditoría temporal propia; su fecha de obtención se registra
   *                          en la tabla pivote `cuenta_insignia.fecha_obtenida`.
   */
  tableName: 'insignia',
  timestamps: false
});


module.exports = Insignia;