const sequelize = require('./database');
require('./models/Cuenta');
require('./models/Materia');
require('./models/Tarea');
require('./models/PreferenciaVisual');
require('./models/SesionEstudio');
require('./models/Insignia');
require('./models/CuentaInsignia');
require('./models/Punto');
require('./models/Reto');
require('./models/Meta');
require('./models/Recordatorio');
require('./models/Reporte');

async function iniciar() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a SQLite exitosa');
    await sequelize.sync({ force: false });
    console.log('✅ Tablas sincronizadas');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

iniciar();