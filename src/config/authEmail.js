'use strict';
const crypto = require('node:crypto');
// Pepper efímero únicamente para desarrollo; en producción es obligatorio configurarlo.
const developmentSecret = crypto.randomBytes(32).toString('hex');
function configuration() {
  const verification = process.env.AUTH_EMAIL_VERIFICATION || 'false';
  const mfa = process.env.AUTH_EMAIL_MFA || 'off';
  if (!['true', 'false'].includes(verification) || !['off', 'optional'].includes(mfa)) {
    throw new Error('AUTH_EMAIL_VERIFICATION debe ser true|false y AUTH_EMAIL_MFA off|optional');
  }
  const integer = (name, fallback, min, max) => {
    const value = Number(process.env[name] ?? fallback);
    if (!Number.isSafeInteger(value) || value < min || value > max) throw new Error(`${name} debe estar entre ${min} y ${max}`);
    return value;
  };
  const active = verification === 'true' || mfa === 'optional';
  const transport = process.env.MAIL_TRANSPORT || 'memoria';
  if (!['smtp', 'memoria'].includes(transport)) throw new Error('MAIL_TRANSPORT debe ser smtp|memoria');
  if (process.env.NODE_ENV === 'production' && active &&
      (transport !== 'smtp' || !process.env.SMTP_HOST || !process.env.MAIL_FROM || !process.env.AUTH_CODE_SECRET)) {
    throw new Error('Autenticación por correo en producción exige MAIL_TRANSPORT=smtp, SMTP_HOST, MAIL_FROM y AUTH_CODE_SECRET');
  }
  return {
    verificacion_correo: verification === 'true', segundo_factor: mfa,
    transport, secret: process.env.AUTH_CODE_SECRET || developmentSecret,
    ttl: integer('AUTH_CODE_TTL_MINUTES', 10, 1, 30),
    attempts: integer('AUTH_CODE_MAX_ATTEMPTS', 5, 1, 100),
    resends: integer('AUTH_CODE_MAX_RESENDS', 3, 0, 100),
    cooldown: integer('AUTH_CODE_RESEND_COOLDOWN_SECONDS', 60, 0, 86400)
  };
}
configuration();
module.exports = { configuration };
