'use strict';

/** RF01/RN26/HU29 · Decisión #10: la importación del catálogo inicial es idempotente, no duplica
 * nombres que difieren solo en mayúsculas y conserva desactivaciones previas. Usa SQLite temporal.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-importacion-'));
process.env.DATABASE_STORAGE = path.join(dir, 'database.sqlite');

const request = require('supertest');
const sequelize = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const app = require('../../src/app');
const catalogo = require('../../src/services/catalogoMateriaService');
const { importarCatalogo } = require('../../scripts/importar-catalogo');

async function run() {
  await inicializarEsquema();
  // Entrada previa con otra grafía y desactivada: no debe duplicarse ni reactivarse.
  const previa = await catalogo.guardar(null, 'ALGORITMOS 1');
  await catalogo.cambiarEstado(previa.id_catalogo_materia, false);

  const primera = await importarCatalogo();
  assert.deepEqual(primera, { creadas: 56, omitidas: 1, total: 57 });
  assert.deepEqual(await importarCatalogo(), { creadas: 0, omitidas: 57, total: 57 }, 'reejecutar no duplica');
  assert.equal((await catalogo.listar(true)).length, 57);

  const publico = await request(app).get('/api/catalogo-materias').expect(200);
  assert.equal(publico.body.datos.length, 56, 'el GET público solo expone entradas activas');
  assert.ok(!publico.body.datos.some(item => item.nombre === 'ALGORITMOS 1'));

  // Validación del archivo: duplicados y nombres vacíos se rechazan sin escribir.
  const malo = path.join(dir, 'malo.json');
  fs.writeFileSync(malo, JSON.stringify({ asignaturas: ['Compiladores', ' compiladores '] }));
  await assert.rejects(importarCatalogo(malo), /duplicadas/);
  fs.writeFileSync(malo, JSON.stringify({ asignaturas: ['  '] }));
  await assert.rejects(importarCatalogo(malo), /inválido/);
  assert.equal((await catalogo.listar(true)).length, 57);

  console.log('✅ Importación del catálogo: idempotente, sin duplicados y solo activas en el GET público');
}

run().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => sequelize.close());
