'use strict';

const express = require('express');
const controller = require('../controllers/authController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateRequest } = require('../middlewares/authentication');
const { requireFields, validateRegistration, validateLogin, allowFields, validateEmailAuth } = require('../validators/requestValidator');

const router = express.Router();

router.post('/registro', allowFields('nombre', 'correo', 'contrasena', 'materia'), validateRegistration, asyncHandler(controller.register));
router.post('/login', allowFields('correo', 'contrasena'), requireFields('correo', 'contrasena'), validateLogin, asyncHandler(controller.login));
router.post('/logout', authenticateRequest, asyncHandler(controller.logout));
router.get('/perfil', authenticateRequest, asyncHandler(controller.profile));

router.get('/configuracion', controller.configuracion);
router.post('/correo/verificar', allowFields('desafio', 'codigo'), validateEmailAuth('codigo'), asyncHandler(controller.verificar));
router.post('/correo/reenviar', allowFields('desafio', 'correo'), validateEmailAuth('reenvio'), asyncHandler(controller.reenviarCorreo));
router.post('/login/codigo', allowFields('desafio', 'codigo'), validateEmailAuth('codigo'), asyncHandler(controller.codigoLogin));
router.post('/login/codigo/reenviar', allowFields('desafio'), requireFields('desafio'), validateEmailAuth('reenvio'), asyncHandler(controller.reenviarLogin));
router.post('/mfa', authenticateRequest, allowFields('activar', 'contrasena'), validateEmailAuth('mfa'), asyncHandler(controller.mfa));
router.post('/correo/cambio', authenticateRequest, allowFields('correo_nuevo', 'contrasena'), validateEmailAuth('cambio'), asyncHandler(controller.cambio));
router.post('/correo/cambio/confirmar', authenticateRequest, allowFields('desafio', 'codigo'), validateEmailAuth('codigo'), asyncHandler(controller.confirmarCambio));
module.exports = router;
