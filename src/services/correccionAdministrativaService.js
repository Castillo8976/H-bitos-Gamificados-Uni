'use strict';

const crypto = require('node:crypto');
const { Transaction } = require('sequelize');
const sequelize = require('../database');
const Cuenta = require('../models/Cuenta');
const Punto = require('../models/Punto');
const Insignia = require('../models/Insignia');
const CuentaInsignia = require('../models/CuentaInsignia');
const Notificacion = require('../models/Notificacion');
const HttpError = require('../middlewares/httpError');
const { fechaIso } = require('./periodoService');

/** RF05/RF07 · HU26: aplica una corrección y su aviso como una sola operación.
 * Mantiene las tablas de E7; no edita movimientos de puntos ni recalcula premios
 * históricos. La autorización se comprueba también dentro de la transacción.
 */
class CorreccionAdministrativaService {
  /** RF01/HU27: verifica en BD que el actor siga activo y sea administrador. */
  async autorizar(idActor, transaction) {
    const actor = await Cuenta.findByPk(idActor, { transaction });
    if (!actor?.activa || actor.rol !== 'Administrador') {
      throw new HttpError(403, 'La corrección requiere un administrador activo');
    }
    return actor;
  }

  /** RF05/RF07/HU26: conserva motivo completo e identidad del actor dentro de E7. */
  mensaje(accion, idActor, motivo) {
    const prefijo = `${accion} por ${idActor}: `;
    const maximo = 200 - [...prefijo].length;
    if (typeof motivo !== 'string' || !motivo.trim() || [...motivo.trim()].length > maximo) {
      throw new HttpError(400, `motivo debe contener entre 1 y ${maximo} caracteres para esta corrección`);
    }
    return prefijo + motivo.trim();
  }

  /** RF05/RF07/HU26: valida destino y confirma corrección+notificación o revierte ambas. */
  async ejecutar(idActor, accion, motivo, operacion) {
    return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
      const actor = await this.autorizar(idActor, transaction);
      const mensaje = this.mensaje(accion, actor.id_cuenta, motivo);
      const { idCuenta, resultado } = await operacion(transaction);
      await Notificacion.create({
        id_notificacion: crypto.randomUUID(), id_cuenta: idCuenta,
        tipo: 'Sistema', mensaje, fecha: fechaIso(), leida: false
      }, { transaction });
      return resultado;
    });
  }

  /** RF07/HU26: acredita una corrección administrativa sin modificar movimientos previos. */
  async otorgarPuntos(idActor, datos) {
    if (!Number.isSafeInteger(datos.cantidad) || datos.cantidad <= 0 || !['Tarea', 'Reto', 'Sesion'].includes(datos.origen)) {
      throw new HttpError(400, 'Cantidad u origen de puntos inválido');
    }
    return this.ejecutar(idActor, 'Corrección de puntos', datos.motivo, async transaction => {
      if (!await Cuenta.findByPk(datos.id_cuenta, { transaction })) throw new HttpError(404, 'Cuenta no encontrada');
      const movimiento = await Punto.create({
        id_punto: crypto.randomUUID(), id_cuenta: datos.id_cuenta,
        cantidad: datos.cantidad, origen: datos.origen, id_origen: datos.id_origen || null, fecha: fechaIso()
      }, { transaction });
      return { idCuenta: datos.id_cuenta, resultado: movimiento.toJSON() };
    });
  }

  /** RF07/HU26: retira un movimiento incorrecto y deja el motivo en la misma transacción. */
  async retirarPuntos(idActor, idPunto, motivo) {
    return this.ejecutar(idActor, 'Corrección de puntos', motivo, async transaction => {
      const movimiento = await Punto.findByPk(idPunto, { transaction });
      if (!movimiento) throw new HttpError(404, 'Movimiento de puntos no encontrado');
      await movimiento.destroy({ transaction });
      return { idCuenta: movimiento.id_cuenta, resultado: undefined };
    });
  }

  /** RF05/HU26: asigna una insignia existente; el duplicado se rechaza sin aviso espurio. */
  async asignarInsignia(idActor, idCuenta, idInsignia, motivo) {
    return this.ejecutar(idActor, 'Corrección de insignia', motivo, async transaction => {
      if (!await Cuenta.findByPk(idCuenta, { transaction })) throw new HttpError(404, 'Cuenta no encontrada');
      if (!await Insignia.findByPk(idInsignia, { transaction })) throw new HttpError(404, 'Insignia no encontrada');
      if (await CuentaInsignia.findOne({ where: { id_cuenta: idCuenta, id_insignia: idInsignia }, transaction })) {
        throw new HttpError(409, 'La cuenta ya tiene asignada esta insignia');
      }
      const asignacion = await CuentaInsignia.create({
        id_cuenta: idCuenta, id_insignia: idInsignia, fecha_obtenida: fechaIso()
      }, { transaction });
      return { idCuenta, resultado: { desbloqueada: true, registro: asignacion.toJSON() } };
    });
  }

  /** RF05/HU26: revoca únicamente una asociación existente, sin editar el catálogo. */
  async revocarInsignia(idActor, idCuenta, idInsignia, motivo) {
    return this.ejecutar(idActor, 'Corrección de insignia', motivo, async transaction => {
      const asignacion = await CuentaInsignia.findOne({
        where: { id_cuenta: idCuenta, id_insignia: idInsignia }, transaction
      });
      if (!asignacion) throw new HttpError(404, 'Asignación de insignia no encontrada');
      await asignacion.destroy({ transaction });
      return { idCuenta, resultado: undefined };
    });
  }
}

module.exports = new CorreccionAdministrativaService();
