'use strict';

const app = require('./app');
const sequelize = require('./database');
const { inicializarEsquema, migracionesPendientes } = require('./config/schema');
const planificador = require('./services/planificadorRecordatoriosService');
const port = Number(process.env.PORT || 3000);
// Solo la máquina local por defecto; HOST=0.0.0.0 la expone a la red local de forma explícita.
const host = process.env.HOST || '127.0.0.1';

/** RF01/HU01: inicializa E11, publica Express y registra el cierre de conexión ante señales. */
async function iniciarServidor() {
  // Una base existente desactualizada no se migra al arrancar: requiere respaldo y `npm run db:migrate`.
  const pendientes = await migracionesPendientes();
  if (pendientes.length && process.env.STUDYQUEST_AUTO_MIGRATE !== 'true') {
    throw new Error(`la base ${sequelize.options.storage} requiere migraciones (${pendientes.join(', ')}). Haga un respaldo y ejecute npm run db:migrate`);
  }
  await inicializarEsquema();
  const server = app.listen(port, host, () => {
    planificador.iniciar();
    console.log(`✅ StudyQuest disponible en http://localhost:${port}`);
    console.log(`✅ Salud del servicio: http://localhost:${port}/api/health`);
  });

  const cerrar = () => server.close(async () => {
    await planificador.detener();
    await sequelize.close();
    process.exit(0);
  });
  process.on('SIGINT', cerrar);
  process.on('SIGTERM', cerrar);
  return server;
}

if (require.main === module) {
  iniciarServidor().catch(error => {
    console.error('❌ No fue posible iniciar StudyQuest:', error.message);
    process.exit(1);
  });
}

module.exports = { iniciarServidor };
