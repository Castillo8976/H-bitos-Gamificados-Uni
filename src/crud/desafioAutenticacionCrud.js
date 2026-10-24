'use strict';
const { Transaction } = require('sequelize');
const sequelize = require('../database');
const Desafio = require('../models/DesafioAutenticacion');
// Serializa las escrituras de este flujo en SQLite; IMMEDIATE protege también entre procesos.
let pending = Promise.resolve();
function transaccion(work) {
  const result = pending.then(() => sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, work));
  pending = result.catch(() => {});
  return result;
}
const obtener = (id, transaction) => Desafio.findByPk(id, { transaction });
const crear = (data, transaction) => Desafio.create(data, { transaction });
const invalidar = (id, proposito, transaction) => Desafio.update({ consumido_en: new Date() }, {
  where: { id_cuenta: id, ...(proposito ? { proposito } : {}), consumido_en: null }, transaction
});
module.exports = { transaccion, obtener, crear, invalidar };
