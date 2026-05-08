/**
 * @fileoverview Punto de entrada para la inicialización de la base de datos.
 * Este script establece la conexión con SQLite, registra todos los modelos
 * del proyecto y sincroniza las tablas con el esquema definido en Sequelize.
 *
 * Debe ejecutarse una sola vez al arrancar la aplicación (o de forma
 * independiente para verificar la integridad del esquema). El orden de
 * importación de los modelos es relevante: los modelos que definen
 * asociaciones con claves foráneas deben cargarse después de sus modelos
 * padre para que las relaciones queden correctamente registradas.
 *
 * Orden de carga y dependencias:
 * ```
 *   Cuenta            ← raíz del esquema, sin dependencias
 *   Materia           ← depende de Cuenta
 *   Tarea             ← depende de Cuenta y Materia
 *   PreferenciaVisual ← depende de Cuenta (relación 1:1)
 *   SesionEstudio     ← depende de Cuenta y Tarea
 *   Insignia          ← sin dependencias (catálogo global)
 *   CuentaInsignia    ← depende de Cuenta e Insignia (tabla pivote N:M)
 *   Punto             ← depende de Cuenta
 *   Reto              ← depende de Cuenta
 *   Meta              ← depende de Cuenta
 *   Recordatorio      ← depende de Cuenta y Tarea
 *   Reporte           ← depende de Cuenta
 * ```
 *
 * @module syncDatabase
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
 */

const sequelize = require('./database'); // Instancia de conexión Sequelize a SQLite


// ─────────────────────────────────────────
// REGISTRO DE MODELOS
// ─────────────────────────────────────────
// Los require() cargan cada modelo y registran sus definiciones de tabla
// y asociaciones en la instancia de Sequelize. El orden importa:
// cada modelo debe cargarse después de sus dependencias (modelos padre).

require('./models/Cuenta');           // 1. Raíz del esquema: sin dependencias externas
require('./models/Materia');          // 2. Depende de Cuenta (FK: id_cuenta)
require('./models/Tarea');            // 3. Depende de Cuenta y Materia (FK: id_cuenta, id_materia)
require('./models/PreferenciaVisual');// 4. Depende de Cuenta — relación 1:1 (FK: id_cuenta UNIQUE)
require('./models/SesionEstudio');    // 5. Depende de Cuenta y Tarea (FK: id_cuenta, id_tarea)
require('./models/Insignia');         // 6. Catálogo global: sin FK a otros modelos
require('./models/CuentaInsignia');   // 7. Tabla pivote N:M — depende de Cuenta e Insignia
require('./models/Punto');            // 8. Depende de Cuenta (FK: id_cuenta)
require('./models/Reto');             // 9. Depende de Cuenta (FK: id_cuenta)
require('./models/Meta');             // 10. Depende de Cuenta (FK: id_cuenta)
require('./models/Recordatorio');     // 11. Depende de Cuenta y Tarea (FK: id_cuenta, id_tarea)
require('./models/Reporte');          // 12. Depende de Cuenta (FK: id_cuenta)


// ─────────────────────────────────────────
// INICIALIZACIÓN
// ─────────────────────────────────────────

/**
 * Inicializa la conexión a la base de datos y sincroniza el esquema.
 *
 * Ejecuta dos operaciones en secuencia:
 * 1. `sequelize.authenticate()` — verifica que la conexión a SQLite sea válida.
 * 2. `sequelize.sync({ force: false })` — crea las tablas que no existen;
 *    respeta las tablas y datos existentes sin borrarlos ni modificarlos.
 *
 * Opciones de `sync` disponibles según el entorno:
 * ```
 *   { force: false }  → PRODUCCIÓN/DESARROLLO: crea tablas nuevas, conserva datos
 *   { force: true }   → REINICIO TOTAL: elimina y recrea TODAS las tablas (⚠️ borra datos)
 *   { alter: true }   → MIGRACIÓN SUAVE: intenta ajustar columnas existentes sin borrar datos
 * ```
 *
 * @async
 * @function iniciar
 * @returns {Promise<void>}
 *
 * @example
 * // Ejecución directa del script
 * node syncDatabase.js
 * // ✅ Conexión a SQLite exitosa
 * // ✅ Tablas sincronizadas
 */
async function iniciar() {
  try {
    // Verifica que Sequelize puede comunicarse con la base de datos SQLite
    await sequelize.authenticate();
    console.log('✅ Conexión a SQLite exitosa');

    // Sincroniza el esquema: crea tablas faltantes sin afectar las existentes.
    // force: false → modo seguro; nunca elimina datos en producción o desarrollo.
    await sequelize.sync({ force: false });
    console.log('✅ Tablas sincronizadas');

  } catch (error) {
    // Captura errores de conexión (archivo bloqueado, ruta incorrecta)
    // o errores de sincronización (conflicto de esquema, FK inválida)
    console.error('❌ Error:', error.message);
  }
}


// Invoca la función de inicialización al ejecutar el script directamente
iniciar();