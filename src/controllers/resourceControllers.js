'use strict';

const HttpError = require('../middlewares/httpError');
const authService = require('../services/authService');
const cuenta = require('../services/cuentaService');
const materia = require('../services/materiaService');
const tarea = require('../services/tareaService');
const preferencia = require('../services/preferenciaVisualService');
const sesion = require('../services/sesionEstudioService');
const recordatorio = require('../services/recordatorioService');
const notificacion = require('../services/notificacionService');
const punto = require('../services/puntoService');
const insignia = require('../services/insigniaService');
const cuentaInsignia = require('../services/cuentaInsigniaService');
const nivel = require('../services/nivelCuentaService');
const reto = require('../services/retoService');
const meta = require('../services/metaService');

function isAdmin(user) {
  return user.rol === 'Administrador';
}

function accountId(req) {
  if (isAdmin(req.user) && req.body.id_cuenta) return req.body.id_cuenta;
  return req.user.id;
}

function ensureOwned(record, user) {
  if (!record) throw new HttpError(404, 'Registro no encontrado');
  if (!isAdmin(user) && record.id_cuenta !== user.id) {
    throw new HttpError(403, 'No puede acceder a información de otra cuenta');
  }
  return record;
}

async function updated(getter, id, updater, data) {
  await updater(id, data);
  const record = await getter(id);
  if (!record) throw new HttpError(404, 'Registro no encontrado');
  return record;
}

const accounts = {
  list: async (_req, res) => res.json({ datos: (await cuenta.listarCuentas()).map(authService.safeAccount) }),
  get: async (req, res) => {
    if (!isAdmin(req.user) && req.params.id !== req.user.id) throw new HttpError(403, 'No puede consultar otra cuenta');
    const record = await cuenta.obtenerCuenta(req.params.id);
    if (!record) throw new HttpError(404, 'Cuenta no encontrada');
    res.json({ dato: authService.safeAccount(record) });
  },
  update: async (req, res) => {
    if (!isAdmin(req.user) && req.params.id !== req.user.id) throw new HttpError(403, 'No puede actualizar otra cuenta');
    const allowed = isAdmin(req.user) ? ['nombre', 'correo', 'activa', 'rol'] : ['nombre', 'correo'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(data).length) throw new HttpError(400, 'No hay campos permitidos para actualizar');
    res.json({ dato: authService.safeAccount(await updated(cuenta.obtenerCuenta, req.params.id, cuenta.actualizarCuenta, data)) });
  },
  deactivate: async (req, res) => {
    if (!isAdmin(req.user) && req.params.id !== req.user.id) throw new HttpError(403, 'No puede desactivar otra cuenta');
    await cuenta.actualizarCuenta(req.params.id, { activa: false });
    res.status(204).send();
  }
};

const subjects = {
  list: async (req, res) => res.json({ datos: await materia.listarMaterias(req.user.id) }),
  get: async (req, res) => res.json({ dato: ensureOwned(await materia.obtenerMateria(req.params.id), req.user) }),
  create: async (req, res) => res.status(201).json({ dato: await materia.crearMateria(accountId(req), req.body.nombre, req.body.horario) }),
  update: async (req, res) => {
    ensureOwned(await materia.obtenerMateria(req.params.id), req.user);
    res.json({ dato: await updated(materia.obtenerMateria, req.params.id, materia.actualizarMateria, req.body) });
  },
  remove: async (req, res) => {
    ensureOwned(await materia.obtenerMateria(req.params.id), req.user);
    await materia.eliminarMateria(req.params.id); res.status(204).send();
  }
};

const tasks = {
  list: async (req, res) => res.json({ datos: await tarea.listarTareas(req.user.id) }),
  get: async (req, res) => res.json({ dato: ensureOwned(await tarea.obtenerTarea(req.params.id), req.user) }),
  create: async (req, res) => {
    if (req.body.id_materia) ensureOwned(await materia.obtenerMateria(req.body.id_materia), req.user);
    res.status(201).json({ dato: await tarea.crearTarea(accountId(req), req.body.nombre, req.body.fecha_entrega, req.body.prioridad, req.body.id_materia || null) });
  },
  update: async (req, res) => {
    ensureOwned(await tarea.obtenerTarea(req.params.id), req.user);
    if (req.body.id_materia) ensureOwned(await materia.obtenerMateria(req.body.id_materia), req.user);
    res.json({ dato: await updated(tarea.obtenerTarea, req.params.id, tarea.actualizarTarea, req.body) });
  },
  complete: async (req, res) => {
    ensureOwned(await tarea.obtenerTarea(req.params.id), req.user);
    await tarea.completarTarea(req.params.id); res.json({ dato: await tarea.obtenerTarea(req.params.id) });
  },
  remove: async (req, res) => {
    ensureOwned(await tarea.obtenerTarea(req.params.id), req.user);
    await tarea.eliminarTarea(req.params.id); res.status(204).send();
  }
};

const preferences = {
  get: async (req, res) => res.json({ dato: await preferencia.obtenerOCrearPreferenciaVisual(req.user.id) }),
  update: async (req, res) => {
    await preferencia.obtenerOCrearPreferenciaVisual(req.user.id);
    await preferencia.actualizarPreferenciaVisual(req.user.id, req.body);
    res.json({ dato: await preferencia.obtenerPreferenciaVisual(req.user.id) });
  }
};

const sessions = {
  list: async (req, res) => res.json({ datos: await sesion.listarSesionesEstudio(req.user.id) }),
  get: async (req, res) => res.json({ dato: ensureOwned(await sesion.obtenerSesionEstudio(req.params.id), req.user) }),
  create: async (req, res) => {
    if (req.body.id_tarea) ensureOwned(await tarea.obtenerTarea(req.body.id_tarea), req.user);
    res.status(201).json({ dato: await sesion.crearSesionEstudio(accountId(req), req.body.duracion_minutos, req.body.modo_enfoque, req.body.id_tarea || null) });
  },
  update: async (req, res) => {
    ensureOwned(await sesion.obtenerSesionEstudio(req.params.id), req.user);
    if (req.body.id_tarea) ensureOwned(await tarea.obtenerTarea(req.body.id_tarea), req.user);
    res.json({ dato: await updated(sesion.obtenerSesionEstudio, req.params.id, sesion.actualizarSesionEstudio, req.body) });
  },
  remove: async (req, res) => {
    ensureOwned(await sesion.obtenerSesionEstudio(req.params.id), req.user);
    await sesion.eliminarSesionEstudio(req.params.id); res.status(204).send();
  }
};

const reminders = {
  list: async (req, res) => res.json({ datos: await recordatorio.listarRecordatorios(req.user.id) }),
  get: async (req, res) => res.json({ dato: ensureOwned(await recordatorio.obtenerRecordatorio(req.params.id), req.user) }),
  create: async (req, res) => {
    ensureOwned(await tarea.obtenerTarea(req.body.id_tarea), req.user);
    res.status(201).json({ dato: await recordatorio.crearRecordatorio(req.body.id_tarea, accountId(req), req.body.fecha_programada, req.body.mensaje) });
  },
  update: async (req, res) => {
    ensureOwned(await recordatorio.obtenerRecordatorio(req.params.id), req.user);
    await recordatorio.toggleRecordatorio(req.params.id, req.body.activo);
    res.json({ dato: await recordatorio.obtenerRecordatorio(req.params.id) });
  },
  remove: async (req, res) => {
    ensureOwned(await recordatorio.obtenerRecordatorio(req.params.id), req.user);
    await recordatorio.eliminarRecordatorio(req.params.id); res.status(204).send();
  }
};

const notifications = {
  list: async (req, res) => res.json({ datos: await notificacion.listarNotificaciones(req.user.id, req.query.no_leidas === 'true' ? true : null) }),
  create: async (req, res) => res.status(201).json({ dato: await notificacion.crearNotificacion(accountId(req), req.body.tipo, req.body.mensaje) }),
  markRead: async (req, res) => {
    const records = await notificacion.listarNotificaciones(req.user.id);
    if (!records.some(item => item.id_notificacion === req.params.id) && !isAdmin(req.user)) throw new HttpError(403, 'No puede modificar otra notificación');
    await notificacion.marcarNotificacionLeida(req.params.id); res.status(204).send();
  },
  markAllRead: async (req, res) => { await notificacion.marcarTodasLeidas(req.user.id); res.status(204).send(); },
  remove: async (req, res) => {
    const records = await notificacion.listarNotificaciones(req.user.id);
    if (!records.some(item => item.id_notificacion === req.params.id) && !isAdmin(req.user)) throw new HttpError(403, 'No puede eliminar otra notificación');
    await notificacion.eliminarNotificacion(req.params.id); res.status(204).send();
  }
};

const points = {
  list: async (req, res) => res.json({ datos: await punto.listarPuntos(req.user.id), total: await punto.calcularTotalPuntos(req.user.id) }),
  get: async (req, res) => res.json({ dato: ensureOwned(await punto.obtenerPunto(req.params.id), req.user) }),
  create: async (req, res) => res.status(201).json({ dato: await punto.otorgarPuntos(req.body.id_cuenta, req.body.cantidad, req.body.origen, req.body.id_origen || null) }),
  remove: async (req, res) => { await punto.eliminarPunto(req.params.id); res.status(204).send(); }
};

const badges = {
  list: async (_req, res) => res.json({ datos: await insignia.listarInsignias() }),
  get: async (req, res) => {
    const record = await insignia.obtenerInsignia(req.params.id); if (!record) throw new HttpError(404, 'Insignia no encontrada'); res.json({ dato: record });
  },
  create: async (req, res) => res.status(201).json({ dato: await insignia.crearInsignia(req.body.nombre, req.body.descripcion, req.body.condicion, req.body.icono || null) }),
  update: async (req, res) => res.json({ dato: await updated(insignia.obtenerInsignia, req.params.id, insignia.actualizarInsignia, req.body) }),
  remove: async (req, res) => { await insignia.eliminarInsignia(req.params.id); res.status(204).send(); }
};

const accountBadges = {
  list: async (req, res) => {
    const target = isAdmin(req.user) && req.query.id_cuenta ? req.query.id_cuenta : req.user.id;
    res.json({ datos: await cuentaInsignia.listarInsigniasDesbloqueadas(target) });
  },
  create: async (req, res) => res.status(201).json(await cuentaInsignia.desbloquearInsignia(req.body.id_cuenta, req.body.id_insignia)),
  remove: async (req, res) => { await cuentaInsignia.revocarInsignia(req.params.id_cuenta, req.params.id_insignia); res.status(204).send(); }
};

const levels = {
  list: async (_req, res) => res.json({ datos: await nivel.listarNiveles() }),
  get: async (req, res) => {
    const record = await nivel.obtenerNivel(req.params.id); if (!record) throw new HttpError(404, 'Nivel no encontrado'); res.json({ dato: record });
  },
  create: async (req, res) => res.status(201).json({ dato: await nivel.crearNivel(req.body.nombre, req.body.descripcion, req.body.puntos_minimos, req.body.orden, req.body.icono || null) }),
  update: async (req, res) => res.json({ dato: await updated(nivel.obtenerNivel, req.params.id, nivel.actualizarNivel, req.body) }),
  remove: async (req, res) => { await nivel.eliminarNivel(req.params.id); res.status(204).send(); }
};

const challenges = {
  list: async (req, res) => res.json({ datos: await reto.listarRetos(req.user.id, req.query.semana || null) }),
  get: async (req, res) => res.json({ dato: ensureOwned(await reto.obtenerReto(req.params.id), req.user) }),
  create: async (req, res) => res.status(201).json({ dato: await reto.crearReto(accountId(req), req.body.descripcion, req.body.condicion, req.body.puntos_recompensa, req.body.semana) }),
  update: async (req, res) => {
    ensureOwned(await reto.obtenerReto(req.params.id), req.user);
    res.json({ dato: await updated(reto.obtenerReto, req.params.id, reto.actualizarReto, req.body) });
  },
  complete: async (req, res) => {
    ensureOwned(await reto.obtenerReto(req.params.id), req.user);
    await reto.completarReto(req.params.id); res.json({ dato: await reto.obtenerReto(req.params.id) });
  },
  remove: async (req, res) => {
    ensureOwned(await reto.obtenerReto(req.params.id), req.user);
    await reto.eliminarReto(req.params.id); res.status(204).send();
  }
};

const goals = {
  list: async (req, res) => res.json({ datos: await meta.listarMetas(req.user.id, req.query.semana || null) }),
  get: async (req, res) => res.json({ dato: ensureOwned(await meta.obtenerMeta(req.params.id), req.user) }),
  create: async (req, res) => res.status(201).json({ dato: await meta.crearMeta(accountId(req), req.body.semana, req.body.descripcion, req.body.valor_objetivo) }),
  update: async (req, res) => {
    ensureOwned(await meta.obtenerMeta(req.params.id), req.user);
    res.json({ dato: await updated(meta.obtenerMeta, req.params.id, meta.actualizarMeta, req.body) });
  },
  progress: async (req, res) => {
    ensureOwned(await meta.obtenerMeta(req.params.id), req.user);
    await meta.actualizarProgresoMeta(req.params.id, req.body.incremento); res.json({ dato: await meta.obtenerMeta(req.params.id) });
  },
  remove: async (req, res) => {
    ensureOwned(await meta.obtenerMeta(req.params.id), req.user);
    await meta.eliminarMeta(req.params.id); res.status(204).send();
  }
};

module.exports = { accounts, subjects, tasks, preferences, sessions, reminders, notifications, points, badges, accountBadges, levels, challenges, goals };
