const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');

const Reporte = sequelize.define('reporte', {
  id_reporte: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  id_cuenta: { type: DataTypes.STRING(36), allowNull: false },
  semana: { type: DataTypes.STRING(10), allowNull: false },
  tareas_completadas: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  horas_estudiadas: { type: DataTypes.DECIMAL(5,2), allowNull: false, defaultValue: 0 },
  puntos_obtenidos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  fecha_generado: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'reporte', timestamps: false });

Cuenta.hasMany(Reporte, { foreignKey: 'id_cuenta', onDelete: 'CASCADE' });
Reporte.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });

module.exports = Reporte;