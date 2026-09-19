'use strict';

const app = require('./app');
const sequelize = require('./database');
const { inicializarEsquema } = require('./config/schema');
const port = Number(process.env.PORT || 3000);

async function iniciarServidor() {
  await inicializarEsquema();
  const server = app.listen(port, () => {
    console.log(`✅ StudyQuest disponible en http://localhost:${port}`);
    console.log(`✅ Salud del servicio: http://localhost:${port}/api/health`);
  });

  const cerrar = () => server.close(async () => {
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
