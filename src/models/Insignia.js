const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Insignia = sequelize.define('insignia', {
  id_insignia: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  nombre: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  descripcion: { type: DataTypes.STRING(200), allowNull: false },
  condicion: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  icono: { type: DataTypes.STRING(50), allowNull: true }
}, { tableName: 'insignia', timestamps: false });

module.exports = Insignia;