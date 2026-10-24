'use strict';
/** Ampliación opcional Bloque D (pendiente de aprobación docente). */
const { DataTypes } = require('sequelize');
const sequelize = require('../database');
module.exports = sequelize.define('desafio_autenticacion', {
  id_desafio: { type: DataTypes.STRING(36), primaryKey: true, allowNull: false },
  id_cuenta: { type: DataTypes.STRING(36), allowNull: false, references: { model: 'cuenta', key: 'id_cuenta' }, onDelete: 'CASCADE' },
  proposito: { type: DataTypes.STRING(30), allowNull: false },
  codigo_hash: { type: DataTypes.TEXT, allowNull: false },
  destino: { type: DataTypes.STRING(120), allowNull: true },
  intentos: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  reenvios: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  ultimo_envio: { type: DataTypes.DATE, allowNull: true },
  expira_en: { type: DataTypes.DATE, allowNull: false },
  consumido_en: { type: DataTypes.DATE, allowNull: true },
  creado_en: { type: DataTypes.DATE, allowNull: false }
}, { tableName: 'desafio_autenticacion', timestamps: false });
