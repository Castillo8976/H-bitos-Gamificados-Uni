'use strict';

const crypto = require('node:crypto');
const { Op, Transaction } = require('sequelize');
const sequelize = require('../database');
const Recordatorio = require('../models/Recordatorio');
const Notificacion = require('../models/Notificacion');
const Tarea = require('../models/Tarea');
const Cuenta = require('../models/Cuenta');
const { fechaIso } = require('./periodoService');

/** RF04/HU04/HU25 · RN05/RN18: programa y despacha avisos persistentes.
 * E7 usa DATE: la precisión es de día UTC, no hora/minuto. No implementa web push.
 */
class PlanificadorRecordatoriosService {
  /** RF04/HU25: inicializa el control del ciclo sin arrancar tareas al importar. */
  constructor() {
    this.temporizador = null;
    this.pendiente = null;
    this.activo = false;
  }

  /** RF04/HU04: deriva un UUID estable por tarea sin agregar campos a E7.
   * Permite reconocer el aviso automático y no sobrescribir avisos manuales.
   */
  idAutomatico(idTarea) {
    const hex = crypto.createHash('sha256').update(`studyquest:recordatorio:${idTarea}`).digest('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
  }

  /** RF04/HU04: crea/reprograma el aviso automático dentro de la transacción de tarea.
   * Conserva una desactivación explícita y solo habilita otro envío al cambiar fecha.
   */
  async sincronizarAutomatico(tarea, transaction) {
    const entrega = new Date(`${tarea.fecha_entrega}T00:00:00.000Z`);
    entrega.setUTCDate(entrega.getUTCDate() - 1);
    const fecha_programada = fechaIso(entrega);
    const id = this.idAutomatico(tarea.id_tarea);
    const actual = await Recordatorio.findByPk(id, { transaction });
    const datos = {
      fecha_programada,
      mensaje: `Recordatorio: "${tarea.nombre}". Entrega: ${tarea.fecha_entrega}.`
    };
    if (actual) {
      if (actual.fecha_programada !== fecha_programada) datos.enviado = false;
      await actual.update(datos, { transaction });
      return actual;
    }
    return Recordatorio.create({
      id_recordatorio: id, id_tarea: tarea.id_tarea, id_cuenta: tarea.id_cuenta,
      activo: tarea.estado !== 'Completada', enviado: false, ...datos
    }, { transaction });
  }

  /** RF03/RF04 · HU03/HU25: cancela todos los avisos pendientes al completar tarea. */
  async cancelarDeTarea(idTarea, transaction) {
    await Recordatorio.update({ activo: false }, { where: { id_tarea: idTarea, enviado: false }, transaction });
  }

  /** RF04/HU25: procesa un lote acotado, con marcado y notificación en una transacción.
   * Recupera atrasados al reiniciar; la marca enviada evita duplicados entre ciclos.
   */
  async procesarPendientes(ahora = new Date()) {
    const hoy = fechaIso(ahora);
    return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
      const pendientes = await Recordatorio.findAll({
        where: { activo: true, enviado: false, fecha_programada: { [Op.lte]: hoy } },
        include: [
          { model: Cuenta, attributes: [], where: { activa: true }, required: true },
          { model: Tarea, attributes: [], where: {
            estado: 'Pendiente', id_cuenta: { [Op.col]: 'recordatorio.id_cuenta' }
          }, required: true }
        ],
        order: [['fecha_programada', 'ASC'], ['id_recordatorio', 'ASC']],
        limit: 100, transaction
      });
      for (const recordatorio of pendientes) {
        await Notificacion.create({
          id_notificacion: crypto.randomUUID(), id_cuenta: recordatorio.id_cuenta,
          tipo: 'Sistema', mensaje: recordatorio.mensaje, leida: false, fecha: hoy
        }, { transaction });
        await recordatorio.update({ enviado: true }, { transaction });
      }
      return pendientes.length;
    });
  }

  /** RF04/HU25: inicia ciclos sin superposición; los errores se reintentan en otro ciclo. */
  iniciar(intervaloMs = 60000) {
    if (this.activo) return;
    this.activo = true;
    const ciclo = async () => {
      if (!this.activo) return;
      this.pendiente = this.procesarPendientes();
      try { await this.pendiente; }
      catch (_) { console.error('No se pudieron procesar recordatorios; se reintentará en el siguiente ciclo.'); }
      finally {
        this.pendiente = null;
        if (this.activo) {
          this.temporizador = setTimeout(ciclo, intervaloMs);
          this.temporizador.unref();
        }
      }
    };
    void ciclo();
  }

  /** RF04/HU25: espera el lote activo antes de cerrar SQLite al detener el servidor. */
  async detener() {
    this.activo = false;
    clearTimeout(this.temporizador);
    await this.pendiente?.catch(() => {});
  }
}

module.exports = new PlanificadorRecordatoriosService();
