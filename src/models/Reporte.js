/**
 * @fileoverview Modelo Sequelize para la entidad Reporte.
 * Define la estructura y restricciones de la tabla `reporte`, almacenando
 * el resumen consolidado del rendimiento académico semanal de cada usuario.
 *
 * A diferencia del modelo Punto (que registra transacciones individuales),
 * Reporte almacena métricas ya agregadas por semana, funcionando como una
 * snapshot o instantánea del desempeño del usuario en un período específico:
 *
 * ```
 *   Punto  → historial de transacciones individuales (append-only ledger)
 *   Reporte → resumen semanal consolidado (snapshot de métricas agregadas)
 * ```
 *
 * Los valores del reporte deben calcularse y persistirse desde el controlador
 * al cierre de cada semana, consultando las tablas Tarea y Punto para
 * obtener los totales correspondientes al período.
 *
 * Relación con Cuenta (One-to-Many / 1:N):
 * ```
 *   Cuenta (1) ──────< Reporte (N)
 *   una cuenta puede tener un reporte por cada semana
 *   cada reporte pertenece a exactamente una cuenta
 * ```
 *
 * @module models/Reporte
 * @requires sequelize
 * @requires ../database
 * @requires ./Cuenta
 */

const { DataTypes } = require('sequelize'); // Tipos de datos de Sequelize para definir columnas
const sequelize = require('../database');    // Instancia de conexión a la base de datos
const Cuenta = require('./Cuenta');          // Modelo padre de la relación 1:N


/**
 * @typedef {Object} ReporteAttributes
 * @property {string} id_reporte         - UUID v4 que identifica unívocamente el reporte (PK).
 * @property {string} id_cuenta          - UUID de la cuenta propietaria del reporte (FK → cuenta).
 * @property {string} semana             - Identificador ISO 8601 de la semana cubierta (ej: '2026-W19').
 * @property {number} tareas_completadas - Total de tareas completadas durante la semana. Por defecto 0.
 * @property {number} horas_estudiadas   - Total de horas de estudio registradas en la semana (decimal). Por defecto 0.
 * @property {number} puntos_obtenidos   - Total de puntos acumulados durante la semana. Por defecto 0.
 * @property {string} fecha_generado     - Fecha en que se generó o actualizó el reporte (YYYY-MM-DD).
 */

/**
 * Modelo Sequelize que representa la tabla `reporte`.
 *
 * Cada fila es el resumen semanal consolidado de un usuario, con métricas
 * precalculadas que evitan consultas costosas en tiempo real. El reporte
 * puede generarse al cerrar la semana o actualizarse progresivamente
 * durante la semana según la lógica del controlador.
 *
 * La combinación (id_cuenta, semana) debería ser única en la práctica
 * para garantizar un solo reporte por usuario por semana; puede reforzarse
 * con un índice compuesto si el proyecto lo requiere.
 *
 * Configuración relevante:
 * - `timestamps: false`     — sin columnas `createdAt`/`updatedAt` automáticas.
 * - `tableName: 'reporte'`  — nombre exacto en BD, evita pluralización automática.
 *
 * @type {import('sequelize').Model}
 */
const Reporte = sequelize.define('reporte', {

  /**
   * Identificador primario del reporte.
   * Se genera automáticamente como UUID v4 si no se proporciona uno explícito.
   * STRING(36) porque un UUID v4 tiene exactamente 36 caracteres con guiones.
   */
  id_reporte: {
    type: DataTypes.STRING(36),                        // UUID v4: siempre 36 caracteres con guiones
    primaryKey: true,                                  // Clave primaria de la tabla
    defaultValue: () => require('crypto').randomUUID() // Genera UUID v4 automáticamente si no se provee
  },

  /**
   * Clave foránea que referencia al usuario propietario del reporte.
   * Debe corresponder a un `id_cuenta` existente en la tabla `cuenta`.
   * Si la cuenta se elimina, todos sus reportes se eliminan en cascada.
   */
  id_cuenta: {
    type: DataTypes.STRING(36), // UUID v4: misma longitud que la PK de Cuenta
    allowNull: false            // Campo obligatorio: todo reporte debe tener un propietario
  },

  /**
   * Identificador de la semana académica cubierta por el reporte.
   * Se recomienda el formato ISO 8601 (`YYYY-Www`) para garantizar
   * consistencia con el campo homónimo del modelo Meta y facilitar
   * el cruce de datos entre ambas tablas.
   *
   * STRING(10) es suficiente para el formato estándar de 8 caracteres
   * (ej: '2026-W19'), con margen para variantes de formato.
   *
   * @example '2026-W19', '2026-W01', '2025-W52'
   */
  semana: {
    type: DataTypes.STRING(10), // Máximo 10 caracteres: formato recomendado 'YYYY-Www' (8 chars)
    allowNull: false            // Campo obligatorio: todo reporte debe cubrir una semana específica
  },

  /**
   * Total de tareas marcadas como completadas durante la semana del reporte.
   * Se calcula contando las filas de Tarea donde:
   * `estado = 'Completada' AND id_cuenta = ? AND fecha_completada BETWEEN inicio AND fin de semana`.
   * Inicia en 0 al crear el reporte; se actualiza conforme avanza la semana.
   *
   * @example 0 (semana sin tareas completadas), 5 (cinco tareas completadas)
   */
  tareas_completadas: {
    type: DataTypes.INTEGER, // Número entero: contador de tareas (unidades discretas)
    allowNull: false,        // Campo obligatorio
    defaultValue: 0          // Todo reporte nuevo inicia sin tareas registradas
  },

  /**
   * Total de horas de estudio registradas por el usuario durante la semana.
   * Usa DECIMAL(5,2) para permitir valores con precisión de centésimas de hora,
   * soportando registros como 1.5h (90 min) o 2.75h (2h 45min).
   *
   * Rango soportado por DECIMAL(5,2):
   * - Máximo: 999.99 horas semanales (suficiente para cualquier caso real)
   * - Precisión: hasta centésimas de hora (equivalente a ~36 segundos)
   *
   * @example 0 (sin horas registradas), 12.5 (doce horas y media), 37.25
   */
  horas_estudiadas: {
    type: DataTypes.DECIMAL(5, 2), // 5 dígitos totales, 2 decimales: rango 0.00 – 999.99
    allowNull: false,              // Campo obligatorio
    defaultValue: 0                // Todo reporte nuevo inicia sin horas registradas
  },

  /**
   * Total de puntos acumulados por el usuario durante la semana del reporte.
   * Se calcula sumando las filas de Punto donde:
   * `id_cuenta = ? AND fecha BETWEEN inicio AND fin de semana`.
   * Permite comparar el rendimiento entre semanas y visualizar tendencias
   * de progreso en el dashboard del usuario.
   *
   * @example 0 (semana sin actividad), 85 (puntos acumulados en la semana)
   */
  puntos_obtenidos: {
    type: DataTypes.INTEGER, // Número entero: los puntos no tienen decimales
    allowNull: false,        // Campo obligatorio
    defaultValue: 0          // Todo reporte nuevo inicia con cero puntos registrados
  },

  /**
   * Fecha en que el reporte fue generado o actualizado por última vez.
   * Se asigna automáticamente con la fecha actual del servidor al crear el registro.
   * Debe actualizarse en el controlador cada vez que se recalculen las métricas.
   * Usa DATEONLY para almacenar solo YYYY-MM-DD, sin componente de hora.
   *
   * @example '2026-05-08' (fecha en que se generó o actualizó el reporte)
   */
  fecha_generado: {
    type: DataTypes.DATEONLY,    // Solo fecha: YYYY-MM-DD (sin hora ni zona horaria)
    allowNull: false,            // Campo obligatorio
    defaultValue: DataTypes.NOW  // Se asigna automáticamente con la fecha actual del servidor
  }

}, {
  /**
   * Opciones del modelo.
   *
   * tableName: 'reporte'  → Nombre exacto de la tabla en la BD.
   *                          Sin esto, Sequelize la llamaría 'reportes' (plural automático).
   *
   * timestamps: false     → Desactiva `createdAt`/`updatedAt` automáticos.
   *                          La auditoría temporal se gestiona con `fecha_generado`.
   */
  tableName: 'reporte',
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
 * Asociación: Cuenta → Reporte (una cuenta puede tener muchos reportes, uno por semana).
 *
 * `hasMany` configura la relación desde el lado del padre (Cuenta):
 * - `foreignKey: 'id_cuenta'` → columna en la tabla `reporte` que apunta a Cuenta.
 * - `onDelete: 'CASCADE'`     → si se elimina una Cuenta, se eliminan automáticamente
 *                               todos sus reportes históricos.
 *
 * Habilita consultas como:
 * @example
 * // Obtener todos los reportes de un usuario ordenados por semana
 * const cuenta = await Cuenta.findByPk(id, { include: Reporte });
 * // cuenta.Reportes → historial completo de reportes semanales del usuario
 *
 * @example
 * // Obtener el reporte de una semana específica
 * const reporte = await Reporte.findOne({
 *   where: { id_cuenta: id, semana: '2026-W19' }
 * });
 */
Cuenta.hasMany(Reporte, {
  foreignKey: 'id_cuenta', // FK en reporte que referencia a Cuenta
  onDelete: 'CASCADE'      // Elimina el historial de reportes si se borra la Cuenta
});

/**
 * Asociación: Reporte → Cuenta (cada reporte pertenece a exactamente una cuenta).
 *
 * `belongsTo` configura la relación desde el lado del hijo (Reporte):
 * - `foreignKey: 'id_cuenta'` → columna en la tabla `reporte` que apunta a Cuenta.
 *
 * La eliminación en cascada se controla desde el padre (`hasMany`),
 * por lo que no se define `onDelete` en esta dirección.
 *
 * Habilita consultas como:
 * @example
 * const reporte = await Reporte.findByPk(id, { include: Cuenta });
 * // reporte.Cuenta → datos del usuario propietario del reporte
 */
Reporte.belongsTo(Cuenta, {
  foreignKey: 'id_cuenta' // FK en reporte que referencia a Cuenta
});


module.exports = Reporte;