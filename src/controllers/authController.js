'use strict';

const authService = require('../services/authService');
const desafios = require('../services/desafioAutenticacionService');
const { configuration } = require('../config/authEmail');

/** RF01/HU01: registra cuenta, preferencias y materia a través del servicio; responde 201. */
async function register(req, res) {
  const account = await authService.register(req.body);
  if (configuration().verificacion_correo) {
    return res.status(201).json({ requiere_verificacion: true, ...await desafios.crear(account, 'verificar_correo') });
  }
  res.status(201).json({ cuenta: account });
}

/** RF01/HU01: entrega token y perfil público tras verificar credenciales. */
async function login(req, res) {
  const resultado = await authService.authenticate(req.body, req.ip);
  res.status(resultado.requiere_verificacion ? 403 : 200).json(resultado);
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

const configuracion = (_req, res) => {
  const config = configuration();
  res.json({ verificacion_correo: config.verificacion_correo, segundo_factor: config.segundo_factor, reenvio_segundos: config.cooldown, caducidad_minutos: config.ttl });
};
/** Bloque D opcional: delega verificación y segundo paso; solo los resultados finales emiten JWT. */
const verificar = async (req, res) => res.json(authService.emitirToken(await desafios.verificarCorreo(req.body.desafio, req.body.codigo, req.body.correo)));
const codigoLogin = async (req, res) => res.json(authService.emitirToken(await desafios.completarLogin(req.body.desafio, req.body.codigo)));
const reenviarCorreo = async (req, res) => res.status(202).json(await desafios.reenviar(req.body, 'verificar_correo'));
const reenviarLogin = async (req, res) => res.status(202).json(await desafios.reenviar(req.body, 'segundo_factor'));
const mfa = async (req, res) => res.json({ cuenta: await desafios.configurarMfa(req.user.id, req.body) });
const cambio = async (req, res) => res.status(202).json(await desafios.cambiarCorreo(req.user.id, req.body));
const confirmarCambio = async (req, res) => res.json(authService.emitirToken(await desafios.confirmarCambio(req.body.desafio, req.body.codigo, req.user.id)));
const recuperar = async (req, res) => res.json({ dato: await desafios.recuperar(req.params.id, req.body) });
module.exports = { register, login, logout, profile, configuracion, verificar, codigoLogin, reenviarCorreo, reenviarLogin, mfa, cambio, confirmarCambio, recuperar };
