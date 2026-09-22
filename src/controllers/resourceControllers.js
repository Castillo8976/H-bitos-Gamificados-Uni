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
const gamificacion = require('../services/gamificacionService');
const correcciones = require('../services/correccionAdministrativaService');

/** RF01/HU27: identifica el rol ya autenticado por el middleware. */
function isAdmin(user) {
  return user.rol === 'Administrador';
}

/** RF01/HU27: permite seleccionar cuenta al administrador; otros usan su ID. */
function accountId(req) {
  if (isAdmin(req.user) && req.body.id_cuenta) return req.body.id_cuenta;
  if (req.body.id_cuenta && req.body.id_cuenta !== req.user.id) {
    throw new HttpError(403, 'No puede crear registros para otra cuenta');
  }
  return req.user.id;
}

/** RF02/HU02 y RN21: una relación siempre une registros de la misma cuenta,
 * incluso cuando un administrador tiene permiso para gestionar ambas cuentas.
 */
function ensureSameAccount(record, idCuenta) {
  if (!record) throw new HttpError(404, 'Registro relacionado no encontrado');
  if (record.id_cuenta !== idCuenta) throw new HttpError(403, 'La relación pertenece a otra cuenta');
  return record;
}

/** RF01/HU20: rechaza registros ausentes o ajenos; permite supervisión administrativa. */
function ensureOwned(record, user) {
  if (!record) throw new HttpError(404, 'Registro no encontrado');
  if (!isAdmin(user) && record.id_cuenta !== user.id) {
    throw new HttpError(403, 'No puede acceder a información de otra cuenta');
  }
  return record;
}

/** RF02/HU19: reutiliza actualización/consulta; devuelve 404 si no hay registro. */
async function updated(getter, id, updater, data) {
  await updater(id, data);
  const record = await getter(id);
  if (!record) throw new HttpError(404, 'Registro no encontrado');
  return record;
}

const accounts = {
  /** RF01/HU20/HU27: Consulta la colección permitida (cuentas). */
  list: async (_req, res) => res.json({ datos: (await cuenta.listarCuentas()).map(authService.safeAccount) }),
  /** RF01/HU20/HU27: Consulta un registro (cuentas). */
  get: async (req, res) => {
    if (!isAdmin(req.user) && req.params.id !== req.user.id) throw new HttpError(403, 'No puede consultar otra cuenta');
    const record = await cuenta.obtenerCuenta(req.params.id);
    if (!record) throw new HttpError(404, 'Cuenta no encontrada');
    res.json({ dato: authService.safeAccount(record) });
  },
  /** RF01/HU20/HU27: Actualiza los campos permitidos por la ruta (cuentas). */
  update: async (req, res) => {
    if (!isAdmin(req.user) && req.params.id !== req.user.id) throw new HttpError(403, 'No puede actualizar otra cuenta');
    if (!isAdmin(req.user) && ['rol', 'activa'].some(key => Object.hasOwn(req.body, key))) {
      throw new HttpError(403, 'Solo el administrador puede cambiar rol o estado de una cuenta');
    }
    const allowed = isAdmin(req.user) ? ['nombre', 'correo', 'activa', 'rol'] : ['nombre', 'correo'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
    if (!Object.keys(data).length) throw new HttpError(400, 'No hay campos permitidos para actualizar');
    res.json({ dato: authService.safeAccount(await updated(cuenta.obtenerCuenta, req.params.id, cuenta.actualizarCuenta, data)) });
  },
  /** RF01/HU20/HU27: Desactiva la cuenta sin borrarla físicamente (cuentas). */
  deactivate: async (req, res) => {
    if (!isAdmin(req.user) && req.params.id !== req.user.id) throw new HttpError(403, 'No puede desactivar otra cuenta');
    await cuenta.actualizarCuenta(req.params.id, { activa: false });
    res.status(204).send();
  }
};

const subjects = {
  /** RF09/HU16: Consulta la colección permitida (materias). */
  list: async (req, res) => res.json({ datos: await materia.listarMaterias(req.user.id) }),
  /** RF09/HU16: Consulta un registro (materias). */
  get: async (req, res) => res.json({ dato: ensureOwned(await materia.obtenerMateria(req.params.id), req.user) }),
  /** RF09/HU16: Crea el registro mediante el servicio (materias). */
  create: async (req, res) => res.status(201).json({ dato: await materia.crearMateria(accountId(req), req.body.nombre, req.body.horario) }),
  /** RF09/HU16: Actualiza los campos permitidos por la ruta (materias). */
  update: async (req, res) => {
    ensureOwned(await materia.obtenerMateria(req.params.id), req.user);
    res.json({ dato: await updated(materia.obtenerMateria, req.params.id, materia.actualizarMateria, req.body) });
  },
  /** RF09/HU16: Elimina el registro mediante el servicio (materias). */
  remove: async (req, res) => {
    ensureOwned(await materia.obtenerMateria(req.params.id), req.user);
    await materia.eliminarMateria(req.params.id); res.status(204).send();
  }
};

const tasks = {
  /** RF02/HU02/HU19: Consulta la colección permitida (tareas). */
  list: async (req, res) => res.json({ datos: await tarea.listarTareas(req.user.id) }),
  /** RF02/HU02/HU19: Consulta un registro (tareas). */
  get: async (req, res) => res.json({ dato: ensureOwned(await tarea.obtenerTarea(req.params.id), req.user) }),
  /** RF02/HU02/HU19: Crea el registro mediante el servicio (tareas). */
  create: async (req, res) => {
    if (req.body.id_materia) ensureSameAccount(await materia.obtenerMateria(req.body.id_materia), accountId(req));
    res.status(201).json({ dato: await tarea.crearTarea(accountId(req), req.body.nombre, req.body.fecha_entrega, req.body.prioridad, req.body.id_materia || null) });
  },
  /** RF02/HU02/HU19: Actualiza los campos permitidos por la ruta (tareas). */
  update: async (req, res) => {
    const actual = ensureOwned(await tarea.obtenerTarea(req.params.id), req.user);
    if (req.body.id_materia) ensureSameAccount(await materia.obtenerMateria(req.body.id_materia), actual.id_cuenta);
    res.json({ dato: await updated(tarea.obtenerTarea, req.params.id, tarea.actualizarTarea, req.body) });
  },
  /** RF02/HU02/HU19: Completa el registro (tareas). */
  complete: async (req, res) => {
    const resultado = await gamificacion.completarTareaConGamificacion(req.user.id, req.params.id);
    res.json({ dato: resultado.tarea, gamificacion: resultado });
  },
  /** RF02/HU02/HU19: Elimina el registro mediante el servicio (tareas). */
  remove: async (req, res) => {
    ensureOwned(await tarea.obtenerTarea(req.params.id), req.user);
    await tarea.eliminarTarea(req.params.id); res.status(204).send();
  }
};

const preferences = {
  /** RF13/HU13: Consulta un registro (preferencias). */
  get: async (req, res) => res.json({ dato: await preferencia.obtenerOCrearPreferenciaVisual(req.user.id) }),
  /** RF13/HU13: Actualiza los campos permitidos por la ruta (preferencias). */
  update: async (req, res) => {
    await preferencia.obtenerOCrearPreferenciaVisual(req.user.id);
    await preferencia.actualizarPreferenciaVisual(req.user.id, req.body);
    res.json({ dato: await preferencia.obtenerPreferenciaVisual(req.user.id) });
  }
};

const sessions = {
  /** RF10/HU10/HU18: Consulta la colección permitida (sesiones). */
  list: async (req, res) => res.json({ datos: await sesion.listarSesionesEstudio(req.user.id) }),
  /** RF10/HU10/HU18: Consulta un registro (sesiones). */
  get: async (req, res) => res.json({ dato: ensureOwned(await sesion.obtenerSesionEstudio(req.params.id), req.user) }),
  /** RF10/HU10/HU18: Crea el registro mediante el servicio (sesiones). */
  create: async (req, res) => {
    const resultado = await gamificacion.registrarSesionConGamificacion(accountId(req), req.body);
    res.status(201).json({ dato: resultado.sesion, gamificacion: resultado });
  },
  /** RF10/HU10/HU18: Actualiza los campos permitidos por la ruta (sesiones). */
  update: async (req, res) => {
    const actual = ensureOwned(await sesion.obtenerSesionEstudio(req.params.id), req.user);
    if (req.body.id_tarea) ensureSameAccount(await tarea.obtenerTarea(req.body.id_tarea), actual.id_cuenta);
    res.json({ dato: await updated(sesion.obtenerSesionEstudio, req.params.id, sesion.actualizarSesionEstudio, req.body) });
  },
  /** RF10/HU10/HU18: Elimina el registro mediante el servicio (sesiones). */
  remove: async (req, res) => {
    ensureOwned(await sesion.obtenerSesionEstudio(req.params.id), req.user);
    await sesion.eliminarSesionEstudio(req.params.id); res.status(204).send();
  }
};

const reminders = {
  /** RF04/HU25: Consulta la colección permitida (recordatorios). */
  list: async (req, res) => res.json({ datos: await recordatorio.listarRecordatorios(req.user.id) }),
  /** RF04/HU25: Consulta un registro (recordatorios). */
  get: async (req, res) => res.json({ dato: ensureOwned(await recordatorio.obtenerRecordatorio(req.params.id), req.user) }),
  /** RF04/HU25: Crea el registro mediante el servicio (recordatorios). */
  create: async (req, res) => {
    ensureSameAccount(await tarea.obtenerTarea(req.body.id_tarea), accountId(req));
    res.status(201).json({ dato: await recordatorio.crearRecordatorio(req.body.id_tarea, accountId(req), req.body.fecha_programada, req.body.mensaje) });
  },
  /** RF04/HU25: Actualiza los campos permitidos por la ruta (recordatorios). */
  update: async (req, res) => {
    ensureOwned(await recordatorio.obtenerRecordatorio(req.params.id), req.user);
    await recordatorio.toggleRecordatorio(req.params.id, req.body.activo);
    res.json({ dato: await recordatorio.obtenerRecordatorio(req.params.id) });
  },
  /** RF04/HU25: Elimina el registro mediante el servicio (recordatorios). */
  remove: async (req, res) => {
    ensureOwned(await recordatorio.obtenerRecordatorio(req.params.id), req.user);
    await recordatorio.eliminarRecordatorio(req.params.id); res.status(204).send();
  }
};

const notifications = {
  /** RF04/HU24: Consulta la colección permitida (notificaciones). */
  list: async (req, res) => res.json({ datos: await notificacion.listarNotificaciones(req.user.id, req.query.no_leidas === 'true' ? true : null) }),
  /** RF04/HU24: Crea el registro mediante el servicio (notificaciones). */
  create: async (req, res) => res.status(201).json({ dato: await notificacion.crearNotificacion(accountId(req), req.body.tipo, req.body.mensaje) }),
  /** RF04/HU24: Marca la notificación como leída (notificaciones). */
  markRead: async (req, res) => {
    const records = await notificacion.listarNotificaciones(req.user.id);
    if (!records.some(item => item.id_notificacion === req.params.id) && !isAdmin(req.user)) throw new HttpError(403, 'No puede modificar otra notificación');
    await notificacion.marcarNotificacionLeida(req.params.id); res.status(204).send();
  },
  /** RF04/HU24: Marca todas las notificaciones propias como leídas (notificaciones). */
  markAllRead: async (req, res) => { await notificacion.marcarTodasLeidas(req.user.id); res.status(204).send(); },
  /** RF04/HU24: Elimina el registro mediante el servicio (notificaciones). */
  remove: async (req, res) => {
    const records = await notificacion.listarNotificaciones(req.user.id);
    if (!records.some(item => item.id_notificacion === req.params.id) && !isAdmin(req.user)) throw new HttpError(403, 'No puede eliminar otra notificación');
    await notificacion.eliminarNotificacion(req.params.id); res.status(204).send();
  }
};

const points = {
  /** RF07/HU07/HU26: Consulta la colección permitida (movimientos de puntos). */
  list: async (req, res) => {
    const target = isAdmin(req.user) && req.query.id_cuenta ? req.query.id_cuenta : req.user.id;
    res.json({ datos: await punto.listarPuntos(target), total: await punto.calcularTotalPuntos(target) });
  },
  /** RF07/HU07/HU26: Consulta un registro (movimientos de puntos). */
  get: async (req, res) => res.json({ dato: ensureOwned(await punto.obtenerPunto(req.params.id), req.user) }),
  /** RF07/HU07/HU26: Crea el registro mediante el servicio (movimientos de puntos). */
  create: async (req, res) => {
    const movimiento = await correcciones.otorgarPuntos(req.user.id, req.body);
    res.status(201).json({ dato: movimiento });
  },
  /** RF07/HU07/HU26: Elimina el registro mediante el servicio (movimientos de puntos). */
  remove: async (req, res) => {
    await correcciones.retirarPuntos(req.user.id, req.params.id, req.body.motivo);
    res.status(204).send();
  }
};

const badges = {
  /** RF05/HU22: Consulta la colección permitida (catálogo de insignias). */
  list: async (_req, res) => res.json({ datos: await insignia.listarInsignias() }),
  /** RF05/HU22: Consulta un registro (catálogo de insignias). */
  get: async (req, res) => {
    const record = await insignia.obtenerInsignia(req.params.id); if (!record) throw new HttpError(404, 'Insignia no encontrada'); res.json({ dato: record });
  },
  /** RF05/HU22: Crea el registro mediante el servicio (catálogo de insignias). */
  create: async (req, res) => res.status(201).json({ dato: await insignia.crearInsignia(req.body.nombre, req.body.descripcion, req.body.condicion, req.body.icono || null) }),
  /** RF05/HU22: Actualiza los campos permitidos por la ruta (catálogo de insignias). */
  update: async (req, res) => res.json({ dato: await updated(insignia.obtenerInsignia, req.params.id, insignia.actualizarInsignia, req.body) }),
  /** RF05/HU22: Elimina el registro mediante el servicio (catálogo de insignias). */
  remove: async (req, res) => { await insignia.eliminarInsignia(req.params.id); res.status(204).send(); }
};

const accountBadges = {
  /** RF05/HU26: Consulta la colección permitida (insignias asignadas). */
  list: async (req, res) => {
    const target = isAdmin(req.user) && req.query.id_cuenta ? req.query.id_cuenta : req.user.id;
    res.json({ datos: await cuentaInsignia.listarInsigniasDesbloqueadas(target) });
  },
  /** RF05/HU26: Crea el registro mediante el servicio (insignias asignadas). */
  create: async (req, res) => {
    const resultado = await correcciones.asignarInsignia(req.user.id, req.body.id_cuenta, req.body.id_insignia, req.body.motivo);
    res.status(201).json(resultado);
  },
  /** RF05/HU26: Elimina el registro mediante el servicio (insignias asignadas). */
  remove: async (req, res) => {
    await correcciones.revocarInsignia(req.user.id, req.params.id_cuenta, req.params.id_insignia, req.body.motivo);
    res.status(204).send();
  }
};

const levels = {
  /** RF07/HU23: Consulta la colección permitida (catálogo de niveles). */
  list: async (_req, res) => res.json({ datos: await nivel.listarNiveles() }),
  /** RF07/HU23: Consulta un registro (catálogo de niveles). */
  get: async (req, res) => {
    const record = await nivel.obtenerNivel(req.params.id); if (!record) throw new HttpError(404, 'Nivel no encontrado'); res.json({ dato: record });
  },
  /** RF07/HU23: Crea el registro mediante el servicio (catálogo de niveles). */
  create: async (req, res) => res.status(201).json({ dato: await nivel.crearNivel(req.body.nombre, req.body.descripcion, req.body.puntos_minimos, req.body.orden, req.body.icono || null) }),
  /** RF07/HU23: Actualiza los campos permitidos por la ruta (catálogo de niveles). */
  update: async (req, res) => res.json({ dato: await updated(nivel.obtenerNivel, req.params.id, nivel.actualizarNivel, req.body) }),
  /** RF07/HU23: Elimina el registro mediante el servicio (catálogo de niveles). */
  remove: async (req, res) => { await nivel.eliminarNivel(req.params.id); res.status(204).send(); }
};

const challenges = {
  /** RF06/HU06: Consulta la colección permitida (retos). */
  list: async (req, res) => {
    const target = isAdmin(req.user) && req.query.id_cuenta ? req.query.id_cuenta : req.user.id;
    res.json({ datos: await reto.listarRetos(target, req.query.semana || null) });
  },
  /** RF06/HU06: Consulta un registro (retos). */
  get: async (req, res) => res.json({ dato: ensureOwned(await reto.obtenerReto(req.params.id), req.user) }),
  /** RF06/HU06: Crea el registro mediante el servicio (retos). */
  create: async (req, res) => res.status(201).json({ dato: await reto.crearReto(accountId(req), req.body.descripcion, req.body.condicion, req.body.puntos_recompensa, req.body.semana) }),
  /** RF06/HU06: Actualiza los campos permitidos por la ruta (retos). */
  update: async (req, res) => {
    ensureOwned(await reto.obtenerReto(req.params.id), req.user);
    res.json({ dato: await updated(reto.obtenerReto, req.params.id, reto.actualizarReto, req.body) });
  },
  /** RF06/HU06: Completa el registro (retos). */
  complete: async (req, res) => {
    ensureOwned(await reto.obtenerReto(req.params.id), req.user);
    await reto.completarReto(req.params.id); res.json({ dato: await reto.obtenerReto(req.params.id) });
  },
  /** RF06/HU06: Elimina el registro mediante el servicio (retos). */
  remove: async (req, res) => {
    ensureOwned(await reto.obtenerReto(req.params.id), req.user);
    await reto.eliminarReto(req.params.id); res.status(204).send();
  }
};

const goals = {
  /** RF15/HU15: Consulta la colección permitida (metas). */
  list: async (req, res) => res.json({ datos: await meta.listarMetas(req.user.id, req.query.semana || null) }),
  /** RF15/HU15: Consulta un registro (metas). */
  get: async (req, res) => res.json({ dato: ensureOwned(await meta.obtenerMeta(req.params.id), req.user) }),
  /** RF15/HU15: Crea el registro mediante el servicio (metas). */
  create: async (req, res) => res.status(201).json({ dato: await meta.crearMeta(accountId(req), req.body.semana, req.body.descripcion, req.body.valor_objetivo) }),
  /** RF15/HU15: Actualiza los campos permitidos por la ruta (metas). */
  update: async (req, res) => {
    ensureOwned(await meta.obtenerMeta(req.params.id), req.user);
    res.json({ dato: await updated(meta.obtenerMeta, req.params.id, meta.actualizarMeta, req.body) });
  },
  /** RF15/HU15: Aplica el incremento de progreso (metas). */
  progress: async (req, res) => {
    ensureOwned(await meta.obtenerMeta(req.params.id), req.user);
    await meta.actualizarProgresoMeta(req.params.id, req.body.incremento); res.json({ dato: await meta.obtenerMeta(req.params.id) });
  },
  /** RF15/HU15: Elimina el registro mediante el servicio (metas). */
  remove: async (req, res) => {
    ensureOwned(await meta.obtenerMeta(req.params.id), req.user);
    await meta.eliminarMeta(req.params.id); res.status(204).send();
  }
};

module.exports = { accounts, subjects, tasks, preferences, sessions, reminders, notifications, points, badges, accountBadges, levels, challenges, goals };
