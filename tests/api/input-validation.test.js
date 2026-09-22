'use strict';

/** RF01/HU01, RF02/HU02 y RF15/HU15: contratos negativos sin modificar la BD.
 * Se prueban los validadores usados por las rutas, incluyendo límites exactos.
 */
const assert = require('node:assert/strict');
const { EntityValidator } = require('../../src/validators/entityValidator');
const { validateRegistration, validateLogin } = require('../../src/validators/requestValidator');
const validator = new EntityValidator();

/** RF02/HU02: cada entrada inválida debe convertirse en un 400 controlado. */
function rechaza(recurso, datos, opciones) {
  assert.throws(() => validator.validar(recurso, datos, opciones), error => error.status === 400);
}

for (const valor of [null, [], 'texto', 4]) rechaza('tareas', valor);
for (const valor of ['', '   ', 123, {}, 'a'.repeat(121)]) rechaza('tareas', { nombre: valor });
assert.equal(validator.validar('tareas', { nombre: 'a'.repeat(120) }).nombre.length, 120);
for (const fecha of ['2026-02-29', '2026-04-31', '21/09/2026', '2026-1-01', 123, null]) {
  rechaza('tareas', { fecha_entrega: fecha });
}
assert.equal(validator.validar('tareas', { fecha_entrega: '2028-02-29' }).fecha_entrega, '2028-02-29');
const opciones = { crear: true, ahora: new Date('2026-09-21T12:00:00Z') };
rechaza('tareas', { fecha_entrega: '2026-09-20' }, opciones);
assert.equal(validator.validar('tareas', { fecha_entrega: '2026-09-21' }, opciones).fecha_entrega, '2026-09-21');
for (const semana of ['2026-W00', '2026-W54', '2025-W53', '2026-39']) rechaza('metas', { semana });
assert.equal(validator.validar('metas', { semana: '2026-W53' }).semana, '2026-W53');
rechaza('sesiones', { duracion_minutos: Number.MAX_SAFE_INTEGER + 1 });
rechaza('preferencias', { modo_oscuro: 'false' });
rechaza('cuentas', { correo: 'sin-correo' });
assert.equal(validator.validar('cuentas', { correo: ' Uno@Ejemplo.com ' }).correo, 'uno@ejemplo.com');
assert.equal(validator.validar('tareas', { id_materia: null }).id_materia, null);
rechaza('notificaciones', { mensaje: 'a'.repeat(201) });
rechaza('niveles', { nombre: 'a'.repeat(61) });

/** RF01/HU01: ejecuta middleware síncrono y devuelve el error recibido por next. */
function ejecutar(middleware, body) {
  let resultado;
  middleware({ body }, {}, error => { resultado = error; });
  return resultado;
}
const registro = { nombre: 'Estudiante', correo: 'uno@ejemplo.com', contrasena: 'Segura123!', materia: { nombre: 'Materia' } };
assert.equal(ejecutar(validateRegistration, { ...registro }), undefined);
for (const contrasena of [12345678, {}, 'á'.repeat(37), 'a'.repeat(73), 'corta']) {
  assert.equal(ejecutar(validateRegistration, { ...registro, contrasena }).status, 400);
}
assert.equal(ejecutar(validateRegistration, { ...registro, materia: { nombre: 'Materia', rol: 'Administrador' } }).status, 400);
assert.equal(ejecutar(validateLogin, { correo: ['uno@ejemplo.com'], contrasena: 'Segura123!' }).status, 400);
assert.equal(ejecutar(validateLogin, { correo: 'uno@ejemplo.com', contrasena: {} }).status, 400);
console.log('✅ RF01/RF02/RF15: tipos, fechas, tamaños, semanas y credenciales validados');
