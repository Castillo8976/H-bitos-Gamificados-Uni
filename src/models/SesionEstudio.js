const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');
const Tarea = require('./Tarea');

const SesionEstudio = sequelize.define('sesion_estudio', {
  id_sesion: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  id_cuenta: { type: DataTypes.STRING(36), allowNull: false },
  id_tarea: { type: DataTypes.STRING(36), allowNull: true },
  fecha: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW },
  duracion_minutos: { type: DataTypes.INTEGER, allowNull: false },
  modo_enfoque: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'sesion_estudio', timestamps: false });

Cuenta.hasMany(SesionEstudio, { foreignKey: 'id_cuenta', onDelete: 'CASCADE' });
SesionEstudio.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });
Tarea.hasMany(SesionEstudio, { foreignKey: 'id_tarea', onDelete: 'SET NULL' });
SesionEstudio.belongsTo(Tarea, { foreignKey: 'id_tarea' });

module.exports = SesionEstudio;