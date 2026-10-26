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
  temporizador: { restante: DURACION_POMODORO, transcurrido: 0, intervalo: null, activo: false, modo: 'pomodoro', descanso: false }
};
const adminUI = { paginaUsuarios: 1, tamanoPagina: 20, cuentaSeleccionada: '', accionConfirmada: null };

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
  let respuesta;
  try { respuesta = await fetch(`${API}${ruta}`, { ...opciones, headers: encabezados }); }
  catch (_) { throw new Error('No se pudo conectar con el servidor. Verifica que esté en ejecución.'); }
  const contenido = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const error = new Error(contenido?.error || 'No fue posible completar la solicitud');
    error.status = respuesta.status;
    error.contenido = contenido;
    throw error;
  }
  return contenido;
}

/** Presenta confirmaciones y errores sin bloquear la navegación. */
/** RF02/HU02: comunica éxito o fallo de una acción mediante la región de avisos. */
function avisar(mensaje, tipo = 'informacion') {
  const aviso = document.createElement('div');
  aviso.className = `aviso ${tipo}`;
  aviso.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
  aviso.textContent = `${tipo === 'error' ? 'Error: ' : tipo === 'exito' ? 'Listo: ' : ''}${mensaje}`;
  // Una sola confirmación evita cubrir la interfaz cuando hay acciones rápidas.
  $('#avisos').replaceChildren(aviso);
  // Los errores permanecen más tiempo para poder leerlos y corregir el formulario.
  window.setTimeout(() => aviso.remove(), tipo === 'error' ? 8000 : 3200);
}

/** Deshabilita temporalmente un formulario para evitar envíos duplicados. */
/** RF02/HU02: deshabilita botones del formulario mientras termina su solicitud. */
async function duranteEnvio(formulario, trabajo) {
  const botones = [...formulario.querySelectorAll('button')];
  formulario.setAttribute('aria-busy', 'true');
  botones.forEach(boton => {
    boton.disabled = true;
    if (boton.type === 'submit') boton.setAttribute('aria-busy', 'true');
  });
  try { return await trabajo(); }
  finally {
    formulario.removeAttribute('aria-busy');
    botones.forEach(boton => { boton.disabled = false; boton.removeAttribute('aria-busy'); });
  }
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
  cerrarPanelMas();
  $$('.vista').forEach(vista => { vista.hidden = vista.dataset.seccion !== nombre; });
  $$('.nav-item').forEach(item => {
    const activa = item.dataset.vista === nombre;
    item.classList.toggle('activo', activa);
    if (activa) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  const titulo = destino.querySelector('h2');
  if (titulo) {
    titulo.tabIndex = -1;
    titulo.focus({ preventScroll: true });
  }
}

/** RF01/HU01: alterna registro/login manteniendo el estado accesible de las pestañas. */
function seleccionarAcceso(nombre) {
  const login = nombre === 'login';
  if (!login) cargarCatalogoMaterias();
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
/** RF01/HU01: solicita revocación, limpia el token y vuelve al acceso.
 * Con `revocar = false` solo limpia el estado local (la cuenta ya fue desactivada). */
async function cerrarSesion(revocar = true) {
  detenerRecepcionAvisos();
  try { if (revocar && estado.token) await api('/auth/logout', { method: 'POST' }); }
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
  let respuesta;
  try {
    respuesta = await api('/auth/login', { method: 'POST', body: JSON.stringify({ correo, contrasena }) });
  } catch (error) {
    if (error.contenido?.requiere_verificacion) { abrirCodigoCorreo(error.contenido.desafio, 'verificar', correo); return; }
    throw error;
  }
  if (respuesta.requiere_codigo) { abrirCodigoCorreo(respuesta.desafio, 'login', correo); return; }
  await aceptarSesionCorreo(respuesta);
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
      await cargarCatalogoMateriasAdmin();
      renderizarUsuario(); renderizarAdministracion(); await cargarDetalleAdministrativo(); mostrarAplicacion(); prepararPeriodos();
      navegar('administracion'); return;
    }
    const [materias, tareas, sesiones, puntos, niveles, insignias, cuentaInsignias, retos, metaSugerida, metas, recordatorios, notificaciones, preferencias] = await Promise.all([
      cargarSeguro('/materias', { datos: [] }), cargarSeguro('/tareas', { datos: [] }),
      cargarSeguro('/sesiones', { datos: [] }), cargarSeguro('/puntos', { datos: [], total: 0 }),
      cargarSeguro('/niveles', { datos: [] }), cargarSeguro('/insignias', { datos: [] }),
      cargarSeguro('/cuenta-insignias', { datos: [] }), cargarSeguro('/retos', { datos: [] }),
      cargarSeguro('/metas/sugerida', { dato: null }), cargarSeguro('/metas', { datos: [] }),
      cargarSeguro('/recordatorios', { datos: [] }),
      cargarSeguro('/notificaciones', { datos: [] }), cargarSeguro('/preferencias', { dato: null })
    ]);
    Object.assign(estado, {
      materias: materias.datos, tareas: tareas.datos, sesiones: sesiones.datos,
      puntos: puntos.datos, totalPuntos: puntos.total, niveles: niveles.datos,
      insignias: insignias.datos, cuentaInsignias: cuentaInsignias.datos,
      retos: retos.datos, metas: metas.datos, recordatorios: recordatorios.datos,
      notificaciones: notificaciones.datos, preferencias: preferencias.dato
    });
    if (metaSugerida.dato && !estado.metas.some(item => item.id_meta === metaSugerida.dato.id_meta)) {
      estado.metas = [...estado.metas, metaSugerida.dato];
    }
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
  $$('.nav-grupo').forEach(grupo => {
    const botones = [...grupo.querySelectorAll('.nav-item[data-vista]')];
    if (botones.length) grupo.hidden = !botones.some(boton => !boton.hidden);
  });
  const progreso = $('#nav-progreso');
  if (progreso) progreso.hidden = rol !== 'Estudiante';
  configurarPanelMovil();
}

const CLAVE_NAV_COLAPSADA = 'studyquest_nav_colapsada';

function guardarPreferenciaNav(colapsada) {
  try { localStorage.setItem(CLAVE_NAV_COLAPSADA, String(colapsada)); } catch (_) { /* La interfaz sigue funcionando sin persistencia. */ }
}

function leerPreferenciaNav() {
  try { return localStorage.getItem(CLAVE_NAV_COLAPSADA) === 'true'; } catch (_) { return false; }
}

function aplicarEstadoNavegacion(colapsada) {
  const nav = $('.navegacion');
  const boton = $('#alternar-navegacion');
  if (!nav || !boton) return;
  nav.classList.toggle('colapsada', colapsada);
  boton.setAttribute('aria-expanded', String(!colapsada));
  boton.setAttribute('aria-label', colapsada ? 'Expandir menú' : 'Contraer menú');
  nav.dataset.colapsada = String(colapsada);
}

function cerrarPanelMas(devolverFoco = false) {
  const panel = $('#nav-panel-mas');
  const boton = $('#nav-mas');
  if (!panel || !boton) return;
  panel.hidden = true;
  boton.setAttribute('aria-expanded', 'false');
  if (devolverFoco) boton.focus();
}

function configurarPanelMovil() {
  const lista = $('.nav-panel-lista');
  if (!lista) return;
  lista.replaceChildren();
  $$('.nav-contenido > .nav-grupo').slice(1).forEach(grupo => {
    if (grupo.hidden) return;
    const copia = grupo.cloneNode(true);
    copia.querySelectorAll('[hidden]').forEach(elemento => elemento.remove());
    copia.querySelectorAll('[id]').forEach(elemento => {
      const idOriginal = elemento.id;
      const idNuevo = `${idOriginal}-movil`;
      elemento.id = idNuevo;
      if (elemento.tagName === 'H2') copia.setAttribute('aria-labelledby', idNuevo);
    });
    copia.querySelectorAll('[data-vista]').forEach(elemento => {
      elemento.dataset.vistaMobile = elemento.dataset.vista;
      delete elemento.dataset.vista;
    });
    lista.append(copia);
  });
  const botonMas = $('#nav-mas');
  if (botonMas) botonMas.hidden = !lista.querySelector('[data-vista-mobile]');
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

/** Bloque E: representa valores existentes sin modificar el progreso del servidor. */
function progresoVisual(actual, objetivo, etiqueta) {
  const maximo = Number(objetivo);
  const valor = Number(actual);
  if (!Number.isFinite(maximo) || maximo <= 0 || !Number.isFinite(valor)) return '';
  return `<progress max="${maximo}" value="${Math.max(0, Math.min(valor, maximo))}" aria-label="${escapar(etiqueta)}" aria-valuetext="${escapar(actual)} de ${maximo}"></progress>`;
}

const DIAS_HORARIO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MINUTOS_INICIO_HORARIO = 5 * 60;
const MINUTOS_FIN_HORARIO = 22 * 60;

function etiquetaHora(minutos) {
  const hora = Math.floor(minutos / 60);
  const minutosHora = String(minutos % 60).padStart(2, '0');
  const periodo = hora < 12 ? 'a. m.' : 'p. m.';
  const hora12 = hora % 12 || 12;
  return `${hora12}:${minutosHora} ${periodo}`;
}

function opcionesHorasHorario() {
  return Array.from({ length: ((MINUTOS_FIN_HORARIO - MINUTOS_INICIO_HORARIO) / 30) + 1 }, (_, indice) => {
    const minutos = MINUTOS_INICIO_HORARIO + indice * 30;
    return `<option value="${minutos}">${etiquetaHora(minutos)}</option>`;
  }).join('');
}

function htmlSelectorHorario(indice = 0) {
  const sufijo = indice ? `-${indice}` : '';
  return `<div class="franja-horario" data-franja-horario>
    <div class="selector-horario-campos">
      <label>Día<select data-horario-dia aria-label="Día de la franja ${indice + 1}">
        <option value="">Sin horario</option>${DIAS_HORARIO.map(dia => `<option value="${dia}">${dia}</option>`).join('')}
      </select></label>
      <label>Hora de inicio<select data-horario-inicio aria-label="Hora de inicio de la franja ${indice + 1}" disabled><option value="">Selecciona la hora</option>${opcionesHorasHorario()}</select></label>
      <label>Hora de fin<select data-horario-fin aria-label="Hora de fin de la franja ${indice + 1}" disabled><option value="">Selecciona la hora</option>${opcionesHorasHorario()}</select></label>
    </div>
    ${indice ? `<button type="button" class="boton peligro pequeno" data-quitar-horario aria-label="Quitar franja ${indice + 1}">Quitar</button>` : ''}
    <small class="error-campo" data-error-horario hidden></small>
  </div>`;
}

function htmlSelectorHorarioCompleto() {
  return `<fieldset class="selector-horario" data-selector-horario-control>
    <legend>Horario <span class="opcional">opcional</span></legend>
    <div data-franjas-horario>${htmlSelectorHorario()}</div>
    <button type="button" class="boton secundario pequeno" data-agregar-horario aria-label="Agregar otro día">Agregar otro día</button>
    <p class="texto-secundario" data-horario-legado hidden></p>
    <small class="error-campo" data-error-horario-general hidden></small>
    <input type="hidden" name="horario" value="">
  </fieldset>`;
}

function selectorHorario(formulario) {
  return formulario.querySelector('[data-selector-horario-control]');
}

function actualizarFranjaHorario(franja) {
  const dia = franja.querySelector('[data-horario-dia]');
  const inicio = franja.querySelector('[data-horario-inicio]');
  const fin = franja.querySelector('[data-horario-fin]');
  const habilitado = Boolean(dia.value);
  inicio.disabled = !habilitado;
  fin.disabled = !habilitado;
  if (!habilitado) {
    inicio.value = '';
    fin.value = '';
  }
}

function errorHorario(control, mensaje = '') {
  const error = control.querySelector('[data-error-horario-general]');
  error.textContent = mensaje;
  error.hidden = !mensaje;
  control.querySelector('[data-franjas-horario]').querySelectorAll('[data-horario-dia],[data-horario-inicio],[data-horario-fin]').forEach(campo => {
    if (mensaje) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
  });
}

function leerHorario(formulario) {
  const control = selectorHorario(formulario);
  if (!control) return { valor: '', valido: true };
  const legado = control.dataset.horarioLegado || '';
  const franjas = [...control.querySelectorAll('[data-franja-horario]')];
  const resultados = [];
  const dias = new Set();
  let mensaje = '';
  for (const franja of franjas) {
    const dia = franja.querySelector('[data-horario-dia]').value;
    const inicio = franja.querySelector('[data-horario-inicio]').value;
    const fin = franja.querySelector('[data-horario-fin]').value;
    if (!dia) continue;
    if (!inicio || !fin) { mensaje = 'Selecciona la hora de inicio y de fin.'; break; }
    if (Number(fin) <= Number(inicio)) { mensaje = 'La hora de fin debe ser posterior a la de inicio.'; break; }
    if (dias.has(dia)) { mensaje = 'No puedes repetir el mismo día en dos franjas.'; break; }
    dias.add(dia);
    resultados.push(`${dia} ${etiquetaHora(Number(inicio))} – ${etiquetaHora(Number(fin))}`);
  }
  const valor = resultados.join('; ');
  if (!mensaje && valor.length > 100) mensaje = 'El horario no puede superar 100 caracteres.';
  if (!mensaje && !resultados.length && legado) {
    formulario.elements.horario.value = legado;
    errorHorario(control);
    return { valor: legado, valido: true };
  }
  formulario.elements.horario.value = mensaje ? '' : valor;
  errorHorario(control, mensaje);
  return { valor: mensaje ? '' : valor, valido: !mensaje };
}

function inicializarSelectoresHorario() {
  $$('[data-selector-horario]').forEach(contenedor => {
    contenedor.innerHTML = htmlSelectorHorarioCompleto();
    const control = contenedor.firstElementChild;
    const formulario = contenedor.closest('form');
    control.querySelector('[data-franjas-horario]').addEventListener('change', evento => {
      if (evento.target.matches('[data-horario-dia]')) actualizarFranjaHorario(evento.target.closest('[data-franja-horario]'));
      delete control.dataset.horarioLegado;
      control.querySelector('[data-horario-legado]').hidden = true;
      leerHorario(formulario);
    });
    control.querySelector('[data-agregar-horario]').addEventListener('click', () => {
      const franjas = control.querySelector('[data-franjas-horario]');
      if (franjas.children.length >= 3) return;
      franjas.insertAdjacentHTML('beforeend', htmlSelectorHorario(franjas.children.length));
      franjas.lastElementChild.querySelector('[data-quitar-horario]').addEventListener('click', evento => {
        const siguiente = evento.currentTarget.closest('[data-franja-horario]').previousElementSibling?.querySelector('[data-horario-dia]');
        evento.currentTarget.closest('[data-franja-horario]').remove();
        leerHorario(formulario);
        (siguiente || control.querySelector('[data-horario-dia]')).focus();
      });
      leerHorario(formulario);
      franjas.lastElementChild.querySelector('[data-horario-dia]').focus();
      if (franjas.children.length === 3) control.querySelector('[data-agregar-horario]').disabled = true;
    });
    formulario.addEventListener('reset', () => window.setTimeout(() => establecerHorario(formulario, ''), 0));
    leerHorario(formulario);
  });
}

function establecerHorario(formulario, valor) {
  const control = selectorHorario(formulario);
  if (!control) return;
  const franjas = control.querySelector('[data-franjas-horario]');
  const filas = valor ? valor.split('; ').map(parte => {
    const coincidencia = parte.match(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo) (\d{1,2}):(\d{2}) ([ap])\. m\. – (\d{1,2}):(\d{2}) ([ap])\. m\.$/);
    if (!coincidencia) return null;
    const convertir = (hora, minutos, periodo) => ((Number(hora) % 12) + (periodo === 'p' ? 12 : 0)) * 60 + Number(minutos);
    return { dia: coincidencia[1], inicio: convertir(coincidencia[2], coincidencia[3], coincidencia[4]), fin: convertir(coincidencia[5], coincidencia[6], coincidencia[7]) };
  }) : [];
  control.dataset.horarioLegado = '';
  if (valor && (!filas.length || filas.some(franja => !franja))) {
    control.dataset.horarioLegado = valor;
    control.querySelector('[data-horario-legado]').textContent = `Actual: ${valor}`;
    control.querySelector('[data-horario-legado]').hidden = false;
  }
  franjas.innerHTML = htmlSelectorHorario();
  for (const [indice, franja] of filas.filter(Boolean).entries()) {
    if (indice) franjas.insertAdjacentHTML('beforeend', htmlSelectorHorario(indice));
    const fila = franjas.children[indice];
    fila.querySelector('[data-horario-dia]').value = franja.dia;
    fila.querySelector('[data-horario-inicio]').value = franja.inicio;
    fila.querySelector('[data-horario-fin]').value = franja.fin;
    actualizarFranjaHorario(fila);
  }
  franjas.querySelectorAll('[data-quitar-horario]').forEach(boton => boton.addEventListener('click', () => {
    boton.closest('[data-franja-horario]').remove();
    leerHorario(formulario);
  }));
  control.querySelector('[data-agregar-horario]').disabled = franjas.children.length >= 3;
  formulario.elements.horario.value = valor || '';
  if (filas.length && filas.every(Boolean)) leerHorario(formulario);
}

/** Bloque E: el texto hace perceptible el estado del reto además de su color. */
function estadoRetoVisual(reto) {
  const estadoVisual = reto.completado ? 'completado' : reto.activo ? 'activo' : 'inactivo';
  return `<span class="chip estado-${estadoVisual}">${estadoVisual === 'completado' ? 'Completado' : estadoVisual === 'activo' ? 'Activo' : 'Inactivo'}</span>`;
}

/** RNF-06: acompaña la validación nativa con un error junto al campo. */
function prepararValidacionVisual() {
  let secuencia = 0;
  const errores = new WeakMap();
  function limpiar(campo) {
    const error = errores.get(campo);
    if (!error) return;
    campo.removeAttribute('aria-invalid');
    const descripciones = (campo.getAttribute('aria-describedby') || '').split(/\s+/).filter(id => id && id !== error.id);
    if (descripciones.length) campo.setAttribute('aria-describedby', descripciones.join(' '));
    else campo.removeAttribute('aria-describedby');
    error.remove();
    errores.delete(campo);
  }
  document.addEventListener('invalid', evento => {
    const campo = evento.target;
    if (!campo.matches('input,select,textarea')) return;
    limpiar(campo);
    const error = document.createElement('small');
    error.id = `error-campo-${++secuencia}`;
    error.className = 'error-campo';
    error.textContent = `Revisa este campo: ${campo.validationMessage}`;
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', `${campo.getAttribute('aria-describedby') || ''} ${error.id}`.trim());
    campo.insertAdjacentElement('afterend', error);
    errores.set(campo, error);
  }, true);
  document.addEventListener('input', evento => limpiar(evento.target));
  document.addEventListener('change', evento => limpiar(evento.target));
  document.addEventListener('reset', evento => {
    evento.target.querySelectorAll('[aria-invalid="true"]').forEach(limpiar);
  });
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
  $('#form-perfil').elements.nombre.value = estado.cuenta.nombre;
  $('#form-perfil').elements.correo.value = estado.cuenta.correo;
  $('#perfil-rol').textContent = estado.cuenta.rol;
  $('#form-perfil').elements.correo.readOnly = configuracionCorreo.verificacion_correo && estado.cuenta.rol === 'Estudiante';
  $('#form-mfa-correo').elements.activar.checked = Boolean(estado.cuenta.mfa_correo);
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
  const porcentaje = calcularPorcentajeNivel();
  $('#progreso-nivel').value = porcentaje;
  if ($('#nav-nivel')) $('#nav-nivel').textContent = nivel;
  if ($('#nav-puntos')) $('#nav-puntos').textContent = estado.totalPuntos || 0;
  if ($('#nav-progreso-barra')) $('#nav-progreso-barra').value = porcentaje;
  const proximas = [...pendientes].sort((a, b) => String(a.fecha_entrega).localeCompare(String(b.fecha_entrega))).slice(0, 3);
  $('#dashboard-tareas').innerHTML = proximas.length ? proximas.map(tarea => `
    <div class="item prioridad-${escapar(tarea.prioridad.toLowerCase())}">
      <div class="item-fila"><strong>${escapar(tarea.nombre)}</strong><span class="chip">${escapar(tarea.prioridad)}</span></div>
      <small>${escapar(materiaDe(tarea.id_materia))} · ${escapar(fechaLegible(tarea.fecha_entrega))}</small>
    </div>`).join('') : estadoVacio('No tienes tareas pendientes.');
}

function calcularPorcentajeNivel() {
  const puntos = Number(estado.totalPuntos || 0);
  const niveles = [...estado.niveles].sort((a, b) => a.puntos_minimos - b.puntos_minimos);
  const nivelBase = niveles.filter(item => item.puntos_minimos <= puntos).at(-1);
  const siguiente = niveles.find(item => item.puntos_minimos > puntos);
  return siguiente && nivelBase
    ? Math.min(100, Math.round(((puntos - nivelBase.puntos_minimos) / (siguiente.puntos_minimos - nivelBase.puntos_minimos)) * 100))
    : 100;
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

/** RN26/Decisión #10: opciones públicas activas; sin selección se impide el alta. */
async function cargarCatalogoMaterias() {
  const formularios = [[$('#form-registro'), $('#aviso-catalogo-registro')], [$('#form-materia'), $('#aviso-catalogo-materia')]];
  for (const [formulario] of formularios) formulario.querySelector('[type=submit]').disabled = true;
  let datos = [], mensaje = '';
  try {
    ({ datos } = await api('/catalogo-materias'));
    if (!datos.length) mensaje = 'No hay asignaturas disponibles en el catálogo; contacta al Administrador';
  } catch (_) { mensaje = 'No se pudo cargar el catálogo de asignaturas. Intenta nuevamente.'; }
  for (const [formulario, aviso] of formularios) {
    const select = formulario.elements.id_catalogo_materia;
    const anterior = select.value;
    select.innerHTML = '<option value="">Selecciona una asignatura</option>' + datos.map(item => `<option value="${escapar(item.id_catalogo_materia)}">${escapar(item.nombre)}</option>`).join('');
    select.value = anterior;
    select.disabled = !datos.length;
    aviso.textContent = mensaje;
    const editando = formulario.id === 'form-materia' && formulario.elements.id.value;
    select.required = !editando;
    formulario.querySelector('[type=submit]').disabled = !datos.length && !editando;
  }
}

/** RF09/HU16: muestra materias y controles de edición/eliminación. */
function renderizarMaterias() {
  $('#total-materias').textContent = estado.materias.length;
  $('#lista-materias').innerHTML = estado.materias.length ? estado.materias.map(materia => `
    <div class="item"><div class="item-fila"><div><strong>${escapar(materia.nombre)}</strong>${materia.id_catalogo_materia ? '' : ' <span class="chip">sin catálogo</span>'}<br><small>${escapar(materia.horario || 'Sin horario')}</small></div>
      <div class="acciones"><button class="boton secundario pequeno" data-accion="editar-materia" data-id="${escapar(materia.id_materia)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-materia" data-id="${escapar(materia.id_materia)}">Eliminar</button></div>
    </div></div>`).join('') : estadoVacio('Aún no hay materias registradas.');
  $('#tarea-materia').innerHTML = `<option value="">Sin materia</option>${opcionesMaterias()}`;
  $('#filtro-materia').innerHTML = `<option value="">Todas</option>${opcionesMaterias()}`;
}

/** RF02/HU02 y RF09/HU09: muestra tareas filtradas y acciones disponibles. */
function renderizarTareas() {
  const texto = $('#buscar-tarea').value.trim().toLowerCase();
  const prioridad = $('#filtro-prioridad').value;
  const idMateria = $('#filtro-materia').value;
  const situacion = $('#filtro-estado').value;
  const fechaDesde = $('#filtro-fecha-desde').value;
  const fechaHasta = $('#filtro-fecha-hasta').value;
  if (fechaDesde && fechaHasta && fechaDesde > fechaHasta) {
    $('#lista-tareas').innerHTML = estadoVacio('El rango de fechas no es válido: “desde” no puede ser posterior a “hasta”.');
    return;
  }
  const hoy = new Date().toISOString().slice(0, 10);
  const filtradas = estado.tareas.filter(tarea => (!texto || tarea.nombre.toLowerCase().includes(texto)) && (!idMateria || tarea.id_materia === idMateria) && (!prioridad || tarea.prioridad === prioridad) && (!situacion || (situacion === 'Vencida' ? tarea.estado !== 'Completada' && tarea.fecha_entrega < hoy : tarea.estado === situacion)) && (!fechaDesde || tarea.fecha_entrega >= fechaDesde) && (!fechaHasta || tarea.fecha_entrega <= fechaHasta));
  $('#lista-tareas').innerHTML = filtradas.length ? filtradas.map(tarea => `
    <div class="item prioridad-${escapar(tarea.prioridad.toLowerCase())} ${tarea.estado === 'Completada' ? 'completada' : ''}">
      <div class="item-fila"><div><strong>${escapar(tarea.nombre)}</strong><br><small>${escapar(materiaDe(tarea.id_materia))} · vence ${escapar(fechaLegible(tarea.fecha_entrega))}</small></div><span class="chip">${escapar(tarea.prioridad)} · ${escapar(tarea.estado)}</span></div>
      <div class="acciones"><button class="boton secundario pequeno" data-accion="ver-tarea" data-id="${escapar(tarea.id_tarea)}">Detalle</button>${tarea.estado === 'Pendiente' ? `<button class="boton secundario pequeno" data-accion="iniciar-tarea" data-id="${escapar(tarea.id_tarea)}">En progreso</button>` : ''}${tarea.estado !== 'Completada' ? `<button class="boton primario pequeno" data-accion="completar-tarea" data-id="${escapar(tarea.id_tarea)}">Completar</button>` : ''}<button class="boton secundario pequeno" data-accion="editar-tarea" data-id="${escapar(tarea.id_tarea)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-tarea" data-id="${escapar(tarea.id_tarea)}">Eliminar</button></div>
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
    return `<div class="item insignia ${asignacion ? 'obtenida' : 'bloqueada'}" title="${escapar(insignia.descripcion)} · Condición: ${escapar(insignia.condicion)}"><strong>${escapar(insignia.nombre)}</strong><span class="chip ${asignacion ? 'logro' : 'estado-inactivo'}">${asignacion ? 'Obtenida' : 'Por desbloquear'}</span><small>${asignacion ? `Obtenida ${escapar(fechaLegible(asignacion.fecha_obtenida))}` : `Condición: ${escapar(insignia.condicion)}`}</small></div>`;
  }).join('') : estadoVacio('El catálogo de insignias está vacío.');
  const avances = [
    ...estado.retos.map(reto => `<div class="item"><div class="item-fila"><div><strong>${escapar(reto.descripcion)}</strong><br><small>Reto · progreso ${escapar(reto.progreso)}${reto.completado ? ' · completado' : ''}${reto.activo ? '' : ' · inactivo'}</small>${estadoRetoVisual(reto)}${progresoVisual(reto.progreso, String(reto.condicion).split(':')[1], 'Progreso del reto')}</div><div class="acciones">${reto.completado ? '' : `<button class="boton secundario pequeno" data-accion="editar-reto" data-id="${escapar(reto.id_reto)}">Editar</button>`}${botonEstadoReto(reto)}${reto.activo && !reto.completado && reto.id_cuenta === estado.cuenta.id_cuenta ? `<button class="boton primario pequeno" data-accion="completar-reto" data-id="${escapar(reto.id_reto)}">Completar</button>` : ''}${reto.completado ? '' : `<button class="boton peligro pequeno" data-accion="eliminar-reto" data-id="${escapar(reto.id_reto)}">Eliminar</button>`}</div></div></div>`),
    ...estado.metas.map(meta => `<div class="item"><div class="item-fila"><div><strong>${escapar(meta.descripcion)}</strong><br><small>Meta · ${escapar(meta.valor_actual)}/${escapar(meta.valor_objetivo)}${meta.cumplida ? ' · cumplida' : ''}</small>${progresoVisual(meta.valor_actual, meta.valor_objetivo, 'Progreso de la meta')}</div><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-meta" data-id="${escapar(meta.id_meta)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-meta" data-id="${escapar(meta.id_meta)}">Eliminar</button></div></div></div>`)
  ];
  $('#lista-retos-metas').innerHTML = avances.length ? avances.join('') : estadoVacio('No tienes retos o metas registrados.');
  const movimientos = [...estado.puntos].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).slice(0, 10);
  $('#lista-historial-gamificacion').innerHTML = movimientos.length ? movimientos.map(item => `<div class="item"><strong>${escapar(item.cantidad)} puntos · ${escapar(item.origen)}</strong><small>${escapar(fechaLegible(item.fecha))}</small></div>`).join('') : estadoVacio('Aún no tienes movimientos de puntos.');
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
  $('#estadisticas-metas').innerHTML = dato.metas.length ? dato.metas.map(meta => `<div class="item"><strong>${escapar(meta.descripcion)}</strong><small>${meta.valor_actual}/${meta.valor_objetivo} · ${meta.cumplida ? 'Cumplida' : 'En progreso'}</small>${progresoVisual(meta.valor_actual, meta.valor_objetivo, 'Progreso de la meta semanal')}</div>`).join('') : estadoVacio('No hay meta para esta semana.');
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

/** RF01/RN26/HU29, Decisión #10: bloque P17 del catálogo global. */
async function cargarCatalogoMateriasAdmin() {
  const { datos } = await api('/catalogo-materias?todas=true');
  estado.catalogoAdmin = datos;
  renderizarCatalogosAdmin();
}

/** RF01/HU27 y RF07/HU26: presenta cuentas, catálogos y correcciones. */
function renderizarAdministracion() {
  renderizarUsuariosAdmin();
  renderizarCatalogosAdmin();
  renderizarInsigniasAdmin();
  renderizarNivelesAdmin();
  const opcionesCuenta = estado.cuentasAdmin.filter(cuenta => cuenta.rol === 'Estudiante' && cuenta.activa).map(cuenta => `<option value="${escapar(cuenta.id_cuenta)}">${escapar(cuenta.nombre)}</option>`).join('');
  $('#admin-reto-cuenta').innerHTML = opcionesCuenta;
  $('#admin-reto-cuenta').disabled = !opcionesCuenta;
  $('#estado-cuentas-admin').hidden = Boolean(opcionesCuenta);
  $('#admin-insignia-correccion').innerHTML = estado.insignias
    .map(item => `<option value="${escapar(item.id_insignia)}">${escapar(item.nombre)}</option>`).join('');
  $('#lista-retos-admin').innerHTML = estado.retosAdmin.length ? `<table><caption class="visually-hidden">Retos de la cuenta seleccionada</caption><thead><tr><th>Descripción</th><th>Semana</th><th>Estado</th><th>Progreso</th><th>Acciones</th></tr></thead><tbody>${estado.retosAdmin.map(reto => `<tr><td data-label="Descripción"><strong>${escapar(reto.descripcion)}</strong></td><td data-label="Semana">${escapar(reto.semana)}</td><td data-label="Estado">${estadoRetoVisual(reto)}</td><td data-label="Progreso">${escapar(reto.progreso)} / ${escapar(String(reto.condicion).split(':')[1] || '?')}</td><td data-label="Acciones"><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-reto-admin" data-id="${escapar(reto.id_reto)}">Editar</button>${botonEstadoReto(reto)}${reto.completado ? '' : `<button class="boton peligro pequeno" data-accion="eliminar-reto-admin" data-id="${escapar(reto.id_reto)}">Eliminar</button>`}</div></td></tr>`).join('')}</tbody></table>` : estadoVacio(adminUI.cuentaSeleccionada ? 'Esta cuenta no tiene retos.' : 'Selecciona una cuenta para consultar sus retos.');
  const puntos = estado.puntosAdmin.map(item => `<tr><td data-label="Tipo">Puntos</td><td data-label="Detalle">${escapar(item.cantidad)} puntos · ${escapar(item.origen)}</td><td data-label="Fecha">${escapar(fechaLegible(item.fecha))}</td><td data-label="Acciones"><button class="boton peligro pequeno" data-accion="eliminar-punto-admin" data-id="${escapar(item.id_punto)}">Eliminar</button></td></tr>`);
  const asignaciones = estado.insigniasCuentaAdmin.map(item => `<tr><td data-label="Tipo">Insignia</td><td data-label="Detalle">${escapar(item.insignia?.nombre || 'Insignia')}</td><td data-label="Fecha">${escapar(fechaLegible(item.fecha_obtenida))}</td><td data-label="Acciones"><button class="boton peligro pequeno" data-accion="revocar-insignia-admin" data-id="${escapar(item.id_insignia)}" data-cuenta="${escapar(item.id_cuenta)}">Revocar</button></td></tr>`);
  $('#lista-correcciones-admin').innerHTML = [...puntos, ...asignaciones].length ? `<table><caption class="visually-hidden">Historial de correcciones</caption><thead><tr><th>Tipo</th><th>Detalle</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>${[...puntos, ...asignaciones].join('')}</tbody></table>` : estadoVacio(adminUI.cuentaSeleccionada ? 'No hay movimientos o insignias para corregir.' : 'Selecciona una cuenta en Retos semanales.');
  $('#total-retos-admin').textContent = estado.retosAdmin.length;
  $('#total-correcciones-admin').textContent = estado.puntosAdmin.length + estado.insigniasCuentaAdmin.length;
}

function renderizarUsuariosAdmin() {
  const texto = ($('#buscar-usuario-admin')?.value || '').trim().toLowerCase();
  const rol = $('#filtro-rol-admin')?.value || '';
  const estadoFiltro = $('#filtro-estado-admin')?.value || '';
  const filtradas = estado.cuentasAdmin.filter(cuenta => (!texto || `${cuenta.nombre} ${cuenta.correo}`.toLowerCase().includes(texto)) && (!rol || cuenta.rol === rol) && (!estadoFiltro || (estadoFiltro === 'activa' ? cuenta.activa : !cuenta.activa)));
  const visibles = filtradas.slice(0, adminUI.paginaUsuarios * adminUI.tamanoPagina);
  $('#total-usuarios-admin').textContent = filtradas.length;
  $('#resultado-usuarios-admin').textContent = `${filtradas.length} usuario${filtradas.length === 1 ? '' : 's'} encontrado${filtradas.length === 1 ? '' : 's'}.`;
  $('#mostrar-mas-usuarios').hidden = visibles.length >= filtradas.length;
  $('#mostrar-mas-usuarios').textContent = `Mostrar más (${Math.max(0, filtradas.length - visibles.length)})`;
  $('#lista-usuarios-admin').innerHTML = visibles.length ? `<table><caption class="visually-hidden">Usuarios administrativos</caption><thead><tr><th>Nombre y correo</th><th>Rol</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${visibles.map(cuenta => `<tr class="item" data-cuenta-row="${escapar(cuenta.id_cuenta)}" data-rol-original="${escapar(cuenta.rol)}" data-activa-original="${cuenta.activa}"><td data-label="Nombre y correo"><strong>${escapar(cuenta.nombre)}</strong><br><small>${escapar(cuenta.correo)}</small></td><td data-label="Rol"><span class="cuenta-rol">${escapar(cuenta.rol)}</span><select class="cuenta-rol-edicion" aria-label="Rol de ${escapar(cuenta.nombre)}" hidden><option>Estudiante</option><option>Administrador</option><option>Revisor institucional</option></select></td><td data-label="Estado"><span class="cuenta-estado chip ${cuenta.activa ? 'estado-activo' : 'estado-inactivo'}">${cuenta.activa ? 'Activa' : 'Inactiva'}</span><label class="cuenta-activa-edicion fila-toggle" hidden><input type="checkbox" aria-label="Activa de ${escapar(cuenta.nombre)}" ${cuenta.activa ? 'checked' : ''}> Activa</label></td><td data-label="Acciones"><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-usuario" data-id="${escapar(cuenta.id_cuenta)}">Editar</button><button class="boton primario pequeno" data-accion="guardar-usuario" data-id="${escapar(cuenta.id_cuenta)}" hidden disabled>Guardar</button><button class="boton secundario pequeno" data-accion="cancelar-usuario" data-id="${escapar(cuenta.id_cuenta)}" hidden>Cancelar</button></div></td></tr>`).join('')}</tbody></table>` : estadoVacio('No hay usuarios que coincidan con los filtros.');
}

function renderizarCatalogosAdmin() {
  const datos = estado.catalogoAdmin || [];
  $('#total-catalogo-admin').textContent = datos.length;
  $('#lista-catalogo-materias').innerHTML = datos.length ? `<table><thead><tr><th>Asignatura</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>${datos.map(item => `<tr><td data-label="Asignatura">${escapar(item.nombre)}</td><td data-label="Estado"><span class="chip ${item.activo ? 'estado-activo' : 'estado-inactivo'}">${item.activo ? 'Activa' : 'Inactiva'}</span></td><td data-label="Acciones"><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-catalogo" data-id="${escapar(item.id_catalogo_materia)}">Editar</button><button class="boton secundario pequeno" data-accion="estado-catalogo" data-id="${escapar(item.id_catalogo_materia)}" data-activo="${!item.activo}">${item.activo ? 'Desactivar' : 'Reactivar'}</button><button class="boton peligro pequeno" aria-label="Eliminar asignatura ${escapar(item.nombre)}" data-accion="eliminar-catalogo" data-id="${escapar(item.id_catalogo_materia)}">Eliminar</button></div></td></tr>`).join('')}</tbody></table>` : estadoVacio('No hay asignaturas en el catálogo.');
}

function renderizarInsigniasAdmin() {
  $('#total-insignias-admin').textContent = estado.insignias.length;
  $('#lista-insignias-admin').innerHTML = estado.insignias.length ? `<table><thead><tr><th>Nombre</th><th>Descripción</th><th>Condición</th><th>Acciones</th></tr></thead><tbody>${estado.insignias.map(item => `<tr><td data-label="Nombre">${escapar(item.nombre)}</td><td data-label="Descripción">${escapar(item.descripcion)}</td><td data-label="Condición">${escapar(item.condicion)}</td><td data-label="Acciones"><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-insignia-admin" data-id="${escapar(item.id_insignia)}">Editar</button><button class="boton peligro pequeno" aria-label="Eliminar insignia ${escapar(item.nombre)}" data-accion="eliminar-insignia-admin" data-id="${escapar(item.id_insignia)}">Eliminar</button></div></td></tr>`).join('')}</tbody></table>` : estadoVacio('No hay insignias registradas.');
}

function renderizarNivelesAdmin() {
  const niveles = [...estado.niveles].sort((a, b) => a.orden - b.orden);
  $('#total-niveles-admin').textContent = niveles.length;
  $('#lista-niveles-admin').innerHTML = niveles.length ? `<table><thead><tr><th>Orden</th><th>Nombre</th><th>Puntos mínimos</th><th>Acciones</th></tr></thead><tbody>${niveles.map(item => `<tr><td data-label="Orden">${escapar(item.orden)}</td><td data-label="Nombre">${escapar(item.nombre)}</td><td data-label="Puntos mínimos">${escapar(item.puntos_minimos)}</td><td data-label="Acciones"><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-nivel-admin" data-id="${escapar(item.id_nivel)}">Editar</button><button class="boton peligro pequeno" aria-label="Eliminar nivel ${escapar(item.nombre)}" data-accion="eliminar-nivel-admin" data-id="${escapar(item.id_nivel)}">Eliminar</button></div></td></tr>`).join('')}</tbody></table>` : estadoVacio('No hay niveles registrados.');
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
  adminUI.cuentaSeleccionada = idCuenta;
  renderizarAdministracion();
  $('#admin-reto-cuenta').value = idCuenta;
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
  if (resultado.insignias_desbloqueadas?.length) partes.push(`<p>Insignias: ${escapar(resultado.insignias_desbloqueadas.join(', '))}</p>`);
  if (resultado.retos_completados?.length) partes.push(`<p>Retos completados: ${escapar(resultado.retos_completados.join(', '))}</p>`);
  if (resultado.metas_cumplidas?.length) partes.push(`<p>Metas cumplidas: ${escapar(resultado.metas_cumplidas.join(', '))}</p>`);
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
    // RF13/HU13: las preferencias silencian alertas nativas, no borran el historial.
    // E7 clasifica recordatorios como Sistema; reconocemos el prefijo del
    // planificador y los mensajes manuales conservados en la lista de avisos.
    const esRecordatorio = aviso.tipo === 'Sistema' &&
      (aviso.mensaje.startsWith('Recordatorio:') || recordatorios.datos.some(item => item.mensaje === aviso.mensaje));
    const silenciado = (aviso.tipo === 'Reto' && estado.preferencias?.notificaciones_retos === false) ||
      (esRecordatorio && estado.preferencias?.notificaciones_recordatorios === false);
    if (!silenciado && !avisosConocidos.has(aviso.id_notificacion) && !aviso.leida && !estado.temporizador.activo &&
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
  if ($('#form-preferencias').elements.avatar) $('#form-preferencias').elements.avatar.value = estado.preferencias?.avatar || '😊';
  $('#form-preferencias').elements.modo_oscuro.checked = oscuro;
  $('#form-preferencias').elements.notificaciones_recordatorios.checked = estado.preferencias?.notificaciones_recordatorios !== false;
  $('#form-preferencias').elements.notificaciones_retos.checked = estado.preferencias?.notificaciones_retos !== false;
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

/** HU06/HU18: semana ISO local, incluyendo el año ISO en los cambios de año. */
function semanaActualReto() {
  const hoy = new Date();
  const jueves = new Date(Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
  jueves.setUTCDate(jueves.getUTCDate() + 4 - (jueves.getUTCDay() || 7));
  const inicio = new Date(Date.UTC(jueves.getUTCFullYear(), 0, 1));
  const semana = Math.ceil(((jueves - inicio) / 86400000 + 1) / 7);
  return `${jueves.getUTCFullYear()}-W${String(semana).padStart(2, '0')}`;
}

/** HU06/HU18: editor compartido para crear y editar retos propios pendientes. */
function abrirReto(reto = null) {
  const f = $('#form-reto');
  f.reset();
  f.elements.id.value = reto?.id_reto || '';
  f.elements.descripcion.value = reto?.descripcion || '';
  f.elements.puntos_recompensa.value = reto?.puntos_recompensa ?? '';
  f.elements.semana.value = reto?.semana || semanaActualReto();
  const condicion = /^(tareas|sesiones|minutos|pomodoros):([1-9]\d*)$/.exec(reto?.condicion || 'tareas:1');
  f.querySelector('[value="antigua"]')?.remove();
  // Los registros antiguos pueden conservar su condición libre al editar otros campos.
  if (!condicion) f.elements.tipo_condicion.add(new Option(`Actual: ${reto.condicion}`, 'antigua'));
  f.elements.tipo_condicion.value = condicion?.[1] || 'antigua';
  f.elements.objetivo.value = condicion?.[2] || '';
  f.elements.objetivo.disabled = !condicion;
  f.elements.progreso.value = reto?.progreso ?? 0;
  f.elements.progreso.disabled = !reto;
  $('#campo-progreso-reto').hidden = !reto;
  $('#titulo-form-reto').textContent = reto ? 'Editar reto' : 'Nuevo reto';
  $('#panel-form-reto').hidden = false;
  $('#mostrar-form-reto').setAttribute('aria-expanded', 'true');
  $('#panel-form-reto').scrollIntoView({ behavior: 'smooth', block: 'start' });
  f.elements.descripcion.focus({ preventScroll: true });
}

/** HU06/HU18: cierra el editor y devuelve el foco a su acción de apertura. */
function cerrarReto() {
  const id = $('#form-reto').elements.id.value;
  $('#form-reto').reset();
  $('#form-reto').elements.id.value = '';
  $('#panel-form-reto').hidden = true;
  $('#mostrar-form-reto').setAttribute('aria-expanded', 'false');
  const editar = $$('#lista-retos-metas [data-accion="editar-reto"]').find(b => b.dataset.id === id);
  (editar || $('#mostrar-form-reto')).focus();
}

/** RF09/HU16: devuelve el formulario de materia al modo de creación. */
function limpiarMateria() {
  $('#form-materia').reset();
  $('#form-materia').elements.id.value = '';
  $('#titulo-form-materia').textContent = 'Nueva materia';
  $('#cancelar-materia').hidden = true;
  cargarCatalogoMaterias();
}

/** RF10/HU10: representa los segundos restantes del cronómetro. */
function actualizarReloj() {
  if (estado.temporizador.modo === 'libre') {
    const minutosLibres = Math.floor(estado.temporizador.transcurrido / 60).toString().padStart(2, '0');
    const segundosLibres = (estado.temporizador.transcurrido % 60).toString().padStart(2, '0');
    $('#reloj').textContent = `${minutosLibres}:${segundosLibres}`;
    return;
  }
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
  $('#estado-temporizador').textContent = estado.temporizador.descanso ? 'Descanso activo.' : 'Modo enfoque activo.';
  $('#tarjeta-temporizador').classList.add('enfoque');
  estado.temporizador.intervalo = window.setInterval(() => {
    if (estado.temporizador.modo === 'libre') {
      estado.temporizador.transcurrido += 1;
    } else if (!estado.temporizador.descanso) {
      estado.temporizador.restante -= 1;
      estado.temporizador.transcurrido += 1;
    } else {
      estado.temporizador.restante -= 1;
    }
    actualizarReloj();
    if (estado.temporizador.modo === 'pomodoro' && estado.temporizador.restante <= 0 && !estado.temporizador.descanso) {
      estado.temporizador.descanso = true;
      estado.temporizador.restante = 5 * 60;
      $('#estado-temporizador').textContent = 'Pomodoro finalizado. Descanso de 5 minutos.';
      $('#tarjeta-temporizador').classList.remove('enfoque');
      avisarFinPomodoro();
    } else if (estado.temporizador.modo === 'pomodoro' && estado.temporizador.restante <= 0 && estado.temporizador.descanso) {
      estado.temporizador.descanso = false;
      estado.temporizador.restante = DURACION_POMODORO;
      $('#estado-temporizador').textContent = 'Descanso finalizado. Nuevo ciclo de enfoque.';
      $('#tarjeta-temporizador').classList.add('enfoque');
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
  const modo = estado.temporizador.modo;
  estado.temporizador = { restante: modo === 'libre' ? 0 : DURACION_POMODORO, transcurrido: 0, intervalo: null, activo: false, modo, descanso: false };
  if (!restablecer || !$('#reloj')) return;
  actualizarReloj();
  $('#iniciar-temporizador').hidden = false;
  $('#iniciar-temporizador').textContent = 'Iniciar';
  $('#guardar-temporizador').hidden = true;
  $('#cancelar-temporizador').hidden = true;
  $('#estado-temporizador').textContent = modo === 'libre' ? 'Listo para comenzar una sesión libre.' : 'Listo para comenzar una sesión Pomodoro.';
  $('#tarjeta-temporizador').classList.remove('enfoque');
}

/** RF10/HU10: envía la duración y presenta la recompensa confirmada. */
async function guardarSesion() {
  if (estado.temporizador.transcurrido < 1) return avisar('Inicia el cronómetro antes de guardar.', 'error');
  const duracion = Math.max(1, Math.ceil(estado.temporizador.transcurrido / 60));
  const respuesta = await api('/sesiones', { method: 'POST', body: JSON.stringify({
    id_tarea: $('#pomodoro-tarea').value || null, duracion_minutos: duracion, modo_enfoque: estado.temporizador.modo === 'pomodoro'
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
/** RF06/HU18/HU31/RN28: botón para desactivar o reactivar un reto sin alterar progreso ni puntos. */
function botonEstadoReto(reto) {
  return `<button class="boton secundario pequeno" data-accion="estado-reto" data-id="${escapar(reto.id_reto)}" data-activo="${reto.activo ? 'false' : 'true'}">${reto.activo ? 'Desactivar' : 'Reactivar'}</button>`;
}

function abrirFormularioAdmin(tipo, valores = {}, titulo = 'Nueva acción') {
  const modal = $('#modal-admin-form');
  const formulario = $(`#modal-admin-form [data-admin-form="${tipo}"]`);
  if (!modal || !formulario) return;
  if ((tipo === 'insignia' || tipo === 'reto') && valores.condicion) {
    const condicion = String(valores.condicion);
    const formatoActual = /^(tareas|sesiones|minutos|pomodoros):([1-9]\d*)$/.exec(condicion);
    const formatoHistorico = /^([1-9]\d*)_(tareas|sesiones|minutos|pomodoros)$/.exec(condicion);
    const parseada = formatoActual || (formatoHistorico && [null, formatoHistorico[2], formatoHistorico[1]]);
    if (parseada) valores = { ...valores, metrica: parseada[1], objetivo: parseada[2] };
  }
  $$('.admin-form').forEach(item => { item.hidden = item !== formulario; });
  formulario.reset();
  Object.entries(valores).forEach(([nombre, valor]) => {
    if (formulario.elements[nombre]) formulario.elements[nombre].value = valor ?? '';
  });
  if (tipo === 'insignia') sincronizarCondicionAdmin(formulario);
  if (tipo === 'reto') {
    formulario.elements.semana.value = valores.semana || semanaActualReto();
    sincronizarCondicionAdmin(formulario);
  }
  $('#titulo-modal-admin').textContent = titulo;
  formulario.dataset.focoInicial = Object.keys(valores).find(nombre => formulario.elements[nombre]?.type !== 'hidden') || 'nombre';
  modal.showModal();
  formulario.elements[formulario.dataset.focoInicial]?.focus();
}

function cerrarFormularioAdmin() {
  const modal = $('#modal-admin-form');
  if (modal?.open) modal.close();
}

function sincronizarCondicionAdmin(formulario) {
  const metrica = formulario.elements.metrica;
  const objetivo = formulario.elements.objetivo;
  if (!metrica || !objetivo) return;
  const valor = `${metrica.value}:${objetivo.value || 1}`;
  if (formulario.elements.condicion) formulario.elements.condicion.value = valor;
  const previa = $('#vista-previa-condicion');
  if (previa && formulario.dataset.adminForm === 'insignia') previa.textContent = valor;
}

function confirmarAdmin(detalle, accion, requiereMotivo = false) {
  const modal = $('#modal-admin-confirmar');
  adminUI.accionConfirmada = accion;
  $('#detalle-confirmar-admin').textContent = detalle;
  $('#campo-motivo-admin').hidden = !requiereMotivo;
  $('#form-confirmar-admin').elements.motivo.value = '';
  if (requiereMotivo) $('#form-confirmar-admin').elements.motivo.required = true;
  else $('#form-confirmar-admin').elements.motivo.required = false;
  modal.showModal();
  (requiereMotivo ? $('#form-confirmar-admin').elements.motivo : $('#cancelar-confirmar-admin')).focus();
}

function activarPestanaAdmin(nombre) {
  $$('.admin-tab').forEach(tab => {
    const activa = tab.dataset.adminTab === nombre;
    tab.classList.toggle('activo', activa);
    tab.setAttribute('aria-selected', String(activa));
    tab.tabIndex = activa ? 0 : -1;
  });
  $$('.admin-panel').forEach(panel => { panel.hidden = panel.id !== `admin-panel-${nombre}`; });
  const panel = $(`#admin-panel-${nombre}`);
  panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function manejarAccion(evento) {
  const boton = evento.target.closest('[data-accion]');
  if (!boton) return;
  const { accion, id } = boton.dataset;
  try {
    if (['editar-catalogo', 'estado-catalogo', 'eliminar-catalogo'].includes(accion)) {
      const ruta = `/catalogo-materias/${id}`;
      if (accion === 'editar-catalogo') {
        const actual = (estado.catalogoAdmin || []).find(item => item.id_catalogo_materia === id);
        return abrirFormularioAdmin('catalogo', { id, nombre: actual?.nombre }, 'Editar asignatura');
      } else if (accion === 'estado-catalogo') {
        await api(`${ruta}/estado`, { method: 'PATCH', body: JSON.stringify({ activo: boton.dataset.activo === 'true' }) });
      } else {
        return confirmarAdmin('¿Eliminar esta asignatura del catálogo?', { ruta, metodo: 'DELETE', refrescar: 'catalogo' });
      }
      await cargarCatalogoMateriasAdmin(); avisar('Catálogo actualizado.', 'exito');
    }
    if (accion === 'nueva-tarea') return abrirTarea();
    if (accion === 'editar-materia') {
      const materia = estado.materias.find(item => item.id_materia === id);
      $('#form-materia').elements.id.value = id;
      await cargarCatalogoMaterias();
      $('#form-materia').elements.id_catalogo_materia.value = materia.id_catalogo_materia || '';
      $('#form-materia').elements.id_catalogo_materia.options[0].textContent = 'Conservar asignatura actual';
      $('#form-materia').elements.id_catalogo_materia.required = false;
      $('#form-materia [type=submit]').disabled = false;
      establecerHorario($('#form-materia'), materia.horario || '');
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
    if (accion === 'iniciar-tarea') {
      const respuesta = await api(`/tareas/${id}`, { method: 'PUT', body: JSON.stringify({ estado: 'En progreso' }) });
      estado.tareas = estado.tareas.map(item => item.id_tarea === id ? respuesta.dato : item);
      renderizarTareas(); renderizarResumen(); avisar('Tarea marcada En progreso.', 'exito');
    }
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
      if (reto && !reto.completado) abrirReto(reto);
    }
    if (accion === 'completar-reto' && confirm('¿Deseas completar este reto y acreditar su recompensa?')) {
      boton.disabled = true;
      await api(`/retos/${id}/completar`, { method: 'PATCH' });
      await recargarGamificacion();
      avisar('Reto completado. Puntos actualizados.', 'exito');
    }
    if (accion === 'estado-reto') {
      const activo = boton.dataset.activo === 'true';
      const respuesta = await api(`/retos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) });
      const reemplazar = lista => lista.map(item => item.id_reto === id ? respuesta.dato : item);
      estado.retos = reemplazar(estado.retos); estado.retosAdmin = reemplazar(estado.retosAdmin);
      if (estado.cuenta?.rol === 'Administrador') renderizarAdministracion(); else renderizarGamificacion();
      avisar(activo ? 'Reto reactivado. Conserva su progreso y sus puntos.' : 'Reto desactivado. No recibirá progreso ni nuevas recompensas.', 'exito');
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
    if (accion === 'editar-usuario') {
      const fila = boton.closest('tr');
      const cuenta = estado.cuentasAdmin.find(item => item.id_cuenta === id);
      fila.classList.add('fila-edicion');
      fila.querySelector('.cuenta-rol').hidden = true; fila.querySelector('.cuenta-rol-edicion').hidden = false;
      fila.querySelector('.cuenta-rol-edicion').value = cuenta.rol;
      fila.querySelector('.cuenta-estado').hidden = true; fila.querySelector('.cuenta-activa-edicion').hidden = false;
      fila.querySelector('[data-accion="editar-usuario"]').hidden = true;
      fila.querySelector('[data-accion="guardar-usuario"]').hidden = false;
      fila.querySelector('[data-accion="cancelar-usuario"]').hidden = false;
      return;
    }
    if (accion === 'cancelar-usuario') return renderizarUsuariosAdmin();
    if (accion === 'guardar-usuario') {
      const fila = boton.closest('tr');
      const respuesta = await api(`/cuentas/${id}`, { method: 'PUT', body: JSON.stringify({
        rol: fila.querySelector('.cuenta-rol-edicion').value, activa: fila.querySelector('.cuenta-activa-edicion input').checked
      }) });
      estado.cuentasAdmin = estado.cuentasAdmin.map(item => item.id_cuenta === id ? respuesta.dato : item);
      renderizarAdministracion(); avisar('Cuenta actualizada.', 'exito');
    }
    if (accion === 'eliminar-insignia-admin') {
      return confirmarAdmin('¿Eliminar esta insignia?', { ruta: `/insignias/${id}`, metodo: 'DELETE', despues: () => { estado.insignias = estado.insignias.filter(item => item.id_insignia !== id); renderizarAdministracion(); avisar('Insignia eliminada.', 'exito'); } });
    }
    if (accion === 'eliminar-nivel-admin') {
      return confirmarAdmin('¿Eliminar este nivel?', { ruta: `/niveles/${id}`, metodo: 'DELETE', despues: () => { estado.niveles = estado.niveles.filter(item => item.id_nivel !== id); renderizarAdministracion(); avisar('Nivel eliminado.', 'exito'); } });
    }
    if (accion === 'editar-insignia-admin') {
      const actual = estado.insignias.find(item => item.id_insignia === id);
      return abrirFormularioAdmin('insignia', { id, nombre: actual.nombre, descripcion: actual.descripcion, condicion: actual.condicion, icono: actual.icono });
    }
    if (accion === 'editar-nivel-admin') {
      const actual = estado.niveles.find(item => item.id_nivel === id);
      return abrirFormularioAdmin('nivel', actual, 'Editar nivel');
    }
    if (accion === 'editar-reto-admin') {
      const actual = estado.retosAdmin.find(item => item.id_reto === id);
      const [metrica, objetivo] = String(actual.condicion || 'tareas:1').split(':');
      return abrirFormularioAdmin('reto', { id, descripcion: actual.descripcion, metrica, objetivo, puntos_recompensa: actual.puntos_recompensa, semana: actual.semana, condicion: actual.condicion }, 'Editar reto');
    }
    if (accion === 'eliminar-reto-admin') {
      return confirmarAdmin('¿Eliminar este reto?', { ruta: `/retos/${id}`, metodo: 'DELETE', despues: () => { estado.retosAdmin = estado.retosAdmin.filter(item => item.id_reto !== id); renderizarAdministracion(); avisar('Reto eliminado.', 'exito'); } });
    }
    if (accion === 'eliminar-punto-admin') {
      return confirmarAdmin('Esta corrección elimina el movimiento. Indica el motivo para continuar.', { ruta: `/puntos/${id}`, metodo: 'DELETE', requiereMotivo: true, despues: () => { estado.puntosAdmin = estado.puntosAdmin.filter(item => item.id_punto !== id); renderizarAdministracion(); avisar('Movimiento corregido.', 'exito'); } }, true);
    }
    if (accion === 'revocar-insignia-admin') {
      return confirmarAdmin('Revocar esta insignia asignada. Indica el motivo para continuar.', { ruta: `/cuenta-insignias/${boton.dataset.cuenta}/${id}`, metodo: 'DELETE', requiereMotivo: true, despues: () => { estado.insigniasCuentaAdmin = estado.insigniasCuentaAdmin.filter(item => item.id_insignia !== id); renderizarAdministracion(); avisar('Insignia revocada.', 'exito'); } }, true);
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
  $('#alternar-navegacion').addEventListener('click', () => {
    const colapsada = $('.navegacion').dataset.colapsada !== 'true';
    aplicarEstadoNavegacion(colapsada);
    guardarPreferenciaNav(colapsada);
  });
  $('#nav-mas').addEventListener('click', () => {
    const panel = $('#nav-panel-mas');
    const abierto = panel.hidden;
    panel.hidden = !abierto;
    $('#nav-mas').setAttribute('aria-expanded', String(abierto));
    if (abierto) panel.querySelector('.nav-item')?.focus();
  });
  $('#nav-panel-mas').addEventListener('click', evento => {
    const cerrar = evento.target.closest('.nav-cerrar-mas');
    if (cerrar) return cerrarPanelMas(true);
    const boton = evento.target.closest('[data-vista-mobile]');
    if (!boton) return;
    navegar(boton.dataset.vistaMobile);
    if (boton.dataset.vistaMobile === 'estadisticas' && !estado.estadisticas) cargarEstadisticas().catch(error => avisar(error.message, 'error'));
    if (boton.dataset.vistaMobile === 'institucional' && !estado.institucionales) cargarInstitucionales().catch(error => avisar(error.message, 'error'));
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && !$('#nav-panel-mas').hidden) cerrarPanelMas(true);
  });
  document.addEventListener('click', evento => {
    const panel = $('#nav-panel-mas');
    if (!panel.hidden && !panel.contains(evento.target) && evento.target !== $('#nav-mas')) cerrarPanelMas();
  });
  // Se envuelve para no pasar el Event como argumento `revocar`.
  $('#boton-salir').addEventListener('click', () => cerrarSesion());
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
    if (!leerHorario(f).valido) return;
    duranteEnvio(f, async () => {
      try {
        const registro = await api('/auth/registro', { method: 'POST', body: JSON.stringify({ nombre: f.elements.nombre.value, correo: f.elements.correo.value, contrasena: f.elements.contrasena.value, materia: { id_catalogo_materia: f.elements.id_catalogo_materia.value, horario: f.elements.horario.value || null } }) });
        if (registro.requiere_verificacion) { abrirCodigoCorreo(registro.desafio, 'verificar', f.elements.correo.value); f.elements.contrasena.value = ''; return; }
        await iniciarSesion(f.elements.correo.value, f.elements.contrasena.value); avisar('Cuenta creada correctamente.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-materia').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget; const id = f.elements.id.value;
    if (!leerHorario(f).valido) return;
    duranteEnvio(f, async () => {
      try {
        const seleccion = f.elements.id_catalogo_materia.value;
        const actual = estado.materias.find(item => item.id_materia === id);
        const datos = { horario: f.elements.horario.value || null };
        if (seleccion && (!id || seleccion !== actual?.id_catalogo_materia)) datos.id_catalogo_materia = seleccion;
        const respuesta = await api(id ? `/materias/${id}` : '/materias', { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
        estado.materias = id ? estado.materias.map(item => item.id_materia === id ? respuesta.dato : item) : [...estado.materias, respuesta.dato];
        limpiarMateria(); renderizarMaterias(); avisar(`Materia ${id ? 'actualizada' : 'creada'}.`, 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#cancelar-materia').addEventListener('click', limpiarMateria);
  $('#mostrar-form-reto').addEventListener('click', () => abrirReto());
  $('#cerrar-form-reto').addEventListener('click', cerrarReto);
  $('#cancelar-reto').addEventListener('click', cerrarReto);
  $('#form-reto').elements.tipo_condicion.addEventListener('change', evento => {
    $('#form-reto').elements.objetivo.disabled = evento.target.value === 'antigua';
  });
  $('#form-reto').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget; const id = f.elements.id.value;
    duranteEnvio(f, async () => {
      try {
        const datos = { descripcion: f.elements.descripcion.value, puntos_recompensa: Number(f.elements.puntos_recompensa.value), semana: f.elements.semana.value };
        if (f.elements.tipo_condicion.value !== 'antigua') datos.condicion = `${f.elements.tipo_condicion.value}:${f.elements.objetivo.value}`;
        if (id) datos.progreso = Number(f.elements.progreso.value);
        const respuesta = await api(id ? `/retos/${id}` : '/retos', { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
        estado.retos = id ? estado.retos.map(item => item.id_reto === id ? respuesta.dato : item) : [...estado.retos, respuesta.dato];
        renderizarGamificacion(); cerrarReto(); avisar(`Reto ${id ? 'actualizado' : 'creado'}.`, 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
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
  ['buscar-tarea', 'filtro-materia', 'filtro-prioridad', 'filtro-estado', 'filtro-fecha-desde', 'filtro-fecha-hasta'].forEach(id => $(`#${id}`).addEventListener('input', renderizarTareas));
  $('#limpiar-filtros').addEventListener('click', () => { $('#buscar-tarea').value = ''; $('#filtro-materia').value = ''; $('#filtro-prioridad').value = ''; $('#filtro-estado').value = ''; $('#filtro-fecha-desde').value = ''; $('#filtro-fecha-hasta').value = ''; renderizarTareas(); });
  $$('[data-panel-gamificacion]').forEach(tab => tab.addEventListener('click', () => {
    const historial = tab.dataset.panelGamificacion === 'historial';
    $('#panel-historial-gamificacion').hidden = !historial;
    $$('.tab-gamificacion').forEach(item => {
      item.classList.toggle('activo', item === tab);
      item.setAttribute('aria-pressed', String(item === tab));
    });
  }));
  $$('input[name="modo-temporizador"]').forEach(input => input.addEventListener('change', () => {
    if (estado.temporizador.activo) return;
    estado.temporizador.modo = input.value;
    estado.temporizador.descanso = false;
    estado.temporizador.restante = input.value === 'libre' ? 0 : DURACION_POMODORO;
    actualizarReloj();
  }));
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
        const respuesta = await api('/preferencias', { method: 'PUT', body: JSON.stringify({ avatar: f.elements.avatar.value, tema: f.elements.tema.value, modo_oscuro: f.elements.modo_oscuro.checked, notificaciones_recordatorios: f.elements.notificaciones_recordatorios.checked, notificaciones_retos: f.elements.notificaciones_retos.checked }) });
        estado.preferencias = respuesta.dato; aplicarPreferencias(); avisar('Preferencias guardadas.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-perfil').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const respuesta = await api(`/cuentas/${estado.cuenta.id_cuenta}`, { method: 'PUT', body: JSON.stringify({ nombre: f.elements.nombre.value.trim(), ...(configuracionCorreo.verificacion_correo && estado.cuenta.rol === 'Estudiante' ? {} : { correo: f.elements.correo.value.trim() }) }) });
        estado.cuenta = respuesta.dato; renderizarUsuario(); avisar('Perfil actualizado.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-preferencias').elements.tema.addEventListener('change', evento => { document.documentElement.dataset.tema = evento.target.value; });
  $('#form-preferencias').elements.modo_oscuro.addEventListener('change', evento => { document.documentElement.classList.toggle('modo-oscuro', evento.target.checked); });
  $('#eliminar-datos').addEventListener('click', async () => {
    if (!confirm('Esta acción eliminará permanentemente todos tus datos. Exporta primero si deseas conservar una copia. ¿Continuar?')) return;
    try { await api(`/cuentas/${estado.cuenta.id_cuenta}/datos`, { method: 'DELETE' }); await cerrarSesion(); }
    catch (error) { avisar(error.message, 'error'); }
  });

  /** RF01/HU30/RN27: Cancelar no envía ninguna petición; Confirmar desactiva una sola vez y cierra la sesión. */
  $('#desactivar-cuenta').addEventListener('click', () => $('#modal-desactivar-cuenta').showModal());
  $('#cancelar-desactivar-cuenta').addEventListener('click', () => $('#modal-desactivar-cuenta').close());
  $('#confirmar-desactivar-cuenta').addEventListener('click', async () => {
    const modal = $('#modal-desactivar-cuenta');
    const botones = [...modal.querySelectorAll('button')];
    botones.forEach(boton => { boton.disabled = true; });
    try {
      await api(`/cuentas/${estado.cuenta.id_cuenta}`, { method: 'DELETE' });
      modal.close();
      await cerrarSesion(false);
      avisar('Tu cuenta fue desactivada. Tus datos se conservan; solo un Administrador puede reactivarla.', 'exito');
    } catch (error) {
      avisar(`No se pudo desactivar la cuenta: ${error.message}`, 'error');
    } finally {
      botones.forEach(boton => { boton.disabled = false; });
    }
  });

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
      await cargarCatalogoMateriasAdmin();
      renderizarAdministracion(); await cargarDetalleAdministrativo(); avisar('Datos administrativos actualizados.', 'exito');
    } catch (error) { avisar(error.message, 'error'); }
  });
  $$('.admin-tab').forEach(tab => tab.addEventListener('click', () => activarPestanaAdmin(tab.dataset.adminTab)));
  $('.admin-pestanas').addEventListener('keydown', evento => {
    const tabs = $$('.admin-tab');
    const actual = tabs.indexOf(document.activeElement);
    if (actual < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(evento.key)) return;
    evento.preventDefault();
    const destino = evento.key === 'Home' ? 0 : evento.key === 'End' ? tabs.length - 1 : (actual + (evento.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    activarPestanaAdmin(tabs[destino].dataset.adminTab); tabs[destino].focus();
  });
  $$('[data-admin-nuevo]').forEach(boton => boton.addEventListener('click', () => {
    const tipo = boton.dataset.adminNuevo;
    if (tipo === 'catalogo') abrirFormularioAdmin('catalogo', {}, 'Nueva asignatura');
    if (tipo === 'insignia') abrirFormularioAdmin('insignia', {}, 'Nueva insignia');
    if (tipo === 'nivel') abrirFormularioAdmin('nivel', { orden: Math.max(0, ...estado.niveles.map(item => Number(item.orden) || 0)) + 1 }, 'Nuevo nivel');
    if (tipo === 'reto') {
      if (!adminUI.cuentaSeleccionada) return avisar('Selecciona una cuenta activa antes de asignar un reto.', 'error');
      abrirFormularioAdmin('reto', {}, 'Asignar reto');
    }
    if (tipo === 'punto' || tipo === 'asignar-insignia') {
      if (!adminUI.cuentaSeleccionada) return avisar('Selecciona una cuenta activa en Retos semanales.', 'error');
      abrirFormularioAdmin(tipo, {}, tipo === 'punto' ? 'Otorgar puntos' : 'Asignar insignia');
    }
  }));
  $('#cerrar-modal-admin').addEventListener('click', cerrarFormularioAdmin);
  $('#cancelar-confirmar-admin').addEventListener('click', () => $('#modal-admin-confirmar').close());
  $('#form-confirmar-admin').addEventListener('submit', async evento => {
    evento.preventDefault();
    const accion = adminUI.accionConfirmada;
    if (!accion) return;
    const motivo = evento.currentTarget.elements.motivo.value.trim();
    if (accion.requiereMotivo && !motivo) return avisar('Debes indicar el motivo de la corrección.', 'error');
    try {
      await api(accion.ruta, { method: accion.metodo, ...(motivo ? { body: JSON.stringify({ motivo }) } : {}) });
      $('#modal-admin-confirmar').close();
      if (accion.refrescar === 'catalogo') await cargarCatalogoMateriasAdmin();
      if (accion.despues) accion.despues();
      avisar('Acción administrativa completada.', 'exito');
    } catch (error) { avisar(error.message, 'error'); }
  });
  ['buscar-usuario-admin', 'filtro-rol-admin', 'filtro-estado-admin'].forEach(id => $(`#${id}`).addEventListener('input', () => { adminUI.paginaUsuarios = 1; renderizarUsuariosAdmin(); }));
  $('#mostrar-mas-usuarios').addEventListener('click', () => { adminUI.paginaUsuarios += 1; renderizarUsuariosAdmin(); });
  $('#lista-usuarios-admin').addEventListener('change', evento => {
    const fila = evento.target.closest('[data-cuenta-row]');
    if (!fila) return;
    const rol = fila.querySelector('.cuenta-rol-edicion').value;
    const activa = fila.querySelector('.cuenta-activa-edicion input').checked;
    const guardar = fila.querySelector('[data-accion="guardar-usuario"]');
    guardar.disabled = rol === fila.dataset.rolOriginal && String(activa) === fila.dataset.activaOriginal;
  });
  $('#form-admin-insignia').elements.metrica.addEventListener('change', evento => sincronizarCondicionAdmin(evento.currentTarget.form));
  $('#form-admin-insignia').elements.objetivo.addEventListener('input', evento => sincronizarCondicionAdmin(evento.currentTarget.form));
  $('#form-admin-reto').elements.metrica.addEventListener('change', evento => sincronizarCondicionAdmin(evento.currentTarget.form));
  $('#form-admin-reto').elements.objetivo.addEventListener('input', evento => sincronizarCondicionAdmin(evento.currentTarget.form));
  $('#form-admin-catalogo').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget; const id = f.elements.id.value;
    duranteEnvio(f, async () => {
      try { await api(id ? `/catalogo-materias/${id}` : '/catalogo-materias', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ nombre: f.elements.nombre.value }) }); f.reset(); cerrarFormularioAdmin(); await cargarCatalogoMateriasAdmin(); avisar(id ? 'Asignatura actualizada.' : 'Asignatura creada.', 'exito'); }
      catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-admin-insignia').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget; const id = f.elements.id.value; sincronizarCondicionAdmin(f);
    duranteEnvio(f, async () => {
      try { const respuesta = await api(id ? `/insignias/${id}` : '/insignias', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ nombre: f.elements.nombre.value, descripcion: f.elements.descripcion.value, condicion: f.elements.condicion.value, icono: f.elements.icono.value || null }) }); estado.insignias = id ? estado.insignias.map(item => item.id_insignia === id ? respuesta.dato : item) : [...estado.insignias, respuesta.dato]; f.reset(); cerrarFormularioAdmin(); renderizarAdministracion(); avisar(id ? 'Insignia actualizada.' : 'Insignia creada.', 'exito'); } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-admin-nivel').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget; const id = f.elements.id.value;
    duranteEnvio(f, async () => {
      try { const respuesta = await api(id ? `/niveles/${id}` : '/niveles', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ nombre: f.elements.nombre.value, descripcion: f.elements.descripcion.value, puntos_minimos: Number(f.elements.puntos_minimos.value), orden: Number(f.elements.orden.value), icono: f.elements.icono.value || null }) }); estado.niveles = id ? estado.niveles.map(item => item.id_nivel === id ? respuesta.dato : item) : [...estado.niveles, respuesta.dato]; f.reset(); cerrarFormularioAdmin(); renderizarAdministracion(); avisar(id ? 'Nivel actualizado.' : 'Nivel creado.', 'exito'); } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-admin-reto').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget; const id = f.elements.id.value; sincronizarCondicionAdmin(f);
    duranteEnvio(f, async () => {
      try { const datos = { descripcion: f.elements.descripcion.value, condicion: f.elements.condicion.value, puntos_recompensa: Number(f.elements.puntos_recompensa.value), semana: f.elements.semana.value }; const ruta = id ? `/retos/${id}` : '/retos'; if (!id) datos.id_cuenta = adminUI.cuentaSeleccionada; const respuesta = await api(ruta, { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) }); f.reset(); cerrarFormularioAdmin(); await cargarDetalleAdministrativo(adminUI.cuentaSeleccionada); avisar(id ? 'Reto actualizado.' : 'Reto semanal asignado.', 'exito'); } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#form-admin-punto').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => { try { await api('/puntos', { method: 'POST', body: JSON.stringify({ id_cuenta: adminUI.cuentaSeleccionada, cantidad: Number(f.elements.cantidad.value), origen: f.elements.origen.value, motivo: f.elements.motivo.value.trim() }) }); f.reset(); cerrarFormularioAdmin(); await cargarDetalleAdministrativo(adminUI.cuentaSeleccionada); avisar('Puntos registrados y estudiante notificado.', 'exito'); } catch (error) { avisar(error.message, 'error'); } });
  });
  $('#form-admin-asignar-insignia').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => { try { await api('/cuenta-insignias', { method: 'POST', body: JSON.stringify({ id_cuenta: adminUI.cuentaSeleccionada, id_insignia: f.elements.id_insignia.value, motivo: f.elements.motivo.value.trim() }) }); f.reset(); cerrarFormularioAdmin(); await cargarDetalleAdministrativo(adminUI.cuentaSeleccionada); avisar('Insignia asignada y estudiante notificado.', 'exito'); } catch (error) { avisar(error.message, 'error'); } });
  });
  $('#admin-reto-cuenta').addEventListener('change', evento => cargarDetalleAdministrativo(evento.target.value).catch(error => avisar(error.message, 'error')));
}

/** Punto de entrada del navegador. Intenta restaurar una sesión de la pestaña. */
/** RF01/HU01: registra eventos y recupera una sesión si hay token. */
async function iniciar() {
  prepararValidacionVisual();
  inicializarSelectoresHorario();
  aplicarEstadoNavegacion(leerPreferenciaNav());
  registrarEventos();
  await iniciarCorreoOpcional();
  await cargarCatalogoMaterias();
  if (estado.token) await cargarAplicacion(); else mostrarAcceso();
}

// Bloque D: controles ocultos hasta recibir configuración explícita del servidor.
let configuracionCorreo = { verificacion_correo: false, segundo_factor: 'off', reenvio_segundos: 60, caducidad_minutos: 10 };
let operacionCodigoCorreo = 'verificar';
let correoReenvio = null;
let temporizadorCorreo;
let plazosCorreo;
async function aceptarSesionCorreo(respuesta) {
  estado.token = respuesta.token;
  sessionStorage.setItem(CLAVE_TOKEN, respuesta.token);
  estado.cuenta = respuesta.cuenta;
  await cargarAplicacion();
}
function mensajeCodigoEnviado() {
  const enviado = `Código enviado${correoReenvio ? ` a ${correoReenvio}` : ''}. Caduca en ${configuracionCorreo.caducidad_minutos} minutos`;
  return operacionCodigoCorreo === 'verificar' && !$('#desafio-correo').value
    ? `Si existe una cuenta pendiente, llegará un código. ${enviado}` : enviado;
}
function cuentaRegresivaCorreo(reiniciar = true) {
  clearInterval(temporizadorCorreo);
  // El servidor vuelve a comprobar los plazos, incluso si se cierra este diálogo.
  const ahora = Date.now();
  if (reiniciar) plazosCorreo = {
    reenviarDesde: ahora + Number(configuracionCorreo.reenvio_segundos) * 1000,
    caduca: ahora + Number(configuracionCorreo.caducidad_minutos) * 60000
  };
  const { reenviarDesde, caduca } = plazosCorreo;
  const boton = $('#reenviar-codigo-correo');
  const actualizar = () => {
    const restante = Math.max(0, Math.ceil((reenviarDesde - Date.now()) / 1000));
    const vencido = Date.now() >= caduca;
    boton.disabled = !vencido && restante > 0;
    boton.textContent = boton.disabled ? `Reenviar en ${restante} s` : 'Reenviar código';
    if (vencido) {
      $('#estado-codigo-correo').textContent = 'El código caducó; solicita otro';
      clearInterval(temporizadorCorreo);
    }
  };
  actualizar(); temporizadorCorreo = setInterval(actualizar, 1000);
}
function abrirCodigoCorreo(desafio, operacion, correo = null, enviando = false) {
  operacionCodigoCorreo = operacion; correoReenvio = correo;
  $('#form-codigo-correo').reset();
  $('#desafio-correo').value = desafio || '';
  $('#titulo-codigo-correo').textContent = operacion === 'login' ? 'Segundo paso de acceso' : 'Confirma tu correo';
  $('#estado-codigo-correo').textContent = enviando ? 'Enviando código…' : mensajeCodigoEnviado();
  $('#reenviar-codigo-correo').hidden = operacion === 'cambio';
  $('#modal-codigo-correo').showModal();
  if (enviando) { clearInterval(temporizadorCorreo); plazosCorreo = null; $('#reenviar-codigo-correo').disabled = true; }
  else cuentaRegresivaCorreo();
  $('#codigo-correo').focus();
}
async function iniciarCorreoOpcional() {
  try { configuracionCorreo = await api('/auth/configuracion'); } catch (_) { return; }
  const verificacion = configuracionCorreo.verificacion_correo;
  const mfa = configuracionCorreo.segundo_factor === 'optional';
  $('#seguridad-correo').hidden = !verificacion && !mfa;
  $('#form-mfa-correo').hidden = !mfa;
  $('#form-cambio-correo').hidden = !verificacion;
  $('#form-reenviar-verificacion').hidden = !verificacion;
  $('#cerrar-codigo-correo').addEventListener('click', () => $('#modal-codigo-correo').close());
  $('#modal-codigo-correo').addEventListener('close', () => { clearInterval(temporizadorCorreo); $('#codigo-correo').value = ''; });
  $('#form-codigo-correo').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const ruta = { verificar: '/correo/verificar', login: '/login/codigo', cambio: '/correo/cambio/confirmar' }[operacionCodigoCorreo];
        const identificador = operacionCodigoCorreo === 'verificar' && !f.elements.desafio.value && correoReenvio
          ? { correo: correoReenvio } : { desafio: f.elements.desafio.value };
        const resultado = await api(`/auth${ruta}`, { method: 'POST', body: JSON.stringify({ ...identificador, codigo: f.elements.codigo.value }) });
        $('#modal-codigo-correo').close(); await aceptarSesionCorreo(resultado);
      } catch (error) { $('#estado-codigo-correo').textContent = error.message; f.elements.codigo.value = ''; }
    });
  });
  $('#reenviar-codigo-correo').addEventListener('click', async () => {
    const boton = $('#reenviar-codigo-correo');
    boton.disabled = true;
    clearInterval(temporizadorCorreo);
    $('#estado-codigo-correo').textContent = 'Reenviando…';
    try {
      const ruta = operacionCodigoCorreo === 'login' ? '/login/codigo/reenviar' : '/correo/reenviar';
      const datos = $('#desafio-correo').value ? { desafio: $('#desafio-correo').value } : { correo: correoReenvio };
      await api(`/auth${ruta}`, { method: 'POST', body: JSON.stringify(datos) });
      $('#estado-codigo-correo').textContent = mensajeCodigoEnviado();
      cuentaRegresivaCorreo();
    } catch (error) {
      if (plazosCorreo) cuentaRegresivaCorreo(false);
      $('#estado-codigo-correo').textContent = error.message; boton.disabled = false;
    }
  });
  $('#form-reenviar-verificacion').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget; const correo = f.elements.correo.value.trim();
    duranteEnvio(f, async () => {
      try {
        abrirCodigoCorreo('', 'verificar', correo, true);
        await api('/auth/correo/reenviar', { method: 'POST', body: JSON.stringify({ correo }) });
        $('#estado-codigo-correo').textContent = mensajeCodigoEnviado();
        cuentaRegresivaCorreo();
      } catch (error) {
        $('#estado-codigo-correo').textContent = error.message;
        $('#reenviar-codigo-correo').disabled = false;
        avisar(error.message, 'error');
      }
    });
  });
  $('#form-mfa-correo').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const resultado = await api('/auth/mfa', { method: 'POST', body: JSON.stringify({ activar: f.elements.activar.checked, contrasena: f.elements.contrasena.value }) });
        estado.cuenta = resultado.cuenta; renderizarUsuario(); avisar('Segundo paso actualizado.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
      finally { f.elements.contrasena.value = ''; }
    });
  });
  $('#form-cambio-correo').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const resultado = await api('/auth/correo/cambio', { method: 'POST', body: JSON.stringify({ correo_nuevo: f.elements.correo_nuevo.value, contrasena: f.elements.contrasena.value }) });
        abrirCodigoCorreo(resultado.desafio, 'cambio');
      } catch (error) { avisar(error.message, 'error'); }
      finally { f.elements.contrasena.value = ''; }
    });
  });
}

iniciar();
