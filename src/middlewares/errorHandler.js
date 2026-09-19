'use strict';

const { UniqueConstraintError, ValidationError, ForeignKeyConstraintError } = require('sequelize');

function notFoundHandler(_req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

function errorHandler(error, _req, res, _next) {
  if (error instanceof UniqueConstraintError) return res.status(409).json({ error: 'El registro ya existe' });
  if (error instanceof ValidationError) return res.status(400).json({ error: 'Datos inválidos', detalles: error.errors.map(e => e.message) });
  if (error instanceof ForeignKeyConstraintError) return res.status(409).json({ error: 'La operación viola la integridad referencial' });
  const status = error.status || 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status === 500 ? 'Error interno del servidor' : error.message, detalles: error.details });
}

module.exports = { notFoundHandler, errorHandler };
