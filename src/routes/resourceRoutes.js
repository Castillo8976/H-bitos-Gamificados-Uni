'use strict';

/** Contratos de 13 entidades (RF01–RF15/HU01–HU27; M15).
 * Orden: autenticación, rol, campos permitidos, validadores y controlador.
 * Los permisos visuales no sustituyen la autorización del servidor.
 */

const express = require('express');
const controllers = require('../controllers/resourceControllers');
const asyncHandler = require('../middlewares/asyncHandler');
const { authenticateRequest, authorize } = require('../middlewares/authentication');
const { validateEntityRequest } = require('../validators/entityValidator');
const { requireFields, allowFields, enumField, positiveInteger, nonNegativeInteger, booleanField, nonBlankText } = require('../validators/requestValidator');

const router = express.Router();
const studentOrAdmin = authorize('Estudiante', 'Administrador');
const admin = authorize('Administrador');
const wrap = handler => asyncHandler(handler);

router.use(authenticateRequest);
router.use(validateEntityRequest);

router.get('/cuentas', admin, wrap(controllers.accounts.list));
router.get('/cuentas/:id', studentOrAdmin, wrap(controllers.accounts.get));
router.put('/cuentas/:id', studentOrAdmin, allowFields('nombre', 'correo', 'activa', 'rol'), booleanField('activa'), enumField('rol', ['Estudiante','Administrador','Revisor institucional']), wrap(controllers.accounts.update));
router.delete('/cuentas/:id', studentOrAdmin, wrap(controllers.accounts.deactivate));
router.delete('/cuentas/:id/datos', authorize('Estudiante'), wrap(controllers.accounts.deleteData));

router.get('/materias', studentOrAdmin, wrap(controllers.subjects.list));
router.get('/materias/:id', studentOrAdmin, wrap(controllers.subjects.get));
router.post('/materias', studentOrAdmin, allowFields('id_cuenta', 'nombre', 'horario'), requireFields('nombre'), wrap(controllers.subjects.create));
router.put('/materias/:id', studentOrAdmin, allowFields('nombre', 'horario', 'activa'), booleanField('activa'), wrap(controllers.subjects.update));
router.delete('/materias/:id', studentOrAdmin, wrap(controllers.subjects.remove));

router.get('/tareas', studentOrAdmin, wrap(controllers.tasks.list));
router.get('/tareas/:id', studentOrAdmin, wrap(controllers.tasks.get));
router.post('/tareas', studentOrAdmin, allowFields('id_cuenta', 'id_materia', 'nombre', 'fecha_entrega', 'prioridad'), requireFields('nombre', 'fecha_entrega', 'prioridad'), enumField('prioridad', ['Alta','Media','Baja']), wrap(controllers.tasks.create));
router.put('/tareas/:id', studentOrAdmin, allowFields('id_materia', 'nombre', 'fecha_entrega', 'prioridad', 'estado'), enumField('prioridad', ['Alta','Media','Baja']), enumField('estado', ['Pendiente','En progreso','Completada']), wrap(controllers.tasks.update));
router.patch('/tareas/:id/completar', authorize('Estudiante'), wrap(controllers.tasks.complete));
router.delete('/tareas/:id', studentOrAdmin, wrap(controllers.tasks.remove));

router.get('/preferencias', studentOrAdmin, wrap(controllers.preferences.get));
router.put('/preferencias', studentOrAdmin, allowFields('tema', 'modo_oscuro', 'avatar', 'notificaciones_recordatorios', 'notificaciones_retos'), enumField('tema', ['purple','teal','amber','coral','blue','green']), booleanField('modo_oscuro'), booleanField('notificaciones_recordatorios'), booleanField('notificaciones_retos'), wrap(controllers.preferences.update));

router.get('/sesiones', studentOrAdmin, wrap(controllers.sessions.list));
router.get('/sesiones/:id', studentOrAdmin, wrap(controllers.sessions.get));
router.post('/sesiones', authorize('Estudiante'), allowFields('id_tarea','duracion_minutos','modo_enfoque'), requireFields('duracion_minutos'), positiveInteger('duracion_minutos'), booleanField('modo_enfoque'), wrap(controllers.sessions.create));
router.put('/sesiones/:id', studentOrAdmin, allowFields('id_tarea','duracion_minutos','modo_enfoque'), positiveInteger('duracion_minutos'), booleanField('modo_enfoque'), wrap(controllers.sessions.update));
router.delete('/sesiones/:id', studentOrAdmin, wrap(controllers.sessions.remove));

router.get('/recordatorios', studentOrAdmin, wrap(controllers.reminders.list));
router.get('/recordatorios/:id', studentOrAdmin, wrap(controllers.reminders.get));
router.post('/recordatorios', studentOrAdmin, allowFields('id_cuenta','id_tarea','fecha_programada','mensaje'), requireFields('id_tarea','fecha_programada','mensaje'), wrap(controllers.reminders.create));
router.patch('/recordatorios/:id', studentOrAdmin, allowFields('activo'), requireFields('activo'), booleanField('activo'), wrap(controllers.reminders.update));
router.delete('/recordatorios/:id', studentOrAdmin, wrap(controllers.reminders.remove));

router.get('/notificaciones', studentOrAdmin, wrap(controllers.notifications.list));
router.post('/notificaciones', admin, allowFields('id_cuenta','tipo','mensaje'), requireFields('id_cuenta','tipo','mensaje'), enumField('tipo', ['Insignia','Reto','Meta','Nivel','Sistema']), wrap(controllers.notifications.create));
router.patch('/notificaciones/leidas', studentOrAdmin, wrap(controllers.notifications.markAllRead));
router.patch('/notificaciones/:id/leida', studentOrAdmin, wrap(controllers.notifications.markRead));
router.delete('/notificaciones/:id', studentOrAdmin, wrap(controllers.notifications.remove));

router.get('/puntos', studentOrAdmin, wrap(controllers.points.list));
router.get('/puntos/:id', studentOrAdmin, wrap(controllers.points.get));
router.post('/puntos', admin, allowFields('id_cuenta','cantidad','origen','id_origen','motivo'), requireFields('id_cuenta','cantidad','origen','motivo'), positiveInteger('cantidad'), enumField('origen', ['Tarea','Reto','Sesion']), nonBlankText('motivo'), wrap(controllers.points.create));
router.delete('/puntos/:id', admin, allowFields('motivo'), requireFields('motivo'), nonBlankText('motivo'), wrap(controllers.points.remove));

router.get('/insignias', wrap(controllers.badges.list));
router.get('/insignias/:id', wrap(controllers.badges.get));
router.post('/insignias', admin, allowFields('nombre','descripcion','condicion','icono'), requireFields('nombre','descripcion','condicion'), wrap(controllers.badges.create));
router.put('/insignias/:id', admin, allowFields('nombre','descripcion','condicion','icono'), wrap(controllers.badges.update));
router.delete('/insignias/:id', admin, wrap(controllers.badges.remove));

router.get('/cuenta-insignias', studentOrAdmin, wrap(controllers.accountBadges.list));
router.post('/cuenta-insignias', admin, allowFields('id_cuenta','id_insignia','motivo'), requireFields('id_cuenta','id_insignia','motivo'), nonBlankText('motivo'), wrap(controllers.accountBadges.create));
router.delete('/cuenta-insignias/:id_cuenta/:id_insignia', admin, allowFields('motivo'), requireFields('motivo'), nonBlankText('motivo'), wrap(controllers.accountBadges.remove));

router.get('/niveles', wrap(controllers.levels.list));
router.get('/niveles/:id', wrap(controllers.levels.get));
router.post('/niveles', admin, allowFields('nombre','descripcion','puntos_minimos','orden','icono'), requireFields('nombre','descripcion','puntos_minimos','orden'), nonNegativeInteger('puntos_minimos'), positiveInteger('orden'), wrap(controllers.levels.create));
router.put('/niveles/:id', admin, allowFields('nombre','descripcion','puntos_minimos','orden','icono'), nonNegativeInteger('puntos_minimos'), positiveInteger('orden'), wrap(controllers.levels.update));
router.delete('/niveles/:id', admin, wrap(controllers.levels.remove));

router.get('/retos', studentOrAdmin, wrap(controllers.challenges.list));
router.get('/retos/:id', studentOrAdmin, wrap(controllers.challenges.get));
router.post('/retos', studentOrAdmin, allowFields('id_cuenta','descripcion','condicion','puntos_recompensa','semana'), requireFields('descripcion','condicion','puntos_recompensa','semana'), positiveInteger('puntos_recompensa'), wrap(controllers.challenges.create));
router.put('/retos/:id', studentOrAdmin, allowFields('descripcion','condicion','puntos_recompensa','semana','progreso'), positiveInteger('puntos_recompensa'), nonNegativeInteger('progreso'), wrap(controllers.challenges.update));
router.patch('/retos/:id/completar', studentOrAdmin, wrap(controllers.challenges.complete));
router.delete('/retos/:id', studentOrAdmin, wrap(controllers.challenges.remove));

router.get('/metas', studentOrAdmin, wrap(controllers.goals.list));
router.get('/metas/:id', studentOrAdmin, wrap(controllers.goals.get));
router.post('/metas', studentOrAdmin, allowFields('id_cuenta','semana','descripcion','valor_objetivo'), requireFields('semana','descripcion','valor_objetivo'), positiveInteger('valor_objetivo'), wrap(controllers.goals.create));
router.put('/metas/:id', studentOrAdmin, allowFields('semana','descripcion','valor_objetivo'), positiveInteger('valor_objetivo'), wrap(controllers.goals.update));
router.patch('/metas/:id/progreso', studentOrAdmin, allowFields('incremento'), requireFields('incremento'), positiveInteger('incremento'), wrap(controllers.goals.progress));
router.delete('/metas/:id', studentOrAdmin, wrap(controllers.goals.remove));

module.exports = router;
