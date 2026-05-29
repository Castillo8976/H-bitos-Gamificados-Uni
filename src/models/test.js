/**
 * @fileoverview Script de pruebas funcionales para el CRUD de Insignia.
 * Ejecuta un flujo completo de pruebas que cubre todas las operaciones
 * disponibles en el controlador de Insignia: crear, listar, obtener,
 * actualizar y eliminar.
 *
 * El script también crea datos base auxiliares (Cuenta, Materia, Tarea)
 * necesarios para que el entorno de prueba sea consistente con el esquema
 * relacional real, y los elimina al finalizar para dejar la base de datos
 * en su estado original (limpieza post-test).
 *
 * Flujo de ejecución:
 * ```
 *   1. Sincronizar esquema (force: false)
 *   2. Crear datos base: Cuenta → Materia → Tarea
 *   3. ── CRUD Insignia ──────────────────────────
 *      3.1 CREAR    → crearInsignia()
 *      3.2 LEER ALL → listarInsignias()
 *      3.3 LEER UNA → obtenerInsignia()
 *      3.4 ACTUALIZAR → actualizarInsignia()
 *      3.5 ELIMINAR → eliminarInsignia()
 *      3.6 VERIFICAR → listarInsignias() (debe retornar vacío)
 *   4. LIMPIEZA: eliminar Tarea → Materia → Cuenta
 *   5. Cerrar conexión a la base de datos
 * ```
 *
 * @module testInsignia
 * @requires ./database
 * @requires ./models/Cuenta
 * @requires ./models/Materia
 * @requires ./models/Tarea
 * @requires ./models/PreferenciaVisual
 * @requires ./models/SesionEstudio
 * @requires ./models/Insignia
 * @requires ./models/CuentaInsignia
 * @requires ./models/Punto
 * @requires ./models/Reto
 * @requires ./models/Meta
 * @requires ./models/Recordatorio
 * @requires ./models/Reporte
 * @requires ./crud/cuentaCrud
 * @requires ./crud/materiaCrud
 * @requires ./crud/tareaCrud
 * @requires ./crud/insigniaCrud
 */

const sequelize = require('./database'); // Instancia única de conexión Sequelize a SQLite


// ─────────────────────────────────────────
// REGISTRO DE MODELOS
// ─────────────────────────────────────────
// Se cargan todos los modelos para que Sequelize registre sus definiciones
// y asociaciones antes de ejecutar sync(). El orden respeta las dependencias
// de claves foráneas entre modelos padre e hijo.

require('./models/Cuenta');            // 1. Raíz del esquema
require('./models/Materia');           // 2. Depende de Cuenta
require('./models/Tarea');             // 3. Depende de Cuenta y Materia
require('./models/PreferenciaVisual'); // 4. Depende de Cuenta (1:1)
require('./models/SesionEstudio');     // 5. Depende de Cuenta y Tarea
require('./models/Insignia');          // 6. Catálogo global sin dependencias
require('./models/CuentaInsignia');    // 7. Tabla pivote N:M: Cuenta ↔ Insignia
require('./models/Punto');             // 8. Depende de Cuenta
require('./models/Reto');              // 9. Depende de Cuenta
require('./models/Meta');              // 10. Depende de Cuenta
require('./models/Recordatorio');      // 11. Depende de Cuenta y Tarea
require('./models/Reporte');           // 12. Depende de Cuenta


// ─────────────────────────────────────────
// IMPORTACIÓN DE CONTROLADORES
// ─────────────────────────────────────────

/**
 * Operaciones de Cuenta necesarias para crear y limpiar los datos base del test.
 * Solo se importan `crearCuenta` y `eliminarCuenta` ya que el foco del test es Insignia.
 */
const { crearCuenta, eliminarCuenta } = require('./crud/cuentaCrud');

/**
 * Operaciones de Materia necesarias para los datos base del test.
 * Solo se importan `crearMateria` y `eliminarMateria`.
 */
const { crearMateria, eliminarMateria } = require('./crud/materiaCrud');

/**
 * Operaciones de Tarea necesarias para los datos base del test.
 * Solo se importan `crearTarea` y `eliminarTarea`.
 */
const { crearTarea, eliminarTarea } = require('./crud/tareaCrud');

/**
 * Todas las operaciones CRUD de Insignia: el conjunto completo que se prueba
 * en este script.
 */
const {
  crearInsignia,
  listarInsignias,
  obtenerInsignia,
  actualizarInsignia,
  eliminarInsignia
} = require('./crud/insigniaCrud');


// ─────────────────────────────────────────
// FUNCIÓN PRINCIPAL DE TEST
// ─────────────────────────────────────────

/**
 * Ejecuta el flujo completo de pruebas funcionales del CRUD de Insignia.
 *
 * Crea un entorno de prueba realista con datos base (Cuenta, Materia, Tarea),
 * ejercita cada operación del controlador de Insignia en el orden lógico
 * del ciclo de vida, y limpia todos los registros al finalizar.
 *
 * La limpieza se realiza en orden inverso a la creación para respetar
 * las restricciones de clave foránea:
 * ```
 *   Creación:  Cuenta → Materia → Tarea    (padre antes que hijo)
 *   Limpieza:  Tarea → Materia → Cuenta   (hijo antes que padre)
 * ```
 * Nota: Insignia no necesita limpieza explícita porque se elimina
 * en el paso 3.5 del flujo de pruebas.
 *
 * @async
 * @function test
 * @returns {Promise<void>}
 */
async function test() {

  // Sincroniza el esquema sin forzar recreación de tablas.
  // force: false garantiza que los datos existentes no se borren.
  await sequelize.sync({ force: false });


  // ── DATOS BASE ────────────────────────────────────────────────────────────
  // Se crean datos auxiliares que representan un contexto realista:
  // una cuenta de usuario con una materia y una tarea asociada.
  // Aunque el test se enfoca en Insignia, estos datos garantizan que
  // el entorno sea fiel al esquema relacional completo del proyecto.

  const cuenta = await crearCuenta('Juan David', 'juan@test.com', '123456');
  const materia = await crearMateria(cuenta.id_cuenta, 'Ingeniería de Software II', 'Lunes 8am');
  const tarea = await crearTarea(
    cuenta.id_cuenta,
    'Entrega Semana 3',
    '2026-05-02',
    'Alta',
    materia.id_materia // Tarea vinculada a la materia creada
  );


  // ── CRUD INSIGNIA ─────────────────────────────────────────────────────────
  console.log('\n===== CRUD INSIGNIA =====');


  // 3.1 CREAR
  // Verifica que crearInsignia() persiste correctamente un nuevo registro
  // con todos sus campos: nombre, descripcion, condicion e icono.
  console.log('\n--- CREAR ---');
  const insignia = await crearInsignia(
    'Primera tarea',                       // nombre: visible en la UI
    'Completaste tu primera tarea',        // descripcion: texto del logro
    'primera_tarea',                       // condicion: criterio de desbloqueo
    'star.svg'                             // icono: nombre del archivo (opcional)
  );


  // 3.2 LEER TODAS
  // Verifica que listarInsignias() retorna al menos la insignia recién creada.
  // El log debe mostrar 1 elemento con id, nombre y condicion.
  console.log('\n--- LEER TODAS ---');
  await listarInsignias();


  // 3.3 LEER UNA
  // Verifica que obtenerInsignia() localiza correctamente el registro
  // usando el UUID asignado en el paso de creación.
  console.log('\n--- LEER UNA ---');
  await obtenerInsignia(insignia.id_insignia);


  // 3.4 ACTUALIZAR
  // Verifica que actualizarInsignia() modifica solo el campo indicado
  // sin afectar los demás campos del registro.
  console.log('\n--- ACTUALIZAR ---');
  await actualizarInsignia(insignia.id_insignia, {
    descripcion: 'Descripción actualizada' // Solo se actualiza este campo
  });


  // 3.5 ELIMINAR
  // Verifica que eliminarInsignia() borra el registro de la base de datos.
  console.log('\n--- ELIMINAR ---');
  await eliminarInsignia(insignia.id_insignia);


  // 3.6 VERIFICAR ELIMINACIÓN
  // Confirma que listarInsignias() retorna vacío después de la eliminación,
  // validando que el DELETE fue efectivo y no quedan registros residuales.
  console.log('\n--- VERIFICAR ELIMINACIÓN ---');
  await listarInsignias(); // Resultado esperado: 📋 Insignias: []


  // ── LIMPIEZA ──────────────────────────────────────────────────────────────
  // Elimina los datos base en orden inverso a su creación para respetar
  // las restricciones de FK: primero los hijos, luego los padres.
  console.log('\n===== LIMPIEZA =====');

  await eliminarTarea(tarea.id_tarea);     // 1. Hijo de Materia y Cuenta
  await eliminarMateria(materia.id_materia); // 2. Hijo de Cuenta
  await eliminarCuenta(cuenta.id_cuenta);  // 3. Raíz del esquema (padre)


  // Cierra la conexión a SQLite de forma ordenada al finalizar el test.
  // Importante para liberar el archivo .sqlite y evitar conexiones colgadas.
  await sequelize.close();
}


// Invoca la función principal de test al ejecutar el script directamente.
// node testInsignia.js
test();