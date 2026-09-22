'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sequelize = require('../database');

const ddlPath = path.join(__dirname, '..', '..', 'pjc', 'docs', 'diseno', 'fase2-datos', 'E11-script-DDL-v2.sql');

/** RF01/HU01 y CRF-001: separa el DDL actual por punto y coma; no es un parser SQL general. */
function dividirSentencias(sql) {
  const sinComentarios = sql.split(/\r?\n/)
    .filter(linea => !linea.trim().startsWith('--'))
    .join('\n');

  return sinComentarios.split(';').map(sentencia => sentencia.trim()).filter(Boolean);
}

/**
 * Inicializa SQLite exclusivamente desde E11. No usa sequelize.sync(),
 * evitando mantener un segundo esquema implícito.
 * @implements CRF-001
 */
/** RF01/HU01 y CRF-001: prepara las tablas necesarias antes de admitir registros. */
async function inicializarEsquema() {
  await sequelize.authenticate();
  const ddl = await fs.readFile(ddlPath, 'utf8');
  for (const sentencia of dividirSentencias(ddl)) {
    await sequelize.query(sentencia);
  }
  const columnasPreferencias = await sequelize.query('PRAGMA table_info(preferencia_visual)', { type: sequelize.QueryTypes.SELECT });
  const existentes = new Set(columnasPreferencias.map(columna => columna.name));
  if (!existentes.has('notificaciones_recordatorios')) {
    await sequelize.query('ALTER TABLE preferencia_visual ADD COLUMN notificaciones_recordatorios INTEGER NOT NULL DEFAULT 1 CHECK (notificaciones_recordatorios IN (0,1))');
  }
  if (!existentes.has('notificaciones_retos')) {
    await sequelize.query('ALTER TABLE preferencia_visual ADD COLUMN notificaciones_retos INTEGER NOT NULL DEFAULT 1 CHECK (notificaciones_retos IN (0,1))');
  }
}

module.exports = { ddlPath, dividirSentencias, inicializarEsquema };
