/**
 * @fileoverview Configuración y exportación de la instancia de conexión Sequelize.
 * Este módulo crea y exporta una única instancia de Sequelize configurada
 * para trabajar con SQLite como motor de base de datos.
 *
 * Al usar el patrón de módulo de Node.js (singleton por caché de require),
 * esta instancia se comparte en toda la aplicación: cada archivo que haga
 * `require('./database')` recibirá exactamente el mismo objeto Sequelize,
 * garantizando una sola conexión activa durante toda la ejecución.
 *
 * Arquitectura de conexión:
 * ```
 *   app.js / syncDatabase.js
 *          │
 *          ▼
 *     database.js  ← este archivo (instancia única / singleton)
 *          │
 *          ▼
 *     /database.sqlite  (archivo en la raíz del proyecto)
 * ```
 *
 * @module database
 * @requires sequelize
 * @requires path
 */

const { Sequelize } = require('sequelize'); // Constructor principal de Sequelize
const path = require('path');               // Módulo nativo para construir rutas de forma segura


/**
 * Instancia única de Sequelize configurada para SQLite.
 *
 * Opciones de configuración:
 *
 * - `dialect: 'sqlite'`
 *   Motor de base de datos utilizado. SQLite almacena toda la BD en un
 *   único archivo local, ideal para desarrollo, pruebas y aplicaciones
 *   de escritorio sin necesidad de un servidor de BD externo.
 *
 * - `storage: path.join(__dirname, '..', 'database.sqlite')`
 *   Ruta absoluta al archivo SQLite. Se construye con `path.join` para
 *   garantizar compatibilidad entre sistemas operativos (Windows/Linux/macOS).
 *   `__dirname` apunta al directorio de este archivo (ej: `/proyecto/src`),
 *   y `'..'` sube un nivel para ubicar el archivo en la raíz del proyecto:
 *   ```
 *     __dirname              → /proyecto/src
 *     path.join(..., '..')   → /proyecto
 *     archivo resultante     → /proyecto/database.sqlite
 *   ```
 *
 * - `logging: false`
 *   Desactiva la impresión automática de cada consulta SQL en la consola.
 *   En desarrollo puede cambiarse a `logging: console.log` para depurar
 *   las consultas generadas por Sequelize en tiempo real.
 *
 * @type {import('sequelize').Sequelize}
 *
 * @example
 * // Uso en cualquier modelo o script del proyecto
 * const sequelize = require('./database');
 * await sequelize.authenticate(); // verifica la conexión
 * await sequelize.sync();         // sincroniza el esquema
 */
const sequelize = new Sequelize({
  dialect: 'sqlite',  // Motor: SQLite (archivo local, sin servidor externo)

  // Ruta absoluta y multiplataforma al archivo de la base de datos.
  // path.join garantiza separadores correctos en Windows (\) y Unix (/)
  storage: path.join(__dirname, '..', 'database.sqlite'),

  logging: false  // false → silencia las consultas SQL en consola (recomendado en producción)
                  // console.log → muestra cada query generado (útil para depuración)
});


module.exports = sequelize; // Exporta la instancia para ser compartida en toda la aplicación