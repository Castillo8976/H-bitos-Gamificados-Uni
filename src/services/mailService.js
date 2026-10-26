'use strict';
const nodemailer = require('nodemailer');
const { configuration } = require('../config/authEmail');
const HttpError = require('../middlewares/httpError');
// Captura explícita de pruebas/desarrollo. Nunca se imprime el contenido.
const mensajes = [];
async function enviar({ to, subject, text }) {
  try {
    if (configuration().transport === 'memoria') {
      mensajes.push({ to, subject, text });
      return;
    }
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      connectionTimeout: 10000, socketTimeout: 10000,
      ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } } : {})
    });
    await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, text });
  } catch (_) {
    // No propagar detalles del proveedor: pueden contener credenciales o el mensaje.
    throw new HttpError(503, 'Servicio de correo no disponible; intenta más tarde');
  }
}
module.exports = { enviar, mensajes };
