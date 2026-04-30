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

const { crearCuenta, eliminarCuenta } = require('./crud/cuentaCrud');
const { crearMateria, eliminarMateria } = require('./crud/materiaCrud');
const { crearTarea, eliminarTarea } = require('./crud/tareaCrud');
const { crearInsignia, listarInsignias, obtenerInsignia, actualizarInsignia, eliminarInsignia } = require('./crud/insigniaCrud');

async function test() {
  await sequelize.sync({ force: false });

  // Datos base
  const cuenta = await crearCuenta('Juan David', 'juan@test.com', '123456');
  const materia = await crearMateria(cuenta.id_cuenta, 'Ingeniería de Software II', 'Lunes 8am');
  const tarea = await crearTarea(cuenta.id_cuenta, 'Entrega Semana 3', '2026-05-02', 'Alta', materia.id_materia);

  console.log('\n===== CRUD INSIGNIA =====');
  console.log('\n--- CREAR ---');
  const insignia = await crearInsignia('Primera tarea', 'Completaste tu primera tarea', 'primera_tarea', 'star.svg');

  console.log('\n--- LEER TODAS ---');
  await listarInsignias();

  console.log('\n--- LEER UNA ---');
  await obtenerInsignia(insignia.id_insignia);

  console.log('\n--- ACTUALIZAR ---');
  await actualizarInsignia(insignia.id_insignia, { descripcion: 'Descripción actualizada' });

  console.log('\n--- ELIMINAR ---');
  await eliminarInsignia(insignia.id_insignia);

  console.log('\n--- VERIFICAR ELIMINACIÓN ---');
  await listarInsignias();

  console.log('\n===== LIMPIEZA =====');
  await eliminarTarea(tarea.id_tarea);
  await eliminarMateria(materia.id_materia);
  await eliminarCuenta(cuenta.id_cuenta);

  await sequelize.close();
}

test();