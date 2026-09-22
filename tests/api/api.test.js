'use strict';

/** RF01–RF15/HU01–HU28: contratos HTTP, permisos por rol y aislamiento.
 * Usa cuentas y SQLite temporales; valida respuestas, datos y rechazos.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const crypto = require('node:crypto');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-api-'));
process.env.DATABASE_STORAGE = path.join(directory, 'database.sqlite');
process.env.JWT_SECRET = 'secreto-exclusivo-de-pruebas-studyquest';

const sequelize = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const app = require('../../src/app');
const Cuenta = require('../../src/models/Cuenta');

const auth = token => ({ Authorization: `Bearer ${token}` });

async function register(data) {
  return request(app).post('/api/auth/registro').send({ materia: { nombre: 'Materia inicial' }, ...data });
}

async function login(correo, contrasena = 'ClaveSegura123!') {
  const response = await request(app).post('/api/auth/login').send({ correo, contrasena });
  return response;
}

async function run() {
  await inicializarEsquema();

  await request(app).get('/api/health').expect(200).expect(({ body }) => assert.equal(body.base_datos, 'sqlite'));

  await request(app).post('/api/auth/registro').send({
    nombre: 'Sin materia', correo: 'sin-materia@test.local', contrasena: 'ClaveSegura123!'
  }).expect(400);
  assert.equal(await Cuenta.count({ where: { correo: 'sin-materia@test.local' } }), 0);

  await request(app).post('/api/auth/registro').send({
    nombre: 'Escalamiento', correo: 'escalamiento@test.local', contrasena: 'ClaveSegura123!',
    rol: 'Administrador', materia: { nombre: 'Materia inicial' }
  }).expect(400);
  assert.equal(await Cuenta.count({ where: { correo: 'escalamiento@test.local' } }), 0);

  const studentRegistration = await register({ nombre: 'Estudiante Uno', correo: 'uno@test.local', contrasena: 'ClaveSegura123!' });
  assert.equal(studentRegistration.status, 201);
  assert.equal(studentRegistration.body.cuenta.rol, 'Estudiante');
  assert.equal('contrasena_hash' in studentRegistration.body.cuenta, false);
  assert.equal((await register({ nombre: 'Duplicado', correo: 'uno@test.local', contrasena: 'ClaveSegura123!' })).status, 409);

  const secondRegistration = await register({ nombre: 'Estudiante Dos', correo: 'dos@test.local', contrasena: 'ClaveSegura123!' });
  assert.equal(secondRegistration.status, 201);
  const inactiveRegistration = await register({ nombre: 'Cuenta Inactiva', correo: 'inactiva@test.local', contrasena: 'ClaveSegura123!' });
  assert.equal(inactiveRegistration.status, 201);

  const adminRegistration = await register({ nombre: 'Administrador', correo: 'admin@test.local', contrasena: 'ClaveSegura123!' });
  await Cuenta.update({ rol: 'Administrador' }, { where: { id_cuenta: adminRegistration.body.cuenta.id_cuenta } });
  const reviewerRegistration = await register({ nombre: 'Revisor', correo: 'revisor@test.local', contrasena: 'ClaveSegura123!' });
  await Cuenta.update({ rol: 'Revisor institucional' }, { where: { id_cuenta: reviewerRegistration.body.cuenta.id_cuenta } });

  const studentLogin = await login('uno@test.local');
  assert.equal(studentLogin.status, 200);
  const studentToken = studentLogin.body.token;
  const secondToken = (await login('dos@test.local')).body.token;
  const adminToken = (await login('admin@test.local')).body.token;
  const reviewerToken = (await login('revisor@test.local')).body.token;

  await request(app).post('/api/auth/login').send({ correo: 'uno@test.local', contrasena: 'Incorrecta!' }).expect(401);
  await request(app).delete(`/api/cuentas/${inactiveRegistration.body.cuenta.id_cuenta}`).set(auth(adminToken)).expect(204);
  assert.equal((await login('inactiva@test.local')).status, 403);
  await request(app).get('/api/materias').expect(401);
  await request(app).get('/api/estadisticas/semanales').expect(401);
  await request(app).get('/api/exportacion/datos').expect(401);
  await request(app).post('/api/insignias').set(auth(studentToken)).send({ nombre: 'No permitido', descripcion: 'X', condicion: 'x' }).expect(403);
  await request(app).post('/api/materias').set(auth(reviewerToken)).send({ nombre: 'No permitido' }).expect(403);

  await request(app).get('/api/auth/perfil').set(auth(studentToken)).expect(200)
    .expect(({ body }) => assert.equal('contrasena_hash' in body.cuenta, false));

  // RF01/HU01 y RF02/HU02: entradas hostiles no llegan al ORM ni producen 500.
  await request(app).post('/api/auth/login').send({ correo: {}, contrasena: 'ClaveSegura123!' }).expect(400);
  await request(app).post('/api/auth/registro').send({
    nombre: 'Inválida', correo: 'invalid@test.local', contrasena: 'á'.repeat(37), materia: { nombre: 'Materia' }
  }).expect(400);
  for (const cambios of [
    { nombre: ' ' }, { nombre: 'a'.repeat(121) }, { nombre: {} },
    { fecha_entrega: '2026-02-29' }, { fecha_entrega: '2000-01-01' }
  ]) {
    await request(app).post('/api/tareas').set(auth(studentToken)).send({
      nombre: 'Rechazar entrada', fecha_entrega: '2027-12-30', prioridad: 'Alta', ...cambios
    }).expect(400);
  }
  await request(app).post('/api/materias').set(auth(studentToken)).send([]).expect(400);
  await request(app).post('/api/sesiones').set(auth(studentToken)).send({ duracion_minutos: Number.MAX_SAFE_INTEGER + 1 }).expect(400);
  await request(app).put('/api/preferencias').set(auth(studentToken)).send({ avatar: 'a'.repeat(51) }).expect(400);
  await request(app).post('/api/metas').set(auth(studentToken)).send({ semana: '2025-W53', descripcion: 'Meta', valor_objetivo: 1 }).expect(400);
  await request(app).get('/api/cuentas').set(auth(adminToken)).expect(200);
  await request(app).put(`/api/cuentas/${studentRegistration.body.cuenta.id_cuenta}`).set(auth(studentToken))
    .send({ nombre: 'Intento de escalada', rol: 'Administrador' }).expect(403);
  await request(app).put(`/api/cuentas/${studentRegistration.body.cuenta.id_cuenta}`).set(auth(studentToken))
    .send({ nombre: 'Estudiante Actualizado' }).expect(200);

  const subject = await request(app).post('/api/materias').set(auth(studentToken))
    .send({ nombre: 'Ingeniería de Software III', horario: 'Sábado' }).expect(201);
  const subjectId = subject.body.dato.id_materia;
  // RN21: el permiso administrativo no autoriza relaciones entre propietarios distintos.
  await request(app).post('/api/tareas').set(auth(adminToken)).send({
    id_cuenta: secondRegistration.body.cuenta.id_cuenta, id_materia: subjectId,
    nombre: 'Relación cruzada', fecha_entrega: '2027-12-31', prioridad: 'Alta'
  }).expect(403);
  await request(app).get('/api/materias').set(auth(studentToken)).expect(200);
  await request(app).get(`/api/materias/${subjectId}`).set(auth(secondToken)).expect(403);
  await request(app).put(`/api/materias/${subjectId}`).set(auth(studentToken)).send({ horario: 'Sábado 08:00' }).expect(200);

  const task = await request(app).post('/api/tareas').set(auth(studentToken)).send({
    id_materia: subjectId, nombre: 'Construir API', fecha_entrega: '2027-12-31', prioridad: 'Alta'
  }).expect(201);
  const taskId = task.body.dato.id_tarea;
  await request(app).get(`/api/tareas/${taskId}`).set(auth(studentToken)).expect(200);
  await request(app).patch(`/api/tareas/${taskId}/completar`).set(auth(secondToken)).expect(404);
  await request(app).put(`/api/tareas/${taskId}`).set(auth(studentToken)).send({ prioridad: 'Media' }).expect(200);
  await request(app).patch(`/api/tareas/${taskId}/completar`).set(auth(studentToken)).expect(200)
    .expect(({ body }) => {
      assert.equal(body.dato.estado, 'Completada');
      assert.equal(body.gamificacion.puntos_otorgados, 10);
    });
  await request(app).patch(`/api/tareas/${taskId}/completar`).set(auth(studentToken)).expect(409);

  await request(app).get('/api/preferencias').set(auth(studentToken)).expect(200);
  await request(app).put('/api/preferencias').set(auth(studentToken)).send({ tema: 'teal', modo_oscuro: true }).expect(200);

  const session = await request(app).post('/api/sesiones').set(auth(studentToken))
    .send({ id_tarea: taskId, duracion_minutos: 25, modo_enfoque: true }).expect(201);
  const sessionId = session.body.dato.id_sesion;
  await request(app).get(`/api/sesiones/${sessionId}`).set(auth(studentToken)).expect(200);
  await request(app).put(`/api/sesiones/${sessionId}`).set(auth(studentToken)).send({ duracion_minutos: 30 }).expect(200);

  const reminder = await request(app).post('/api/recordatorios').set(auth(studentToken)).send({
    id_tarea: taskId, fecha_programada: '2027-12-30', mensaje: 'Entrega próxima'
  }).expect(201);
  const reminderId = reminder.body.dato.id_recordatorio;
  await request(app).get(`/api/recordatorios/${reminderId}`).set(auth(studentToken)).expect(200);
  await request(app).patch(`/api/recordatorios/${reminderId}`).set(auth(studentToken)).send({ activo: false }).expect(200);

  const notification = await request(app).post('/api/notificaciones').set(auth(adminToken)).send({
    id_cuenta: studentRegistration.body.cuenta.id_cuenta, tipo: 'Sistema', mensaje: 'Mensaje de prueba'
  }).expect(201);
  const notificationId = notification.body.dato.id_notificacion;
  await request(app).get('/api/notificaciones').set(auth(studentToken)).expect(200);
  await request(app).patch(`/api/notificaciones/${notificationId}/leida`).set(auth(studentToken)).expect(204);

  const administrativeOrigin = crypto.randomUUID();
  await request(app).post('/api/puntos').set(auth(adminToken)).send({
    id_cuenta: studentRegistration.body.cuenta.id_cuenta, cantidad: 10, origen: 'Sesion', id_origen: administrativeOrigin
  }).expect(400);
  const point = await request(app).post('/api/puntos').set(auth(adminToken)).send({
    id_cuenta: studentRegistration.body.cuenta.id_cuenta, cantidad: 10, origen: 'Sesion',
    id_origen: administrativeOrigin, motivo: 'Ajuste autorizado de prueba'
  }).expect(201);
  const pointId = point.body.dato.id_punto;
  await request(app).get(`/api/puntos/${pointId}`).set(auth(studentToken)).expect(200);
  await request(app).get(`/api/puntos/${pointId}`).set(auth(secondToken)).expect(403);
  await request(app).get('/api/puntos').set(auth(studentToken)).expect(200)
    .expect(({ body }) => assert.equal(body.total, 25));

  const hoy = new Date().toISOString().slice(0, 10);
  await request(app).get(`/api/estadisticas/semanales?fecha_inicio=${hoy}&fecha_fin=${hoy}`)
    .set(auth(studentToken)).expect(200).expect(({ body }) => {
      assert.equal(body.dato.tareas_completadas, 1);
      assert.equal(body.dato.minutos_estudiados, 30);
      assert.equal(body.dato.puntos_obtenidos, 25);
    });
  await request(app).get(`/api/estadisticas/institucionales?fecha_inicio=${hoy}&fecha_fin=${hoy}`)
    .set(auth(studentToken)).expect(403);
  await request(app).get(`/api/estadisticas/institucionales?fecha_inicio=${hoy}&fecha_fin=${hoy}`)
    .set(auth(reviewerToken)).expect(200).expect(({ body }) => {
      assert.equal(body.dato.estudiantes_activos, 2);
      assert.equal('cuentas' in body.dato, false);
    });
  await request(app).get('/api/exportacion/datos').set(auth(reviewerToken)).expect(403);
  await request(app).get('/api/exportacion/datos').set(auth(studentToken)).expect(200)
    .expect('Content-Type', /application\/json/)
    .expect('Content-Disposition', /datos\.json/)
    .expect(({ body }) => {
      assert.deepEqual(Object.keys(body).sort(), [
        'cuenta', 'generado_en', 'insignias', 'materias', 'metas', 'notificaciones',
        'puntos', 'preferencia_visual', 'recordatorios', 'retos', 'sesiones_estudio',
        'tareas', 'version_exportacion'
      ].sort());
      assert.equal(body.cuenta.correo, 'uno@test.local');
      assert.equal('contrasena_hash' in body.cuenta, false);
      assert.ok(body.tareas.every(item => item.id_cuenta === studentRegistration.body.cuenta.id_cuenta));
    });

  const badge = await request(app).post('/api/insignias').set(auth(adminToken)).send({
    nombre: 'API completa', descripcion: 'Completó las pruebas API', condicion: 'api_completa', icono: 'api.svg'
  }).expect(201);
  const badgeId = badge.body.dato.id_insignia;
  await request(app).put(`/api/insignias/${badgeId}`).set(auth(adminToken)).send({ descripcion: 'Descripción actualizada' }).expect(200);
  await request(app).get(`/api/insignias/${badgeId}`).set(auth(studentToken)).expect(200);

  await request(app).post('/api/cuenta-insignias').set(auth(adminToken)).send({
    id_cuenta: studentRegistration.body.cuenta.id_cuenta, id_insignia: badgeId
  }).expect(400);
  await request(app).post('/api/cuenta-insignias').set(auth(adminToken)).send({
    id_cuenta: studentRegistration.body.cuenta.id_cuenta, id_insignia: badgeId,
    motivo: 'Asignación autorizada de prueba'
  }).expect(201);
  await request(app).get('/api/cuenta-insignias').set(auth(studentToken)).expect(200)
    .expect(({ body }) => assert.ok(body.datos.some(item => item.id_insignia === badgeId)));

  const level = await request(app).post('/api/niveles').set(auth(adminToken)).send({
    nombre: 'Leyenda', descripcion: 'Nivel temporal de prueba', puntos_minimos: 2000, orden: 5
  }).expect(201);
  const levelId = level.body.dato.id_nivel;
  await request(app).put(`/api/niveles/${levelId}`).set(auth(adminToken)).send({ descripcion: 'Nivel actualizado' }).expect(200);
  await request(app).get(`/api/niveles/${levelId}`).set(auth(studentToken)).expect(200);

  const challenge = await request(app).post('/api/retos').set(auth(studentToken)).send({
    descripcion: 'Completar API', condicion: 'api >= 1', puntos_recompensa: 20, semana: '2026-W39'
  }).expect(201);
  const challengeId = challenge.body.dato.id_reto;
  await request(app).put(`/api/retos/${challengeId}`).set(auth(studentToken)).send({ progreso: 1 }).expect(200);
  await request(app).patch(`/api/retos/${challengeId}/completar`).set(auth(studentToken)).expect(200);

  const goal = await request(app).post('/api/metas').set(auth(studentToken)).send({
    semana: '2026-W39', descripcion: 'Completar una prueba', valor_objetivo: 1
  }).expect(201);
  const goalId = goal.body.dato.id_meta;
  await request(app).put(`/api/metas/${goalId}`).set(auth(studentToken)).send({ descripcion: 'Meta actualizada' }).expect(200);
  await request(app).patch(`/api/metas/${goalId}/progreso`).set(auth(studentToken)).send({ incremento: 1 }).expect(200)
    .expect(({ body }) => assert.equal(body.dato.cumplida, true));

  await request(app).delete(`/api/metas/${goalId}`).set(auth(studentToken)).expect(204);
  await request(app).delete(`/api/retos/${challengeId}`).set(auth(studentToken)).expect(204);
  await request(app).delete(`/api/niveles/${levelId}`).set(auth(adminToken)).expect(204);
  await request(app).delete(`/api/cuenta-insignias/${studentRegistration.body.cuenta.id_cuenta}/${badgeId}`).set(auth(adminToken)).expect(400);
  await request(app).delete(`/api/cuenta-insignias/${studentRegistration.body.cuenta.id_cuenta}/${badgeId}`).set(auth(adminToken)).send({ motivo: 'Asignación de prueba' }).expect(204);
  await request(app).delete(`/api/insignias/${badgeId}`).set(auth(adminToken)).expect(204);
  await request(app).delete(`/api/puntos/${pointId}`).set(auth(adminToken)).expect(400);
  await request(app).delete(`/api/puntos/${pointId}`).set(auth(adminToken)).send({ motivo: 'Movimiento de prueba' }).expect(204);
  await request(app).delete(`/api/notificaciones/${notificationId}`).set(auth(studentToken)).expect(204);
  await request(app).delete(`/api/recordatorios/${reminderId}`).set(auth(studentToken)).expect(204);
  await request(app).delete(`/api/sesiones/${sessionId}`).set(auth(studentToken)).expect(204);
  await request(app).delete(`/api/tareas/${taskId}`).set(auth(studentToken)).expect(204);
  await request(app).delete(`/api/materias/${subjectId}`).set(auth(studentToken)).expect(204);

  await request(app).post('/api/auth/logout').set(auth(studentToken)).expect(204);
  await request(app).get('/api/auth/perfil').set(auth(studentToken)).expect(401);

  const integrity = await sequelize.query('PRAGMA integrity_check', { type: sequelize.QueryTypes.SELECT });
  const foreignKeys = await sequelize.query('PRAGMA foreign_key_check', { type: sequelize.QueryTypes.SELECT });
  assert.equal(integrity[0].integrity_check, 'ok');
  assert.deepEqual(foreignKeys, []);

  console.log('✅ API MVC: autenticación, roles, aislamiento y CRUD de 13 entidades verificados');
}

(async () => {
  try {
    await run();
  } catch (error) {
    console.error('❌ Falló la prueba de API');
    console.error(error.stack || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
})();
