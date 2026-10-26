'use strict';

/** Decisión #10: reconstruye el E11 anterior a M1 (13 tablas), sin catálogo ni FK. */
function sinCatalogo(ddl) {
  return ddl.replace(/CREATE TABLE IF NOT EXISTS catalogo_materia \([\s\S]*?\);\s*/u, '')
    .replace(/  id_catalogo_materia VARCHAR\(36\),\r?\n/u, '')
    .replace(/  CONSTRAINT fk_materia_catalogo FOREIGN KEY \(id_catalogo_materia\)\r?\n    REFERENCES catalogo_materia\(id_catalogo_materia\) ON DELETE RESTRICT ON UPDATE CASCADE,\r?\n/u, '');
}
/** Siembra explícita solo en bases temporales de ensayo. */
async function sembrarCatalogo(nombre = 'Materia inicial', activo = true) {
  const storage = require('../../src/database').options.storage;
  const os = require('node:os');
  const path = require('node:path');
  if (!storage || !path.resolve(storage).startsWith(os.tmpdir() + path.sep)) {
    throw new Error('El catálogo de prueba exige DATABASE_STORAGE temporal');
  }
  return require('../../src/models/CatalogoMateria').create({ nombre, activo });
}
module.exports = { sinCatalogo, sembrarCatalogo };
