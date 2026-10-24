'use strict';

/** Decisión #10: reconstruye el E11 anterior a M1 (13 tablas), sin catálogo ni FK. */
function sinCatalogo(ddl) {
  return ddl.replace(/CREATE TABLE IF NOT EXISTS catalogo_materia \([\s\S]*?\);\s*/u, '')
    .replace('  id_catalogo_materia VARCHAR(36),\n', '')
    .replace(/  CONSTRAINT fk_materia_catalogo FOREIGN KEY \(id_catalogo_materia\)\n    REFERENCES catalogo_materia\(id_catalogo_materia\) ON DELETE RESTRICT ON UPDATE CASCADE,\n/u, '');
}
module.exports = { sinCatalogo };
