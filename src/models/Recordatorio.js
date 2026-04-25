const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');
const Tarea = require('./Tarea');

const Recordatorio = sequelize.define('recordatorio', {
  id_recordatorio: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  id_tarea: { type: DataTypes.STRING(36), allowNull: false },
  id_cuenta: { type: DataTypes.STRING(36), allowNull: false },
  fecha_programada: { type: DataTypes.DATEONLY, allowNull: false },
  mensaje: { type: DataTypes.STRING(200), allowNull: false },
  enviado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'recordatorio', timestamps: false });

Tarea.hasMany(Recordatorio, { foreignKey: 'id_tarea', onDelete: 'CASCADE' });
Recordatorio.belongsTo(Tarea, { foreignKey: 'id_tarea' });
Cuenta.hasMany(Recordatorio, { foreignKey: 'id_cuenta', onDelete: 'CASCADE' });
Recordatorio.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });

module.exports = Recordatorio;