'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-schema-'));
process.env.DATABASE_STORAGE = path.join(tempDirectory, 'database.sqlite');

const sequelize = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');

const models = {
  cuenta: require('../../src/models/Cuenta'),
  materia: require('../../src/models/Materia'),
  tarea: require('../../src/models/Tarea'),
  sesion_estudio: require('../../src/models/SesionEstudio'),
  insignia: require('../../src/models/Insignia'),
  cuenta_insignia: require('../../src/models/CuentaInsignia'),
  punto: require('../../src/models/Punto'),
  reto: require('../../src/models/Reto'),
  meta: require('../../src/models/Meta'),
  recordatorio: require('../../src/models/Recordatorio'),
  preferencia_visual: require('../../src/models/PreferenciaVisual'),
  nivel_cuenta: require('../../src/models/NivelCuenta'),
  notificacion: require('../../src/models/Notificacion')
};

const expected = {
  cuenta: ['id_cuenta','nombre','correo','contrasena_hash','fecha_registro','activa'],
  materia: ['id_materia','id_cuenta','nombre','horario','activa'],
  tarea: ['id_tarea','id_cuenta','id_materia','nombre','fecha_entrega','prioridad','estado','fecha_completada'],
  sesion_estudio: ['id_sesion','id_cuenta','id_tarea','fecha','duracion_minutos','modo_enfoque'],
  insignia: ['id_insignia','nombre','descripcion','condicion','icono'],
  cuenta_insignia: ['id_cuenta','id_insignia','fecha_obtenida'],
  punto: ['id_punto','id_cuenta','cantidad','origen','id_origen','fecha'],
  reto: ['id_reto','id_cuenta','descripcion','condicion','puntos_recompensa','semana','progreso','completado'],
  meta: ['id_meta','id_cuenta','semana','descripcion','valor_objetivo','valor_actual','cumplida'],
  recordatorio: ['id_recordatorio','id_tarea','id_cuenta','fecha_programada','mensaje','enviado','activo'],
  preferencia_visual: ['id_preferencia','id_cuenta','tema','modo_oscuro','avatar','fecha_actualizado'],
  nivel_cuenta: ['id_nivel','nombre','descripcion','puntos_minimos','orden','icono'],
  notificacion: ['id_notificacion','id_cuenta','tipo','mensaje','leida','fecha']
};

function sorted(values) {
  return [...values].sort();
}

function normalizeType(type) {
  const value = String(type).toUpperCase();
  if (value === 'BOOLEAN/INT' || value.startsWith('TINYINT')) return 'INTEGER';
  return value;
}

function e7TableDefinition(markdown, table) {
  const heading = new RegExp('## \\d+\\. `' + table + '`[^\\n]*\\n');
  const start = markdown.search(heading);
  assert.notEqual(start, -1, `${table}: no está documentada en E7`);
  const remainder = markdown.slice(start);
  const nextHeading = remainder.slice(1).search(/\n## \d+\. `/);
  const section = nextHeading === -1 ? remainder : remainder.slice(0, nextHeading + 1);
  const fields = {};
  const row = /^\| \*\*([a-z_]+)[^*]*\*\* \| ([^|]+) \| (No|Sí) \|/gm;
  let match;
  while ((match = row.exec(section)) !== null) {
    fields[match[1]] = { type: normalizeType(match[2].trim()), nullable: match[3] === 'Sí' };
  }
  return fields;
}

function modelType(attribute) {
  return normalizeType(attribute.type.toString());
}

async function run() {
  await inicializarEsquema();

  const tables = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    { type: sequelize.QueryTypes.SELECT }
  );
  assert.deepEqual(tables.map(row => row.name), sorted(Object.keys(expected)));
  assert.equal(tables.some(row => row.name === 'reporte'), false);

  const e7Path = path.join(__dirname, '..', '..', 'pjc', 'docs', 'diseno', 'fase2-datos', 'E7-diccionario-datos.md');
  const e7 = fs.readFileSync(e7Path, 'utf8');

  for (const [table, columns] of Object.entries(expected)) {
    const e7Fields = e7TableDefinition(e7, table);
    const dbColumns = await sequelize.query(`PRAGMA table_info(${table})`, {
      type: sequelize.QueryTypes.SELECT
    });
    assert.deepEqual(sorted(dbColumns.map(column => column.name)), sorted(columns), `${table}: E11 y SQLite difieren`);
    assert.deepEqual(sorted(Object.keys(models[table].rawAttributes)), sorted(columns), `${table}: modelo y E11 difieren`);
    assert.deepEqual(sorted(Object.keys(e7Fields)), sorted(columns), `${table}: E7 no contiene los mismos campos`);

    for (const dbColumn of dbColumns) {
      const documented = e7Fields[dbColumn.name];
      const modelAttribute = models[table].rawAttributes[dbColumn.name];
      assert.equal(normalizeType(dbColumn.type), documented.type, `${table}.${dbColumn.name}: tipo E7/E11 diferente`);
      assert.equal(modelType(modelAttribute), documented.type, `${table}.${dbColumn.name}: tipo E7/modelo diferente`);
      assert.equal(Boolean(dbColumn.notnull), !documented.nullable, `${table}.${dbColumn.name}: nulabilidad E7/E11 diferente`);
      const modelNullable = modelAttribute.primaryKey ? false : modelAttribute.allowNull !== false;
      assert.equal(modelNullable, documented.nullable, `${table}.${dbColumn.name}: nulabilidad E7/modelo diferente`);
    }
  }

  const primaryKeys = {
    cuenta: ['id_cuenta'], materia: ['id_materia'], tarea: ['id_tarea'],
    sesion_estudio: ['id_sesion'], insignia: ['id_insignia'],
    cuenta_insignia: ['id_cuenta', 'id_insignia'], punto: ['id_punto'],
    reto: ['id_reto'], meta: ['id_meta'], recordatorio: ['id_recordatorio'],
    preferencia_visual: ['id_preferencia'], nivel_cuenta: ['id_nivel'],
    notificacion: ['id_notificacion']
  };
  for (const [table, keys] of Object.entries(primaryKeys)) {
    const info = await sequelize.query(`PRAGMA table_info(${table})`, { type: sequelize.QueryTypes.SELECT });
    const actual = info.filter(column => column.pk > 0).sort((a, b) => a.pk - b.pk).map(column => column.name);
    assert.deepEqual(actual, keys, `${table}: clave primaria incorrecta`);
  }

  const defaults = {
    cuenta: { fecha_registro: 'CURRENT_DATE', activa: '1' },
    nivel_cuenta: { puntos_minimos: '0', orden: '1' },
    preferencia_visual: { tema: "'purple'", modo_oscuro: '0', fecha_actualizado: 'CURRENT_DATE' },
    materia: { activa: '1' }, tarea: { estado: "'Pendiente'" },
    sesion_estudio: { fecha: 'CURRENT_DATE', modo_enfoque: '0' },
    cuenta_insignia: { fecha_obtenida: 'CURRENT_DATE' }, punto: { fecha: 'CURRENT_DATE' },
    reto: { progreso: '0', completado: '0' }, meta: { valor_actual: '0', cumplida: '0' },
    recordatorio: { enviado: '0', activo: '1' },
    notificacion: { leida: '0', fecha: 'CURRENT_DATE' }
  };
  for (const [table, fields] of Object.entries(defaults)) {
    const info = await sequelize.query(`PRAGMA table_info(${table})`, { type: sequelize.QueryTypes.SELECT });
    for (const [field, value] of Object.entries(fields)) {
      assert.equal(String(info.find(column => column.name === field).dflt_value), value,
        `${table}.${field}: valor predeterminado incorrecto`);
    }
  }

  const requiredChecks = {
    cuenta: ['activa IN (0,1)'],
    nivel_cuenta: ['puntos_minimos >= 0', 'orden > 0'],
    preferencia_visual: ["tema IN ('purple','teal','amber','coral','blue','green')", 'modo_oscuro IN (0,1)'],
    materia: ['activa IN (0,1)'],
    tarea: ["prioridad IN ('Alta','Media','Baja')", "estado IN ('Pendiente','Completada')"],
    sesion_estudio: ['duracion_minutos > 0', 'modo_enfoque IN (0,1)'],
    punto: ['cantidad > 0', "origen IN ('Tarea','Reto','Sesion')"],
    reto: ['puntos_recompensa > 0', 'progreso >= 0', 'completado IN (0,1)'],
    meta: ['valor_objetivo > 0', 'valor_actual >= 0', 'cumplida IN (0,1)'],
    recordatorio: ['enviado IN (0,1)', 'activo IN (0,1)'],
    notificacion: ["tipo IN ('Insignia','Reto','Meta','Nivel','Sistema')", 'leida IN (0,1)']
  };
  for (const [table, checks] of Object.entries(requiredChecks)) {
    const rows = await sequelize.query(`SELECT sql FROM sqlite_master WHERE type='table' AND name='${table}'`, {
      type: sequelize.QueryTypes.SELECT
    });
    for (const check of checks) assert.ok(rows[0].sql.includes(check), `${table}: falta CHECK ${check}`);
  }

  const requiredUniqueKeys = {
    cuenta: [['correo']],
    nivel_cuenta: [['nombre']],
    preferencia_visual: [['id_cuenta']],
    insignia: [['nombre'], ['condicion']],
    reto: [['id_cuenta', 'semana']],
    meta: [['id_cuenta', 'semana']]
  };
  for (const [table, uniqueKeys] of Object.entries(requiredUniqueKeys)) {
    const indexes = await sequelize.query(`PRAGMA index_list(${table})`, { type: sequelize.QueryTypes.SELECT });
    const actualUniqueKeys = [];
    for (const index of indexes.filter(item => item.unique === 1)) {
      const columns = await sequelize.query(`PRAGMA index_info(${index.name})`, { type: sequelize.QueryTypes.SELECT });
      actualUniqueKeys.push(columns.sort((a, b) => a.seqno - b.seqno).map(column => column.name));
    }
    for (const key of uniqueKeys) {
      assert.ok(actualUniqueKeys.some(actual => JSON.stringify(actual) === JSON.stringify(key)),
        `${table}: falta UNIQUE(${key.join(', ')})`);
    }
  }

  const expectedForeignKeys = [
    ['preferencia_visual','id_cuenta','cuenta','id_cuenta','CASCADE'],
    ['materia','id_cuenta','cuenta','id_cuenta','CASCADE'],
    ['tarea','id_cuenta','cuenta','id_cuenta','CASCADE'],
    ['tarea','id_materia','materia','id_materia','SET NULL'],
    ['sesion_estudio','id_cuenta','cuenta','id_cuenta','CASCADE'],
    ['sesion_estudio','id_tarea','tarea','id_tarea','SET NULL'],
    ['cuenta_insignia','id_cuenta','cuenta','id_cuenta','CASCADE'],
    ['cuenta_insignia','id_insignia','insignia','id_insignia','CASCADE'],
    ['punto','id_cuenta','cuenta','id_cuenta','CASCADE'],
    ['reto','id_cuenta','cuenta','id_cuenta','CASCADE'],
    ['meta','id_cuenta','cuenta','id_cuenta','CASCADE'],
    ['recordatorio','id_tarea','tarea','id_tarea','CASCADE'],
    ['recordatorio','id_cuenta','cuenta','id_cuenta','CASCADE'],
    ['notificacion','id_cuenta','cuenta','id_cuenta','CASCADE']
  ];
  for (const [table, from, target, to, onDelete] of expectedForeignKeys) {
    const keys = await sequelize.query(`PRAGMA foreign_key_list(${table})`, { type: sequelize.QueryTypes.SELECT });
    assert.ok(keys.some(key => key.from === from && key.table === target && key.to === to && key.on_delete === onDelete),
      `${table}.${from}: FK o acción ON DELETE incorrecta`);
  }

  const foreignKeyErrors = await sequelize.query('PRAGMA foreign_key_check', { type: sequelize.QueryTypes.SELECT });
  const integrity = await sequelize.query('PRAGMA integrity_check', { type: sequelize.QueryTypes.SELECT });
  assert.deepEqual(foreignKeyErrors, []);
  assert.equal(integrity[0].integrity_check, 'ok');

  const insignias = await sequelize.query('SELECT COUNT(*) AS total FROM insignia', { type: sequelize.QueryTypes.SELECT });
  const niveles = await sequelize.query('SELECT COUNT(*) AS total FROM nivel_cuenta', { type: sequelize.QueryTypes.SELECT });
  assert.equal(insignias[0].total, 5);
  assert.equal(niveles[0].total, 4);

  await assert.rejects(
    sequelize.query("INSERT INTO tarea (id_tarea,id_cuenta,nombre,fecha_entrega,prioridad) VALUES ('x','inexistente','X','2026-01-01','Urgente')")
  );

  console.log('✅ E7 → E11 → 13 modelos → SQLite: alineación verificada');
  console.log('✅ Sin reporte; integridad ok; 0 violaciones de claves foráneas');
}

(async () => {
  try {
    await run();
  } catch (error) {
    console.error('❌ Falló la verificación del esquema');
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    fs.rmSync(tempDirectory, { recursive: true, force: true });
  }
})();
