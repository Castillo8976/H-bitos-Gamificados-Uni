'use strict';

/** RF01/RN26/HU29: persistencia del catálogo global, separada de materias personales. */
const CatalogoMateria = require('../models/CatalogoMateria');
const { Transaction } = require('sequelize');

const listar = (todas = false, transaction) => CatalogoMateria.findAll({
  where: todas ? {} : { activo: true },
  attributes: todas ? ['id_catalogo_materia', 'nombre', 'activo'] : ['id_catalogo_materia', 'nombre'],
  order: [['nombre', 'ASC']], transaction
});
const obtener = (id, transaction) => CatalogoMateria.findByPk(id, { transaction });
const crear = (nombre, transaction) => CatalogoMateria.create({ nombre }, { transaction });
const actualizar = (registro, datos, transaction) => registro.update(datos, { transaction });
const eliminar = registro => registro.destroy();
// IMMEDIATE serializa comprobación Unicode y escritura, incluso entre conexiones SQLite.
const transaccion = operacion => CatalogoMateria.sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, operacion);

module.exports = { listar, obtener, crear, actualizar, eliminar, transaccion };
