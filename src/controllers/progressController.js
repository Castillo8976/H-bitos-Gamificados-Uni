'use strict';

const estadisticasService = require('../services/estadisticasService');
const exportadorDatosService = require('../services/exportadorDatosService');

/** Consulta el periodo de la cuenta autenticada, no un ID enviado por el cliente.
 * @implements RF11 @implements HU08
 */
async function weekly(req, res) {
  const dato = await estadisticasService.obtenerEstadisticasSemana(
    req.user.id, req.query.fecha_inicio, req.query.fecha_fin
  );
  res.json({ dato });
}

/** Devuelve agregados institucionales; el permiso se verifica en progressRoutes.
 * @implements RF11 @implements HU28
 */
async function institutional(req, res) {
  const dato = await estadisticasService.obtenerIndicadoresInstitucionales(
    req.query.fecha_inicio, req.query.fecha_fin
  );
  res.json({ dato });
}

/** Descarga los datos propios en JSON, sin contraseña ni datos de otras cuentas.
 * @implements RF14 @implements HU14
 */
async function exportPersonal(req, res) {
  const datos = await exportadorDatosService.exportarDatosPersonales(req.user.id);
  res.set('Content-Type', 'application/json; charset=utf-8');
  res.set('Content-Disposition', 'attachment; filename="datos.json"');
  res.send(JSON.stringify(datos, null, 2));
}

module.exports = { weekly, institutional, exportPersonal };
