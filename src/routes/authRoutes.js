'use strict';

const express = require('express');
const controller = require('../controllers/authController');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateRequest } = require('../middlewares/authentication');
const { requireFields, validateRegistration, allowFields } = require('../validators/requestValidator');

const router = express.Router();

router.post('/registro', allowFields('nombre', 'correo', 'contrasena', 'materia'), validateRegistration, asyncHandler(controller.register));
router.post('/login', allowFields('correo', 'contrasena'), requireFields('correo', 'contrasena'), asyncHandler(controller.login));
router.post('/logout', authenticateRequest, asyncHandler(controller.logout));
router.get('/perfil', authenticateRequest, asyncHandler(controller.profile));

module.exports = router;
