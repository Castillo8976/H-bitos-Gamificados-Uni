'use strict';

const app = require('./app');
const sequelize = require('./database');
const { inicializarEsquema } = require('./config/schema');
const planificador = require('./services/planificadorRecordatoriosService');
const port = Number(process.env.PORT || 3000);

/** RF01/HU01: inicializa E11, publica Express y registra el cierre de conexión ante señales. */
async function iniciarServidor() {
  await inicializarEsquema();
  const server = app.listen(port, () => {
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
