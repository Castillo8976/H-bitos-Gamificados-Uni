'use strict';

const sequelize = require('../src/database');
const { prepararEsquemaSinMigrar } = require('../src/config/schema');
const Cuenta = require('../src/models/Cuenta');
const authService = require('../src/services/authService');
const catalogo = require('../src/services/catalogoMateriaService');

async function run() {
  const nombre = process.env.BOOTSTRAP_NAME;
  const correo = process.env.BOOTSTRAP_EMAIL;
  const contrasena = process.env.BOOTSTRAP_PASSWORD;
  const rol = process.env.BOOTSTRAP_ROLE;
  const allowed = ['Administrador', 'Revisor institucional'];

  if (!nombre || !correo || !contrasena || !allowed.includes(rol)) {
    throw new Error('Defina BOOTSTRAP_NAME, BOOTSTRAP_EMAIL, BOOTSTRAP_PASSWORD y BOOTSTRAP_ROLE (Administrador o Revisor institucional)');
  }

  await prepararEsquemaSinMigrar();
  let account = await Cuenta.findOne({ where: { correo: correo.trim().toLowerCase() } });
  if (!account) {
    // RN26 (Decisión #10): el registro exige una asignatura activa; importe antes el catálogo (npm run catalog:import).
    const [asignatura] = await catalogo.listar(false);
    if (!asignatura) throw new Error('El catálogo de materias está vacío; ejecute primero npm run catalog:import');
    await authService.register({
      nombre,
      correo,
      contrasena,
      materia: { id_catalogo_materia: asignatura.id_catalogo_materia }
    });
    account = await Cuenta.findOne({ where: { correo: correo.trim().toLowerCase() } });
  }
  await require('../src/services/desafioAutenticacionService').recuperar(account.id_cuenta, { correo_verificado: true, mfa_correo: false });
  await account.update({ rol, activa: true });
  console.log(`✅ Cuenta ${correo} habilitada con rol ${rol}`);
}

run()
  .catch(error => {
    console.error(`❌ ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
