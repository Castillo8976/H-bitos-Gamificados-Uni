'use strict';

/** RF01/RN26/HU29 (Decisión #10): normalización Unicode y restricciones administrativas del catálogo. */
const crud = require('../crud/catalogoMateriaCrud');
const HttpError = require('../middlewares/httpError');
const { UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const normalizar = nombre => nombre.trim().replace(/\s+/gu, ' ');
const clave = nombre => normalizar(nombre).toLocaleLowerCase('es');

async function obtener(id, transaction) {
  const registro = await crud.obtener(id, transaction);
  if (!registro) throw new HttpError(404, 'Asignatura del catálogo no encontrada');
  return registro;
}

async function guardar(id, nombre) {
  try {
    return await crud.transaccion(async transaction => {
      const registro = id ? await obtener(id, transaction) : null;
      const existentes = await crud.listar(true, transaction);
      if (existentes.some(item => item.id_catalogo_materia !== id && clave(item.nombre) === clave(nombre))) {
        throw new HttpError(409, 'Ya existe una asignatura con ese nombre en el catálogo');
      }
      return registro ? crud.actualizar(registro, { nombre: normalizar(nombre) }, transaction) : crud.crear(normalizar(nombre), transaction);
    });
  } catch (error) {
    if (error instanceof UniqueConstraintError) throw new HttpError(409, 'Ya existe una asignatura con ese nombre en el catálogo');
    throw error;
  }
}

async function cambiarEstado(id, activo) {
  return crud.actualizar(await obtener(id), { activo });
}

async function eliminar(id) {
  try { await crud.eliminar(await obtener(id)); }
  catch (error) {
    if (error instanceof ForeignKeyConstraintError) throw new HttpError(409, 'La asignatura tiene materias asociadas; puede desactivarla');
    throw error;
  }
}

module.exports = { listar: crud.listar, obtener, guardar, cambiarEstado, eliminar };
