'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-challenge-migration-'));
process.env.DATABASE_STORAGE = path.join(directory, 'database.sqlite');

const sequelize = require('../../src/database');
const { ddlPath, dividirSentencias, inicializarEsquema } = require('../../src/config/schema');

async function run() {
  const ddlActual = fs.readFileSync(ddlPath, 'utf8');
  const ddlAnterior = ddlActual
    .replace('nombre VARCHAR(60) NOT NULL CHECK (length(trim(nombre)) BETWEEN 2 AND 60),', 'nombre VARCHAR(60) NOT NULL,')
    .replace('duracion_minutos INTEGER NOT NULL CHECK (duracion_minutos BETWEEN 1 AND 1440),', 'duracion_minutos INTEGER NOT NULL CHECK (duracion_minutos > 0),')
    .replace('puntos_recompensa INTEGER NOT NULL CHECK (puntos_recompensa BETWEEN 1 AND 10000),', 'puntos_recompensa INTEGER NOT NULL CHECK (puntos_recompensa > 0),')
    .replace('  activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1)),\n  CONSTRAINT pk_reto', '  CONSTRAINT pk_reto')
    .replace('valor_objetivo INTEGER NOT NULL CHECK (valor_objetivo BETWEEN 1 AND 10080),', 'valor_objetivo INTEGER NOT NULL CHECK (valor_objetivo > 0),');

  for (const statement of dividirSentencias(ddlAnterior)) await sequelize.query(statement);
  await sequelize.query(
    "INSERT INTO cuenta (id_cuenta,nombre,correo,contrasena_hash) VALUES ('legacy-account','Cuenta heredada','legacy@test.local','hash')"
  );
  await sequelize.query(
    "INSERT INTO reto (id_reto,id_cuenta,descripcion,condicion,puntos_recompensa,semana) VALUES ('legacy-challenge','legacy-account','Reto heredado','tareas:1',20,'2026-W39')"
  );

  await inicializarEsquema();

  const reto = await sequelize.query(
    "SELECT activo FROM reto WHERE id_reto='legacy-challenge'",
    { type: sequelize.QueryTypes.SELECT }
  );
  assert.deepEqual(reto, [{ activo: 1 }]);
  await assert.rejects(() => sequelize.query(
    "INSERT INTO reto (id_reto,id_cuenta,descripcion,condicion,puntos_recompensa,semana) VALUES ('invalid-reward','legacy-account','Reto','tareas:1',10001,'2026-W40')"
  ));
  await assert.rejects(() => sequelize.query(
    "INSERT INTO cuenta (id_cuenta,nombre,correo,contrasena_hash) VALUES ('invalid-name','A','invalid@test.local','hash')"
  ));
  await assert.rejects(() => sequelize.query(
    "INSERT INTO meta (id_meta,id_cuenta,semana,descripcion,valor_objetivo) VALUES ('invalid-target','legacy-account','2026-W40','Meta',10081)"
  ));
  await assert.rejects(() => sequelize.query(
    "INSERT INTO sesion_estudio (id_sesion,id_cuenta,duracion_minutos) VALUES ('invalid-duration','legacy-account',1441)"
  ));
  console.log('✅ Esquema anterior: activo agregado sin pérdida y límites aplicados por triggers');
}

(async () => {
  try {
    await run();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
})();
