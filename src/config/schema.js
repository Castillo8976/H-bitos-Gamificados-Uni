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
 * Inicializa SQLite desde E11 y extensiones aditivas explícitas. No usa sequelize.sync(),
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
  // RF01/HU30/RN27 (Decisión #08): migración aditiva; las cuentas existentes inician con versión 0.
  const columnasCuenta = await sequelize.query('PRAGMA table_info(cuenta)', { type: sequelize.QueryTypes.SELECT });
  if (!columnasCuenta.some(columna => columna.name === 'version_sesion')) {
    await sequelize.query('ALTER TABLE cuenta ADD COLUMN version_sesion INTEGER NOT NULL DEFAULT 0 CHECK (version_sesion >= 0)');
  }
  // Bloque D opcional: las cuentas anteriores se consideran verificadas para conservar su acceso.
  for (const [campo, defecto] of [['correo_verificado', 1], ['mfa_correo', 0]]) {
    if (!columnasCuenta.some(columna => columna.name === campo)) {
      await sequelize.query(`ALTER TABLE cuenta ADD COLUMN ${campo} INTEGER NOT NULL DEFAULT ${defecto} CHECK (${campo} IN (0,1))`);
    }
  }
  await sequelize.query(`CREATE TABLE IF NOT EXISTS desafio_autenticacion (
    id_desafio VARCHAR(36) NOT NULL PRIMARY KEY,
    id_cuenta VARCHAR(36) NOT NULL REFERENCES cuenta(id_cuenta) ON DELETE CASCADE,
    proposito VARCHAR(30) NOT NULL CHECK (proposito IN ('verificar_correo','segundo_factor','cambiar_correo')),
    codigo_hash TEXT NOT NULL, destino VARCHAR(120),
    intentos INTEGER NOT NULL DEFAULT 0, reenvios INTEGER NOT NULL DEFAULT 0,
    ultimo_envio DATETIME, expira_en DATETIME NOT NULL, consumido_en DATETIME,
    creado_en DATETIME NOT NULL
  )`);
  // RF01/RN26/HU29 (Decisión #10, M1): conserva materias históricas sin asociación automática.
  const columnasMateria = await sequelize.query('PRAGMA table_info(materia)', { type: sequelize.QueryTypes.SELECT });
  if (!columnasMateria.some(columna => columna.name === 'id_catalogo_materia')) {
    await sequelize.query('ALTER TABLE materia ADD COLUMN id_catalogo_materia VARCHAR(36) REFERENCES catalogo_materia(id_catalogo_materia) ON DELETE RESTRICT ON UPDATE CASCADE');
  }
  // RF06/HU31/RN28 (Decisión #09): migración aditiva; los retos existentes quedan activos.
  const columnasReto = await sequelize.query('PRAGMA table_info(reto)', { type: sequelize.QueryTypes.SELECT });
  if (!columnasReto.some(columna => columna.name === 'activo')) {
    await sequelize.query('ALTER TABLE reto ADD COLUMN activo INTEGER NOT NULL DEFAULT 1 CHECK (activo IN (0,1))');
  }

  const restriccionesCompatibilidad = [
    `CREATE TRIGGER IF NOT EXISTS validar_cuenta_nombre_insert
      BEFORE INSERT ON cuenta
      WHEN length(trim(NEW.nombre)) NOT BETWEEN 2 AND 60
      BEGIN SELECT RAISE(ABORT, 'cuenta.nombre debe contener entre 2 y 60 caracteres'); END`,
    `CREATE TRIGGER IF NOT EXISTS validar_cuenta_nombre_update
      BEFORE UPDATE OF nombre ON cuenta
      WHEN length(trim(NEW.nombre)) NOT BETWEEN 2 AND 60
      BEGIN SELECT RAISE(ABORT, 'cuenta.nombre debe contener entre 2 y 60 caracteres'); END`,
    `CREATE TRIGGER IF NOT EXISTS validar_reto_recompensa_insert
      BEFORE INSERT ON reto
      WHEN NEW.puntos_recompensa NOT BETWEEN 1 AND 10000
      BEGIN SELECT RAISE(ABORT, 'reto.puntos_recompensa debe estar entre 1 y 10000'); END`,
    `CREATE TRIGGER IF NOT EXISTS validar_reto_recompensa_update
      BEFORE UPDATE OF puntos_recompensa ON reto
      WHEN NEW.puntos_recompensa NOT BETWEEN 1 AND 10000
      BEGIN SELECT RAISE(ABORT, 'reto.puntos_recompensa debe estar entre 1 y 10000'); END`,
    `CREATE TRIGGER IF NOT EXISTS validar_meta_objetivo_insert
      BEFORE INSERT ON meta
      WHEN NEW.valor_objetivo NOT BETWEEN 1 AND 10080
      BEGIN SELECT RAISE(ABORT, 'meta.valor_objetivo debe estar entre 1 y 10080'); END`,
    `CREATE TRIGGER IF NOT EXISTS validar_meta_objetivo_update
      BEFORE UPDATE OF valor_objetivo ON meta
      WHEN NEW.valor_objetivo NOT BETWEEN 1 AND 10080
      BEGIN SELECT RAISE(ABORT, 'meta.valor_objetivo debe estar entre 1 y 10080'); END`,
    `CREATE TRIGGER IF NOT EXISTS validar_sesion_duracion_insert
      BEFORE INSERT ON sesion_estudio
      WHEN NEW.duracion_minutos NOT BETWEEN 1 AND 1440
      BEGIN SELECT RAISE(ABORT, 'sesion_estudio.duracion_minutos debe estar entre 1 y 1440'); END`,
    `CREATE TRIGGER IF NOT EXISTS validar_sesion_duracion_update
      BEFORE UPDATE OF duracion_minutos ON sesion_estudio
      WHEN NEW.duracion_minutos NOT BETWEEN 1 AND 1440
      BEGIN SELECT RAISE(ABORT, 'sesion_estudio.duracion_minutos debe estar entre 1 y 1440'); END`
  ];
  for (const restriccion of restriccionesCompatibilidad) await sequelize.query(restriccion);
}

/** Columnas añadidas por migraciones aditivas posteriores a E11 (CRF-005, Decisiones #08–#10 y Bloque D). */
const COLUMNAS_ADITIVAS = [
  ['preferencia_visual', 'notificaciones_recordatorios'], ['preferencia_visual', 'notificaciones_retos'],
  ['cuenta', 'version_sesion'], ['cuenta', 'correo_verificado'], ['cuenta', 'mfa_correo'],
  ['materia', 'id_catalogo_materia'], ['reto', 'activo']
];

/** Solo lectura: lista lo que inicializarEsquema() cambiaría en una base existente; vacía si la base es nueva o está al día. */
async function migracionesPendientes() {
  const tablas = new Set((await sequelize.query("SELECT name FROM sqlite_master WHERE type='table'", { type: sequelize.QueryTypes.SELECT })).map(t => t.name));
  if (!tablas.has('cuenta')) return [];
  const ddl = await fs.readFile(ddlPath, 'utf8');
  const pendientes = [...ddl.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)/gi)].map(m => m[1]).filter(t => !tablas.has(t)).map(t => `tabla ${t}`);
  if (!tablas.has('desafio_autenticacion')) pendientes.push('tabla desafio_autenticacion');
  const [tarea] = await sequelize.query("SELECT sql FROM sqlite_master WHERE type='table' AND name='tarea'", { type: sequelize.QueryTypes.SELECT });
  if (tarea && !tarea.sql.includes("'En progreso'")) pendientes.push('estados de tarea (CRF-005)');
  for (const [tabla, columna] of COLUMNAS_ADITIVAS) {
    if (!tablas.has(tabla)) continue;
    const columnas = await sequelize.query(`PRAGMA table_info(${tabla})`, { type: sequelize.QueryTypes.SELECT });
    if (!columnas.some(c => c.name === columna)) pendientes.push(`${tabla}.${columna}`);
  }
  return pendientes;
}

/** Para scripts operativos: crea una base nueva, pero rechaza migrar implícitamente una existente. */
async function prepararEsquemaSinMigrar() {
  const pendientes = await migracionesPendientes();
  if (pendientes.length) throw new Error(`la base requiere migraciones (${pendientes.join(', ')}); haga un respaldo y ejecute npm run db:migrate`);
  await inicializarEsquema();
}

module.exports = { ddlPath, dividirSentencias, inicializarEsquema, migracionesPendientes, prepararEsquemaSinMigrar };
