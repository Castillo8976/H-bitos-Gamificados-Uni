'use strict';

/** RF02/HU02: error HTTP explícito compartido por validadores y servicios. */
class HttpError extends Error {
  /** Conserva estado, mensaje y detalles para errorHandler; apoyo RF02/HU02. */
  constructor(status, message, details = undefined) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

module.exports = HttpError;
