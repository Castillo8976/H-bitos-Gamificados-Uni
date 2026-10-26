'use strict';

/** RF01/HU01, RF02/HU02 y RF15/HU15: contratos negativos sin modificar la BD.
 * Se prueban los validadores usados por las rutas, incluyendo límites exactos.
 */
const assert = require('node:assert/strict');
const { EntityValidator } = require('../../src/validators/entityValidator');
const { validateRegistration, validateLogin, integerRange, challengeCondition } = require('../../src/validators/requestValidator');
const validator = new EntityValidator();

/** RF02/HU02: cada entrada inválida debe convertirse en un 400 controlado. */
function rechaza(recurso, datos, opciones) {
  assert.throws(() => validator.validar(recurso, datos, opciones), error => error.status === 400);
}

for (const valor of [null, [], 'texto', 4]) rechaza('tareas', valor);
for (const valor of ['', '   ', 123, {}, 'a'.repeat(121)]) rechaza('tareas', { nombre: valor });
assert.equal(validator.validar('tareas', { nombre: 'a'.repeat(120) }).nombre.length, 120);
for (const nombre of ['A', 'Juan123', "Ana!"]) rechaza('cuentas', { nombre });
assert.equal(validator.validar('cuentas', { nombre: "María O'Neil-Gómez" }).nombre, "María O'Neil-Gómez");
rechaza('retos', { puntos_recompensa: 0 });
rechaza('retos', { puntos_recompensa: 10001 });
assert.equal(validator.validar('retos', { puntos_recompensa: 10000 }).puntos_recompensa, 10000);
rechaza('metas', { valor_objetivo: 10081 });
assert.equal(validator.validar('metas', { valor_objetivo: 10080 }).valor_objetivo, 10080);
rechaza('sesiones', { duracion_minutos: 1441 });
assert.equal(validator.validar('sesiones', { duracion_minutos: 1440 }).duracion_minutos, 1440);
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
const registro = { nombre: 'Estudiante', correo: 'uno@ejemplo.com', contrasena: 'Segura123!', materia: { id_catalogo_materia: 'catalogo-prueba' } };
assert.equal(ejecutar(validateRegistration, { ...registro }), undefined);
for (const nombre of ['A', 'Nombre1', 'Nombre!']) {
  assert.equal(ejecutar(validateRegistration, { ...registro, nombre }).status, 400);
}
assert.equal(ejecutar(validateRegistration, { ...registro, nombre: "María O'Neil-Gómez" }), undefined);
for (const contrasena of [12345678, {}, 'á'.repeat(37), 'a'.repeat(73), 'corta']) {
  assert.equal(ejecutar(validateRegistration, { ...registro, contrasena }).status, 400);
}
assert.equal(ejecutar(validateRegistration, { ...registro, contrasena: '12345678' }), undefined);
assert.equal(ejecutar(validateRegistration, { ...registro, materia: { nombre: 'Materia', rol: 'Administrador' } }).status, 400);
assert.equal(ejecutar(validateRegistration, { ...registro, rol: 'Administrador' }).status, 400);
assert.equal(ejecutar(validateLogin, { correo: ['uno@ejemplo.com'], contrasena: 'Segura123!' }).status, 400);
assert.equal(ejecutar(validateLogin, { correo: 'uno@ejemplo.com', contrasena: {} }).status, 400);

/** RF01/HU01 (E7): nombre de cuenta de 2 a 60 caracteres con letras Unicode, espacios, apóstrofo y guion. */
for (const nombre of ['Al', 'José Ñandú', "O'Brien-Pérez", 'D’Alembert', 'Zoë Ângela', 'á'.repeat(60), '  Ana  ']) {
  assert.ok(validator.validar('cuentas', { nombre }).nombre, `debería aceptar ${nombre}`);
}
assert.equal(validator.validar('cuentas', { nombre: '  Ana  ' }).nombre, 'Ana');
for (const nombre of ['A', ' A ', 'a'.repeat(61), 'Ana2', 'Ana_Mar', 'Ana.', '<script>', 'Ana😀', 'Ana\tMar', '', '   ', 42, ['Ana']]) {
  rechaza('cuentas', { nombre });
}
assert.match(ejecutar(validateRegistration, { ...registro, nombre: 'R2-D2' }).message, /entre 2 y 60 caracteres/);

/** RF01/HU01: límites exactos de correo (100), contraseña (8 caracteres a 72 bytes), selección de catálogo y horario (100). */
const correo100 = `${'a'.repeat(88)}@ejemplo.com`;
assert.equal(correo100.length, 100);
assert.equal(ejecutar(validateRegistration, { ...registro, correo: correo100 }), undefined);
assert.equal(ejecutar(validateRegistration, { ...registro, correo: `a${correo100}` }).status, 400);
for (const contrasena of ['12345678', 'a'.repeat(72), 'á'.repeat(36)]) {
  assert.equal(ejecutar(validateRegistration, { ...registro, contrasena }), undefined);
}
assert.match(ejecutar(validateRegistration, { ...registro, contrasena: '1234567' }).message, /La contraseña debe tener mínimo 8 caracteres/);
assert.equal(ejecutar(validateRegistration, { ...registro, materia: { id_catalogo_materia: 'catalogo-prueba', horario: 'h'.repeat(100) } }), undefined);
for (const materia of [{ id_catalogo_materia: 'catalogo-prueba', nombre: 'Texto libre' }, { id_catalogo_materia: 'catalogo-prueba', extra: true }, {}, { id_catalogo_materia: null }, { id_catalogo_materia: 42 }, { id_catalogo_materia: '' }, { nombre: 'm'.repeat(81) }, { id_catalogo_materia: 'catalogo-prueba', horario: 'h'.repeat(101) }, { nombre: '   ' }, { nombre: 7 }]) {
  const error = ejecutar(validateRegistration, { ...registro, materia });
  assert.equal(error.status, 400);
}
assert.match(ejecutar(validateRegistration, { ...registro, materia: { nombre: 'm'.repeat(81) } }).message, /^Materia inicial: /);
assert.equal(ejecutar(validateRegistration, { ...registro, materia: { id_catalogo_materia: 'catalogo-prueba', horario: null } }), undefined);
for (const faltante of ['nombre', 'correo', 'contrasena', 'materia']) {
  const { [faltante]: _omitido, ...incompleto } = registro;
  assert.equal(ejecutar(validateRegistration, incompleto).status, 400);
}
for (const body of [null, [], 'texto']) assert.equal(ejecutar(validateRegistration, body).status, 400);

/** RNF-16 (E7): límites exactos de recompensa, objetivo semanal y duración de sesión. */
for (const [campo, maximo] of [['puntos_recompensa', 10000], ['valor_objetivo', 10080], ['duracion_minutos', 1440]]) {
  const middleware = integerRange(campo, 1, maximo);
  for (const valor of [1, maximo]) assert.equal(ejecutar(middleware, { [campo]: valor }), undefined);
  for (const valor of [0, maximo + 1, -1, 1.5, '10', null]) assert.equal(ejecutar(middleware, { [campo]: valor }).status, 400);
  assert.equal(ejecutar(middleware, {}), undefined, 'un campo ausente no se valida');
}
assert.match(ejecutar(integerRange('puntos_recompensa', 1, 10000), { puntos_recompensa: 10001 }).message, /entre 1 y 10\.000/);

/** RF06/RN24: condición `metrica:objetivo` al crear o cambiarla. */
for (const condicion of ['tareas:1', 'sesiones:3', 'pomodoros:4', 'minutos:120', ' tareas:5 ', `tareas:${Number.MAX_SAFE_INTEGER}`]) {
  assert.equal(ejecutar(challengeCondition, { condicion }), undefined);
}
for (const condicion of ['api >= 1', 'tareas:0', 'tareas:', 'horas:2', 'TAREAS:2', 'tareas:2;x', 'tareas:99999999999999999999', 5, null]) {
  assert.equal(ejecutar(challengeCondition, { condicion }).status, 400);
}
assert.equal(ejecutar(challengeCondition, { descripcion: 'sin condición' }), undefined);
console.log('✅ RF01/RF02/RF15: tipos, fechas, tamaños, semanas, nombre (E7) y credenciales validados');
console.log('✅ RNF-16 y RN24: límites y formato de condición validados');
