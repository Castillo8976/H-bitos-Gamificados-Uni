'use strict';

const authService = require('../services/authService');

/** RF01/HU01: registra cuenta, preferencias y materia a través del servicio; responde 201. */
async function register(req, res) {
  const account = await authService.register(req.body);
  res.status(201).json({ cuenta: account });
}

/** RF01/HU01: entrega token y perfil público tras verificar credenciales. */
async function login(req, res) {
  res.status(200).json(await authService.authenticate(req.body));
}

/** RF01/HU01: revoca el identificador de la sesión actual y responde sin contenido. */
async function logout(req, res) {
  authService.revokeToken(req.user);
  res.status(204).send();
}

/** RF01/HU20: consulta el perfil de la cuenta autenticada, nunca un ID del cliente. */
async function profile(req, res) {
  res.status(200).json({ cuenta: await authService.getProfile(req.user.id) });
}

module.exports = { register, login, logout, profile };
