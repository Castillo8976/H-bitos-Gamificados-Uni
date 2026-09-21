'use strict';
/** RF02/HU02: adapta handlers asíncronos a Express y propaga rechazos a next.
 * Apoyo transversal de las rutas; no captura ni oculta errores de negocio.
 */
module.exports = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
