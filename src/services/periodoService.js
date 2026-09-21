'use strict';

const HttpError = require('../middlewares/httpError');

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** RF11/HU08: obtiene el día UTC YYYY-MM-DD para consultas consistentes con E11. */
function fechaIso(fecha = new Date()) {
  return fecha.toISOString().slice(0, 10);
}

/** RF11/HU08: rechaza formatos y fechas inexistentes con error HTTP 400. */
function parsearFecha(valor, nombre) {
  if (!FORMATO_FECHA.test(String(valor || ''))) {
    throw new HttpError(400, `${nombre} debe usar el formato YYYY-MM-DD`);
  }
  const fecha = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(fecha.getTime()) || fechaIso(fecha) !== valor) {
    throw new HttpError(400, `${nombre} no es una fecha válida`);
  }
  return fecha;
}

/** Devuelve el identificador ISO `YYYY-Www` utilizado por reto y meta. */
/** RF15/HU15: calcula la semana ISO en UTC, incluidos cambios de año. */
function semanaIso(fecha = new Date()) {
  const utc = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const dia = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const semana = Math.ceil((((utc - inicio) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

/** RF11/HU08: obtiene lunes y domingo UTC del periodo predeterminado. */
function semanaActual(fecha = new Date()) {
  const fin = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const dia = fin.getUTCDay() || 7;
  const inicio = new Date(fin);
  inicio.setUTCDate(inicio.getUTCDate() - dia + 1);
  const domingo = new Date(inicio);
  domingo.setUTCDate(domingo.getUTCDate() + 6);
  return { inicio: fechaIso(inicio), fin: fechaIso(domingo) };
}

/**
 * Valida un periodo inclusivo de máximo 366 días.
 * @implements RF11 @implements HU08 @implements CU05
 */
function validarPeriodo(inicioValor, finValor, ahora = new Date()) {
  const predeterminado = semanaActual(ahora);
  const inicioTexto = inicioValor || predeterminado.inicio;
  const finTexto = finValor || predeterminado.fin;
  const inicio = parsearFecha(inicioTexto, 'fecha_inicio');
  const fin = parsearFecha(finTexto, 'fecha_fin');
  if (inicio > fin) throw new HttpError(400, 'fecha_inicio no puede ser posterior a fecha_fin');
  const dias = Math.floor((fin - inicio) / 86400000) + 1;
  if (dias > 366) throw new HttpError(400, 'El periodo no puede superar 366 días');
  return { inicio: inicioTexto, fin: finTexto, dias };
}

module.exports = { fechaIso, semanaIso, semanaActual, validarPeriodo };
