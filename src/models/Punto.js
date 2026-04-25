const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');

const Punto = sequelize.define('punto', {
  id_punto: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  id_cuenta: { type: DataTypes.STRING(36), allowNull: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  origen: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: { isIn: [['Tarea','Reto','Sesion']] }
  },
  id_origen: { type: DataTypes.STRING(36), allowNull: true },
  fecha: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'punto', timestamps: false });

Cuenta.hasMany(Punto, { foreignKey: 'id_cuenta', onDelete: 'CASCADE' });
Punto.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });

module.exports = Punto;