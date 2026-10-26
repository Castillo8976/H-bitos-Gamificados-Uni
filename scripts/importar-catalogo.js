'use strict';

/** RF01/RN26/HU29 (Decisión #10): importa el catálogo inicial mediante catalogoMateriaService; es idempotente. */
const path = require('node:path');
const fs = require('node:fs');

const ARCHIVO = path.join(__dirname, 'data', 'catalogo-uniremington-ingenieria-sistemas.json');
const clave = nombre => nombre.trim().replace(/\s+/gu, ' ').toLocaleLowerCase('es');

async function importarCatalogo(archivo = ARCHIVO) {
  const catalogo = require('../src/services/catalogoMateriaService');
  const { asignaturas } = JSON.parse(fs.readFileSync(archivo, 'utf8'));
  if (!Array.isArray(asignaturas) || !asignaturas.length) throw new Error('El archivo no contiene asignaturas');
  const claves = asignaturas.map(nombre => {
    if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 80) throw new Error(`Nombre inválido: ${nombre}`);
    return clave(nombre);
  });
  if (new Set(claves).size !== claves.length) throw new Error('El archivo contiene asignaturas duplicadas');

  const existentes = new Set((await catalogo.listar(true)).map(item => clave(item.nombre)));
  let creadas = 0;
  for (const nombre of asignaturas) {
    if (existentes.has(clave(nombre))) continue;
    await catalogo.guardar(null, nombre);
    existentes.add(clave(nombre));
    creadas += 1;
  }
  return { creadas, omitidas: asignaturas.length - creadas, total: asignaturas.length };
}

if (require.main === module) {
  const sequelize = require('../src/database');
  require('../src/config/schema').prepararEsquemaSinMigrar()
    .then(() => importarCatalogo())
    .then(r => console.log(`✅ Catálogo: ${r.creadas} creadas, ${r.omitidas} ya existentes (${r.total} en el archivo)`))
    .catch(error => { console.error(`❌ ${error.message}`); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = { importarCatalogo };
