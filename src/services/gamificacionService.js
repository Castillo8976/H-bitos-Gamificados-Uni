'use strict';

const crypto = require('node:crypto');
const { Op, Transaction } = require('sequelize');
const sequelize = require('../database');
const HttpError = require('../middlewares/httpError');
const Tarea = require('../models/Tarea');
const SesionEstudio = require('../models/SesionEstudio');
const Punto = require('../models/Punto');
const Reto = require('../models/Reto');
const Meta = require('../models/Meta');
const Insignia = require('../models/Insignia');
const CuentaInsignia = require('../models/CuentaInsignia');
const NivelCuenta = require('../models/NivelCuenta');
const Notificacion = require('../models/Notificacion');
const { fechaIso, semanaIso, semanaActual } = require('./periodoService');
const planificador = require('./planificadorRecordatoriosService');

const PUNTOS_TAREA = 10;
const PUNTOS_SESION = 5;

/** RF06/HU06: extrae el umbral de la condición histórica del reto. */
function numeroObjetivo(texto, predeterminado = 1) {
  const coincidencia = String(texto || '').match(/(\d+)/);
  return coincidencia ? Number(coincidencia[1]) : predeterminado;
}

/** RF06/HU06: identifica qué evento incrementa el reto; compatibilidad según CRF-003. */
function metricaReto(condicion) {
  const texto = String(condicion || '').toLowerCase();
  if (texto.includes('minut')) return 'minutos';
  if (texto.includes('pomodoro')) return 'pomodoros';
  if (texto.includes('sesion') || texto.includes('sesión')) return 'sesiones';
  return 'tareas';
}

/** RF15/HU15: interpreta la unidad de la meta conforme al formato actual. */
function metricaMeta(descripcion) {
  const texto = String(descripcion || '').toLowerCase();
  if (texto.includes('pomodoro')) return 'pomodoros';
  if (texto.includes('sesion') || texto.includes('sesión')) return 'sesiones';
  if (texto.includes('minut') || texto.includes('hora') || texto.includes('estudiar')) return 'minutos';
  return 'tareas';
}

/** RF04/HU24: registra el aviso dentro de la transacción del evento. */
async function notificar(idCuenta, tipo, mensaje, transaction, ahora = new Date()) {
  return Notificacion.create({
    id_notificacion: crypto.randomUUID(), id_cuenta: idCuenta, tipo, mensaje,
    leida: false, fecha: fechaIso(ahora)
  }, { transaction });
}

/** RF07/HU07: acredita un evento una sola vez; complementa el índice único de E11. */
async function otorgarUnaVez(idCuenta, cantidad, origen, idOrigen, transaction, ahora = new Date()) {
  const existente = await Punto.findOne({
    where: { id_cuenta: idCuenta, origen, id_origen: idOrigen }, transaction
  });
  if (existente) return { punto: existente, otorgado: false };
  const punto = await Punto.create({
    id_punto: crypto.randomUUID(), id_cuenta: idCuenta, cantidad, origen,
    id_origen: idOrigen, fecha: fechaIso(ahora)
  }, { transaction });
  return { punto, otorgado: true };
}

/** RF15/HU15: acumula progreso semanal y notifica metas alcanzadas en la misma transacción. */
async function actualizarMetas(idCuenta, semana, evento, cantidad, transaction, ahora) {
  const metas = await Meta.findAll({ where: { id_cuenta: idCuenta, semana, cumplida: false }, transaction });
  const cumplidas = [];
  for (const meta of metas) {
    if (metricaMeta(meta.descripcion) !== evento) continue;
    const valorActual = meta.valor_actual + cantidad;
    const cumplida = valorActual >= meta.valor_objetivo;
    await meta.update({ valor_actual: valorActual, cumplida }, { transaction });
    if (cumplida) {
      cumplidas.push(meta.descripcion);
      await notificar(idCuenta, 'Meta', `Meta cumplida: ${meta.descripcion}`, transaction, ahora);
    }
  }
  return cumplidas;
}

/** RF06/HU06: acumula la métrica y acredita la recompensa al alcanzar el umbral. */
async function actualizarRetos(idCuenta, semana, evento, cantidad, transaction, ahora) {
  const retos = await Reto.findAll({ where: { id_cuenta: idCuenta, semana, completado: false }, transaction });
  const completados = [];
  let puntosOtorgados = 0;
  for (const reto of retos) {
    if (metricaReto(reto.condicion) !== evento) continue;
    const progreso = reto.progreso + cantidad;
    const completado = progreso >= numeroObjetivo(reto.condicion);
    await reto.update({ progreso, completado }, { transaction });
    if (!completado) continue;
    const recompensa = await otorgarUnaVez(idCuenta, reto.puntos_recompensa, 'Reto', reto.id_reto, transaction, ahora);
    if (recompensa.otorgado) puntosOtorgados += reto.puntos_recompensa;
    completados.push(reto.descripcion);
    await notificar(idCuenta, 'Reto', `Reto completado: ${reto.descripcion}`, transaction, ahora);
  }
  return { completados, puntosOtorgados };
}

/** RF05/HU05: consulta evidencia de tareas y sesiones para evaluar insignias. */
async function contextoInsignias(idCuenta, ahora, transaction) {
  const periodoSemana = semanaActual(ahora);
  const [tareas, pomodoros, sesionesSemana] = await Promise.all([
    Tarea.count({ where: { id_cuenta: idCuenta, estado: 'Completada' }, transaction }),
    SesionEstudio.count({ where: { id_cuenta: idCuenta, modo_enfoque: true }, transaction }),
    SesionEstudio.count({
      where: { id_cuenta: idCuenta, fecha: { [Op.between]: [periodoSemana.inicio, periodoSemana.fin] } },
      transaction
    })
  ]);
  return { tareas, pomodoros, sesionesSemana };
}

/** RF05/HU05: aplica las cinco condiciones semilla; la condición de racha usa conteo histórico. */
async function evaluarInsignias(idCuenta, evento, ahora, transaction) {
  const contexto = await contextoInsignias(idCuenta, ahora, transaction);
  const reglas = new Map([
    ['primera_tarea', contexto.tareas >= 1],
    ['5_tareas_seguidas', contexto.tareas >= 5],
    ['7_sesiones_semana', contexto.sesionesSemana >= 7],
    ['10_pomodoros', contexto.pomodoros >= 10],
    ['sesion_antes_8am', evento === 'sesion' && ahora.getHours() < 8]
  ]);
  const candidatas = await Insignia.findAll({ where: { condicion: { [Op.in]: [...reglas.keys()] } }, transaction });
  const nuevas = [];
  for (const insignia of candidatas) {
    if (!reglas.get(insignia.condicion)) continue;
    const [, creada] = await CuentaInsignia.findOrCreate({
      where: { id_cuenta: idCuenta, id_insignia: insignia.id_insignia },
      defaults: { fecha_obtenida: fechaIso(ahora) }, transaction
    });
    if (creada) {
      nuevas.push(insignia.nombre);
      await notificar(idCuenta, 'Insignia', `Nueva insignia: ${insignia.nombre}`, transaction, ahora);
    }
  }
  return nuevas;
}

/** RF07/HU07: busca el mayor umbral alcanzado, sin guardar una FK de nivel en cuenta. */
async function nivelPara(total, transaction) {
  return NivelCuenta.findOne({
    where: { puntos_minimos: { [Op.lte]: total } },
    order: [['puntos_minimos', 'DESC'], ['orden', 'DESC']], transaction
  });
}

/** RF07/HU07: compara niveles antes/después del evento y notifica el ascenso. */
async function evaluarCambioNivel(idCuenta, puntosAntes, transaction, ahora) {
  const total = Number(await Punto.sum('cantidad', { where: { id_cuenta: idCuenta }, transaction }) || 0);
  const [anterior, actual] = await Promise.all([nivelPara(puntosAntes, transaction), nivelPara(total, transaction)]);
  const cambio = actual && actual.id_nivel !== anterior?.id_nivel;
  if (cambio) await notificar(idCuenta, 'Nivel', `Nuevo nivel alcanzado: ${actual.nombre}`, transaction, ahora);
  return { total, nivel: actual?.nombre || null, cambio };
}

/**
 * Completa una tarea y aplica toda la recompensa como una sola transacción.
 * @implements RF03 @implements RF05 @implements RF06 @implements RF07
 * @implements HU03 @implements CU03
 */
async function completarTarea(idCuenta, idTarea, opciones = {}) {
  const ahora = opciones.ahora || new Date();
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    const tarea = await Tarea.findOne({ where: { id_tarea: idTarea, id_cuenta: idCuenta }, transaction });
    if (!tarea) throw new HttpError(404, 'Tarea no encontrada');
    if (tarea.estado === 'Completada') throw new HttpError(409, 'La tarea ya fue completada y recompensada');

    const puntosAntes = Number(await Punto.sum('cantidad', { where: { id_cuenta: idCuenta }, transaction }) || 0);
    await tarea.update({ estado: 'Completada', fecha_completada: fechaIso(ahora) }, { transaction });
    await planificador.cancelarDeTarea(tarea.id_tarea, transaction);
    const recompensa = await otorgarUnaVez(idCuenta, PUNTOS_TAREA, 'Tarea', tarea.id_tarea, transaction, ahora);
    if (opciones.fallarEn === 'despues_puntos') throw new Error('Fallo controlado para verificar rollback');

    const semana = semanaIso(ahora);
    const metas = await actualizarMetas(idCuenta, semana, 'tareas', 1, transaction, ahora);
    const retos = await actualizarRetos(idCuenta, semana, 'tareas', 1, transaction, ahora);
    const insignias = await evaluarInsignias(idCuenta, 'tarea', ahora, transaction);
    const nivel = await evaluarCambioNivel(idCuenta, puntosAntes, transaction, ahora);
    await notificar(idCuenta, 'Sistema', `Tarea completada: ${tarea.nombre}. +${PUNTOS_TAREA} puntos.`, transaction, ahora);
    if (opciones.fallarEn === 'antes_confirmar') throw new Error('Fallo controlado antes de confirmar la transacción');

    return {
      tarea: tarea.toJSON(), puntos_otorgados: recompensa.otorgado ? PUNTOS_TAREA + retos.puntosOtorgados : 0,
      insignias_desbloqueadas: insignias, retos_completados: retos.completados,
      metas_cumplidas: metas, total_puntos: nivel.total, nivel: nivel.nivel, nuevo_nivel: nivel.cambio
    };
  });
}

/**
 * Registra una sesión y aplica puntos, metas, retos e insignias relacionados.
 * @implements RF05 @implements RF07 @implements RF10 @implements HU10 @implements CU04
 */
async function registrarSesion(idCuenta, datos, opciones = {}) {
  const ahora = opciones.ahora || new Date();
  return sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, async transaction => {
    if (datos.id_tarea) {
      const propia = await Tarea.count({ where: { id_tarea: datos.id_tarea, id_cuenta: idCuenta }, transaction });
      if (!propia) throw new HttpError(403, 'La tarea asociada no pertenece a la cuenta');
    }
    const puntosAntes = Number(await Punto.sum('cantidad', { where: { id_cuenta: idCuenta }, transaction }) || 0);
    const sesion = await SesionEstudio.create({
      id_sesion: crypto.randomUUID(), id_cuenta: idCuenta, id_tarea: datos.id_tarea || null,
      fecha: fechaIso(ahora), duracion_minutos: datos.duracion_minutos, modo_enfoque: Boolean(datos.modo_enfoque)
    }, { transaction });
    const recompensa = await otorgarUnaVez(idCuenta, PUNTOS_SESION, 'Sesion', sesion.id_sesion, transaction, ahora);
    const semana = semanaIso(ahora);
    const metasMinutos = await actualizarMetas(idCuenta, semana, 'minutos', datos.duracion_minutos, transaction, ahora);
    const metasSesiones = await actualizarMetas(idCuenta, semana, 'sesiones', 1, transaction, ahora);
    const metasPomodoros = datos.modo_enfoque
      ? await actualizarMetas(idCuenta, semana, 'pomodoros', 1, transaction, ahora)
      : [];
    const retosMinutos = await actualizarRetos(idCuenta, semana, 'minutos', datos.duracion_minutos, transaction, ahora);
    const retosSesiones = await actualizarRetos(idCuenta, semana, 'sesiones', 1, transaction, ahora);
    const retosPomodoros = datos.modo_enfoque
      ? await actualizarRetos(idCuenta, semana, 'pomodoros', 1, transaction, ahora)
      : { completados: [], puntosOtorgados: 0 };
    const insignias = await evaluarInsignias(idCuenta, 'sesion', ahora, transaction);
    const nivel = await evaluarCambioNivel(idCuenta, puntosAntes, transaction, ahora);
    await notificar(idCuenta, 'Sistema', `Sesión de ${datos.duracion_minutos} minuto(s) guardada. +${PUNTOS_SESION} puntos.`, transaction, ahora);
    if (opciones.fallarEn === 'antes_confirmar') throw new Error('Fallo controlado antes de confirmar la transacción');
    return {
      sesion: sesion.toJSON(),
      puntos_otorgados: recompensa.otorgado
        ? PUNTOS_SESION + retosMinutos.puntosOtorgados + retosSesiones.puntosOtorgados + retosPomodoros.puntosOtorgados
        : 0,
      insignias_desbloqueadas: insignias,
      retos_completados: [...retosMinutos.completados, ...retosSesiones.completados, ...retosPomodoros.completados],
      metas_cumplidas: [...metasMinutos, ...metasSesiones, ...metasPomodoros], total_puntos: nivel.total,
      nivel: nivel.nivel, nuevo_nivel: nivel.cambio
    };
  });
}

/** RF03/HU03 y RF10/HU10: coordina eventos y recompensas atómicos.
 * Las opciones de reloj/fallo son solo de pruebas; el controlador no las recibe del body.
 */
class GamificacionService {
  /** RF03/HU03: puntuación por tarea según RN22. */
  get PUNTOS_TAREA() { return PUNTOS_TAREA; }
  /** RF10/HU10: puntuación por sesión según RN22. */
  get PUNTOS_SESION() { return PUNTOS_SESION; }

  /** Coordina CU03 dentro de una transacción idempotente. @implements RF03 @implements HU03 */
  completarTareaConGamificacion(idCuenta, idTarea, opciones) {
    return completarTarea(idCuenta, idTarea, opciones);
  }

  /** Coordina CU04 y sus recompensas dentro de una transacción. @implements RF10 @implements HU10 */
  registrarSesionConGamificacion(idCuenta, datos, opciones) {
    return registrarSesion(idCuenta, datos, opciones);
  }
}

module.exports = new GamificacionService();
