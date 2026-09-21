'use strict';

/** Rutas de tablero y exportación. Autenticación común y autorización por rol
 * antes de delegar al controlador; los errores asíncronos pasan al middleware.
 * @implements RF11 @implements HU08 @implements HU28
 * @implements RF14 @implements HU14
 */

const express = require('express');
const controller = require('../controllers/progressController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateRequest, authorize } = require('../middlewares/authentication');

const router = express.Router();
router.use(authenticateRequest);

router.get('/estadisticas/semanales', authorize('Estudiante', 'Administrador'), asyncHandler(controller.weekly));
router.get('/estadisticas/institucionales', authorize('Revisor institucional', 'Administrador'), asyncHandler(controller.institutional));
router.get('/exportacion/datos', authorize('Estudiante'), asyncHandler(controller.exportPersonal));

module.exports = router;
