const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');

const Materia = sequelize.define('materia', {
  id_materia: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  id_cuenta: {
    type: DataTypes.STRING(36),
    allowNull: false
  },
  nombre: {
    type: DataTypes.STRING(80),
    allowNull: false
  },
  horario: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  activa: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'materia',
  timestamps: false
});

// Relación: Cuenta tiene muchas Materias
Cuenta.hasMany(Materia, { foreignKey: 'id_cuenta', onDelete: 'CASCADE' });
Materia.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });

module.exports = Materia;