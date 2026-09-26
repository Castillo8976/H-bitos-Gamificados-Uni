'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const sequelize = require('../database');

const ddlPath = path.join(__dirname, '..', '..', 'pjc', 'docs', 'diseno', 'fase2-datos', 'E11-script-DDL-v2.sql');

/** CRF-005/RF02: amplía el CHECK de tareas antiguas sin perder filas ni referencias.
 * Se ejecuta antes de admitir peticiones. Usa una sola conexión y revierte toda
 * la reconstrucción si falla la copia, un índice o la integridad referencial.
 */
async function migrarEstadosTarea(ddl) {
  const connection = await sequelize.connectionManager.getConnection({ type: 'WRITE' });
  const consultar = sql => new Promise((resolve, reject) => {
    connection.all(sql, (error, rows) => error ? reject(error) : resolve(rows));
  });
  let iniciada = false;
  let clavesDesactivadas = false;
  try {
    const [tabla] = await consultar("SELECT sql FROM sqlite_master WHERE type='table' AND name='tarea'");
    if (!tabla || tabla.sql.includes("'En progreso'")) return;
    const definicion = dividirSentencias(ddl).find(sql => /^CREATE TABLE IF NOT EXISTS tarea\s*\(/i.test(sql));
    if (!definicion) throw new Error('E11 no contiene la definición de tarea');
    const objetos = await consultar("SELECT sql FROM sqlite_master WHERE tbl_name='tarea' AND type IN ('index','trigger') AND sql IS NOT NULL");
    await consultar('PRAGMA foreign_keys = OFF');
    clavesDesactivadas = true;
    await consultar('BEGIN IMMEDIATE');
    iniciada = true;
    await consultar(definicion.replace(/CREATE TABLE IF NOT EXISTS tarea/i, 'CREATE TABLE tarea_migracion_crf005'));
    const campos = 'id_tarea,id_cuenta,id_materia,nombre,fecha_entrega,prioridad,estado,fecha_completada';
    await consultar(`INSERT INTO tarea_migracion_crf005 (${campos}) SELECT ${campos} FROM tarea`);
    await consultar('DROP TABLE tarea');
    await consultar('ALTER TABLE tarea_migracion_crf005 RENAME TO tarea');
    for (const objeto of objetos) await consultar(objeto.sql);
    const errores = await consultar('PRAGMA foreign_key_check');
    if (errores.length) throw new Error('La migración de tarea viola la integridad referencial');
    await consultar('COMMIT');
    iniciada = false;
  } catch (error) {
    if (iniciada) await consultar('ROLLBACK');
    throw error;
  } finally {
    if (clavesDesactivadas) await consultar('PRAGMA foreign_keys = ON');
    await sequelize.connectionManager.releaseConnection(connection);
  }
}

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
  await migrarEstadosTarea(ddl);
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
