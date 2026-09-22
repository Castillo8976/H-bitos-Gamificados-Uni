'use strict';

/**
 * Cliente web de StudyQuest.
 *
 * Mantiene la interfaz separada del backend: aquí solo se gestionan eventos,
 * estado visual y solicitudes HTTP. Las reglas de negocio permanecen en los
 * servicios de Node.js y los registros se guardan en SQLite.
 *
 * @implements RF01 Registro, autenticación y perfil.
 * @implements RF02 Gestión de tareas.
 * @implements RF04 Recordatorios y notificaciones.
 * @implements RF05-RF07 Consulta de gamificación.
 * @implements RF08-RF11 Estadísticas personales e institucionales.
 * @implements RF10 Registro de sesiones de estudio.
 * @implements RF13 Preferencias visuales.
 * @implements RF14 Exportación de datos personales.
 */

const API = '/api';
const CLAVE_TOKEN = 'studyquest_token';
const DURACION_POMODORO = 25 * 60;
let temporizadorAvisos = null;
let generacionAvisos = 0;
let avisosConocidos = new Set();

const estado = {
  token: sessionStorage.getItem(CLAVE_TOKEN),
  cuenta: null,
  materias: [], tareas: [], sesiones: [], puntos: [], niveles: [],
  insignias: [], cuentaInsignias: [], retos: [], metas: [],
  recordatorios: [], notificaciones: [], preferencias: null,
  estadisticas: null, institucionales: null, cuentasAdmin: [], retosAdmin: [],
  puntosAdmin: [], insigniasCuentaAdmin: [],
  temporizador: { restante: DURACION_POMODORO, transcurrido: 0, intervalo: null, activo: false }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

/** Escapa texto antes de insertarlo en plantillas HTML. */
/** RF02/HU02: escapa datos al renderizar; apoyo técnico para todos los formularios. */
function escapar(valor = '') {
  return String(valor).replace(/[&<>'"]/g, caracter => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[caracter]);
}

/**
 * Ejecuta una solicitud a la API e incorpora el JWT cuando está disponible.
 * Convierte todos los errores HTTP en mensajes sencillos para la interfaz.
 */
/** RF01/HU01: incorpora el JWT y traduce errores HTTP; compartido por las acciones de M16. */
async function api(ruta, opciones = {}) {
  const encabezados = { ...(opciones.body ? { 'Content-Type': 'application/json' } : {}), ...opciones.headers };
  if (estado.token) encabezados.Authorization = `Bearer ${estado.token}`;
  const respuesta = await fetch(`${API}${ruta}`, { ...opciones, headers: encabezados });
  const contenido = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const error = new Error(contenido?.error || 'No fue posible completar la solicitud');
    error.status = respuesta.status;
    throw error;
  }
  return contenido;
}

/** Presenta confirmaciones y errores sin bloquear la navegación. */
/** RF02/HU02: comunica éxito o fallo de una acción mediante la región de avisos. */
function avisar(mensaje, tipo = 'informacion') {
  const aviso = document.createElement('div');
  aviso.className = `aviso ${tipo}`;
  aviso.textContent = mensaje;
  // Una sola confirmación evita cubrir la interfaz cuando hay acciones rápidas.
  $('#avisos').replaceChildren(aviso);
  window.setTimeout(() => aviso.remove(), 3200);
}

/** Deshabilita temporalmente un formulario para evitar envíos duplicados. */
/** RF02/HU02: deshabilita botones del formulario mientras termina su solicitud. */
async function duranteEnvio(formulario, trabajo) {
  const botones = [...formulario.querySelectorAll('button')];
  botones.forEach(boton => { boton.disabled = true; });
  try { return await trabajo(); }
  finally { botones.forEach(boton => { boton.disabled = false; }); }
}

/** RF01/HU01: presenta login/registro y oculta la aplicación. */
function mostrarAcceso() {
  $('#acceso').hidden = false;
  $('#aplicacion').hidden = true;
}

/** RF01/HU01: muestra la sesión autenticada. */
function mostrarAplicacion() {
  $('#acceso').hidden = true;
  $('#aplicacion').hidden = false;
}

/** Cambia entre las pantallas internas sin recargar el documento. */
/** RF09/HU09: cambia la sección visible y dirige el foco al encabezado. */
function navegar(nombre) {
  const destino = $(`#vista-${nombre}`);
  if (!destino || destino.dataset.permitida === 'false') return;
  $$('.vista').forEach(vista => { vista.hidden = vista.dataset.seccion !== nombre; });
  $$('.nav-item').forEach(item => item.classList.toggle('activo', item.dataset.vista === nombre));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const titulo = destino.querySelector('h2');
  if (titulo) {
    titulo.tabIndex = -1;
    titulo.focus({ preventScroll: true });
  }
}

/** RF01/HU01: alterna registro/login manteniendo el estado accesible de las pestañas. */
function seleccionarAcceso(nombre) {
  const login = nombre === 'login';
  $('#panel-login').hidden = !login;
  $('#panel-registro').hidden = login;
  $('#tab-login').classList.toggle('activo', login);
  $('#tab-registro').classList.toggle('activo', !login);
  $('#tab-login').setAttribute('aria-selected', String(login));
  $('#tab-registro').setAttribute('aria-selected', String(!login));
  $('#tab-login').tabIndex = login ? 0 : -1;
  $('#tab-registro').tabIndex = login ? -1 : 0;
}

/** Cierra la sesión local incluso si el token ya venció en el servidor. */
/** RF01/HU01: solicita revocación, limpia el token y vuelve al acceso. */
async function cerrarSesion() {
  detenerRecepcionAvisos();
  try { if (estado.token) await api('/auth/logout', { method: 'POST' }); }
  catch (_) { /* El estado local siempre debe limpiarse. */ }
  sessionStorage.removeItem(CLAVE_TOKEN);
  estado.token = null;
  estado.cuenta = null;
  detenerTemporizador(false);
  mostrarAcceso();
  seleccionarAcceso('login');
}

/** RF01/HU01: autentica, conserva el token y carga la cuenta. */
async function iniciarSesion(correo, contrasena) {
  const respuesta = await api('/auth/login', {
    method: 'POST', body: JSON.stringify({ correo, contrasena })
  });
  estado.token = respuesta.token;
  sessionStorage.setItem(CLAVE_TOKEN, respuesta.token);
  estado.cuenta = respuesta.cuenta;
  await cargarAplicacion();
}

/** Consulta un recurso sin impedir que carguen las demás tarjetas. */
/** RF01/HU01: consulta recursos opcionales sin impedir la carga de la vista. */
async function cargarSeguro(ruta, valorPredeterminado) {
  try { return await api(ruta); }
  catch (error) {
    if (error.status === 401) throw error;
    return valorPredeterminado;
  }
}

/** Carga en paralelo los recursos de lectura del estudiante autenticado. */
/** RF01/HU01: consulta perfil y recursos permitidos para el rol autenticado. */
async function cargarAplicacion() {
  try {
    const perfil = await api('/auth/perfil');
    estado.cuenta = perfil.cuenta;
    configurarRol();
    if (estado.cuenta.rol === 'Revisor institucional') {
      renderizarUsuario(); mostrarAplicacion(); prepararPeriodos();
      await cargarInstitucionales(); navegar('institucional'); return;
    }
    if (estado.cuenta.rol === 'Administrador') {
      const [cuentas, niveles, insignias] = await Promise.all([api('/cuentas'), api('/niveles'), api('/insignias')]);
      estado.cuentasAdmin = cuentas.datos; estado.niveles = niveles.datos; estado.insignias = insignias.datos;
      renderizarUsuario(); renderizarAdministracion(); await cargarDetalleAdministrativo(); mostrarAplicacion(); prepararPeriodos();
      navegar('administracion'); return;
    }
    const [materias, tareas, sesiones, puntos, niveles, insignias, cuentaInsignias, retos, metas, recordatorios, notificaciones, preferencias] = await Promise.all([
      cargarSeguro('/materias', { datos: [] }), cargarSeguro('/tareas', { datos: [] }),
      cargarSeguro('/sesiones', { datos: [] }), cargarSeguro('/puntos', { datos: [], total: 0 }),
      cargarSeguro('/niveles', { datos: [] }), cargarSeguro('/insignias', { datos: [] }),
      cargarSeguro('/cuenta-insignias', { datos: [] }), cargarSeguro('/retos', { datos: [] }),
      cargarSeguro('/metas', { datos: [] }), cargarSeguro('/recordatorios', { datos: [] }),
      cargarSeguro('/notificaciones', { datos: [] }), cargarSeguro('/preferencias', { dato: null })
    ]);
    Object.assign(estado, {
      materias: materias.datos, tareas: tareas.datos, sesiones: sesiones.datos,
      puntos: puntos.datos, totalPuntos: puntos.total, niveles: niveles.datos,
      insignias: insignias.datos, cuentaInsignias: cuentaInsignias.datos,
      retos: retos.datos, metas: metas.datos, recordatorios: recordatorios.datos,
      notificaciones: notificaciones.datos, preferencias: preferencias.dato
    });
    aplicarPreferencias();
    renderizarTodo();
    mostrarAplicacion();
    prepararPeriodos();
    navegar('dashboard');
    iniciarRecepcionAvisos();
  } catch (error) {
    if (error.status === 401) return cerrarSesion();
    avisar(error.message, 'error');
  }
}

/** RF01/HU27: ajusta navegación visual; la autorización real permanece en el servidor. */
function configurarRol() {
  const rol = estado.cuenta.rol;
  const permitidas = {
    Estudiante: ['dashboard','materias','tareas','pomodoro','gamificacion','estadisticas','recordatorios','notificaciones','configuracion','exportacion'],
    Administrador: ['administracion','institucional'],
    'Revisor institucional': ['institucional']
  }[rol] || [];
  $$('.vista').forEach(vista => { vista.dataset.permitida = String(permitidas.includes(vista.dataset.seccion)); });
  $$('[data-roles]').forEach(elemento => {
    const permitida = elemento.dataset.roles.split(',').includes(rol);
    elemento.hidden = !permitida;
    elemento.dataset.permitida = String(permitida);
  });
}

/** RF11/HU08: calcula el rango inicial del tablero. */
function periodoSemanaActual() {
  const hoy = new Date();
  const dia = hoy.getDay() || 7;
  const inicio = new Date(hoy);
  inicio.setDate(hoy.getDate() - dia + 1);
  const fin = new Date(inicio);
  fin.setDate(inicio.getDate() + 6);
  const iso = fecha => fecha.toISOString().slice(0, 10);
  return { inicio: iso(inicio), fin: iso(fin) };
}

/** RF11/HU08: asigna fechas iniciales a los formularios de indicadores. */
function prepararPeriodos() {
  const periodo = periodoSemanaActual();
  ['form-estadisticas', 'form-institucional'].forEach(id => {
    const formulario = $(`#${id}`);
    if (!formulario) return;
    formulario.elements.fecha_inicio.value = periodo.inicio;
    formulario.elements.fecha_fin.value = periodo.fin;
  });
}

/** RF02/HU02: formatea una fecha para presentación, sin modificar el registro. */
function fechaLegible(valor) {
  if (!valor) return 'Sin fecha';
  const fecha = new Date(`${valor}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? valor : fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** RF09/HU09: muestra una explicación cuando no hay registros visibles. */
function estadoVacio(mensaje) {
  return `<p class="estado-vacio">${escapar(mensaje)}</p>`;
}

/** RF09/HU09: resuelve el nombre de la materia desde el estado cargado. */
function materiaDe(id) {
  return estado.materias.find(materia => materia.id_materia === id)?.nombre || 'Sin materia';
}

/** RF07/HU07: obtiene el nivel visible por umbral de puntos. */
function nivelActual() {
  const total = Number(estado.totalPuntos || 0);
  return [...estado.niveles].sort((a, b) => a.puntos_minimos - b.puntos_minimos)
    .filter(nivel => nivel.puntos_minimos <= total).at(-1)?.nombre || 'Sin nivel';
}

/** RF01/HU20: presenta el perfil y prepara su formulario de edición. */
function renderizarUsuario() {
  const nombreCorto = estado.cuenta.nombre.split(' ')[0];
  $('#usuario-nombre').textContent = estado.cuenta.nombre;
  $('#usuario-correo').textContent = estado.cuenta.correo;
  $('#usuario-rol').textContent = estado.cuenta.rol;
  $('#saludo-nombre').textContent = nombreCorto;
  if ($('#perfil-nombre')) $('#perfil-nombre').value = estado.cuenta.nombre;
  if ($('#perfil-correo')) $('#perfil-correo').value = estado.cuenta.correo;
  $('#perfil-rol').textContent = estado.cuenta.rol;
}

/** RF08/HU08: muestra contadores y próximos pendientes. */
function renderizarResumen() {
  const pendientes = estado.tareas.filter(tarea => tarea.estado !== 'Completada');
  const nivel = nivelActual();
  $('#metrica-pendientes').textContent = pendientes.length;
  $('#metrica-puntos').textContent = estado.totalPuntos || 0;
  $('#metrica-nivel').textContent = nivel;
  $('#metrica-sesiones').textContent = estado.sesiones.length;
  $('#gamificacion-puntos').textContent = estado.totalPuntos || 0;
  $('#gamificacion-nivel').textContent = nivel;
  const proximas = [...pendientes].sort((a, b) => String(a.fecha_entrega).localeCompare(String(b.fecha_entrega))).slice(0, 3);
  $('#dashboard-tareas').innerHTML = proximas.length ? proximas.map(tarea => `
    <div class="item prioridad-${escapar(tarea.prioridad.toLowerCase())}">
      <div class="item-fila"><strong>${escapar(tarea.nombre)}</strong><span class="chip">${escapar(tarea.prioridad)}</span></div>
      <small>${escapar(materiaDe(tarea.id_materia))} · ${escapar(fechaLegible(tarea.fecha_entrega))}</small>
    </div>`).join('') : estadoVacio('No tienes tareas pendientes.');
}

/** RF02/HU02: genera las opciones de materia para el editor de tareas. */
function opcionesMaterias() {
  return estado.materias.map(materia => `<option value="${escapar(materia.id_materia)}">${escapar(materia.nombre)}</option>`).join('');
}

/** RF10/HU10: genera las tareas disponibles para asociar una sesión. */
function opcionesTareas() {
  return estado.tareas.filter(tarea => tarea.estado !== 'Completada')
    .map(tarea => `<option value="${escapar(tarea.id_tarea)}">${escapar(tarea.nombre)}</option>`).join('');
}

/** RF09/HU16: muestra materias y controles de edición/eliminación. */
function renderizarMaterias() {
  $('#total-materias').textContent = estado.materias.length;
  $('#lista-materias').innerHTML = estado.materias.length ? estado.materias.map(materia => `
    <div class="item"><div class="item-fila"><div><strong>${escapar(materia.nombre)}</strong><br><small>${escapar(materia.horario || 'Sin horario')}</small></div>
      <div class="acciones"><button class="boton secundario pequeno" data-accion="editar-materia" data-id="${escapar(materia.id_materia)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-materia" data-id="${escapar(materia.id_materia)}">Eliminar</button></div>
    </div></div>`).join('') : estadoVacio('Aún no hay materias registradas.');
  $('#tarea-materia').innerHTML = `<option value="">Sin materia</option>${opcionesMaterias()}`;
}

/** RF02/HU02 y RF09/HU09: muestra tareas filtradas y acciones disponibles. */
function renderizarTareas() {
  const texto = $('#buscar-tarea').value.trim().toLowerCase();
  const prioridad = $('#filtro-prioridad').value;
  const situacion = $('#filtro-estado').value;
  const filtradas = estado.tareas.filter(tarea => (!texto || tarea.nombre.toLowerCase().includes(texto)) && (!prioridad || tarea.prioridad === prioridad) && (!situacion || tarea.estado === situacion));
  $('#lista-tareas').innerHTML = filtradas.length ? filtradas.map(tarea => `
    <div class="item prioridad-${escapar(tarea.prioridad.toLowerCase())} ${tarea.estado === 'Completada' ? 'completada' : ''}">
      <div class="item-fila"><div><strong>${escapar(tarea.nombre)}</strong><br><small>${escapar(materiaDe(tarea.id_materia))} · vence ${escapar(fechaLegible(tarea.fecha_entrega))}</small></div><span class="chip">${escapar(tarea.prioridad)} · ${escapar(tarea.estado)}</span></div>
      <div class="acciones"><button class="boton secundario pequeno" data-accion="ver-tarea" data-id="${escapar(tarea.id_tarea)}">Detalle</button>${tarea.estado !== 'Completada' ? `<button class="boton primario pequeno" data-accion="completar-tarea" data-id="${escapar(tarea.id_tarea)}">Completar</button>` : ''}<button class="boton secundario pequeno" data-accion="editar-tarea" data-id="${escapar(tarea.id_tarea)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-tarea" data-id="${escapar(tarea.id_tarea)}">Eliminar</button></div>
    </div>`).join('') : estadoVacio('No hay tareas que coincidan con los filtros.');
  const opciones = opcionesTareas();
  $('#pomodoro-tarea').innerHTML = `<option value="">Sesión libre</option>${opciones}`;
  $('#recordatorio-tarea').innerHTML = opciones || '<option value="">No hay tareas pendientes</option>';
}

/** RF05–RF07/HU05–HU07: presenta resultados del servidor; no concede premios. */
function renderizarGamificacion() {
  const obtenidas = new Map(estado.cuentaInsignias.map(item => [item.id_insignia, item]));
  $('#total-insignias').textContent = `${obtenidas.size}/${estado.insignias.length}`;
  $('#lista-insignias').innerHTML = estado.insignias.length ? estado.insignias.map(insignia => {
    const asignacion = obtenidas.get(insignia.id_insignia);
    return `<div class="item insignia ${asignacion ? 'obtenida' : 'bloqueada'}" title="${escapar(insignia.descripcion)} · Condición: ${escapar(insignia.condicion)}"><strong>${asignacion ? '🏅' : '🔒'} ${escapar(insignia.nombre)}</strong><small>${asignacion ? `Obtenida ${escapar(fechaLegible(asignacion.fecha_obtenida))}` : `Condición: ${escapar(insignia.condicion)}`}</small></div>`;
  }).join('') : estadoVacio('El catálogo de insignias está vacío.');
  const avances = [
    ...estado.retos.map(reto => `<div class="item"><div class="item-fila"><div><strong>${escapar(reto.descripcion)}</strong><br><small>Reto · progreso ${escapar(reto.progreso)}${reto.completado ? ' · completado' : ''}</small></div><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-reto" data-id="${escapar(reto.id_reto)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-reto" data-id="${escapar(reto.id_reto)}">Eliminar</button></div></div></div>`),
    ...estado.metas.map(meta => `<div class="item"><div class="item-fila"><div><strong>${escapar(meta.descripcion)}</strong><br><small>Meta · ${escapar(meta.valor_actual)}/${escapar(meta.valor_objetivo)}${meta.cumplida ? ' · cumplida' : ''}</small></div><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-meta" data-id="${escapar(meta.id_meta)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-meta" data-id="${escapar(meta.id_meta)}">Eliminar</button></div></div></div>`)
  ];
  $('#lista-retos-metas').innerHTML = avances.length ? avances.join('') : estadoVacio('No tienes retos o metas registrados.');
  renderizarSesiones();
}

/** RF10/RF11/HU21: muestra el historial propio y sus acciones de edición. */
function renderizarSesiones() {
  const lista = $('#lista-sesiones');
  if (!lista) return;
  lista.innerHTML = estado.sesiones.length ? estado.sesiones.map(sesion => `<div class="item"><div class="item-fila"><div><strong>${escapar(fechaLegible(sesion.fecha))}</strong><br><small>${escapar(sesion.duracion_minutos)} minutos · ${sesion.modo_enfoque ? 'Pomodoro' : 'Libre'}</small></div><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-sesion" data-id="${escapar(sesion.id_sesion)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-sesion" data-id="${escapar(sesion.id_sesion)}">Eliminar</button></div></div></div>`).join('') : estadoVacio('Aún no tienes sesiones registradas.');
}

/** RF11/HU08: construye tarjetas reutilizables de indicadores. */
function tarjetasMetricas(datos) {
  return Object.entries(datos).map(([etiqueta, valor]) => `<article class="tarjeta metrica"><span>${escapar(etiqueta)}</span><strong>${escapar(valor)}</strong></article>`).join('');
}

/** RF11/HU08: presenta el periodo personal y sus resultados. */
function renderizarEstadisticas() {
  const dato = estado.estadisticas;
  if (!dato) return;
  $('#metricas-estadisticas').innerHTML = tarjetasMetricas({
    'Tareas completadas': dato.tareas_completadas,
    'Cumplimiento': `${dato.porcentaje_cumplimiento}%`,
    'Horas estudiadas': dato.horas_estudiadas,
    'Puntos del periodo': dato.puntos_obtenidos,
    'Sesiones Pomodoro': dato.sesiones_pomodoro
  });
  $('#estadisticas-metas').innerHTML = dato.metas.length ? dato.metas.map(meta => `<div class="item"><strong>${escapar(meta.descripcion)}</strong><small>${meta.valor_actual}/${meta.valor_objetivo} · ${meta.cumplida ? 'Cumplida' : 'En progreso'}</small></div>`).join('') : estadoVacio('No hay meta para esta semana.');
  $('#estadisticas-retos').innerHTML = dato.retos.length ? dato.retos.map(reto => `<div class="item"><strong>${escapar(reto.descripcion)}</strong><small>Progreso ${reto.progreso} · ${reto.completado ? 'Completado' : 'En progreso'}</small></div>`).join('') : estadoVacio('No hay reto para esta semana.');
}

/** RF11/HU08: consulta el rango seleccionado y actualiza el tablero. */
async function cargarEstadisticas() {
  const formulario = $('#form-estadisticas');
  const consulta = new URLSearchParams({ fecha_inicio: formulario.elements.fecha_inicio.value, fecha_fin: formulario.elements.fecha_fin.value });
  estado.estadisticas = (await api(`/estadisticas/semanales?${consulta}`)).dato;
  renderizarEstadisticas();
}

/** RF11/HU28: presenta agregados sin filas individuales de estudiantes. */
function renderizarInstitucionales() {
  const dato = estado.institucionales;
  if (!dato) return;
  $('#metricas-institucionales').innerHTML = tarjetasMetricas({
    'Estudiantes activos': dato.estudiantes_activos,
    'Tareas completadas': dato.tareas_completadas,
    'Horas estudiadas': dato.horas_estudiadas,
    'Puntos obtenidos': dato.puntos_obtenidos,
    'Promedio de minutos': dato.promedio_minutos_por_estudiante || 0,
    'Promedio de puntos': dato.promedio_puntos_por_estudiante || 0
  });
}

/** RF11/HU28: solicita los indicadores autorizados del periodo. */
async function cargarInstitucionales() {
  const formulario = $('#form-institucional');
  if (!formulario.elements.fecha_inicio.value) prepararPeriodos();
  const consulta = new URLSearchParams({ fecha_inicio: formulario.elements.fecha_inicio.value, fecha_fin: formulario.elements.fecha_fin.value });
  estado.institucionales = (await api(`/estadisticas/institucionales?${consulta}`)).dato;
  renderizarInstitucionales();
}

/** RF01/HU27 y RF07/HU26: presenta cuentas, catálogos y correcciones. */
function renderizarAdministracion() {
  $('#lista-usuarios-admin').innerHTML = estado.cuentasAdmin.length ? estado.cuentasAdmin.map(cuenta => `
    <div class="item"><div class="item-fila"><div><strong>${escapar(cuenta.nombre)}</strong><br><small>${escapar(cuenta.correo)}</small></div><div class="controles-admin"><select id="rol-${escapar(cuenta.id_cuenta)}" aria-label="Rol de ${escapar(cuenta.nombre)}"><option ${cuenta.rol === 'Estudiante' ? 'selected' : ''}>Estudiante</option><option ${cuenta.rol === 'Administrador' ? 'selected' : ''}>Administrador</option><option ${cuenta.rol === 'Revisor institucional' ? 'selected' : ''}>Revisor institucional</option></select><label class="fila-toggle"><input id="activa-${escapar(cuenta.id_cuenta)}" type="checkbox" ${cuenta.activa ? 'checked' : ''}> Activa</label><button class="boton secundario pequeno" data-accion="guardar-usuario" data-id="${escapar(cuenta.id_cuenta)}">Guardar</button></div></div></div>`).join('') : estadoVacio('No hay cuentas registradas.');
  const insignias = estado.insignias.map(item => `<div class="item"><div class="item-fila"><div><strong>Insignia · ${escapar(item.nombre)}</strong><br><small>${escapar(item.condicion)}</small></div><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-insignia-admin" data-id="${escapar(item.id_insignia)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-insignia-admin" data-id="${escapar(item.id_insignia)}">Eliminar</button></div></div></div>`);
  const niveles = estado.niveles.map(item => `<div class="item"><div class="item-fila"><div><strong>Nivel ${item.orden} · ${escapar(item.nombre)}</strong><br><small>${item.puntos_minimos} puntos</small></div><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-nivel-admin" data-id="${escapar(item.id_nivel)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-nivel-admin" data-id="${escapar(item.id_nivel)}">Eliminar</button></div></div></div>`);
  $('#lista-catalogos-admin').innerHTML = [...insignias, ...niveles].join('') || estadoVacio('No hay catálogos.');
  const opcionesCuenta = estado.cuentasAdmin.filter(cuenta => cuenta.rol === 'Estudiante' && cuenta.activa).map(cuenta => `<option value="${escapar(cuenta.id_cuenta)}">${escapar(cuenta.nombre)}</option>`).join('');
  $('#admin-reto-cuenta').innerHTML = opcionesCuenta;
  $('#admin-correccion-cuenta').innerHTML = opcionesCuenta;
  $('#admin-insignia-correccion').innerHTML = estado.insignias
    .map(item => `<option value="${escapar(item.id_insignia)}">${escapar(item.nombre)}</option>`).join('');
  $('#lista-retos-admin').innerHTML = estado.retosAdmin.length ? estado.retosAdmin.map(reto => `<div class="item"><div class="item-fila"><div><strong>${escapar(reto.descripcion)}</strong><br><small>${escapar(reto.semana)} · ${escapar(reto.condicion)}</small></div><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-reto-admin" data-id="${escapar(reto.id_reto)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-reto-admin" data-id="${escapar(reto.id_reto)}">Eliminar</button></div></div></div>`).join('') : estadoVacio('Selecciona una cuenta para consultar sus retos.');
  const puntos = estado.puntosAdmin.map(item => `<div class="item"><div class="item-fila"><div><strong>${item.cantidad} puntos</strong><br><small>${escapar(item.origen)} · ${escapar(fechaLegible(item.fecha))}</small></div><button class="boton peligro pequeno" data-accion="eliminar-punto-admin" data-id="${escapar(item.id_punto)}">Eliminar movimiento</button></div></div>`);
  const asignaciones = estado.insigniasCuentaAdmin.map(item => `<div class="item"><div class="item-fila"><div><strong>${escapar(item.insignia?.nombre || 'Insignia')}</strong><br><small>Asignada ${escapar(fechaLegible(item.fecha_obtenida))}</small></div><button class="boton peligro pequeno" data-accion="revocar-insignia-admin" data-id="${escapar(item.id_insignia)}" data-cuenta="${escapar(item.id_cuenta)}">Revocar</button></div></div>`);
  $('#lista-correcciones-admin').innerHTML = [...puntos, ...asignaciones].join('') || estadoVacio('No hay movimientos o insignias para corregir.');
}

/** RF07/HU26: consulta retos, puntos e insignias de la cuenta seleccionada. */
async function cargarDetalleAdministrativo(idCuenta = $('#admin-reto-cuenta').value) {
  if (!idCuenta) return;
  const [retos, puntos, insignias] = await Promise.all([
    api(`/retos?id_cuenta=${encodeURIComponent(idCuenta)}`),
    api(`/puntos?id_cuenta=${encodeURIComponent(idCuenta)}`),
    api(`/cuenta-insignias?id_cuenta=${encodeURIComponent(idCuenta)}`)
  ]);
  estado.retosAdmin = retos.datos; estado.puntosAdmin = puntos.datos; estado.insigniasCuentaAdmin = insignias.datos;
  renderizarAdministracion();
  $('#admin-reto-cuenta').value = idCuenta; $('#admin-correccion-cuenta').value = idCuenta;
}

/** RF03/HU03: refresca progreso y avisos después de registrar un evento. */
async function recargarGamificacion() {
  const [puntos, insigniasCuenta, retos, metas, notificaciones] = await Promise.all([
    api('/puntos'), api('/cuenta-insignias'), api('/retos'), api('/metas'), api('/notificaciones')
  ]);
  estado.puntos = puntos.datos; estado.totalPuntos = puntos.total;
  estado.cuentaInsignias = insigniasCuenta.datos; estado.retos = retos.datos;
  estado.metas = metas.datos; estado.notificaciones = notificaciones.datos;
  renderizarGamificacion(); renderizarNotificaciones(); renderizarResumen();
}

/** RF03/HU03: muestra la recompensa confirmada por el backend. */
function mostrarRecompensa(resultado) {
  const partes = [`<p><strong>+${resultado.puntos_otorgados} puntos</strong></p>`];
  if (resultado.insignias_desbloqueadas?.length) partes.push(`<p>🏅 ${escapar(resultado.insignias_desbloqueadas.join(', '))}</p>`);
  if (resultado.retos_completados?.length) partes.push(`<p>🏆 ${escapar(resultado.retos_completados.join(', '))}</p>`);
  if (resultado.metas_cumplidas?.length) partes.push(`<p>🎯 ${escapar(resultado.metas_cumplidas.join(', '))}</p>`);
  if (resultado.nuevo_nivel) partes.push(`<p>Nuevo nivel: ${escapar(resultado.nivel)}</p>`);
  $('#detalle-recompensa').innerHTML = partes.join('');
  $('#modal-recompensa').showModal();
}

/** RF04/HU25: presenta avisos programados y controles manuales. */
function renderizarRecordatorios() {
  $('#lista-recordatorios').innerHTML = estado.recordatorios.length ? estado.recordatorios.map(item => `
    <div class="item"><div class="item-fila"><div><strong>${escapar(item.mensaje)}</strong><br><small>${escapar(fechaLegible(item.fecha_programada))} · ${item.activo ? 'Activo' : 'Inactivo'}</small></div><div class="acciones"><button class="boton secundario pequeno" data-accion="alternar-recordatorio" data-id="${escapar(item.id_recordatorio)}" data-activo="${item.activo}">${item.activo ? 'Desactivar' : 'Activar'}</button><button class="boton peligro pequeno" data-accion="eliminar-recordatorio" data-id="${escapar(item.id_recordatorio)}">Eliminar</button></div></div></div>`).join('') : estadoVacio('No tienes recordatorios programados.');
}

/** RF04/HU24: presenta avisos recibidos y contador de no leídos. */
function renderizarNotificaciones() {
  const noLeidas = estado.notificaciones.filter(item => !item.leida).length;
  const contador = $('#contador-notificaciones');
  contador.textContent = noLeidas;
  contador.hidden = noLeidas === 0;
  $('#marcar-notificaciones').disabled = noLeidas === 0;
  $('#lista-notificaciones').innerHTML = estado.notificaciones.length ? estado.notificaciones.map(item => `
    <div class="item ${item.leida ? 'completada' : ''}"><div class="item-fila"><div><strong>${escapar(item.tipo)}</strong><br><span>${escapar(item.mensaje)}</span><br><small>${escapar(fechaLegible(item.fecha))}</small></div><div class="acciones">${!item.leida ? `<button class="boton secundario pequeno" data-accion="leer-notificacion" data-id="${escapar(item.id_notificacion)}">Marcar leída</button>` : ''}<button class="boton peligro pequeno" data-accion="eliminar-notificacion" data-id="${escapar(item.id_notificacion)}">Eliminar</button></div></div></div>`).join('') : estadoVacio('No tienes notificaciones.');
}

/** RF04/HU24/HU25: detiene consultas y descarta respuestas de sesiones anteriores. */
function detenerRecepcionAvisos() {
  generacionAvisos += 1;
  clearTimeout(temporizadorAvisos);
  avisosConocidos = new Set();
}

/** RF04/HU24: refresca avisos sin escrituras ni duplicación de datos académicos.
 * Solo muestra avisos nativos nuevos con permiso; durante enfoque no interrumpe.
 * La notificación interna persiste aunque el navegador cierre o deniegue permiso.
 */
async function actualizarAvisos(generacion = generacionAvisos) {
  const token = estado.token;
  if (!token || estado.cuenta?.rol !== 'Estudiante') return;
  const [avisos, recordatorios] = await Promise.all([api('/notificaciones'), api('/recordatorios')]);
  if (generacion !== generacionAvisos || token !== estado.token) return;
  for (const aviso of avisos.datos) {
    if (!avisosConocidos.has(aviso.id_notificacion) && !aviso.leida && !estado.temporizador.activo &&
      'Notification' in window && Notification.permission === 'granted') {
      try { new Notification('StudyQuest', { body: aviso.mensaje, tag: aviso.id_notificacion }); }
      catch (_) { /* El aviso interno no depende de soporte de notificación nativa. */ }
    }
    avisosConocidos.add(aviso.id_notificacion);
  }
  estado.notificaciones = avisos.datos;
  estado.recordatorios = recordatorios.datos;
  renderizarNotificaciones(); renderizarRecordatorios();
}

/** RF04/HU24: consulta cada 15 segundos sin solapar solicitudes ni repetir avisos al entrar. */
function iniciarRecepcionAvisos() {
  detenerRecepcionAvisos();
  const generacion = generacionAvisos;
  avisosConocidos = new Set(estado.notificaciones.map(item => item.id_notificacion));
  const ciclo = async () => {
    if (generacion !== generacionAvisos) return;
    try { await actualizarAvisos(generacion); }
    catch (error) {
      if (generacion !== generacionAvisos) return;
      if (error.status === 401) { await cerrarSesion(); return; }
      // Fallos transitorios de red se reintentan sin llenar la pantalla de errores.
    }
    if (generacion === generacionAvisos) temporizadorAvisos = setTimeout(ciclo, 15000);
  };
  temporizadorAvisos = setTimeout(ciclo, 15000);
}

/** RF04/HU04 · RN19: solicita permiso mediante una acción explícita del usuario. */
async function solicitarPermisoAvisos() {
  if (!('Notification' in window)) return avisar('Este navegador conserva los avisos dentro de la aplicación.');
  try {
    const permiso = await Notification.requestPermission();
    avisar(permiso === 'granted' ? 'Avisos del navegador habilitados mientras la aplicación esté abierta.' :
      'Seguiremos guardando los avisos dentro de la aplicación.');
  } catch (_) { avisar('No se pudo activar el permiso; tus avisos permanecen en la aplicación.'); }
}

/** RF13/HU13: aplica el tema persistido a la interfaz. */
function aplicarPreferencias() {
  const tema = estado.preferencias?.tema || 'purple';
  const oscuro = Boolean(estado.preferencias?.modo_oscuro);
  document.documentElement.dataset.tema = tema;
  document.documentElement.classList.toggle('modo-oscuro', oscuro);
  $('#form-preferencias').elements.tema.value = tema;
  $('#form-preferencias').elements.modo_oscuro.checked = oscuro;
}

/** RF08/HU08: coordina el refresco visual con los datos ya cargados. */
function renderizarTodo() {
  renderizarUsuario(); renderizarResumen(); renderizarMaterias(); renderizarTareas();
  renderizarGamificacion(); renderizarRecordatorios(); renderizarNotificaciones();
}

/** RF02/HU02: prepara el editor para crear o modificar una tarea. */
function abrirTarea(tarea = null) {
  const formulario = $('#form-tarea');
  formulario.reset();
  formulario.elements.id.value = tarea?.id_tarea || '';
  formulario.elements.nombre.value = tarea?.nombre || '';
  formulario.elements.fecha_entrega.value = tarea?.fecha_entrega || '';
  formulario.elements.prioridad.value = tarea?.prioridad || 'Media';
  formulario.elements.id_materia.value = tarea?.id_materia || '';
  $('#titulo-form-tarea').textContent = tarea ? 'Editar tarea' : 'Nueva tarea';
  $('#panel-form-tarea').hidden = false;
  $('#panel-form-tarea').scrollIntoView({ behavior: 'smooth', block: 'start' });
  formulario.elements.nombre.focus({ preventScroll: true });
}

/** RF02/HU02: cierra el editor sin guardar cambios. */
function cerrarTarea() {
  $('#form-tarea').reset();
  $('#form-tarea').elements.id.value = '';
  $('#panel-form-tarea').hidden = true;
}

/** RF09/HU16: devuelve el formulario de materia al modo de creación. */
function limpiarMateria() {
  $('#form-materia').reset();
  $('#form-materia').elements.id.value = '';
  $('#titulo-form-materia').textContent = 'Nueva materia';
  $('#cancelar-materia').hidden = true;
}

/** RF10/HU10: representa los segundos restantes del cronómetro. */
function actualizarReloj() {
  const minutos = Math.floor(estado.temporizador.restante / 60).toString().padStart(2, '0');
  const segundos = (estado.temporizador.restante % 60).toString().padStart(2, '0');
  $('#reloj').textContent = `${minutos}:${segundos}`;
}

/** RF10/HU10: inicia o pausa el Pomodoro; solicita permiso de notificación. */
function alternarTemporizador() {
  if (estado.temporizador.activo) {
    clearInterval(estado.temporizador.intervalo);
    estado.temporizador.activo = false;
    $('#iniciar-temporizador').textContent = 'Reanudar';
    $('#estado-temporizador').textContent = 'Sesión pausada.';
    $('#tarjeta-temporizador').classList.remove('enfoque');
    return;
  }
  if ('Notification' in window && Notification.permission === 'default') {
    // Algunos navegadores o contextos privados rechazan esta promesa. El
    // Pomodoro debe seguir funcionando con su aviso visual y sonoro.
    Promise.resolve(Notification.requestPermission()).catch(() => {});
  }
  estado.temporizador.activo = true;
  $('#iniciar-temporizador').textContent = 'Pausar';
  $('#guardar-temporizador').hidden = false;
  $('#cancelar-temporizador').hidden = false;
  $('#estado-temporizador').textContent = 'Modo enfoque activo.';
  $('#tarjeta-temporizador').classList.add('enfoque');
  estado.temporizador.intervalo = window.setInterval(() => {
    estado.temporizador.restante -= 1;
    estado.temporizador.transcurrido += 1;
    actualizarReloj();
    if (estado.temporizador.restante <= 0) {
      clearInterval(estado.temporizador.intervalo);
      estado.temporizador.activo = false;
      $('#estado-temporizador').textContent = 'Pomodoro finalizado. Guarda la sesión.';
      $('#iniciar-temporizador').hidden = true;
      avisarFinPomodoro();
    }
  }, 1000);
}

/** RF10/HU10: avisa del fin en la pestaña abierta, sin guardar automáticamente. */
function avisarFinPomodoro() {
  try {
    const contexto = new (window.AudioContext || window.webkitAudioContext)();
    const oscilador = contexto.createOscillator();
    oscilador.frequency.value = 740; oscilador.connect(contexto.destination); oscilador.start();
    oscilador.stop(contexto.currentTime + 0.18);
  } catch (_) { /* El aviso visual continúa disponible si no hay audio. */ }
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Pomodoro finalizado', { body: 'Guarda tu sesión y toma un descanso.' });
  }
  avisar('Pomodoro finalizado. Guarda la sesión y toma un descanso.', 'exito');
}

/** RF10/HU10: cancela el intervalo y opcionalmente restablece el reloj. */
function detenerTemporizador(restablecer = true) {
  clearInterval(estado.temporizador.intervalo);
  estado.temporizador = { restante: DURACION_POMODORO, transcurrido: 0, intervalo: null, activo: false };
  if (!restablecer || !$('#reloj')) return;
  actualizarReloj();
  $('#iniciar-temporizador').hidden = false;
  $('#iniciar-temporizador').textContent = 'Iniciar';
  $('#guardar-temporizador').hidden = true;
  $('#cancelar-temporizador').hidden = true;
  $('#estado-temporizador').textContent = 'Listo para comenzar una sesión Pomodoro.';
  $('#tarjeta-temporizador').classList.remove('enfoque');
}

/** RF10/HU10: envía la duración y presenta la recompensa confirmada. */
async function guardarSesion() {
  if (estado.temporizador.transcurrido < 1) return avisar('Inicia el cronómetro antes de guardar.', 'error');
  const duracion = Math.max(1, Math.ceil(estado.temporizador.transcurrido / 60));
  const respuesta = await api('/sesiones', { method: 'POST', body: JSON.stringify({
    id_tarea: $('#pomodoro-tarea').value || null, duracion_minutos: duracion, modo_enfoque: true
  }) });
  detenerTemporizador();
  const sesiones = await api('/sesiones');
  estado.sesiones = sesiones.datos;
  await recargarGamificacion();
  mostrarRecompensa(respuesta.gamificacion);
  avisar(`Sesión de ${duracion} minuto(s) guardada.`, 'exito');
}

/** Delega acciones de listas dinámicas para no registrar eventos repetidos. */
/** RF02/HU02 y RF07/HU26: despacha acciones identificadas por data-accion; contratos en M16. */
async function manejarAccion(evento) {
  const boton = evento.target.closest('[data-accion]');
  if (!boton) return;
  const { accion, id } = boton.dataset;
  try {
    if (accion === 'nueva-tarea') return abrirTarea();
    if (accion === 'editar-materia') {
      const materia = estado.materias.find(item => item.id_materia === id);
      $('#form-materia').elements.id.value = id;
      $('#form-materia').elements.nombre.value = materia.nombre;
      $('#form-materia').elements.horario.value = materia.horario || '';
      $('#titulo-form-materia').textContent = 'Editar materia';
      $('#cancelar-materia').hidden = false;
      return;
    }
    if (accion === 'eliminar-materia' && confirm('¿Deseas eliminar esta materia?')) {
      await api(`/materias/${id}`, { method: 'DELETE' });
      estado.materias = estado.materias.filter(item => item.id_materia !== id);
      renderizarMaterias(); renderizarResumen(); avisar('Materia eliminada.', 'exito');
    }
    if (accion === 'editar-tarea') return abrirTarea(estado.tareas.find(item => item.id_tarea === id));
    if (accion === 'ver-tarea') {
      const tarea = estado.tareas.find(item => item.id_tarea === id);
      $('#detalle-tarea-nombre').textContent = tarea.nombre;
      $('#detalle-tarea-datos').innerHTML = `<div><dt>Materia</dt><dd>${escapar(materiaDe(tarea.id_materia))}</dd></div><div><dt>Entrega</dt><dd>${escapar(fechaLegible(tarea.fecha_entrega))}</dd></div><div><dt>Prioridad</dt><dd>${escapar(tarea.prioridad)}</dd></div><div><dt>Estado</dt><dd>${escapar(tarea.estado)}</dd></div>`;
      $('#editar-desde-detalle').dataset.id = id;
      $('#modal-detalle-tarea').showModal(); return;
    }
    if (accion === 'completar-tarea') {
      boton.disabled = true;
      const respuesta = await api(`/tareas/${id}/completar`, { method: 'PATCH' });
      estado.tareas = estado.tareas.map(item => item.id_tarea === id ? respuesta.dato : item);
      renderizarTareas(); await recargarGamificacion(); mostrarRecompensa(respuesta.gamificacion);
      await actualizarAvisos();
      avisar('Tarea completada y progreso actualizado.', 'exito');
    }
    if (accion === 'eliminar-tarea' && confirm('¿Deseas eliminar esta tarea?')) {
      await api(`/tareas/${id}`, { method: 'DELETE' });
      estado.tareas = estado.tareas.filter(item => item.id_tarea !== id);
      await actualizarAvisos();
      renderizarTareas(); renderizarResumen(); avisar('Tarea eliminada.', 'exito');
    }
    if (accion === 'editar-reto') {
      const reto = estado.retos.find(item => item.id_reto === id);
      const descripcion = prompt('Descripción del reto', reto.descripcion);
      if (descripcion === null || !descripcion.trim()) return;
      const respuesta = await api(`/retos/${id}`, { method: 'PUT', body: JSON.stringify({ descripcion: descripcion.trim() }) });
      estado.retos = estado.retos.map(item => item.id_reto === id ? respuesta.dato : item);
      renderizarGamificacion(); avisar('Reto actualizado.', 'exito');
    }
    if (accion === 'eliminar-reto' && confirm('¿Deseas eliminar este reto?')) {
      await api(`/retos/${id}`, { method: 'DELETE' });
      estado.retos = estado.retos.filter(item => item.id_reto !== id);
      renderizarGamificacion(); avisar('Reto eliminado.', 'exito');
    }
    if (accion === 'editar-meta') {
      const meta = estado.metas.find(item => item.id_meta === id);
      const descripcion = prompt('Descripción de la meta', meta.descripcion);
      if (descripcion === null || !descripcion.trim()) return;
      const respuesta = await api(`/metas/${id}`, { method: 'PUT', body: JSON.stringify({ descripcion: descripcion.trim() }) });
      estado.metas = estado.metas.map(item => item.id_meta === id ? respuesta.dato : item);
      renderizarGamificacion(); avisar('Meta actualizada.', 'exito');
    }
    if (accion === 'eliminar-meta' && confirm('¿Deseas eliminar esta meta?')) {
      await api(`/metas/${id}`, { method: 'DELETE' });
      estado.metas = estado.metas.filter(item => item.id_meta !== id);
      renderizarGamificacion(); avisar('Meta eliminada.', 'exito');
    }
    if (accion === 'editar-sesion') {
      const sesion = estado.sesiones.find(item => item.id_sesion === id);
      const duracion = Number(prompt('Duración en minutos', sesion.duracion_minutos));
      if (!Number.isInteger(duracion) || duracion < 1) return avisar('La duración debe ser un entero positivo.', 'error');
      const respuesta = await api(`/sesiones/${id}`, { method: 'PUT', body: JSON.stringify({ duracion_minutos: duracion, modo_enfoque: Boolean(sesion.modo_enfoque) }) });
      estado.sesiones = estado.sesiones.map(item => item.id_sesion === id ? respuesta.dato : item);
      renderizarSesiones(); renderizarResumen(); avisar('Sesión actualizada.', 'exito');
    }
    if (accion === 'eliminar-sesion' && confirm('¿Deseas eliminar esta sesión?')) {
      await api(`/sesiones/${id}`, { method: 'DELETE' });
      estado.sesiones = estado.sesiones.filter(item => item.id_sesion !== id);
      renderizarSesiones(); renderizarResumen(); avisar('Sesión eliminada.', 'exito');
    }
    if (accion === 'alternar-recordatorio') {
      await api(`/recordatorios/${id}`, { method: 'PATCH', body: JSON.stringify({ activo: boton.dataset.activo !== 'true' }) });
      const respuesta = await api('/recordatorios'); estado.recordatorios = respuesta.datos; renderizarRecordatorios();
    }
    if (accion === 'eliminar-recordatorio') {
      await api(`/recordatorios/${id}`, { method: 'DELETE' });
      estado.recordatorios = estado.recordatorios.filter(item => item.id_recordatorio !== id); renderizarRecordatorios();
    }
    if (accion === 'leer-notificacion') {
      await api(`/notificaciones/${id}/leida`, { method: 'PATCH' });
      estado.notificaciones = estado.notificaciones.map(item => item.id_notificacion === id ? { ...item, leida: true } : item); renderizarNotificaciones();
    }
    if (accion === 'eliminar-notificacion') {
      await api(`/notificaciones/${id}`, { method: 'DELETE' });
      estado.notificaciones = estado.notificaciones.filter(item => item.id_notificacion !== id); renderizarNotificaciones();
    }
    if (accion === 'guardar-usuario') {
      const respuesta = await api(`/cuentas/${id}`, { method: 'PUT', body: JSON.stringify({
        rol: $(`#rol-${id}`).value, activa: $(`#activa-${id}`).checked
      }) });
      estado.cuentasAdmin = estado.cuentasAdmin.map(item => item.id_cuenta === id ? respuesta.dato : item);
      renderizarAdministracion(); avisar('Cuenta actualizada.', 'exito');
    }
    if (accion === 'eliminar-insignia-admin' && confirm('¿Eliminar esta insignia?')) {
      await api(`/insignias/${id}`, { method: 'DELETE' });
      estado.insignias = estado.insignias.filter(item => item.id_insignia !== id);
      renderizarAdministracion(); avisar('Insignia eliminada.', 'exito');
    }
    if (accion === 'eliminar-nivel-admin' && confirm('¿Eliminar este nivel?')) {
      await api(`/niveles/${id}`, { method: 'DELETE' });
      estado.niveles = estado.niveles.filter(item => item.id_nivel !== id);
      renderizarAdministracion(); avisar('Nivel eliminado.', 'exito');
    }
    if (accion === 'editar-insignia-admin') {
      const actual = estado.insignias.find(item => item.id_insignia === id);
      const descripcion = prompt('Descripción de la insignia', actual.descripcion);
      if (descripcion === null) return;
      const respuesta = await api(`/insignias/${id}`, { method: 'PUT', body: JSON.stringify({ descripcion }) });
      estado.insignias = estado.insignias.map(item => item.id_insignia === id ? respuesta.dato : item);
      renderizarAdministracion(); avisar('Insignia actualizada.', 'exito');
    }
    if (accion === 'editar-nivel-admin') {
      const actual = estado.niveles.find(item => item.id_nivel === id);
      const descripcion = prompt('Descripción del nivel', actual.descripcion);
      if (descripcion === null) return;
      const respuesta = await api(`/niveles/${id}`, { method: 'PUT', body: JSON.stringify({ descripcion }) });
      estado.niveles = estado.niveles.map(item => item.id_nivel === id ? respuesta.dato : item);
      renderizarAdministracion(); avisar('Nivel actualizado.', 'exito');
    }
    if (accion === 'editar-reto-admin') {
      const actual = estado.retosAdmin.find(item => item.id_reto === id);
      const descripcion = prompt('Descripción del reto', actual.descripcion);
      if (descripcion === null) return;
      const respuesta = await api(`/retos/${id}`, { method: 'PUT', body: JSON.stringify({ descripcion }) });
      estado.retosAdmin = estado.retosAdmin.map(item => item.id_reto === id ? respuesta.dato : item);
      renderizarAdministracion(); avisar('Reto actualizado.', 'exito');
    }
    if (accion === 'eliminar-reto-admin' && confirm('¿Eliminar este reto?')) {
      await api(`/retos/${id}`, { method: 'DELETE' });
      estado.retosAdmin = estado.retosAdmin.filter(item => item.id_reto !== id);
      renderizarAdministracion(); avisar('Reto eliminado.', 'exito');
    }
    if (accion === 'eliminar-punto-admin' && confirm('Esta corrección elimina el movimiento. ¿Continuar?')) {
      const motivo = prompt('Motivo obligatorio de la corrección');
      if (!motivo?.trim()) return avisar('Debes indicar el motivo de la corrección.', 'error');
      await api(`/puntos/${id}`, { method: 'DELETE', body: JSON.stringify({ motivo: motivo.trim() }) });
      estado.puntosAdmin = estado.puntosAdmin.filter(item => item.id_punto !== id);
      renderizarAdministracion(); avisar('Movimiento corregido.', 'exito');
    }
    if (accion === 'revocar-insignia-admin' && confirm('¿Revocar esta insignia asignada?')) {
      const motivo = prompt('Motivo obligatorio de la revocación');
      if (!motivo?.trim()) return avisar('Debes indicar el motivo de la corrección.', 'error');
      await api(`/cuenta-insignias/${boton.dataset.cuenta}/${id}`, { method: 'DELETE', body: JSON.stringify({ motivo: motivo.trim() }) });
      estado.insigniasCuentaAdmin = estado.insigniasCuentaAdmin.filter(item => item.id_insignia !== id);
      renderizarAdministracion(); avisar('Insignia revocada.', 'exito');
    }
  } catch (error) { boton.disabled = false; avisar(error.message, 'error'); }
}

/** RF01–RF15/HU01–HU28: conecta formularios y botones con sus acciones de M16. */
function registrarEventos() {
  $('#tab-login').addEventListener('click', () => seleccionarAcceso('login'));
  $('#tab-registro').addEventListener('click', () => seleccionarAcceso('registro'));
  $('.selector-acceso').addEventListener('keydown', evento => {
    const pestanas = [$('#tab-login'), $('#tab-registro')];
    const actual = pestanas.indexOf(document.activeElement);
    if (actual < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    const destino = evento.key === 'Home' ? 0 : evento.key === 'End' ? 1
      : (actual + (evento.key === 'ArrowRight' ? 1 : -1) + pestanas.length) % pestanas.length;
    seleccionarAcceso(destino === 0 ? 'login' : 'registro');
    pestanas[destino].focus();
  });
  $$('[data-vista]').forEach(boton => boton.addEventListener('click', () => {
    navegar(boton.dataset.vista);
    if (boton.dataset.accion === 'nueva-tarea') abrirTarea();
    if (boton.dataset.vista === 'estadisticas' && !estado.estadisticas) cargarEstadisticas().catch(error => avisar(error.message, 'error'));
    if (boton.dataset.vista === 'institucional' && !estado.institucionales) cargarInstitucionales().catch(error => avisar(error.message, 'error'));
  }));
  $('#boton-salir').addEventListener('click', cerrarSesion);
  document.addEventListener('click', manejarAccion);

  $('#form-login').addEventListener('submit', evento => {
    evento.preventDefault();
    duranteEnvio(evento.currentTarget, async () => {
      try { await iniciarSesion(evento.currentTarget.elements.correo.value, evento.currentTarget.elements.contrasena.value); }
      catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-registro').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        await api('/auth/registro', { method: 'POST', body: JSON.stringify({ nombre: f.elements.nombre.value, correo: f.elements.correo.value, contrasena: f.elements.contrasena.value, materia: { nombre: f.elements.materia.value, horario: f.elements.horario.value || null } }) });
        await iniciarSesion(f.elements.correo.value, f.elements.contrasena.value); avisar('Cuenta creada correctamente.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-materia').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget; const id = f.elements.id.value;
    duranteEnvio(f, async () => {
      try {
        const respuesta = await api(id ? `/materias/${id}` : '/materias', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ nombre: f.elements.nombre.value, horario: f.elements.horario.value || null }) });
        estado.materias = id ? estado.materias.map(item => item.id_materia === id ? respuesta.dato : item) : [...estado.materias, respuesta.dato];
        limpiarMateria(); renderizarMaterias(); avisar(`Materia ${id ? 'actualizada' : 'creada'}.`, 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#cancelar-materia').addEventListener('click', limpiarMateria);
  $('#mostrar-form-tarea').addEventListener('click', () => abrirTarea());
  $('#cerrar-form-tarea').addEventListener('click', cerrarTarea);
  $('#cancelar-tarea').addEventListener('click', cerrarTarea);
  $('#form-tarea').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget; const id = f.elements.id.value;
    duranteEnvio(f, async () => {
      try {
        const datos = { nombre: f.elements.nombre.value, fecha_entrega: f.elements.fecha_entrega.value, prioridad: f.elements.prioridad.value, id_materia: f.elements.id_materia.value || null };
        const respuesta = await api(id ? `/tareas/${id}` : '/tareas', { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
        estado.tareas = id ? estado.tareas.map(item => item.id_tarea === id ? respuesta.dato : item) : [...estado.tareas, respuesta.dato];
        await actualizarAvisos();
        cerrarTarea(); renderizarTareas(); renderizarResumen(); avisar(`Tarea ${id ? 'actualizada' : 'creada'}.`, 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  ['buscar-tarea', 'filtro-prioridad', 'filtro-estado'].forEach(id => $(`#${id}`).addEventListener('input', renderizarTareas));
  $('#iniciar-temporizador').addEventListener('click', alternarTemporizador);
  $('#guardar-temporizador').addEventListener('click', () => guardarSesion().catch(error => avisar(error.message, 'error')));
  $('#cancelar-temporizador').addEventListener('click', () => detenerTemporizador());
  $('#form-recordatorio').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const tarea = estado.tareas.find(item => item.id_tarea === f.elements.id_tarea.value);
        const programada = new Date(`${f.elements.fecha_programada.value}T00:00:00`);
        const entrega = new Date(`${tarea?.fecha_entrega}T00:00:00`);
        const anticipacion = entrega.getTime() - programada.getTime();
        if (!tarea || !Number.isFinite(anticipacion) || anticipacion < 86_400_000) {
          throw new Error('El recordatorio debe programarse al menos un día antes de la entrega.');
        }
        const respuesta = await api('/recordatorios', { method: 'POST', body: JSON.stringify({ id_tarea: f.elements.id_tarea.value, fecha_programada: f.elements.fecha_programada.value, mensaje: f.elements.mensaje.value }) });
        estado.recordatorios.push(respuesta.dato); f.reset(); renderizarRecordatorios(); avisar('Recordatorio creado.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#habilitar-avisos').addEventListener('click', solicitarPermisoAvisos);
  $('#marcar-notificaciones').addEventListener('click', async () => {
    try { await api('/notificaciones/leidas', { method: 'PATCH' }); estado.notificaciones = estado.notificaciones.map(item => ({ ...item, leida: true })); renderizarNotificaciones(); }
    catch (error) { avisar(error.message, 'error'); }
  });
  $('#form-preferencias').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const respuesta = await api('/preferencias', { method: 'PUT', body: JSON.stringify({ tema: f.elements.tema.value, modo_oscuro: f.elements.modo_oscuro.checked }) });
        estado.preferencias = respuesta.dato; aplicarPreferencias(); avisar('Preferencias guardadas.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-perfil').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const respuesta = await api(`/cuentas/${estado.cuenta.id_cuenta}`, { method: 'PUT', body: JSON.stringify({ nombre: f.elements.nombre.value.trim(), correo: f.elements.correo.value.trim() }) });
        estado.cuenta = respuesta.dato; renderizarUsuario(); avisar('Perfil actualizado.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-preferencias').elements.tema.addEventListener('change', evento => { document.documentElement.dataset.tema = evento.target.value; });
  $('#form-preferencias').elements.modo_oscuro.addEventListener('change', evento => { document.documentElement.classList.toggle('modo-oscuro', evento.target.checked); });

  $('#cerrar-recompensa').addEventListener('click', () => $('#modal-recompensa').close());
  $('#cerrar-detalle-tarea').addEventListener('click', () => $('#modal-detalle-tarea').close());
  $('#editar-desde-detalle').addEventListener('click', evento => {
    $('#modal-detalle-tarea').close(); navegar('tareas');
    abrirTarea(estado.tareas.find(item => item.id_tarea === evento.currentTarget.dataset.id));
  });
  $('#form-estadisticas').addEventListener('submit', evento => {
    evento.preventDefault(); duranteEnvio(evento.currentTarget, async () => {
      try { await cargarEstadisticas(); } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-institucional').addEventListener('submit', evento => {
    evento.preventDefault(); duranteEnvio(evento.currentTarget, async () => {
      try { await cargarInstitucionales(); } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#boton-exportar').addEventListener('click', async evento => {
    // `currentTarget` vuelve a null cuando el listener cede en un `await`.
    const botonExportar = evento.currentTarget;
    botonExportar.disabled = true;
    try {
      const respuesta = await fetch(`${API}/exportacion/datos`, { headers: { Authorization: `Bearer ${estado.token}` } });
      if (!respuesta.ok) throw new Error((await respuesta.json().catch(() => null))?.error || 'No fue posible exportar los datos');
      const blob = await respuesta.blob();
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(blob); enlace.download = 'datos.json'; enlace.click();
      URL.revokeObjectURL(enlace.href);
      $('#estado-exportacion').textContent = 'Tus datos han sido exportados exitosamente.';
    } catch (error) { $('#estado-exportacion').textContent = error.message; avisar(error.message, 'error'); }
    finally { botonExportar.disabled = false; }
  });
  $('#recargar-admin').addEventListener('click', async () => {
    try {
      const [cuentas, niveles, insignias] = await Promise.all([api('/cuentas'), api('/niveles'), api('/insignias')]);
      estado.cuentasAdmin = cuentas.datos; estado.niveles = niveles.datos; estado.insignias = insignias.datos;
      renderizarAdministracion(); await cargarDetalleAdministrativo(); avisar('Datos administrativos actualizados.', 'exito');
    } catch (error) { avisar(error.message, 'error'); }
  });
  $('#form-admin-insignia').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const respuesta = await api('/insignias', { method: 'POST', body: JSON.stringify({ nombre: f.elements.nombre.value, descripcion: f.elements.descripcion.value, condicion: f.elements.condicion.value, icono: f.elements.icono.value || null }) });
        estado.insignias.push(respuesta.dato); f.reset(); renderizarAdministracion(); avisar('Insignia creada.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-admin-nivel').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const respuesta = await api('/niveles', { method: 'POST', body: JSON.stringify({ nombre: f.elements.nombre.value, descripcion: f.elements.descripcion.value, puntos_minimos: Number(f.elements.puntos_minimos.value), orden: Number(f.elements.orden.value) }) });
        estado.niveles.push(respuesta.dato); f.reset(); renderizarAdministracion(); avisar('Nivel creado.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-admin-reto').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        await api('/retos', { method: 'POST', body: JSON.stringify({ id_cuenta: f.elements.id_cuenta.value, descripcion: f.elements.descripcion.value, condicion: f.elements.condicion.value, puntos_recompensa: Number(f.elements.puntos_recompensa.value), semana: f.elements.semana.value }) });
        const idCuenta = f.elements.id_cuenta.value;
        f.reset(); await cargarDetalleAdministrativo(idCuenta); avisar('Reto semanal asignado.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-admin-punto').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const idCuenta = $('#admin-correccion-cuenta').value;
        if (!idCuenta) throw new Error('Selecciona una cuenta para la corrección.');
        await api('/puntos', { method: 'POST', body: JSON.stringify({
          id_cuenta: idCuenta, cantidad: Number(f.elements.cantidad.value),
          origen: f.elements.origen.value, motivo: f.elements.motivo.value.trim()
        }) });
        f.reset(); await cargarDetalleAdministrativo(idCuenta);
        avisar('Puntos registrados y estudiante notificado.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-admin-asignar-insignia').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const idCuenta = $('#admin-correccion-cuenta').value;
        if (!idCuenta) throw new Error('Selecciona una cuenta para la corrección.');
        await api('/cuenta-insignias', { method: 'POST', body: JSON.stringify({
          id_cuenta: idCuenta, id_insignia: f.elements.id_insignia.value,
          motivo: f.elements.motivo.value.trim()
        }) });
        f.reset(); await cargarDetalleAdministrativo(idCuenta);
        avisar('Insignia asignada y estudiante notificado.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#admin-reto-cuenta').addEventListener('change', evento => cargarDetalleAdministrativo(evento.target.value).catch(error => avisar(error.message, 'error')));
  $('#admin-correccion-cuenta').addEventListener('change', evento => cargarDetalleAdministrativo(evento.target.value).catch(error => avisar(error.message, 'error')));
}

/** Punto de entrada del navegador. Intenta restaurar una sesión de la pestaña. */
/** RF01/HU01: registra eventos y recupera una sesión si hay token. */
async function iniciar() {
  registrarEventos();
  if (estado.token) await cargarAplicacion(); else mostrarAcceso();
}

iniciar();
