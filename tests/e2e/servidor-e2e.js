'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { ADMIN, REVISOR } = require('./datos');

const puerto = Number(process.env.PORT);
assert.ok([3950, 3951].includes(puerto), 'Servidor exclusivo de E2E: PORT debe ser 3950 o 3951');
const temporal = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-e2e-'));
process.env.DATABASE_STORAGE = path.join(temporal, 'e2e.sqlite');
process.env.JWT_SECRET = 'solo-pruebas-e2e-jwt-no-produccion';
process.env.AUTH_CODE_SECRET = 'solo-pruebas-e2e-correo-no-produccion';
process.env.NODE_ENV = 'test';
// Antes de importar cualquier módulo de la aplicación.
const sequelize = require('../../src/database');
assert.equal(sequelize.options.storage, path.join(temporal, 'e2e.sqlite'));
process.on('exit', () => { try { fs.rmSync(temporal, { recursive: true, force: true }); } catch (_) { /* Limpieza de mejor esfuerzo. */ } });

let control;
async function preparar() {
  require('../../src/app');
  await require('../../src/config/schema').inicializarEsquema();
  await require('../../scripts/importar-catalogo').importarCatalogo();
  const [materia] = await require('../../src/services/catalogoMateriaService').listar(false);
  const Cuenta = require('../../src/models/Cuenta');
  for (const datos of [ADMIN, REVISOR]) {
    await require('../../src/services/authService').register({ ...datos, materia: { id_catalogo_materia: materia.id_catalogo_materia } });
    const cuenta = await Cuenta.findOne({ where: { correo: datos.correo } });
    await require('../../src/services/desafioAutenticacionService').recuperar(cuenta.id_cuenta, { correo_verificado: true, mfa_correo: false });
    await cuenta.update({ rol: datos.rol, activa: true });
  }
  if (puerto === 3951) {
    const { mensajes } = require('../../src/services/mailService');
    control = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-store');
      if (req.method !== 'GET' || url.pathname !== '/correos' || !url.searchParams.get('para')) {
        res.writeHead(404); res.end(JSON.stringify({ error: 'Ruta de control desconocida' })); return;
      }
      res.end(JSON.stringify(mensajes.filter(m => m.to === url.searchParams.get('para'))));
    });
    await new Promise((resolve, reject) => { control.once('error', reject); control.listen(puerto + 100, '127.0.0.1', resolve); });
  }
  // La salud se publica después de preparar también el servidor de control.
  await require('../../src/server').iniciarServidor();
  for (const señal of ['SIGINT', 'SIGTERM']) process.on(señal, () => control?.close());
}
preparar().catch(async error => {
  console.error('No fue posible preparar E2E:', error);
  control?.close();
  await sequelize.close().catch(() => {});
  process.exitCode = 1;
});
