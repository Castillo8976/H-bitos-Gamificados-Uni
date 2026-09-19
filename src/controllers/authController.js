'use strict';

const authService = require('../services/authService');

async function register(req, res) {
  const account = await authService.register(req.body);
  res.status(201).json({ cuenta: account });
}

async function login(req, res) {
  res.status(200).json(await authService.authenticate(req.body));
}

async function logout(req, res) {
  authService.revokeToken(req.user);
  res.status(204).send();
}

async function profile(req, res) {
  res.status(200).json({ cuenta: await authService.getProfile(req.user.id) });
}

module.exports = { register, login, logout, profile };
