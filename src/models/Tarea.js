const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('./Cuenta');
const Materia = require('./Materia');

const Tarea = sequelize.define('tarea', {
  id_tarea: {
    type: DataTypes.STRING(36),
    primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  id_cuenta: {
    type: DataTypes.STRING(36),
    allowNull: false
  },
  id_materia: {
    type: DataTypes.STRING(36),
    allowNull: true
  },
  nombre: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  fecha_entrega: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  prioridad: {
    type: DataTypes.STRING(10),
    allowNull: false,
    validate: { isIn: [['Alta', 'Media', 'Baja']] }
  },
  estado: {
    type: DataTypes.STRING(15),
    allowNull: false,
    defaultValue: 'Pendiente',
    validate: { isIn: [['Pendiente', 'Completada']] }
  },
  fecha_completada: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  tableName: 'tarea',
  timestamps: false
});

Cuenta.hasMany(Tarea, { foreignKey: 'id_cuenta', onDelete: 'CASCADE' });
Tarea.belongsTo(Cuenta, { foreignKey: 'id_cuenta' });

Materia.hasMany(Tarea, { foreignKey: 'id_materia', onDelete: 'SET NULL' });
Tarea.belongsTo(Materia, { foreignKey: 'id_materia' });

module.exports = Tarea;