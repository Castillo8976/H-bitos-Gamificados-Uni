const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');

const Reto = sequelize.define('reto', {
  id_reto: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  id_cuenta: { type: DataTypes.STRING(36), allowNull: false },
  descripcion: { type: DataTypes.STRING(200), allowNull: false },
  condicion: { type: DataTypes.STRING(100), allowNull: false },
  puntos_recompensa: { type: DataTypes.INTEGER, allowNull: false },
  semana: { type: DataTypes.STRING(10), allowNull: false },
  progreso: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  completado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'reto', timestamps: false });

Cuenta.hasMany(Reto, { foreignKey: 'id_cuenta', onDelete: 'CASCADE' });
Reto.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });

module.exports = Reto;