const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');

const Meta = sequelize.define('meta', {
  id_meta: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  id_cuenta: { type: DataTypes.STRING(36), allowNull: false },
  semana: { type: DataTypes.STRING(10), allowNull: false },
  descripcion: { type: DataTypes.STRING(200), allowNull: false },
  valor_objetivo: { type: DataTypes.INTEGER, allowNull: false },
  valor_actual: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  cumplida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
}, { tableName: 'meta', timestamps: false });

Cuenta.hasMany(Meta, { foreignKey: 'id_cuenta', onDelete: 'CASCADE' });
Meta.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });

module.exports = Meta;