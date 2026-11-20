'use strict';

/**
 * Demo docente: crea el catálogo, tres perfiles ficticios (Estudiante, Administrador y Revisor institucional)
 * y tareas de ejemplo. Es idempotente: no duplica cuentas ni tareas ni cambia contraseñas existentes.
 * Las contraseñas llegan por entorno (DEMO_*_PASSWORD) y nunca se escriben en el repositorio.
 * Rechaza trabajar sobre la base local database.sqlite.
 */
const path = require('node:path');

const PERFILES = [
  { rol: 'Administrador', nombre: 'Administrador Demo', correo: process.env.DEMO_ADMIN_EMAIL || 'admin@studyquest.demo', clave: 'DEMO_ADMIN_PASSWORD' },
  { rol: 'Revisor institucional', nombre: 'Revisor Demo', correo: process.env.DEMO_REVISOR_EMAIL || 'revisor@studyquest.demo', clave: 'DEMO_REVISOR_PASSWORD' },
  { rol: 'Estudiante', nombre: 'Estudiante Demo', correo: process.env.DEMO_STUDENT_EMAIL || 'estudiante@studyquest.demo', clave: 'DEMO_STUDENT_PASSWORD' }
];

function fechaDesdeHoy(dias) {
  const d = new Date(); d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

async function sembrar() {
  const almacen = process.env.DATABASE_STORAGE;
  if (!almacen || path.resolve(almacen) === path.resolve(__dirname, '..', 'database.sqlite')) {
    throw new Error('Defina DATABASE_STORAGE con una base distinta de database.sqlite');
  }
  for (const p of PERFILES) {
    if ((process.env[p.clave] || '').length < 8) throw new Error(`${p.clave} es obligatoria (mínimo 8 caracteres)`);
  }
  const { prepararEsquemaSinMigrar } = require('../src/config/schema');
  const { importarCatalogo } = require('./importar-catalogo');
  const Cuenta = require('../src/models/Cuenta');
  const Tarea = require('../src/models/Tarea');
  const authService = require('../src/services/authService');
  const catalogo = require('../src/services/catalogoMateriaService');
  const tareas = require('../src/services/tareaService');

  await prepararEsquemaSinMigrar();
  await importarCatalogo();
  const [asignatura] = await catalogo.listar(false);
  const resumen = [];
  for (const p of PERFILES) {
    const correo = p.correo.trim().toLowerCase();
    let cuenta = await Cuenta.findOne({ where: { correo } });
    if (!cuenta) {
      await authService.register({ nombre: p.nombre, correo, contrasena: process.env[p.clave], materia: { id_catalogo_materia: asignatura.id_catalogo_materia } });
      cuenta = await Cuenta.findOne({ where: { correo } });
    }
    await cuenta.update({ rol: p.rol, activa: true, correo_verificado: true, mfa_correo: false });
    resumen.push(`${p.rol}: ${correo}`);
  }
  const estudiante = await Cuenta.findOne({ where: { correo: PERFILES[2].correo.trim().toLowerCase() } });
  if (!(await Tarea.count({ where: { id_cuenta: estudiante.id_cuenta } }))) {
    await tareas.crearTarea(estudiante.id_cuenta, 'Taller de ingeniería de software', fechaDesdeHoy(3), 'Alta');
    await tareas.crearTarea(estudiante.id_cuenta, 'Lectura del capítulo de pruebas', fechaDesdeHoy(5), 'Media');
    await tareas.crearTarea(estudiante.id_cuenta, 'Repaso de bases de datos', fechaDesdeHoy(7), 'Baja');
  }
  return resumen;
}

if (require.main === module) {
  const sequelize = require('../src/database');
  sembrar()
    .then(r => console.log('✅ Demo lista. Perfiles: ' + r.join('; ')))
    .catch(e => { console.error(`❌ ${e.message}`); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = { sembrar };
