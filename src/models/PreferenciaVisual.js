const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');

const PreferenciaVisual = sequelize.define('preferencia_visual', {
  id_preferencia: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  id_cuenta: {
    type: DataTypes.STRING(36),
    allowNull: false,
    unique: true
  },
  tema: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'purple',
    validate: { isIn: [['purple','teal','amber','coral','blue','green']] }
  },
  modo_oscuro: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  avatar: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  fecha_actualizado: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, { tableName: 'preferencia_visual', timestamps: false });

Cuenta.hasOne(PreferenciaVisual, { foreignKey: 'id_cuenta', onDelete: 'CASCADE' });
PreferenciaVisual.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });

module.exports = PreferenciaVisual;