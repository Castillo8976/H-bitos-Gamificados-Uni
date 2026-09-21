'use strict';

/** RF07/HU07 y RF11/HU08: regresión del día UTC de puntos administrativos.
 * Fija instantes a ambos lados de medianoche UTC; no abre ni modifica la BD.
 */
const assert = require('node:assert/strict');
const { mock } = require('node:test');
const Punto = require('../../src/models/Punto');

for (const instante of ['2026-09-20T23:59:00Z', '2026-09-21T03:30:00Z']) {
  mock.timers.enable({ apis: ['Date'], now: new Date(instante) });
  try {
    const punto = Punto.build({
      id_punto: 'prueba-fecha', id_cuenta: 'cuenta-prueba', cantidad: 10, origen: 'Sesion'
    });
    assert.equal(punto.fecha, instante.slice(0, 10));
  } finally {
    mock.timers.reset();
  }
}
console.log('✅ RF07/HU07: puntos administrativos conservan el día UTC');
