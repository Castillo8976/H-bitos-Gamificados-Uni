const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');
const Insignia = require('./Insignia');

const CuentaInsignia = sequelize.define('cuenta_insignia', {
  id_cuenta: { type: DataTypes.STRING(36), allowNull: false },
  id_insignia: { type: DataTypes.STRING(36), allowNull: false },
  fecha_obtenida: { type: DataTypes.DATEONLY, allowNull: false, defaultValue: DataTypes.NOW }
}, { tableName: 'cuenta_insignia', timestamps: false });

Cuenta.belongsToMany(Insignia, { through: CuentaInsignia, foreignKey: 'id_cuenta', onDelete: 'CASCADE' });
Insignia.belongsToMany(Cuenta, { through: CuentaInsignia, foreignKey: 'id_insignia', onDelete: 'CASCADE' });

module.exports = CuentaInsignia;