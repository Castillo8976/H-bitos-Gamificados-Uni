'use strict';
const crud = require('../crud/materiaCrud');
const catalogoCrud = require('../crud/catalogoMateriaCrud');
const catalogo = require('./catalogoMateriaService');
const HttpError = require('../middlewares/httpError');

/** RN26: un bloqueo de otra conexión es un conflicto recuperable, no un error interno. */
async function conConflictoCatalogo(operacion) {
  try { return await operacion(); }
  catch (error) {
    if ([error.code, error.original?.code, error.parent?.code].includes('SQLITE_BUSY')) {
      throw new HttpError(409, 'La operación entró en conflicto con otra modificación del catálogo; inténtalo de nuevo');
    }
    throw error;
  }
}

/** RF09/HU16/RN26: selección y escritura serializadas frente a cambios del catálogo. */
async function crearDesdeCatalogo(idCuenta, idCatalogo, horario) {
  return conConflictoCatalogo(() => catalogoCrud.transaccion(async transaction => {
    const asignatura = await catalogo.obtenerActiva(idCatalogo, transaction);
    return crud.crearMateria(idCuenta, asignatura.nombre, horario, asignatura.id_catalogo_materia, transaction);
  }));
}

/** RN26: omitir la selección conserva el nombre y vínculo históricos. */
async function actualizarDesdeCatalogo(id, datos) {
  const cambios = { ...datos };
  return conConflictoCatalogo(() => {
    if (!Object.hasOwn(cambios, 'id_catalogo_materia')) return crud.actualizarMateria(id, cambios);
    return catalogoCrud.transaccion(async transaction => {
      const actual = await crud.obtenerMateria(id, transaction);
      // RN26: reenviar el vínculo existente no constituye una asociación nueva.
      if (actual && actual.id_catalogo_materia === cambios.id_catalogo_materia) {
        delete cambios.id_catalogo_materia;
        delete cambios.nombre;
        return crud.actualizarMateria(id, cambios, transaction);
      }
      const asignatura = await catalogo.obtenerActiva(cambios.id_catalogo_materia, transaction);
      cambios.nombre = asignatura.nombre;
      return crud.actualizarMateria(id, cambios, transaction);
    });
  });
}

module.exports = { ...crud, crearDesdeCatalogo, actualizarDesdeCatalogo };
