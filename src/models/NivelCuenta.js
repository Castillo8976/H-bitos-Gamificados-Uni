/**
 * @fileoverview Modelo Sequelize para la entidad NivelCuenta.
 * Define la estructura de la tabla `nivel_cuenta`, representando
 * el nivel de progreso gamificado que alcanza cada usuario dentro
 * de la plataforma en función de sus puntos acumulados.
 *
 * Cada nivel tiene un umbral mínimo de puntos para alcanzarlo y
 * un nombre descriptivo que se muestra en la interfaz del usuario.
 *
 * Relación con Cuenta (One-to-One / 1:1):
 * ```
 *   Cuenta (1) ──────── NivelCuenta (1)
 *   una cuenta tiene exactamente un nivel activo
 *   un nivel puede ser alcanzado por muchas cuentas
 * ```
 *
 * Nota de diseño: NivelCuenta actúa como catálogo global (tabla maestra).
 * La cuenta referencia su nivel actual mediante id_nivel_cuenta (FK en cuenta
 * o manejado en lógica del controlador).
 *
 * @module models/NivelCuenta
 * @requires sequelize
 * @requires ../database
 */

const { DataTypes } = require('sequelize');
const sequelize = require('../database');

/**
 * @typedef {Object} NivelCuentaAttributes
 * @property {string}  id_nivel       - UUID v4 que identifica unívocamente el nivel (PK).
 * @property {string}  nombre         - Nombre del nivel visible en la UI (máx. 60 caracteres).
 * @property {string}  descripcion    - Descripción del nivel y sus beneficios (máx. 200 caracteres).
 * @property {number}  puntos_minimos - Cantidad mínima de puntos necesarios para alcanzar el nivel.
 * @property {number}  orden          - Número de orden del nivel (1 = básico, N = máximo).
 * @property {string|null} icono      - Nombre del archivo de ícono del nivel. Opcional.
 */

/**
 * Modelo Sequelize que representa la tabla `nivel_cuenta`.
 *
 * Catálogo global de niveles de la plataforma. El controlador debe
 * evaluar el total de puntos de la cuenta y asignar el nivel
 * correspondiente consultando esta tabla.
 *
 * Configuración relevante:
 * - `timestamps: false`       — sin columnas automáticas createdAt/updatedAt.
 * - `tableName: 'nivel_cuenta'` — nombre exacto en BD.
 *
 * @type {import('sequelize').Model}
 */
const NivelCuenta = sequelize.define('nivel_cuenta', {

  /**
   * Identificador primario del nivel.
   * UUID v4 generado automáticamente.
   */
  id_nivel: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },

  /**
   * Nombre visible del nivel en la interfaz del usuario.
   * Debe ser único para evitar confusiones en la UI.
   * @example 'Principiante', 'Estudiante', 'Experto', 'Maestro'
   */
  nombre: {
    type: DataTypes.STRING(60),
    allowNull: false,
    unique: true
  },

  /**
   * Descripción del nivel y lo que representa para el usuario.
   * Se muestra al desbloquear el nivel o en el perfil del estudiante.
   */
  descripcion: {
    type: DataTypes.STRING(200),
    allowNull: false
  },

  /**
   * Cantidad mínima de puntos acumulados necesarios para alcanzar este nivel.
   * El controlador debe comparar SUM(punto.cantidad) contra este valor.
   * @example 0 (nivel inicial), 100, 500, 1000
   */
  puntos_minimos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },

  /**
   * Número de orden del nivel dentro de la jerarquía de progreso.
   * Permite ordenar los niveles de menor a mayor sin depender de puntos_minimos.
   * @example 1 (Principiante), 2 (Estudiante), 3 (Experto), 4 (Maestro)
   */
  orden: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },

  /**
   * Nombre del archivo de ícono visual asociado al nivel.
   * Opcional; si es null la UI muestra un ícono genérico.
   * @example 'nivel_bronce.svg', 'nivel_oro.png', null
   */
  icono: {
    type: DataTypes.STRING(50),
    allowNull: true
  }

}, {
  tableName: 'nivel_cuenta',
  timestamps: false
});

module.exports = NivelCuenta;
