'use strict';

const crypto = require('node:crypto');
const { Transaction } = require('sequelize');
const sequelize = require('../database');
const Tarea = require('../models/Tarea');
const Materia = require('../models/Materia');
const HttpError = require('../middlewares/httpError');
const { EntityValidator } = require('../validators/entityValidator');
const planificador = require('./planificadorRecordatoriosService');
const crud = require('../crud/tareaCrud');
const validator = new EntityValidator();

/** RF02/RF04 · HU02/HU19/HU25: mantiene tarea y recordatorio en una transacción. */
class TareaService {
  /** RF02/HU02: crea una tarea válida y su recordatorio del día anterior (RN05). */
  async crearTarea(idCuenta, nombre, fechaEntrega, prioridad, idMateria = null) {
    const datos = validator.validar('tareas', {
      id_cuenta: idCuenta, nombre, fecha_entrega: fechaEntrega, prioridad, id_materia: idMateria
    }, { crear: true });
    return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
      if (idMateria && !await Materia.count({ where: { id_materia: idMateria, id_cuenta: idCuenta }, transaction })) {
        throw new HttpError(403, 'La materia no pertenece a la cuenta');
      }
      const tarea = await Tarea.create({ id_tarea: crypto.randomUUID(), ...datos }, { transaction });
      await planificador.sincronizarAutomatico(tarea, transaction);
      return tarea;
    });
  }

  /** RF02/HU19: actualiza datos editables y reprograma solo el aviso automático. */
  async actualizarTarea(id, datos) {
    const permitidos = ['nombre', 'fecha_entrega', 'prioridad', 'id_materia', 'estado'];
    if (Object.keys(datos).some(campo => !permitidos.includes(campo))) throw new HttpError(400, 'Campos de tarea no editables');
    const cambios = validator.validar('tareas', datos);
    return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
      const tarea = await Tarea.findByPk(id, { transaction });
      if (!tarea) throw new HttpError(404, 'Tarea no encontrada');
      // RF02/RF03: completar conserva el camino transaccional de recompensas.
      if ('estado' in cambios && !['Pendiente', 'En progreso'].includes(cambios.estado)) {
        throw new HttpError(400, 'Utilice la acción Completar para finalizar la tarea');
      }
      if ('estado' in cambios && tarea.estado === 'Completada') {
        throw new HttpError(409, 'No se puede reabrir una tarea completada');
      }
      if (cambios.fecha_entrega && cambios.fecha_entrega !== tarea.fecha_entrega) {
        validator.validar('tareas', cambios, { crear: true });
      }
      if (cambios.id_materia && !await Materia.count({ where: { id_materia: cambios.id_materia, id_cuenta: tarea.id_cuenta }, transaction })) {
        throw new HttpError(403, 'La materia no pertenece a la cuenta');
      }
      await tarea.update(cambios, { transaction });
      if (tarea.estado !== 'Completada' && ('nombre' in cambios || 'fecha_entrega' in cambios)) {
        await planificador.sincronizarAutomatico(tarea, transaction);
      }
      return tarea;
    });
  }

  /** RF09/HU09: consulta las tareas propias mediante el CRUD existente. */
  listarTareas(idCuenta) { return crud.listarTareas(idCuenta); }
  /** RF02/HU19: obtiene una tarea; el controlador verifica propiedad antes de mutar. */
  obtenerTarea(id) { return crud.obtenerTarea(id); }
  /** RF02/HU19: elimina la tarea; E11 elimina sus recordatorios por cascada. */
  eliminarTarea(id) { return crud.eliminarTarea(id); }
  /** RF03/HU03: completa con recompensas, evitando el antiguo camino aislado. */
  completarTarea(id) {
    return Tarea.findByPk(id).then(tarea => {
      if (!tarea) throw new HttpError(404, 'Tarea no encontrada');
      return require('./gamificacionService').completarTareaConGamificacion(tarea.id_cuenta, id);
    });
  }
}

module.exports = new TareaService();
