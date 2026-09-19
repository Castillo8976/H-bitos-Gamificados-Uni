'use strict';

const sequelize = require('../src/database');
const { inicializarEsquema } = require('../src/config/schema');
const Cuenta = require('../src/models/Cuenta');
const authService = require('../src/services/authService');

async function run() {
  const nombre = process.env.BOOTSTRAP_NAME;
  const correo = process.env.BOOTSTRAP_EMAIL;
  const contrasena = process.env.BOOTSTRAP_PASSWORD;
  const rol = process.env.BOOTSTRAP_ROLE;
  const allowed = ['Administrador', 'Revisor institucional'];

  if (!nombre || !correo || !contrasena || !allowed.includes(rol)) {
    throw new Error('Defina BOOTSTRAP_NAME, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD y BOOTSTRAP_ROLE (Administrador o Revisor institucional)');
  }

  await inicializarEsquema();
  let account = await Cuenta.findOne({ where: { correo: correo.trim().toLowerCase() } });
  if (!account) {
    await authService.register({
      nombre,
      correo,
      contrasena,
      materia: { nombre: 'Administración de StudyQuest' }
    });
    account = await Cuenta.findOne({ where: { correo: correo.trim().toLowerCase() } });
  }
  await account.update({ rol, activa: true });
  console.log(`✅ Cuenta ${correo} habilitada con rol ${rol}`);
}

run()
  .catch(error => {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
