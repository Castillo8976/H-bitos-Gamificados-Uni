'use strict';

/** RF01/RN26/HU29, Decisión #10: catálogo global administrado; sin asignaturas sembradas. */
const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const CatalogoMateria = sequelize.define('catalogo_materia', {
  id_catalogo_materia: {
    type: DataTypes.STRING(36), allowNull: false, primaryKey: true,
    defaultValue: () => require('crypto').randomUUID()
  },
  nombre: { type: DataTypes.STRING(80), allowNull: false, unique: true },
  activo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true }
}, { tableName: 'catalogo_materia', timestamps: false });

module.exports = CatalogoMateria;
