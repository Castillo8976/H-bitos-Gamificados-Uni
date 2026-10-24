'use strict';

/** Inicializa una base nueva o aplica las migraciones aditivas pendientes de forma explícita. */
const sequelize = require('../src/database');
const { inicializarEsquema, migracionesPendientes } = require('../src/config/schema');

async function run() {
  const pendientes = await migracionesPendientes();
  console.log(`Base: ${sequelize.options.storage}`);
  console.log(pendientes.length ? `Migraciones pendientes: ${pendientes.join(', ')}` : 'Sin migraciones pendientes sobre datos existentes');
  await inicializarEsquema();
  const [{ integrity_check: integridad }] = await sequelize.query('PRAGMA integrity_check', { type: sequelize.QueryTypes.SELECT });
  const fk = await sequelize.query('PRAGMA foreign_key_check', { type: sequelize.QueryTypes.SELECT });
  const [{ n }] = await sequelize.query("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'", { type: sequelize.QueryTypes.SELECT });
  if (integridad !== 'ok' || fk.length) throw new Error(`integridad=${integridad}, claves foráneas inválidas=${fk.length}`);
  console.log(`✅ Esquema al día: ${n} tablas, integridad ok`);
}

run().catch(error => { console.error(`❌ ${error.message}`); process.exitCode = 1; }).finally(() => sequelize.close());
