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
  insignias: [], cuentaInsignias: [], retos: [], metas: [], metaSugerida: null,
  recordatorios: [], notificaciones: [], preferencias: null,
  estadisticas: null, institucionales: null, cuentasAdmin: [], retosAdmin: [],
  puntosAdmin: [], insigniasCuentaAdmin: [],
  temporizador: { restante: DURACION_POMODORO, transcurrido: 0, intervalo: null, activo: false, modo: 'pomodoro', descanso: false }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

/** RF13: shell compartido; preferencia local sin almacenar datos de la cuenta. */
function configurarNavegacion() {
  const panel = $('#navegacion-principal');
  const abrir = $('#abrir-menu');
  const contraer = $('#contraer-menu');
  const escritorio = window.matchMedia('(min-width: 1024px)');
  let abierto = false;
  const aplicarContraido = contraido => {
    $('#aplicacion').classList.toggle('sidebar-contraida', contraido);
    contraer.setAttribute('aria-expanded', String(!contraido));
    contraer.setAttribute('aria-label', contraido ? 'Expandir navegación' : 'Contraer navegación');
    contraer.title = contraer.getAttribute('aria-label');
  };
  try { aplicarContraido(localStorage.getItem('studyquest_sidebar_contraida') === 'true'); } catch (_) { aplicarContraido(false); }
  function cambiar(visible, devolverFoco = true) {
    abierto = visible && !escritorio.matches;
    abrir.setAttribute('aria-expanded', String(abierto));
    abrir.setAttribute('aria-label', abierto ? 'Cerrar menú' : 'Abrir menú');
    panel.classList.toggle('abierto', abierto);
    panel.inert = !escritorio.matches && !abierto;
    $('#velo-menu').hidden = !abierto;
    document.body.classList.toggle('menu-abierto', abierto);
    $('#contenido').inert = abierto;
    $('.barra-superior').inert = abierto;
    if (abierto) {
      panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
      panel.querySelector('.nav-item:not([hidden])')?.focus();
    } else {
      panel.removeAttribute('role'); panel.removeAttribute('aria-modal');
      if (devolverFoco && !escritorio.matches) abrir.focus();
    }
  }
  abrir.addEventListener('click', () => cambiar(!abierto));
  $('#cerrar-menu').addEventListener('click', () => cambiar(false));
  $('#velo-menu').addEventListener('click', () => cambiar(false));
  panel.addEventListener('click', evento => { if (evento.target.closest('[data-vista]') && abierto) cambiar(false); });
  document.addEventListener('keydown', evento => {
    if (!abierto) return;
    if (evento.key === 'Escape') { evento.preventDefault(); cambiar(false); }
    if (evento.key === 'Tab') {
      const controles = [...panel.querySelectorAll('button:not([hidden]):not(:disabled),[tabindex="0"]')].filter(n => n.getClientRects().length);
      const primero = controles[0], ultimo = controles.at(-1);
      if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
    }
  });
  contraer.addEventListener('click', () => {
    const contraido = !$('#aplicacion').classList.contains('sidebar-contraida');
    aplicarContraido(contraido);
    try { localStorage.setItem('studyquest_sidebar_contraida', String(contraido)); } catch (_) { /* La navegación funciona sin almacenamiento. */ }
  });
  escritorio.addEventListener('change', () => cambiar(false, false));
  cambiar(false, false);
}

/** Construye controles etiquetados usando únicamente texto y atributos permitidos. */
function crearCampoDialogo(campo) {
  const etiqueta = document.createElement('label');
  etiqueta.textContent = campo.label;
  const input = document.createElement(campo.type === 'select' ? 'select' : 'input');
  if (campo.type === 'select') {
    for (const [valor, texto] of campo.opciones || []) input.add(new Option(texto, valor));
    input.value = campo.value || '';
  } else input.type = campo.type || 'text';
  input.name = campo.name;
  input.required = Boolean(campo.required);
  for (const clave of ['value', 'min', 'max', 'maxlength']) {
    if (campo[clave] !== undefined) input.setAttribute(clave, campo[clave]);
  }
  if (campo.type === 'number') input.step = '1';
  etiqueta.append(input);
  $('#campos-modal-accion').append(etiqueta);
  return input;
}

/** Segundo paso común: comparación exacta, sin enviar el correo como credencial. */
function reforzarConfirmacion(contenedor, confirmar, verificacion) {
  const etiqueta = document.createElement('label'); etiqueta.textContent = `Escribe ${verificacion} para confirmar`;
  const input = document.createElement('input'); input.name = 'verificacion'; input.required = true;
  input.autocomplete = 'off'; etiqueta.append(input); contenedor.append(etiqueta);
  confirmar.disabled = true;
  input.addEventListener('input', () => { confirmar.disabled = input.value !== verificacion; });
  input.focus();
  return input;
}

/** Modal único: Cancelar/Escape no producen escrituras; el foco vuelve al disparador. */
function abrirDialogoAccion({ titulo, detalle = [], campos, textoConfirmar, peligro = false, verificacion }) {
  const modal = $('#modal-accion');
  if (modal.open) return Promise.resolve(campos ? null : false);
  const disparador = document.activeElement;
  const formulario = $('#form-modal-accion');
  const confirmar = $('#confirmar-accion');
  $('#titulo-accion').textContent = titulo;
  $('#detalle-accion').replaceChildren();
  for (const linea of Array.isArray(detalle) ? detalle : [detalle]) {
    const p = document.createElement('p'); p.textContent = linea;
    $('#detalle-accion').append(p);
  }
  $('#campos-modal-accion').replaceChildren();
  const controles = (campos || []).map(crearCampoDialogo);
  confirmar.textContent = textoConfirmar || (campos ? 'Guardar cambios' : 'Confirmar');
  confirmar.className = `boton ${peligro ? 'peligro' : 'primario'}`;
  confirmar.disabled = false;
  let comprobacion = null;
  return new Promise(resolve => {
    const cancelado = campos ? null : false;
    function cancelar() { cerrar(cancelado); }
    function escape(evento) { evento.preventDefault(); cerrar(cancelado); }
    function enviar(evento) {
      evento.preventDefault();
      if (verificacion && !comprobacion) {
        comprobacion = reforzarConfirmacion($('#campos-modal-accion'), confirmar, verificacion);
        return;
      }
      if (comprobacion && comprobacion.value !== verificacion) return;
      confirmar.disabled = true;
      cerrar(campos ? Object.fromEntries(controles.map(input => [input.name, input.value])) : true);
    }
    // Se cierra de forma síncrona: el evento 'close' es asíncrono y llegaría a la siguiente apertura.
    function cerrar(resultado) {
      formulario.removeEventListener('submit', enviar);
      $('#cancelar-accion').removeEventListener('click', cancelar);
      modal.removeEventListener('cancel', escape);
      modal.close();
      // Si la lista se volvió a representar, el foco vuelve al botón equivalente.
      const destino = disparador?.isConnected ? disparador
        : disparador?.dataset?.accion && document.querySelector(`[data-accion="${CSS.escape(disparador.dataset.accion)}"][data-id="${CSS.escape(disparador.dataset.id || '')}"]`);
      destino?.focus({ preventScroll: true });
      resolve(resultado);
    }
    formulario.addEventListener('submit', enviar);
    $('#cancelar-accion').addEventListener('click', cancelar);
    modal.addEventListener('cancel', escape);
    modal.showModal();
    $('#cancelar-accion').focus();
  });
}

/** @returns {Promise<boolean>} Confirmación contextual y segundo paso crítico opcional. */
function confirmarAccion({ titulo, detalle, textoConfirmar, peligro, verificacion }) {
  return abrirDialogoAccion({ titulo, detalle, textoConfirmar, peligro, verificacion });
}

/** @returns {Promise<object|null>} Datos validados por el formulario nativo, o cancelación. */
function pedirDatos({ titulo, campos, textoConfirmar, detalle }) {
  return abrirDialogoAccion({ titulo, campos, textoConfirmar, detalle });
}

/** Lista local reutilizable: búsqueda con debounce, filtros, orden y páginas acotadas. */
function crearListaCliente({ contenedor, obtenerDatos, buscar, filtros = [], ordenar, renderizar, opcionesOrden = [['asc', 'Nombre A–Z'], ['desc', 'Nombre Z–A']] }) {
  let pagina = 1, tamano = 10, espera;
  const herramientas = document.createElement('div'); herramientas.className = 'barra-herramientas';
  const campo = document.createElement('label'); campo.textContent = 'Buscar';
  const busqueda = document.createElement('input'); busqueda.type = 'search'; campo.append(busqueda); herramientas.append(campo);
  const selectores = filtros.map(filtro => {
    const label = document.createElement('label'); label.textContent = filtro.label;
    const select = document.createElement(filtro.type ? 'input' : 'select'); select.setAttribute('aria-label', filtro.label);
    if (filtro.type) select.type = filtro.type;
    if (!filtro.type) for (const [valor, texto] of [['', 'Todos'], ...(typeof filtro.opciones === 'function' ? filtro.opciones() : filtro.opciones || [])]) select.add(new Option(texto, valor));
    label.append(select); herramientas.append(label);
    select.addEventListener('change', () => { pagina = 1; actualizar(); });
    return { select, filtrar: filtro.filtrar, opciones: filtro.opciones };
  });
  const ordenLabel = document.createElement('label'); ordenLabel.textContent = 'Orden';
  const orden = document.createElement('select'); orden.setAttribute('aria-label', 'Orden'); opcionesOrden.forEach(([valor, texto]) => orden.add(new Option(texto, valor)));
  ordenLabel.append(orden); herramientas.append(ordenLabel);
  const cuenta = document.createElement('span'); cuenta.setAttribute('aria-live', 'polite'); herramientas.append(cuenta);
  const navegacion = document.createElement('div'); navegacion.className = 'paginacion'; navegacion.setAttribute('role', 'group'); navegacion.setAttribute('aria-label', 'Paginación');
  const anterior = document.createElement('button'), siguiente = document.createElement('button');
  anterior.type = siguiente.type = 'button'; anterior.className = siguiente.className = 'boton secundario';
  anterior.textContent = 'Anterior'; siguiente.textContent = 'Siguiente';
  const estadoPagina = document.createElement('span'); estadoPagina.setAttribute('aria-live', 'polite');
  const sizeLabel = document.createElement('label'); sizeLabel.textContent = 'Por página';
  const size = document.createElement('select'); size.setAttribute('aria-label', 'Por página'); [10,20,50].forEach(n => size.add(new Option(n, n))); sizeLabel.append(size);
  navegacion.append(anterior, estadoPagina, siguiente, sizeLabel); contenedor.append(herramientas, navegacion);
  function actualizar() {
    for (const filtro of selectores) if (typeof filtro.opciones === 'function') {
      const valor = filtro.select.value;
      filtro.select.replaceChildren();
      for (const [id, label] of [['', 'Todos'], ...filtro.opciones()]) filtro.select.add(new Option(label, id));
      filtro.select.value = valor;
      if (filtro.select.selectedIndex < 0) filtro.select.value = '';
    }
    const texto = busqueda.value.trim().toLocaleLowerCase('es');
    const datos = obtenerDatos().filter(item => buscar(item).toLocaleLowerCase('es').includes(texto) && selectores.every(f => !f.select.value || f.filtrar(item, f.select.value)))
      .sort((a,b) => ordenar(a,b,orden.value) * (orden.value === 'desc' ? -1 : 1));
    const paginas = Math.max(1, Math.ceil(datos.length / tamano)); pagina = Math.min(pagina, paginas);
    cuenta.textContent = `${datos.length} ${datos.length === 1 ? 'resultado' : 'resultados'}`; estadoPagina.textContent = `Página ${pagina} de ${paginas}`;
    anterior.disabled = pagina === 1; siguiente.disabled = pagina === paginas;
    renderizar(datos.slice((pagina-1)*tamano, pagina*tamano));
  }
  busqueda.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(() => { pagina = 1; actualizar(); }, 250); });
  orden.addEventListener('change', () => { pagina = 1; actualizar(); });
  size.addEventListener('change', () => { tamano = Number(size.value); pagina = 1; actualizar(); });
  anterior.addEventListener('click', () => { pagina--; actualizar(); });
  siguiente.addEventListener('click', () => { pagina++; actualizar(); });
  return { actualizar };
}

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
  if (tipo === 'error') {
    const cerrar = document.createElement('button'); cerrar.type = 'button'; cerrar.className = 'boton secundario pequeno';
    cerrar.textContent = 'Cerrar aviso'; cerrar.addEventListener('click', () => aviso.remove()); aviso.append(cerrar);
  } else window.setTimeout(() => aviso.remove(), 4000);
}

/** Deshabilita temporalmente un formulario para evitar envíos duplicados. */
/** RF02/HU02: deshabilita botones del formulario mientras termina su solicitud. */
async function duranteEnvio(formulario, trabajo) {
  if (formulario.getAttribute('aria-busy') === 'true') return;
  const botones = formulario.matches('button') ? [formulario] : [...formulario.querySelectorAll('button')];
  const anteriores = botones.map(boton => boton.disabled);
  formulario.setAttribute('aria-busy', 'true');
  botones.forEach(boton => {
    boton.disabled = true;
    if (boton.type === 'submit') boton.setAttribute('aria-busy', 'true');
  });
  try { return await trabajo(); }
  finally {
    formulario.removeAttribute('aria-busy');
    botones.forEach((boton, i) => { boton.disabled = anteriores[i]; boton.removeAttribute('aria-busy'); });
  }
}

/** RF01/HU01: presenta login/registro y oculta la aplicación. */
function mostrarAcceso() {
  if (document.body.classList.contains('menu-abierto')) $('#cerrar-menu').click();
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
  $$('.nav-item').forEach(item => {
    const activa = item.dataset.vista === nombre;
    item.classList.toggle('activo', activa);
    if (activa) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  $('#titulo-vista-actual').textContent = $('.nav-item[aria-current=page]')?.getAttribute('aria-label') || destino.querySelector('h2')?.textContent;
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
      navegar('institucional'); await cargarInstitucionales(); return;
    }
    if (estado.cuenta.rol === 'Administrador') {
      const [cuentas, niveles, insignias] = await Promise.all([api('/cuentas'), api('/niveles'), api('/insignias')]);
      estado.cuentasAdmin = cuentas.datos; estado.niveles = niveles.datos; estado.insignias = insignias.datos;
      await cargarRetosAdmin(); await cargarCatalogoMateriasAdmin();
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
    estado.metaSugerida = metaSugerida.dato;
    aplicarPreferencias();
    renderizarTodo();
    mostrarAplicacion();
    prepararPeriodos();
    navegar('dashboard');
    iniciarRecepcionAvisos();
    await cargarResumenSemanal();
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
    Administrador: ['administracion','usuarios','asignaturas','insignias','niveles','retos','correcciones','institucional'],
    'Revisor institucional': ['institucional']
  }[rol] || [];
  $$('.vista').forEach(vista => { vista.dataset.permitida = String(permitidas.includes(vista.dataset.seccion)); });
  $$('[data-roles]').forEach(elemento => {
    const permitida = elemento.dataset.roles.split(',').includes(rol);
    elemento.hidden = !permitida;
    elemento.dataset.permitida = String(permitida);
  });
  $$('.nav-grupo').forEach(grupo => { grupo.hidden = !grupo.querySelector('.nav-item:not([hidden])'); });
  $('#grupo-gestion').textContent = rol === 'Revisor institucional' ? 'Consulta' : 'Administración';
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

/** RF02/HU02: fecha local para describir vencimientos sin inventar plazos. */
function entregaLegible(tarea) {
  if (!tarea.fecha_entrega) return 'Sin fecha';
  const ahora = new Date();
  const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`;
  if (tarea.estado !== 'Completada') {
    if (tarea.fecha_entrega < hoy) return `Vencida · ${fechaLegible(tarea.fecha_entrega)}`;
    if (tarea.fecha_entrega === hoy) return 'Vence hoy';
  }
  return fechaLegible(tarea.fecha_entrega);
}

/** RF06/HU18: traduce únicamente condiciones reconocidas por el contrato. */
function condicionLegible(condicion) {
  const partes = /^(tareas|sesiones|pomodoros|minutos):([1-9][0-9]*)$/.exec(String(condicion));
  if (!partes) return String(condicion || 'Sin condición');
  const [, tipo, cantidad] = partes;
  return { tareas: `Completar ${cantidad} tareas`, sesiones: `Registrar ${cantidad} sesiones`, pomodoros: `Completar ${cantidad} pomodoros`, minutos: `Estudiar ${cantidad} minutos` }[tipo];
}

/** RF15/HU15: presenta la semana ISO conservada por la API. */
function semanaLegible(semana) {
  const partes = /^(\d{4})-W(\d{2})$/.exec(String(semana));
  return partes ? `Semana ${Number(partes[2])} · ${partes[1]}` : String(semana || 'Sin semana');
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
  $('#usuario-rol').textContent = estado.cuenta.rol === 'Revisor institucional' ? 'Revisor institucional · Solo lectura' : estado.cuenta.rol;
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
  // Progreso dentro del tramo del nivel actual (adaptado de c9edc8a), no desde cero.
  const puntos = Number(estado.totalPuntos || 0);
  const ordenados = [...estado.niveles].sort((a, b) => a.puntos_minimos - b.puntos_minimos);
  const siguiente = ordenados.find(item => Number(item.puntos_minimos) > puntos);
  const base = Number(ordenados.filter(item => Number(item.puntos_minimos) <= puntos).at(-1)?.puntos_minimos || 0);
  const barra = $('#progreso-nivel');
  barra.hidden = !ordenados.length;
  if (siguiente) {
    barra.max = Number(siguiente.puntos_minimos) - base;
    barra.value = puntos - base;
    const porcentaje = Math.round(barra.value / barra.max * 100);
    $('#detalle-progreso-nivel').textContent = `${puntos} / ${siguiente.puntos_minimos} puntos · ${porcentaje} % del nivel actual · Siguiente: ${siguiente.nombre}`;
  } else if (ordenados.length) {
    barra.max = 1; barra.value = 1;
    $('#detalle-progreso-nivel').textContent = `${puntos} puntos · Nivel máximo alcanzado.`;
  } else $('#detalle-progreso-nivel').textContent = 'Sin siguiente nivel disponible.';
  barra.setAttribute('aria-valuemax', barra.max);
  barra.setAttribute('aria-valuenow', barra.value);
  const semana = semanaActualReto();
  const metas = estado.metas.filter(meta => meta.semana === semana);
  const retos = estado.retos.filter(reto => reto.semana === semana && reto.activo && !reto.completado);
  $('#dashboard-progreso').innerHTML = [
    ...metas.map(meta => `<div class="item"><strong>${escapar(meta.descripcion)}</strong><small>Meta · ${escapar(semanaLegible(meta.semana))} · ${escapar(meta.valor_actual)} / ${escapar(meta.valor_objetivo)} actividades · ${escapar(semanaLegible(meta.semana))}</small>${progresoVisual(meta.valor_actual, meta.valor_objetivo, 'Meta semanal')}</div>`),
    ...retos.map(reto => `<div class="item"><strong>${escapar(reto.descripcion)}</strong><small>${escapar(condicionLegible(reto.condicion))}</small>${estadoRetoVisual(reto)}</div>`)
  ].join('') || estadoVacio('Aún no tienes metas o retos activos esta semana. Ve a Gamificación para crear una meta.');
  const proximas = [...pendientes].sort((a, b) => String(a.fecha_entrega).localeCompare(String(b.fecha_entrega))).slice(0, 3);
  $('#dashboard-tareas').innerHTML = proximas.length ? proximas.map(tarea => `
    <div class="item prioridad-${escapar(tarea.prioridad.toLowerCase())}">
      <div class="item-fila"><strong>${escapar(tarea.nombre)}</strong><span class="chip">${escapar(tarea.prioridad)}</span></div>
      <small>${escapar(materiaDe(tarea.id_materia))} · ${escapar(entregaLegible(tarea))}</small>
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

/* Horarios estructurados (adaptado de 76fdc57): se persiste el mismo texto `horario` (≤100). */
const DIAS_HORARIO = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MINUTOS_INICIO_HORARIO = 5 * 60, MINUTOS_FIN_HORARIO = 22 * 60, MAX_FRANJAS_HORARIO = 3;

function etiquetaHora(minutos) {
  const hora = Math.floor(minutos / 60);
  return `${hora % 12 || 12}:${String(minutos % 60).padStart(2, '0')} ${hora < 12 ? 'a. m.' : 'p. m.'}`;
}

function opcionesHorasHorario() {
  return Array.from({ length: (MINUTOS_FIN_HORARIO - MINUTOS_INICIO_HORARIO) / 30 + 1 }, (_, i) => {
    const minutos = MINUTOS_INICIO_HORARIO + i * 30;
    return `<option value="${minutos}">${etiquetaHora(minutos)}</option>`;
  }).join('');
}

function htmlFranjaHorario(indice) {
  const n = indice + 1;
  return `<div class="franja-horario" data-franja-horario>
    <div class="selector-horario-campos">
      <label>Día<select data-horario-dia aria-label="Día de la franja ${n}"><option value="">Sin horario</option>${DIAS_HORARIO.map(dia => `<option value="${dia}">${dia}</option>`).join('')}</select></label>
      <label>Hora de inicio<select data-horario-inicio aria-label="Hora de inicio de la franja ${n}" disabled><option value="">Selecciona la hora</option>${opcionesHorasHorario()}</select></label>
      <label>Hora de fin<select data-horario-fin aria-label="Hora de fin de la franja ${n}" disabled><option value="">Selecciona la hora</option>${opcionesHorasHorario()}</select></label>
    </div>
    ${indice ? `<button type="button" class="boton secundario pequeno" data-quitar-horario aria-label="Quitar franja ${n}">Quitar</button>` : ''}
  </div>`;
}

const selectorHorario = formulario => formulario.querySelector('[data-selector-horario-control]');

function actualizarFranjaHorario(franja) {
  const [dia, inicio, fin] = ['dia', 'inicio', 'fin'].map(c => franja.querySelector(`[data-horario-${c}]`));
  inicio.disabled = fin.disabled = !dia.value;
  if (!dia.value) inicio.value = fin.value = '';
}

function errorHorario(control, mensaje = '', franjaInvalida = null) {
  const error = control.querySelector('[data-error-horario-general]');
  error.textContent = mensaje; error.hidden = !mensaje;
  control.querySelectorAll('[data-horario-dia],[data-horario-inicio],[data-horario-fin]').forEach(campo => {
    // Solo se marca la franja que causa el error (o todas si es el límite de longitud).
    if (mensaje && (!franjaInvalida || franjaInvalida.contains(campo))) campo.setAttribute('aria-invalid', 'true'); else campo.removeAttribute('aria-invalid');
  });
}

/** Valida las franjas y sincroniza el campo oculto; el texto histórico se conserva mientras no haya franjas completas. */
function leerHorario(formulario) {
  const control = selectorHorario(formulario);
  if (!control) return { valor: formulario.elements.horario?.value || '', valido: true };
  const legado = control.dataset.horarioLegado || '';
  const resultados = [], dias = new Set();
  let mensaje = '', franjaInvalida = null;
  for (const franja of control.querySelectorAll('[data-franja-horario]')) {
    franjaInvalida = franja;
    const [dia, inicio, fin] = ['dia', 'inicio', 'fin'].map(c => franja.querySelector(`[data-horario-${c}]`).value);
    if (!dia) continue;
    if (!inicio || !fin) { mensaje = 'Selecciona la hora de inicio y de fin.'; break; }
    if (Number(fin) <= Number(inicio)) { mensaje = 'La hora de fin debe ser posterior a la de inicio.'; break; }
    if (dias.has(dia)) { mensaje = 'No puedes repetir el mismo día en dos franjas.'; break; }
    dias.add(dia);
    resultados.push(`${dia} ${etiquetaHora(Number(inicio))} – ${etiquetaHora(Number(fin))}`);
  }
  if (!mensaje) franjaInvalida = null;
  const valor = resultados.length ? resultados.join('; ') : legado;
  if (!mensaje && valor.length > 100) mensaje = 'El horario no puede superar 100 caracteres.';
  formulario.elements.horario.value = mensaje ? '' : valor;
  control.querySelector('[data-horario-legado]').hidden = !legado || resultados.length > 0;
  errorHorario(control, mensaje, franjaInvalida);
  return { valor: mensaje ? '' : valor, valido: !mensaje };
}

function ajustarFranjasHorario(control) {
  control.querySelector('[data-agregar-horario]').disabled = control.querySelectorAll('[data-franja-horario]').length >= MAX_FRANJAS_HORARIO;
}

function inicializarSelectoresHorario() {
  $$('[data-selector-horario]').forEach(contenedor => {
    contenedor.innerHTML = `<fieldset class="selector-horario" data-selector-horario-control>
      <legend>Horario <span class="opcional">opcional</span></legend>
      <div data-franjas-horario>${htmlFranjaHorario(0)}</div>
      <button type="button" class="boton secundario pequeno" data-agregar-horario>Agregar otro día</button>
      <p class="texto-secundario" data-horario-legado hidden></p>
      <small class="error-campo" data-error-horario-general role="alert" hidden></small>
      <input type="hidden" name="horario" value="">
    </fieldset>`;
    const control = contenedor.firstElementChild, formulario = contenedor.closest('form');
    const franjas = control.querySelector('[data-franjas-horario]');
    franjas.addEventListener('change', evento => {
      if (evento.target.matches('[data-horario-dia]')) actualizarFranjaHorario(evento.target.closest('[data-franja-horario]'));
      leerHorario(formulario);
    });
    franjas.addEventListener('click', evento => {
      const quitar = evento.target.closest('[data-quitar-horario]');
      if (!quitar) return;
      const anterior = quitar.closest('[data-franja-horario]').previousElementSibling;
      quitar.closest('[data-franja-horario]').remove();
      ajustarFranjasHorario(control); leerHorario(formulario);
      anterior?.querySelector('[data-horario-dia]').focus();
    });
    control.querySelector('[data-agregar-horario]').addEventListener('click', () => {
      franjas.insertAdjacentHTML('beforeend', htmlFranjaHorario(franjas.children.length));
      ajustarFranjasHorario(control); leerHorario(formulario);
      franjas.lastElementChild.querySelector('[data-horario-dia]').focus();
    });
    formulario.addEventListener('reset', () => setTimeout(() => establecerHorario(formulario, ''), 0));
  });
}

/** Carga un horario guardado; si no es interpretable se muestra y se conserva sin cambios. */
function establecerHorario(formulario, valor) {
  const control = selectorHorario(formulario);
  if (!control) return;
  const convertir = (h, m, p) => (Number(h) % 12 + (p === 'p' ? 12 : 0)) * 60 + Number(m);
  const filas = valor ? valor.split('; ').map(parte => {
    const c = parte.match(/^(Lunes|Martes|Miércoles|Jueves|Viernes|Sábado|Domingo) (\d{1,2}):(\d{2}) ([ap])\. m\. – (\d{1,2}):(\d{2}) ([ap])\. m\.$/);
    return c && { dia: c[1], inicio: convertir(c[2], c[3], c[4]), fin: convertir(c[5], c[6], c[7]) };
  }) : [];
  const interpretable = filas.length > 0 && filas.every(Boolean) && filas.length <= MAX_FRANJAS_HORARIO
    && filas.every(f => f.inicio >= MINUTOS_INICIO_HORARIO && f.fin <= MINUTOS_FIN_HORARIO && f.inicio % 30 === 0 && f.fin % 30 === 0);
  control.dataset.horarioLegado = valor && !interpretable ? valor : '';
  control.querySelector('[data-horario-legado]').textContent = valor && !interpretable ? `Horario actual (se conserva hasta que definas una franja): ${valor}` : '';
  const franjas = control.querySelector('[data-franjas-horario]');
  franjas.innerHTML = (interpretable ? filas : [null]).map((_, i) => htmlFranjaHorario(i)).join('');
  if (interpretable) filas.forEach((franja, i) => {
    const fila = franjas.children[i];
    fila.querySelector('[data-horario-dia]').value = franja.dia;
    actualizarFranjaHorario(fila);
    fila.querySelector('[data-horario-inicio]').value = franja.inicio;
    fila.querySelector('[data-horario-fin]').value = franja.fin;
  });
  ajustarFranjasHorario(control);
  leerHorario(formulario);
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
let listaMaterias;
function renderizarMaterias() {
  $('#total-materias').textContent = estado.materias.length;
  if (!listaMaterias) listaMaterias = crearListaCliente({
    contenedor: $('#herramientas-materias'), obtenerDatos: () => estado.materias,
    buscar: materia => `${materia.nombre} ${materia.horario || ''}`,
    ordenar: (a, b) => a.nombre.localeCompare(b.nombre, 'es'),
    renderizar: datos => { $('#lista-materias').innerHTML = datos.length ? datos.map(materia => `
    <div class="item"><div class="item-fila"><div><strong>${escapar(materia.nombre)}</strong>${materia.id_catalogo_materia ? '' : ' <span class="chip">sin catálogo</span>'}<br><small>${escapar(materia.horario || 'Sin horario')}</small></div>
      <div class="acciones"><button class="boton secundario pequeno" data-accion="editar-materia" data-id="${escapar(materia.id_materia)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-materia" data-id="${escapar(materia.id_materia)}">Eliminar</button></div>
    </div></div>`).join('') : estadoVacio('No hay materias que mostrar. Usa Nueva materia para registrar una asignatura.'); }
  });
  $('#herramientas-materias').hidden = estado.materias.length < 5 && !$('#herramientas-materias input').value;
  listaMaterias.actualizar();
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
    $('#total-tareas').textContent = 'Rango no válido';
    $('#lista-tareas').innerHTML = estadoVacio('El rango de fechas no es válido: “desde” no puede ser posterior a “hasta”.');
    return;
  }
  const hoy = new Date().toISOString().slice(0, 10);
  const filtradas = estado.tareas.filter(tarea => (!texto || tarea.nombre.toLowerCase().includes(texto)) && (!idMateria || tarea.id_materia === idMateria) && (!prioridad || tarea.prioridad === prioridad) && (!situacion || (situacion === 'Vencida' ? tarea.estado !== 'Completada' && tarea.fecha_entrega < hoy : tarea.estado === situacion)) && (!fechaDesde || tarea.fecha_entrega >= fechaDesde) && (!fechaHasta || tarea.fecha_entrega <= fechaHasta));
  $('#total-tareas').textContent = `${filtradas.length} ${filtradas.length === 1 ? 'resultado' : 'resultados'}`;
  $('#lista-tareas').innerHTML = filtradas.length ? filtradas.map(tarea => `
    <div class="item prioridad-${escapar(tarea.prioridad.toLowerCase())} ${tarea.estado === 'Completada' ? 'completada' : ''}">
      <div class="item-fila"><div><strong>${escapar(tarea.nombre)}</strong><br><small>${escapar(materiaDe(tarea.id_materia))} · ${escapar(entregaLegible(tarea))}</small></div><span class="chip">${escapar(tarea.prioridad)} · ${escapar(tarea.estado)}</span></div>
      <div class="acciones"><button class="boton secundario pequeno" data-accion="ver-tarea" data-id="${escapar(tarea.id_tarea)}">Detalle</button>${tarea.estado === 'Pendiente' ? `<button class="boton secundario pequeno" data-accion="iniciar-tarea" data-id="${escapar(tarea.id_tarea)}">En progreso</button>` : ''}${tarea.estado !== 'Completada' ? `<button class="boton secundario pequeno" data-accion="completar-tarea" data-id="${escapar(tarea.id_tarea)}">Completar</button>` : ''}<button class="boton secundario pequeno" data-accion="editar-tarea" data-id="${escapar(tarea.id_tarea)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-tarea" data-id="${escapar(tarea.id_tarea)}">Eliminar</button></div>
    </div>`).join('') : estadoVacio('No hay tareas que coincidan con los filtros.');
  const opciones = opcionesTareas();
  const tareaPomodoro = $('#pomodoro-tarea').value;
  $('#pomodoro-tarea').innerHTML = `<option value="">Sesión libre</option>${opciones}`;
  $('#pomodoro-tarea').value = estado.tareas.some(tarea => tarea.id_tarea === tareaPomodoro && tarea.estado !== 'Completada') ? tareaPomodoro : '';
  $('#recordatorio-tarea').innerHTML = opciones || '<option value="">No hay tareas pendientes</option>';
}

/** RF05–RF07/HU05–HU07: presenta resultados del servidor; no concede premios. */
function renderizarGamificacion() {
  const obtenidas = new Map(estado.cuentaInsignias.map(item => [item.id_insignia, item]));
  $('#total-insignias').textContent = `${obtenidas.size}/${estado.insignias.length}`;
  $('#lista-insignias').innerHTML = estado.insignias.length ? estado.insignias.map(insignia => {
    const asignacion = obtenidas.get(insignia.id_insignia);
    return `<div class="item insignia ${asignacion ? 'obtenida' : 'bloqueada'}" title="${escapar(insignia.descripcion)} · Condición: ${escapar(insignia.condicion)}"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m8 3 4 4 4-4 4 5-4 4v9l-4-3-4 3v-9L4 8Z"/></svg><strong>${escapar(insignia.nombre)}</strong><span class="chip ${asignacion ? 'logro' : 'estado-inactivo'}">${asignacion ? 'Obtenida' : 'Bloqueada'}</span><small>Condición: ${escapar(insignia.condicion)}${asignacion ? ` · Obtenida ${escapar(fechaLegible(asignacion.fecha_obtenida))}` : ''}</small></div>`;
  }).join('') : estadoVacio('El catálogo de insignias está vacío.');
  const avances = [
    ...estado.retos.map(reto => `<div class="item"><div class="item-fila"><div><strong>${escapar(reto.descripcion)}</strong><br><small>${escapar(condicionLegible(reto.condicion))} · ${escapar(reto.puntos_recompensa)} puntos · ${escapar(semanaLegible(reto.semana))} · progreso ${escapar(reto.progreso)}${reto.completado ? ' · completado' : ''}${reto.activo ? '' : ' · inactivo'}</small>${estadoRetoVisual(reto)}${progresoVisual(reto.progreso, String(reto.condicion).split(':')[1], 'Progreso del reto')}</div><div class="acciones">${reto.completado ? '' : `<button class="boton secundario pequeno" data-accion="editar-reto" data-id="${escapar(reto.id_reto)}">Editar</button>`}${botonEstadoReto(reto)}${reto.activo && !reto.completado && reto.id_cuenta === estado.cuenta.id_cuenta ? `<button class="boton primario pequeno" data-accion="completar-reto" data-id="${escapar(reto.id_reto)}">Completar</button>` : ''}${reto.completado ? '' : `<button class="boton peligro pequeno" data-accion="eliminar-reto" data-id="${escapar(reto.id_reto)}">Eliminar</button>`}</div></div></div>`),
    ...estado.metas.map(meta => `<div class="item"><div class="item-fila"><div><strong>${escapar(meta.descripcion)}</strong><br><small>Meta · ${escapar(semanaLegible(meta.semana))} · ${escapar(meta.valor_actual)}/${escapar(meta.valor_objetivo)}${meta.cumplida ? ' · cumplida' : ''}</small>${progresoVisual(meta.valor_actual, meta.valor_objetivo, 'Progreso de la meta')}</div><div class="acciones"><button class="boton secundario pequeno" data-accion="editar-meta" data-id="${escapar(meta.id_meta)}">Editar</button><button class="boton peligro pequeno" data-accion="eliminar-meta" data-id="${escapar(meta.id_meta)}">Eliminar</button></div></div></div>`)
  ];
  $('#lista-retos-metas').innerHTML = avances.length ? avances.join('') : estadoVacio('No tienes retos o metas registrados.');
  const semana = estado.metaSugerida?.semana || semanaActualReto();
  const tieneMeta = estado.metas.some(meta => meta.semana === semana);
  $('#panel-meta').hidden = tieneMeta;
  $('#form-meta').hidden = tieneMeta || !estado.editandoMeta;
  $('#mostrar-form-meta').hidden = tieneMeta;
  $('#mostrar-form-meta').setAttribute('aria-expanded', String(!$('#form-meta').hidden));
  $('#form-meta').elements.semana.value = semana;
  $('#meta-sugerida').hidden = tieneMeta || !estado.metaSugerida || Boolean(estado.editandoMeta);
  $('#semana-meta-sugerida').textContent = semanaLegible(semana);
  $('#descripcion-meta-sugerida').textContent = estado.metaSugerida?.descripcion || '';
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
    'Horas estudiadas': `${dato.horas_estudiadas} h`,
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

/** RF11/HU08: resumen de la semana actual, usando exclusivamente el tablero existente. */
async function cargarResumenSemanal() {
  const token = estado.token;
  const { inicio, fin } = periodoSemanaActual();
  const consulta = new URLSearchParams({ fecha_inicio: inicio, fecha_fin: fin });
  const panel = $('#dashboard-semana');
  try {
    const { dato } = await api(`/estadisticas/semanales?${consulta}`);
    if (token !== estado.token) return;
    const porcentaje = Number(dato?.porcentaje_cumplimiento);
    panel.hidden = dato?.porcentaje_cumplimiento == null || !Number.isFinite(porcentaje);
    if (!panel.hidden) panel.innerHTML = `<h4>Cumplimiento semanal</h4><p class="texto-secundario">${escapar(fechaLegible(inicio))} – ${escapar(fechaLegible(fin))} · ${escapar(porcentaje)}%</p>${progresoVisual(porcentaje, 100, 'Cumplimiento semanal')}`;
  } catch (error) {
    panel.hidden = true;
    avisar(error.message, 'error');
  }
}

/** RF11/HU28: agregados del periodo; un campo ausente nunca representa un cero. */
function renderizarInstitucionales() {
  const dato = estado.institucionales;
  if (!dato) return;
  const periodo = $('#periodo-institucional').textContent;
  if (dato.estudiantes_activos === 0) {
    $('#metricas-institucionales').innerHTML = estadoVacio(`Sin datos en el periodo. No hay actividad registrada ${periodo.toLowerCase()}.`);
    return;
  }
  const campos = [
    ['estudiantes_activos', 'Estudiantes activos', 'estudiantes'], ['tareas_completadas', 'Tareas completadas', 'tareas'],
    ['horas_estudiadas', 'Horas estudiadas', 'horas'], ['minutos_estudiados', 'Minutos estudiados', 'minutos'],
    ['sesiones_realizadas', 'Sesiones realizadas', 'sesiones'], ['puntos_obtenidos', 'Puntos obtenidos', 'puntos'],
    ['promedio_minutos_por_estudiante', 'Promedio de minutos por estudiante', 'minutos / estudiante'],
    ['promedio_puntos_por_estudiante', 'Promedio de puntos por estudiante', 'puntos / estudiante']
  ];
  $('#metricas-institucionales').innerHTML = campos.map(([clave, titulo, unidad]) => `<article class="tarjeta metrica"><span>${titulo}</span><strong>${escapar(dato[clave] ?? 'Sin datos')}</strong><small>${unidad} · ${escapar(periodo)}</small></article>`).join('');
}

let consultaInstitucionalActual = 0;

/** RF11/HU28: consulta autorizada con rango aplicado, carga y error visibles. */
async function cargarInstitucionales() {
  const f = $('#form-institucional'), panel = $('#metricas-institucionales');
  if (!f.elements.fecha_inicio.value) prepararPeriodos();
  const inicio = f.elements.fecha_inicio.value, fin = f.elements.fecha_fin.value;
  const invalido = inicio > fin;
  f.elements.fecha_fin.setAttribute('aria-invalid', String(invalido));
  f.elements.fecha_fin.setAttribute('aria-describedby', 'error-periodo-institucional');
  $('#error-periodo-institucional').textContent = invalido ? 'Hasta debe ser igual o posterior a Desde.' : '';
  if (invalido) return;
  const solicitud = ++consultaInstitucionalActual, token = estado.token;
  panel.setAttribute('aria-busy', 'true'); panel.textContent = 'Cargando indicadores…';
  try {
    const consulta = new URLSearchParams({ fecha_inicio: inicio, fecha_fin: fin });
    const respuesta = await api(`/estadisticas/institucionales?${consulta}`);
    if (solicitud !== consultaInstitucionalActual || token !== estado.token) return;
    estado.institucionales = respuesta.dato;
    $('#periodo-institucional').textContent = `Entre ${fechaLegible(inicio)} y ${fechaLegible(fin)}`;
    renderizarInstitucionales();
  } catch (error) {
    if (solicitud !== consultaInstitucionalActual || token !== estado.token) return;
    panel.textContent = 'No se pudieron cargar los indicadores. Vuelve a consultar.'; throw error;
  } finally { if (solicitud === consultaInstitucionalActual) panel.removeAttribute('aria-busy'); }
}

const reglasInsignia = {
  primera_tarea: 'Primera tarea completada', '5_tareas_seguidas': 'Cinco tareas seguidas',
  '7_sesiones_semana': 'Siete sesiones en una semana', '10_pomodoros': 'Diez pomodoros', sesion_antes_8am: 'Sesión antes de las 8 a. m.'
};
const listasAdmin = {};
let catalogoAdmin = [];

/** Tablas comparables que pasan a tarjetas en móvil; todo dato externo se escapa. */
function tablaAdmin(titulo, columnas, filas) {
  if (!filas.length) return estadoVacio('No hay resultados para estos filtros.');
  return `<table class="tabla-admin"><caption class="solo-lectores">${escapar(titulo)}</caption><thead><tr>${columnas.map(c => `<th scope="col">${escapar(c)}</th>`).join('')}</tr></thead><tbody>${filas.map(fila => `<tr class="item">${fila.map((celda, i) => `<td data-etiqueta="${escapar(columnas[i])}">${celda}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function accionAdmin(accion, id, texto, peligro = false, atributos = '') {
  return `<button type="button" class="boton ${peligro ? 'peligro' : 'secundario'} pequeno" data-accion="${accion}" data-id="${escapar(id)}" ${atributos}>${texto}</button>`;
}

/** RF01/RN26/HU29: catálogo completo, con orden, filtros y paginación locales. */
async function cargarCatalogoMateriasAdmin() {
  catalogoAdmin = (await api('/catalogo-materias?todas=true')).datos;
  renderizarAdministracion();
}

/** RF06/HU18: la API lista retos por cuenta; se consultan las cuentas existentes. */
async function cargarRetosAdmin() {
  const colecciones = await Promise.all(estado.cuentasAdmin.filter(c => c.rol === 'Estudiante').map(c => api(`/retos?id_cuenta=${encodeURIComponent(c.id_cuenta)}`)));
  estado.retosAdmin = colecciones.flatMap(r => r.datos);
}

/** RF01/HU27 y RF07/HU26: módulos independientes sobre los datos autorizados. */
function renderizarAdministracion() {
  const filtroEstado = (propiedad, femenino = false) => ({ label: 'Estado', opciones: [['true', femenino ? 'Activa' : 'Activo'], ['false', femenino ? 'Inactiva' : 'Inactivo']], filtrar: (c,v) => String(Boolean(c[propiedad])) === v });
  const montar = (clave, opciones) => {
    if (!listasAdmin[clave]) listasAdmin[clave] = crearListaCliente({ contenedor: $(`#herramientas-${clave}`), ...opciones });
    listasAdmin[clave].actualizar();
  };
  const alfabetico = (a,b) => a.nombre.localeCompare(b.nombre, 'es');
  montar('usuarios', {
    obtenerDatos: () => estado.cuentasAdmin, buscar: c => `${c.nombre} ${c.correo}`,
    filtros: [{ label: 'Rol', opciones: ['Estudiante','Administrador','Revisor institucional'].map(r => [r,r]), filtrar: (c,v) => c.rol === v }, { label: 'Estado', opciones: [['activa','Activa'],['inactiva','Inactiva']], filtrar: (c,v) => Boolean(c.activa) === (v === 'activa') }],
    opcionesOrden: [['asc','Nombre A–Z'],['desc','Nombre Z–A'],['correo','Correo A–Z'],['rol','Rol A–Z'],['estado','Estado']],
    ordenar: (a,b,orden) => orden === 'estado' ? Number(b.activa)-Number(a.activa) : String(a[orden] || a.nombre).localeCompare(String(b[orden] || b.nombre), 'es'),
    renderizar: datos => { $('#lista-usuarios-admin').innerHTML = tablaAdmin('Usuarios', ['Nombre','Correo','Rol','Estado','Acciones'], datos.map(c => [
      `<strong>${escapar(c.nombre)}</strong>`, escapar(c.correo), escapar(c.rol), c.activa ? 'Activa' : 'Inactiva',
      `<div class="acciones">${accionAdmin('rol-usuario',c.id_cuenta,'Cambiar rol')}${accionAdmin('estado-usuario',c.id_cuenta,c.activa ? 'Desactivar' : 'Activar',Boolean(c.activa))}</div>`
    ])); }
  });
  montar('asignaturas', {
    obtenerDatos: () => catalogoAdmin, buscar: c => c.nombre, filtros: [filtroEstado('activo', true)], ordenar: alfabetico,
    renderizar: datos => { $('#lista-catalogo-materias').innerHTML = tablaAdmin('Asignaturas', ['Nombre','Estado','Acciones'], datos.map(c => [
      `<strong>${escapar(c.nombre)}</strong>`, c.activo ? 'Activa' : 'Inactiva', `<div class="acciones">${accionAdmin('editar-catalogo',c.id_catalogo_materia,'Editar nombre',false,`data-nombre="${escapar(c.nombre)}"`)}${accionAdmin('estado-catalogo',c.id_catalogo_materia,c.activo ? 'Desactivar' : 'Reactivar',Boolean(c.activo),`data-activo="${!c.activo}"`)}${accionAdmin('eliminar-catalogo',c.id_catalogo_materia,'Eliminar',true)}</div>`
    ])); }
  });
  montar('insignias', {
    obtenerDatos: () => estado.insignias, buscar: c => `${c.nombre} ${c.descripcion} ${reglasInsignia[c.condicion] || c.condicion}`, ordenar: alfabetico,
    renderizar: datos => { $('#lista-insignias-admin').innerHTML = tablaAdmin('Insignias', ['Nombre','Descripción','Condición','Ícono','Acciones'], datos.map(c => [
      `<strong>${escapar(c.nombre)}</strong>`, escapar(c.descripcion), escapar(reglasInsignia[c.condicion] || c.condicion), escapar(c.icono || 'Sin ícono'), `<div class="acciones">${accionAdmin('editar-insignia-admin',c.id_insignia,'Editar')}${accionAdmin('eliminar-insignia-admin',c.id_insignia,'Eliminar',true)}</div>`
    ])); }
  });
  montar('niveles', {
    obtenerDatos: () => estado.niveles, buscar: c => `${c.nombre} ${c.descripcion}`, opcionesOrden: [['asc','Menor umbral primero'],['desc','Mayor umbral primero']], ordenar: (a,b) => a.puntos_minimos-b.puntos_minimos,
    renderizar: datos => { $('#lista-niveles-admin').innerHTML = tablaAdmin('Niveles', ['Nombre','Descripción','Puntos mínimos','Orden','Ícono','Acciones'], datos.map(c => [
      `<strong>${escapar(c.nombre)}</strong>`, escapar(c.descripcion), escapar(c.puntos_minimos), escapar(c.orden), escapar(c.icono || 'Sin ícono'), `<div class="acciones">${accionAdmin('editar-nivel-admin',c.id_nivel,'Editar')}${accionAdmin('eliminar-nivel-admin',c.id_nivel,'Eliminar',true)}</div>`
    ])); }
  });
  $('#escala-niveles').innerHTML = [...estado.niveles].sort((a,b) => a.puntos_minimos-b.puntos_minimos).map(n => `<li><strong>${escapar(n.nombre)}</strong><small>${escapar(n.puntos_minimos)} puntos</small></li>`).join('');
  montar('retos', {
    obtenerDatos: () => estado.retosAdmin, buscar: c => `${c.descripcion} ${condicionLegible(c.condicion)} ${c.semana}`,
    filtros: [
      { label: 'Estudiante', opciones: () => estado.cuentasAdmin.filter(c => c.rol === 'Estudiante').map(c => [c.id_cuenta,c.nombre]), filtrar: (c,v) => c.id_cuenta === v },
      { label: 'Semana ISO', type: 'week', filtrar: (c,v) => c.semana === v }, filtroEstado('activo'),
      { label: 'Cumplimiento', opciones: [['true','Completado'],['false','Pendiente']], filtrar: (c,v) => String(Boolean(c.completado)) === v }
    ],
    opcionesOrden: [['desc','Semana más reciente'],['asc','Semana más antigua']], ordenar: (a,b) => a.semana.localeCompare(b.semana),
    renderizar: datos => { $('#lista-retos-admin').innerHTML = tablaAdmin('Retos', ['Estudiante','Descripción','Condición','Semana','Recompensa','Estado','Acciones'], datos.map(c => [
      escapar(estado.cuentasAdmin.find(u => u.id_cuenta === c.id_cuenta)?.nombre || 'Estudiante'), `<strong>${escapar(c.descripcion)}</strong>`, escapar(condicionLegible(c.condicion)), escapar(semanaLegible(c.semana)), `${escapar(c.puntos_recompensa)} puntos`, estadoRetoVisual(c),
      `<div class="acciones">${accionAdmin('editar-reto-admin',c.id_reto,'Editar')}${botonEstadoReto(c).replace('secundario', c.activo ? 'peligro' : 'secundario')}${c.completado ? '' : accionAdmin('eliminar-reto-admin',c.id_reto,'Eliminar',true)}</div>`
    ])); }
  });
  const resumen = {};
  for (const rol of ['Estudiante','Administrador','Revisor institucional']) {
    for (const activa of [true,false]) resumen[`${rol} · ${activa ? 'Activas' : 'Inactivas'}`] = estado.cuentasAdmin.filter(c => c.rol === rol && Boolean(c.activa) === activa).length;
  }
  Object.assign(resumen, { 'Asignaturas activas': catalogoAdmin.filter(c => c.activo).length, 'Asignaturas inactivas': catalogoAdmin.filter(c => !c.activo).length, Insignias: estado.insignias.length, Niveles: estado.niveles.length, 'Retos activos': estado.retosAdmin.filter(c => c.activo).length });
  $('#resumen-admin').innerHTML = tarjetasMetricas(resumen);
  // Conservar selección al refrescar listas y no cambiar de estudiante implícitamente.
  for (const selector of ['#admin-reto-cuenta','#admin-correccion-cuenta']) {
    const select = $(selector), anterior = select.value;
    select.innerHTML = '<option value="">Selecciona un estudiante</option>' + estado.cuentasAdmin.filter(c => c.rol === 'Estudiante').map(c => `<option value="${escapar(c.id_cuenta)}">${escapar(c.nombre)}</option>`).join('');
    select.value = anterior;
  }
  const insignia = $('#admin-insignia-correccion'), anterior = insignia.value;
  insignia.innerHTML = estado.insignias.map(c => `<option value="${escapar(c.id_insignia)}">${escapar(c.nombre)}</option>`).join('');
  if (anterior) insignia.value = anterior;
  actualizarCorreccion();
}

/** RF07/HU26: detalle exclusivamente de la cuenta elegida, sin mezclar retos y correcciones. */
async function cargarDetalleAdministrativo(idCuenta = $('#admin-correccion-cuenta').value) {
  const seleccion = $('#admin-correccion-cuenta').value;
  if (!idCuenta) { estado.puntosAdmin = []; estado.insigniasCuentaAdmin = []; actualizarCorreccion(); return; }
  const [puntos, insignias] = await Promise.all([api(`/puntos?id_cuenta=${encodeURIComponent(idCuenta)}`), api(`/cuenta-insignias?id_cuenta=${encodeURIComponent(idCuenta)}`)]);
  if (seleccion !== $('#admin-correccion-cuenta').value) return;
  estado.puntosAdmin = puntos.datos; estado.insigniasCuentaAdmin = insignias.datos;
  actualizarCorreccion();
}

/** RF07/HU26: un solo formulario por tipo; el motivo precede a la confirmación. */
function actualizarCorreccion() {
  const cuenta = $('#admin-correccion-cuenta').value, tipo = $('#tipo-correccion').value;
  $('#paso-tipo-correccion').hidden = !cuenta;
  $('#paso-form-correccion').hidden = !cuenta || !tipo;
  $('#form-admin-punto').hidden = tipo !== 'punto';
  $('#form-admin-asignar-insignia').hidden = tipo !== 'asignar-insignia';
  const f = $('#form-admin-retirar'); f.hidden = !['eliminar-punto','revocar'].includes(tipo);
  const registros = tipo === 'eliminar-punto' ? estado.puntosAdmin.map(p => [p.id_punto, `${p.cantidad} puntos · ${p.origen} · ${fechaLegible(p.fecha)}`]) : estado.insigniasCuentaAdmin.map(i => [i.id_insignia, i.insignia?.nombre || 'Insignia']);
  f.elements.registro.innerHTML = '<option value="">Selecciona un registro</option>' + registros.map(([id,label]) => `<option value="${escapar(id)}">${escapar(label)}</option>`).join('');
}

/** Editor contextual compartido por altas y ediciones; mantiene errores y datos al fallar. */
function abrirEditorAdmin(tipo, id = '') {
  const fuentes = { catalogo: [catalogoAdmin,'id_catalogo_materia'], insignia: [estado.insignias,'id_insignia'], nivel: [estado.niveles,'id_nivel'], reto: [estado.retosAdmin,'id_reto'] };
  const [lista, clave] = fuentes[tipo], actual = lista.find(c => c[clave] === id);
  const f = $(`#form-admin-${tipo}`); f.reset(); f.dataset.id = id;
  [...f.elements].forEach(c => { c.disabled = false; });
  f.querySelector('.error-campo').textContent = '';
  for (const [nombre, valor] of Object.entries(actual || {})) if (f.elements[nombre]) f.elements[nombre].value = valor ?? '';
  if (tipo === 'insignia') {
    // condicion es UNIQUE en BD: las reglas ya usadas por otra insignia no se ofrecen.
    const usadas = new Set(estado.insignias.filter(i => i.id_insignia !== id).map(i => i.condicion));
    for (const opcion of f.elements.condicion.options) opcion.disabled = usadas.has(opcion.value);
    const libre = [...f.elements.condicion.options].find(o => !o.disabled && o.value !== 'personalizada')?.value || 'personalizada';
    f.elements.condicion.value = reglasInsignia[actual?.condicion] ? actual.condicion : actual ? 'personalizada' : libre;
    f.elements.regla_personalizada.value = actual?.condicion || '';
    cambiarReglaInsignia();
  }
  // Alta de nivel (adaptado de cb4d2d3): propone el siguiente orden libre.
  if (tipo === 'nivel' && !actual) f.elements.orden.value = Math.max(0, ...estado.niveles.map(n => Number(n.orden) || 0)) + 1;
  if (tipo === 'reto') {
    const condicion = /^(tareas|sesiones|pomodoros|minutos):([1-9]\d*)$/.exec(actual?.condicion || 'tareas:1');
    f.elements.metrica.querySelector('[value=historica]')?.remove();
    if (!condicion && actual) f.elements.metrica.add(new Option(`Conservar condición actual: ${condicionLegible(actual.condicion)}`, 'historica'));
    f.elements.metrica.value = condicion?.[1] || 'historica'; f.elements.objetivo.value = condicion?.[2] || '';
    f.elements.objetivo.disabled = !condicion;
    f.elements.semana.value = actual?.semana || semanaActualReto();
    f.elements.id_cuenta.disabled = Boolean(id);
    if (actual?.completado) for (const nombre of ['metrica','objetivo','puntos_recompensa','semana']) f.elements[nombre].disabled = true;
  }
  $(`#titulo-editor-${tipo}`).textContent = `${id ? 'Editar' : 'Crear'} ${ { catalogo: 'asignatura', insignia: 'insignia', nivel: 'nivel', reto: 'reto' }[tipo]}`;
  f.querySelector('[type=submit]').textContent = id ? 'Guardar cambios' : { catalogo: 'Crear asignatura', insignia: 'Crear insignia', nivel: 'Crear nivel', reto: 'Asignar reto' }[tipo];
  $(`#editor-admin-${tipo}`).showModal(); f.querySelector('input,select').focus();
}
function cambiarReglaInsignia() {
  const f = $('#form-admin-insignia'), libre = f.elements.condicion.value === 'personalizada';
  $('#campo-regla-personalizada').hidden = !libre; f.elements.regla_personalizada.required = libre;
}

/** RF07/HU26: consecuencias y confirmación comunes antes de enviar el payload existente. */
async function confirmarCorreccion(tipo, datos, registro = '') {
  const cuenta = estado.cuentasAdmin.find(c => c.id_cuenta === $('#admin-correccion-cuenta').value);
  if (!cuenta) throw new Error('Selecciona un estudiante para la corrección.');
  const retirar = ['eliminar-punto','revocar'].includes(tipo);
  const detalle = [cuenta.nombre, cuenta.correo,
    tipo === 'punto' ? `Otorgar ${datos.cantidad} puntos · ${datos.origen}.` : tipo === 'asignar-insignia' ? `Asignar insignia: ${$('#admin-insignia-correccion').selectedOptions[0]?.textContent}.` : `${tipo === 'revocar' ? 'Revocar insignia' : 'Eliminar movimiento'}: ${registro}. La eliminación o revocación es permanente.`,
    `Motivo: ${datos.motivo}`, 'El estudiante será notificado y la corrección quedará registrada.'];
  if (!await confirmarAccion({ titulo: '4 · Revisar consecuencias de la corrección', detalle, textoConfirmar: 'Confirmar corrección', peligro: retirar, verificacion: retirar ? cuenta.correo : undefined })) return false;
  return cuenta.id_cuenta;
}

/** RF03/HU03: refresca progreso y avisos después de registrar un evento. */
async function recargarGamificacion() {
  const [puntos, insigniasCuenta, retos, metas, notificaciones, sugerencia] = await Promise.all([
    api('/puntos'), api('/cuenta-insignias'), api('/retos'), api('/metas'), api('/notificaciones'), api('/metas/sugerida')
  ]);
  estado.puntos = puntos.datos; estado.totalPuntos = puntos.total;
  estado.cuentaInsignias = insigniasCuenta.datos; estado.retos = retos.datos;
  estado.metaSugerida = sugerencia.dato;
  estado.metas = metas.datos; estado.notificaciones = notificaciones.datos;
  renderizarGamificacion(); renderizarNotificaciones(); renderizarResumen();
  await cargarResumenSemanal();
}

/** RF15/HU15: guarda solo por aceptación o envío explícito del estudiante. */
async function crearMeta(datos) {
  const panel = $('#panel-meta');
  await duranteEnvio(panel, async () => {
    try {
      await api('/metas', { method: 'POST', body: JSON.stringify(datos) });
      estado.metaSugerida = null;
      estado.editandoMeta = false;
      $('#form-meta').reset();
      await recargarGamificacion();
      avisar('Meta creada.', 'exito');
    } catch (error) { avisar(error.message, 'error'); }
  });
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
    <div class="item"><div class="item-fila"><div><strong>${escapar(item.mensaje)}</strong><br><small>${escapar(fechaLegible(item.fecha_programada))} · ${item.activo ? 'Activo' : 'Inactivo'}</small></div><div class="acciones"><button class="boton secundario pequeno" role="switch" aria-checked="${Boolean(item.activo)}" data-accion="alternar-recordatorio" data-id="${escapar(item.id_recordatorio)}" data-activo="${item.activo}">${item.activo ? 'Desactivar' : 'Activar'}</button><button class="boton peligro pequeno" data-accion="eliminar-recordatorio" data-id="${escapar(item.id_recordatorio)}">Eliminar</button></div></div></div>`).join('') : estadoVacio('No tienes recordatorios programados.');
}

/** RF04/HU24: presenta avisos recibidos y contador de no leídos. */
function renderizarNotificaciones() {
  const noLeidas = estado.notificaciones.filter(item => !item.leida).length;
  const contador = $('#contador-notificaciones');
  contador.textContent = noLeidas;
  contador.hidden = noLeidas === 0;
  $('#contador-notificaciones-encabezado').textContent = noLeidas;
  $('#contador-notificaciones-encabezado').hidden = noLeidas === 0;
  $('#notificaciones-encabezado').setAttribute('aria-label', noLeidas ? `Notificaciones: ${noLeidas} sin leer` : 'Notificaciones');
  $('#marcar-notificaciones').disabled = noLeidas === 0;
  $('#lista-notificaciones').innerHTML = estado.notificaciones.length ? estado.notificaciones.map(item => `
    <div class="item ${item.leida ? 'completada' : ''}"><div class="item-fila"><div><strong>${escapar(item.tipo)}</strong><br><span>${escapar(item.mensaje)}</span><br><small>${escapar(fechaLegible(item.fecha))} · ${item.leida ? 'Leída' : 'Sin leer'}</small></div><div class="acciones">${!item.leida ? `<button class="boton secundario pequeno" data-accion="leer-notificacion" data-id="${escapar(item.id_notificacion)}">Marcar leída</button>` : ''}<button class="boton peligro pequeno" data-accion="eliminar-notificacion" data-id="${escapar(item.id_notificacion)}">Eliminar</button></div></div></div>`).join('') : estadoVacio('No tienes notificaciones.');
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
  $('#panel-form-tarea').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
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
  $('#panel-form-reto').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
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
  $('#panel-form-materia').hidden = true;
  $('#mostrar-form-materia').setAttribute('aria-expanded', 'false');
  $('#mostrar-form-materia').focus();
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
  $('#iniciar-temporizador').className = 'boton secundario';
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
  $('#iniciar-temporizador').className = 'boton primario';
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

async function manejarAccion(evento) {
  const boton = evento.target.closest('[data-accion]');
  if (!boton) return;
  const { accion, id } = boton.dataset;
  if (boton.getAttribute('aria-busy') === 'true') return;
  const deshabilitado = boton.disabled;
  boton.setAttribute('aria-busy', 'true');
  try {
    if (['editar-catalogo', 'estado-catalogo', 'eliminar-catalogo'].includes(accion)) {
      const ruta = `/catalogo-materias/${id}`;
      if (accion === 'editar-catalogo') {
        const datos = await pedirDatos({ titulo: 'Nombre de la asignatura:', campos: [{ name: 'nombre', label: 'Nombre de la asignatura', type: 'text', value: boton.dataset.nombre, required: true, maxlength: 80 }], textoConfirmar: 'Guardar cambios' });
      if (!datos) return;
      const { nombre } = datos;
        if (nombre === null) return;
        await api(ruta, { method: 'PUT', body: JSON.stringify({ nombre }) });
      } else if (accion === 'estado-catalogo') {
        if (!await confirmarAccion({ titulo: boton.dataset.activo === 'true' ? '¿Reactivar esta asignatura?' : '¿Desactivar esta asignatura?', detalle: [catalogoAdmin.find(c => c.id_catalogo_materia === id)?.nombre || '', 'Se conservan las materias asociadas. Solo las asignaturas activas aparecen para nuevas materias.'], textoConfirmar: boton.dataset.activo === 'true' ? 'Reactivar asignatura' : 'Desactivar asignatura', peligro: boton.dataset.activo !== 'true' })) return;
        await api(`${ruta}/estado`, { method: 'PATCH', body: JSON.stringify({ activo: boton.dataset.activo === 'true' }) });
      } else {
        if (!await confirmarAccion({ titulo: '¿Eliminar esta asignatura del catálogo?', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || 'Elemento seleccionado', 'La eliminación o revocación es permanente.'], textoConfirmar: 'Eliminar', peligro: true })) return;
        await api(ruta, { method: 'DELETE' });
      }
      await cargarCatalogoMateriasAdmin(); avisar('Catálogo actualizado.', 'exito');
    }
    if (accion === 'nueva-tarea') return abrirTarea();
    if (accion === 'editar-materia') {
      const materia = estado.materias.find(item => item.id_materia === id);
      const f = $('#form-materia');
      f.elements.id.value = id;
      await cargarCatalogoMaterias();
      // Materias históricas sin catálogo: vacío conserva la asignatura actual.
      f.elements.id_catalogo_materia.value = materia.id_catalogo_materia || '';
      establecerHorario(f, materia.horario || '');
      $('#titulo-form-materia').textContent = `Editar materia: ${materia.nombre}`;
      $('#panel-form-materia').hidden = false;
      $('#mostrar-form-materia').setAttribute('aria-expanded', 'true');
      f.elements.id_catalogo_materia.focus();
      return;
    }
    if (accion === 'eliminar-materia' && await confirmarAccion({ titulo: '¿Deseas eliminar esta materia?', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || 'Elemento seleccionado', 'La eliminación o revocación es permanente.'], textoConfirmar: 'Eliminar', peligro: true })) {
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
      $('#detalle-tarea-datos').innerHTML = `<div><dt>Materia</dt><dd>${escapar(materiaDe(tarea.id_materia))}</dd></div><div><dt>Entrega</dt><dd>${escapar(entregaLegible(tarea))}</dd></div><div><dt>Prioridad</dt><dd>${escapar(tarea.prioridad)}</dd></div><div><dt>Estado</dt><dd>${escapar(tarea.estado)}</dd></div>`;
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
    if (accion === 'eliminar-tarea' && await confirmarAccion({ titulo: '¿Deseas eliminar esta tarea?', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || 'Elemento seleccionado', 'La eliminación o revocación es permanente.'], textoConfirmar: 'Eliminar', peligro: true })) {
      await api(`/tareas/${id}`, { method: 'DELETE' });
      estado.tareas = estado.tareas.filter(item => item.id_tarea !== id);
      await actualizarAvisos();
      renderizarTareas(); renderizarResumen(); await cargarResumenSemanal(); avisar('Tarea eliminada.', 'exito');
    }
    if (accion === 'editar-reto') {
      const reto = estado.retos.find(item => item.id_reto === id);
      if (reto && !reto.completado) abrirReto(reto);
    }
    if (accion === 'completar-reto') {
      const reto = estado.retos.find(item => item.id_reto === id);
      if (!await confirmarAccion({ titulo: 'Completar reto y acreditar recompensa', detalle: [reto.descripcion, `${reto.puntos_recompensa} puntos de recompensa. Esta acción registra el completado del reto.`], textoConfirmar: 'Completar reto' })) return;
      boton.disabled = true;
      await api(`/retos/${id}/completar`, { method: 'PATCH' });
      await recargarGamificacion();
      avisar('Reto completado. Puntos actualizados.', 'exito');
    }
    if (accion === 'estado-reto') {
      const activo = boton.dataset.activo === 'true';
      if (estado.cuenta?.rol === 'Administrador' && !await confirmarAccion({ titulo: activo ? '¿Reactivar este reto?' : '¿Desactivar este reto?', detalle: [estado.retosAdmin.find(r => r.id_reto === id)?.descripcion || '', 'Se conserva su progreso. Inactivo no recibirá progreso ni nuevas recompensas.'], textoConfirmar: activo ? 'Reactivar reto' : 'Desactivar reto', peligro: !activo })) return;
      const respuesta = await api(`/retos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ activo }) });
      const reemplazar = lista => lista.map(item => item.id_reto === id ? respuesta.dato : item);
      estado.retos = reemplazar(estado.retos); estado.retosAdmin = reemplazar(estado.retosAdmin);
      if (estado.cuenta?.rol === 'Administrador') renderizarAdministracion(); else renderizarGamificacion();
      avisar(activo ? 'Reto reactivado. Conserva su progreso y sus puntos.' : 'Reto desactivado. No recibirá progreso ni nuevas recompensas.', 'exito');
    }
    if (accion === 'eliminar-reto' && await confirmarAccion({ titulo: '¿Deseas eliminar este reto?', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || 'Elemento seleccionado', 'La eliminación o revocación es permanente.'], textoConfirmar: 'Eliminar', peligro: true })) {
      await api(`/retos/${id}`, { method: 'DELETE' });
      estado.retos = estado.retos.filter(item => item.id_reto !== id);
      renderizarGamificacion(); avisar('Reto eliminado.', 'exito');
    }
    if (accion === 'editar-meta') {
      const meta = estado.metas.find(item => item.id_meta === id);
      const datos = await pedirDatos({ titulo: 'Descripción de la meta', campos: [{ name: 'descripcion', label: 'Descripción de la meta', type: 'text', value: meta.descripcion, required: true, maxlength: 200 }], textoConfirmar: 'Guardar cambios' });
      if (!datos) return;
      const { descripcion } = datos;
      if (descripcion === null || !descripcion.trim()) return;
      const respuesta = await api(`/metas/${id}`, { method: 'PUT', body: JSON.stringify({ descripcion: descripcion.trim() }) });
      estado.metas = estado.metas.map(item => item.id_meta === id ? respuesta.dato : item);
      renderizarGamificacion(); avisar('Meta actualizada.', 'exito');
    }
    if (accion === 'eliminar-meta' && await confirmarAccion({ titulo: '¿Deseas eliminar esta meta?', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || 'Elemento seleccionado', 'La eliminación o revocación es permanente.'], textoConfirmar: 'Eliminar', peligro: true })) {
      await api(`/metas/${id}`, { method: 'DELETE' });
      estado.metas = estado.metas.filter(item => item.id_meta !== id);
      renderizarGamificacion(); avisar('Meta eliminada.', 'exito');
    }
    if (accion === 'editar-sesion') {
      const sesion = estado.sesiones.find(item => item.id_sesion === id);
      const datos = await pedirDatos({ titulo: 'Editar sesión', campos: [{ name: 'duracion', label: 'Duración en minutos', type: 'number', value: sesion.duracion_minutos, required: true, min: 1 }], textoConfirmar: 'Guardar sesión' });
      if (!datos) return;
      const duracion = Number(datos.duracion);
      if (!Number.isInteger(duracion) || duracion < 1) return avisar('La duración debe ser un entero positivo.', 'error');
      const respuesta = await api(`/sesiones/${id}`, { method: 'PUT', body: JSON.stringify({ duracion_minutos: duracion, modo_enfoque: Boolean(sesion.modo_enfoque) }) });
      estado.sesiones = estado.sesiones.map(item => item.id_sesion === id ? respuesta.dato : item);
      renderizarSesiones(); renderizarResumen(); avisar('Sesión actualizada.', 'exito');
    }
    if (accion === 'eliminar-sesion' && await confirmarAccion({ titulo: '¿Deseas eliminar esta sesión?', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || 'Elemento seleccionado', 'La eliminación o revocación es permanente.'], textoConfirmar: 'Eliminar', peligro: true })) {
      await api(`/sesiones/${id}`, { method: 'DELETE' });
      estado.sesiones = estado.sesiones.filter(item => item.id_sesion !== id);
      renderizarSesiones(); renderizarResumen(); avisar('Sesión eliminada.', 'exito');
    }
    if (accion === 'alternar-recordatorio') {
      await api(`/recordatorios/${id}`, { method: 'PATCH', body: JSON.stringify({ activo: boton.dataset.activo !== 'true' }) });
      const respuesta = await api('/recordatorios'); estado.recordatorios = respuesta.datos; renderizarRecordatorios(); avisar('Recordatorio actualizado.', 'exito');
    }
    if (accion === 'eliminar-recordatorio') {
      if (!await confirmarAccion({ titulo: 'Eliminar recordatorio', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || '', 'Esta acción es permanente.'], textoConfirmar: 'Eliminar recordatorio', peligro: true })) return;
      await api(`/recordatorios/${id}`, { method: 'DELETE' });
      estado.recordatorios = estado.recordatorios.filter(item => item.id_recordatorio !== id); renderizarRecordatorios(); avisar('Recordatorio eliminado.', 'exito');
    }
    if (accion === 'leer-notificacion') {
      await api(`/notificaciones/${id}/leida`, { method: 'PATCH' });
      estado.notificaciones = estado.notificaciones.map(item => item.id_notificacion === id ? { ...item, leida: true } : item); renderizarNotificaciones(); avisar('Notificación marcada como leída.', 'exito');
    }
    if (accion === 'eliminar-notificacion') {
      if (!await confirmarAccion({ titulo: 'Eliminar notificación', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || '', 'Esta acción es permanente.'], textoConfirmar: 'Eliminar notificación', peligro: true })) return;
      await api(`/notificaciones/${id}`, { method: 'DELETE' });
      estado.notificaciones = estado.notificaciones.filter(item => item.id_notificacion !== id); renderizarNotificaciones(); avisar('Notificación eliminada.', 'exito');
    }
    if (['rol-usuario','estado-usuario'].includes(accion)) {
      const cuenta = estado.cuentasAdmin.find(c => c.id_cuenta === id);
      let cambios;
      if (accion === 'rol-usuario') {
        const datos = await pedirDatos({ titulo: `Cambiar rol de ${cuenta.nombre}`, detalle: [cuenta.correo, `Rol actual: ${cuenta.rol}. El nuevo rol cambiará los permisos de acceso de esta cuenta.`], campos: [{ name: 'rol', label: 'Nuevo rol', type: 'select', value: cuenta.rol, opciones: ['Estudiante','Administrador','Revisor institucional'].map(r => [r,r]) }], textoConfirmar: 'Cambiar rol' });
        if (!datos || datos.rol === cuenta.rol) return;
        cambios = { rol: datos.rol };
      } else {
        // Escribir el correo es una salvaguarda contra errores, no reautenticación.
        if (!await confirmarAccion({ titulo: cuenta.activa ? `¿Estás seguro de que deseas desactivar la cuenta de ${cuenta.nombre}?` : `¿Activar la cuenta de ${cuenta.nombre}?`, detalle: [cuenta.nombre, cuenta.correo, `Rol: ${cuenta.rol}`, `Estado: ${cuenta.activa ? 'Activa' : 'Inactiva'}`, cuenta.activa ? 'No podrá iniciar sesión. Sus datos se conservan.' : 'Podrá iniciar sesión con sus permisos actuales.'], textoConfirmar: cuenta.activa ? 'Desactivar cuenta' : 'Activar cuenta', peligro: Boolean(cuenta.activa), verificacion: cuenta.activa ? cuenta.correo : undefined })) return;
        cambios = { activa: !cuenta.activa };
      }
      try {
        const respuesta = await api(`/cuentas/${id}`, { method: 'PUT', body: JSON.stringify(cambios) });
        estado.cuentasAdmin = estado.cuentasAdmin.map(c => c.id_cuenta === id ? respuesta.dato : c);
        renderizarAdministracion(); avisar('Cuenta actualizada.', 'exito');
      } catch (error) {
        avisar(error.message, 'error');
        if (accion === 'rol-usuario') await confirmarAccion({ titulo: 'No se pudo cambiar el rol', detalle: [cuenta.nombre, cuenta.correo, error.message, `Se conserva el rol ${cuenta.rol}.`], textoConfirmar: 'Entendido' });
      }
    }
    if (accion === 'eliminar-insignia-admin' && await confirmarAccion({ titulo: '¿Eliminar esta insignia?', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || 'Elemento seleccionado', 'La eliminación o revocación es permanente.'], textoConfirmar: 'Eliminar', peligro: true })) {
      await api(`/insignias/${id}`, { method: 'DELETE' });
      estado.insignias = estado.insignias.filter(item => item.id_insignia !== id);
      renderizarAdministracion(); avisar('Insignia eliminada.', 'exito');
    }
    if (accion === 'eliminar-nivel-admin' && await confirmarAccion({ titulo: '¿Eliminar este nivel?', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || 'Elemento seleccionado', 'La eliminación o revocación es permanente.'], textoConfirmar: 'Eliminar', peligro: true })) {
      await api(`/niveles/${id}`, { method: 'DELETE' });
      estado.niveles = estado.niveles.filter(item => item.id_nivel !== id);
      renderizarAdministracion(); avisar('Nivel eliminado.', 'exito');
    }
    if (accion === 'editar-insignia-admin') abrirEditorAdmin('insignia', id);
    if (accion === 'editar-nivel-admin') abrirEditorAdmin('nivel', id);
    if (accion === 'editar-reto-admin') abrirEditorAdmin('reto', id);
    if (accion === 'eliminar-reto-admin' && await confirmarAccion({ titulo: '¿Eliminar este reto?', detalle: [boton.closest('.item')?.querySelector('strong')?.textContent || 'Elemento seleccionado', 'La eliminación o revocación es permanente.'], textoConfirmar: 'Eliminar', peligro: true })) {
      await api(`/retos/${id}`, { method: 'DELETE' });
      estado.retosAdmin = estado.retosAdmin.filter(item => item.id_reto !== id);
      renderizarAdministracion(); avisar('Reto eliminado.', 'exito');
    }

  } catch (error) { avisar(error.message + (accion === 'eliminar-catalogo' && error.status === 409 ? ' Puedes desactivar la asignatura para conservar sus asociaciones.' : ''), 'error'); }
  finally { boton.disabled = deshabilitado; boton.removeAttribute('aria-busy'); }
}

/** RF01–RF15/HU01–HU28: conecta formularios y botones con sus acciones de M16. */
function registrarEventos() {
  configurarNavegacion();
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
    if (!leerHorario(f).valido) { selectorHorario(f).querySelector('[aria-invalid=true]')?.focus(); return; }
    duranteEnvio(f, async () => {
      try {
        const registro = await api('/auth/registro', { method: 'POST', body: JSON.stringify({ nombre: f.elements.nombre.value, correo: f.elements.correo.value, contrasena: f.elements.contrasena.value, materia: { id_catalogo_materia: f.elements.id_catalogo_materia.value, horario: f.elements.horario.value || null } }) });
        if (registro.requiere_verificacion) { abrirCodigoCorreo(registro.desafio, 'verificar', f.elements.correo.value); f.elements.contrasena.value = ''; return; }
        await iniciarSesion(f.elements.correo.value, f.elements.contrasena.value); avisar('Cuenta creada correctamente.', 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  $('#mostrar-form-materia').addEventListener('click', () => {
    const f = $('#form-materia');
    if (f.elements.id.value) { f.reset(); f.elements.id.value = ''; $('#titulo-form-materia').textContent = 'Nueva materia'; cargarCatalogoMaterias(); }
    $('#panel-form-materia').hidden = false;
    $('#mostrar-form-materia').setAttribute('aria-expanded', 'true');
    $('#form-materia').elements.id_catalogo_materia.focus();
  });
  $('#form-materia').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget; const id = f.elements.id.value;
    if (!leerHorario(f).valido) { selectorHorario(f).querySelector('[aria-invalid=true]')?.focus(); return; }
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
  $('#aceptar-meta-sugerida').addEventListener('click', () => {
    if (estado.metaSugerida) crearMeta({ ...estado.metaSugerida });
  });
  $('#personalizar-meta').addEventListener('click', () => {
    const f = $('#form-meta');
    if (!estado.metaSugerida) return;
    for (const campo of ['semana', 'descripcion', 'valor_objetivo']) f.elements[campo].value = estado.metaSugerida[campo];
    estado.editandoMeta = true;
    $('#meta-sugerida').hidden = true;
    f.hidden = false; $('#mostrar-form-meta').setAttribute('aria-expanded', 'true');
    f.elements.descripcion.focus();
  });
  $('#mostrar-form-meta').addEventListener('click', () => {
    estado.editandoMeta = true;
    const f = $('#form-meta'); f.reset();
    f.elements.semana.value = estado.metaSugerida?.semana || semanaActualReto();
    $('#meta-sugerida').hidden = true;
    f.hidden = false; $('#mostrar-form-meta').setAttribute('aria-expanded', 'true'); f.elements.descripcion.focus();
  });
  $('#form-meta').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    crearMeta({ semana: f.elements.semana.value, descripcion: f.elements.descripcion.value, valor_objetivo: Number(f.elements.valor_objetivo.value) });
  });
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
        cerrarTarea(); renderizarTareas(); renderizarResumen(); await cargarResumenSemanal(); avisar(`Tarea ${id ? 'actualizada' : 'creada'}.`, 'exito');
      } catch (error) { avisar(error.message, 'error'); }
    });
  });
  let esperaTareas;
  $('#buscar-tarea').addEventListener('input', () => { clearTimeout(esperaTareas); esperaTareas = setTimeout(renderizarTareas, 250); });
  ['filtro-materia', 'filtro-prioridad', 'filtro-estado', 'filtro-fecha-desde', 'filtro-fecha-hasta'].forEach(id => $(`#${id}`).addEventListener('input', renderizarTareas));
  const filtrosMoviles = window.matchMedia('(max-width: 719px)');
  const adaptarFiltros = () => { $('#filtros-tareas').open = !filtrosMoviles.matches; };
  adaptarFiltros(); filtrosMoviles.addEventListener('change', adaptarFiltros);
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
  $('#guardar-temporizador').addEventListener('click', () => duranteEnvio($('#tarjeta-temporizador'), () => guardarSesion().catch(error => avisar(error.message, 'error'))));
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
  $('#habilitar-avisos').addEventListener('click', () => duranteEnvio($('#habilitar-avisos'), () => solicitarPermisoAvisos().catch(error => avisar(error.message, 'error'))));
  $('#marcar-notificaciones').addEventListener('click', () => duranteEnvio($('#marcar-notificaciones'), async () => {
    try { await api('/notificaciones/leidas', { method: 'PATCH' }); estado.notificaciones = estado.notificaciones.map(item => ({ ...item, leida: true })); renderizarNotificaciones(); avisar('Notificaciones marcadas como leídas.', 'exito'); }
    catch (error) { avisar(error.message, 'error'); }
  }).then(renderizarNotificaciones));
  $('#form-preferencias').addEventListener('submit', evento => {
    evento.preventDefault(); const f = evento.currentTarget;
    duranteEnvio(f, async () => {
      try {
        const respuesta = await api('/preferencias', { method: 'PUT', body: JSON.stringify({ avatar: f.elements.avatar.value, tema: f.elements.tema.value, modo_oscuro: f.elements.modo_oscuro.checked, notificaciones_recordatorios: f.elements.notificaciones_recordatorios.checked, notificaciones_retos: f.elements.notificaciones_retos.checked }) });
        estado.preferencias = respuesta.dato; aplicarPreferencias(); avisar('Preferencias guardadas.', 'exito');
      } catch (error) { aplicarPreferencias(); avisar(error.message, 'error'); }
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
  $('#eliminar-datos').addEventListener('click', async () => {
    if (!await confirmarAccion({ titulo: 'Eliminar todos mis datos', detalle: [estado.cuenta.nombre, estado.cuenta.correo, 'Esta acción elimina permanentemente tus datos. Exporta primero para conservar una copia.'], textoConfirmar: 'Eliminar todos mis datos', peligro: true, verificacion: estado.cuenta.correo })) return;
    duranteEnvio($('#eliminar-datos'), async () => {
      try { await api(`/cuentas/${estado.cuenta.id_cuenta}/datos`, { method: 'DELETE' }); await cerrarSesion(); }
      catch (error) { avisar(error.message, 'error'); }
    });
  });

  /** RF01/HU30/RN27: Cancelar no envía ninguna petición; Confirmar desactiva una sola vez y cierra la sesión. */
  $('#desactivar-cuenta').addEventListener('click', async () => {
    if (!await confirmarAccion({ titulo: '¿Estás seguro de que deseas desactivar tu cuenta?',
      detalle: [estado.cuenta.nombre, estado.cuenta.correo, estado.cuenta.rol, 'No podrás iniciar sesión hasta que un Administrador reactive tu cuenta. Tus datos se conservarán.'],
      textoConfirmar: 'Confirmar', peligro: true, verificacion: estado.cuenta.correo })) return;
    duranteEnvio($('#desactivar-cuenta'), async () => {
      try {
        await api(`/cuentas/${estado.cuenta.id_cuenta}`, { method: 'DELETE' });
        await cerrarSesion(false);
        avisar('Tu cuenta fue desactivada. Tus datos se conservan; solo un Administrador puede reactivarla.', 'exito');
      } catch (error) { avisar(`No se pudo desactivar la cuenta: ${error.message}`, 'error'); }
    });
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
    if (botonExportar.getAttribute('aria-busy') === 'true') return;
    botonExportar.setAttribute('aria-busy', 'true');
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
    finally { botonExportar.disabled = false; botonExportar.removeAttribute('aria-busy'); }
  });
  $('#recargar-admin').addEventListener('click', evento => duranteEnvio(evento.currentTarget, async () => {
    try {
      const [cuentas, niveles, insignias] = await Promise.all([api('/cuentas'), api('/niveles'), api('/insignias')]);
      estado.cuentasAdmin = cuentas.datos; estado.niveles = niveles.datos; estado.insignias = insignias.datos;
      await cargarRetosAdmin(); await cargarCatalogoMateriasAdmin();
      renderizarAdministracion(); await cargarDetalleAdministrativo(); avisar('Datos administrativos actualizados.', 'exito');
    } catch (error) { avisar(error.message, 'error'); }
  }));
  $$('[data-editor-admin]').forEach(b => b.addEventListener('click', () => abrirEditorAdmin(b.dataset.editorAdmin)));
  $$('[data-cerrar-editor]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
  $('#form-admin-insignia').elements.condicion.addEventListener('change', cambiarReglaInsignia);
  for (const tipo of ['catalogo','insignia','nivel','reto']) {
    $(`#form-admin-${tipo}`).addEventListener('submit', evento => {
      evento.preventDefault(); const f = evento.currentTarget;
      duranteEnvio(f, async () => {
        const id = f.dataset.id;
        const recurso = { catalogo: 'catalogo-materias', insignia: 'insignias', nivel: 'niveles', reto: 'retos' }[tipo];
        try {
          f.querySelector('.error-campo').textContent = '';
          let datos;
          if (tipo === 'catalogo') datos = { nombre: f.elements.nombre.value.trim() };
          if (tipo === 'insignia') datos = {
            nombre: f.elements.nombre.value.trim(), descripcion: f.elements.descripcion.value.trim(),
            condicion: f.elements.condicion.value === 'personalizada' ? f.elements.regla_personalizada.value.trim() : f.elements.condicion.value,
            icono: f.elements.icono.value.trim() || null
          };
          if (tipo === 'nivel') datos = {
            nombre: f.elements.nombre.value.trim(), descripcion: f.elements.descripcion.value.trim(),
            puntos_minimos: Number(f.elements.puntos_minimos.value), orden: Number(f.elements.orden.value), icono: f.elements.icono.value.trim() || null
          };
          if (tipo === 'reto') {
            datos = { descripcion: f.elements.descripcion.value.trim(), condicion: `${f.elements.metrica.value}:${f.elements.objetivo.value}`, puntos_recompensa: Number(f.elements.puntos_recompensa.value), semana: f.elements.semana.value };
            if (!id) datos.id_cuenta = f.elements.id_cuenta.value;
            // Una condición histórica se conserva al editar otros campos hasta cambiar su métrica u objetivo.
            const actual = estado.retosAdmin.find(c => c.id_reto === id);
            if (actual && !/^(tareas|sesiones|pomodoros|minutos):[1-9]\d*$/.test(actual.condicion) && f.elements.metrica.value === 'historica') delete datos.condicion;
            if (actual?.completado) datos = { descripcion: datos.descripcion };
          }
          for (const [clave, valor] of Object.entries(datos)) {
            if (typeof valor === 'string' && !valor.trim()) throw new Error('Completa todos los campos obligatorios.');
            if (['puntos_minimos','orden','puntos_recompensa'].includes(clave) && (!Number.isSafeInteger(valor) || valor < (clave === 'puntos_minimos' ? 0 : 1))) throw new Error('Indica cantidades enteras dentro de los límites del formulario.');
          }
          const respuesta = await api(`/${recurso}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(datos) });
          if (tipo === 'catalogo') await cargarCatalogoMateriasAdmin();
          else {
            const propiedad = { insignia: 'insignias', nivel: 'niveles', reto: 'retosAdmin' }[tipo], clave = `id_${tipo}`;
            estado[propiedad] = id ? estado[propiedad].map(c => c[clave] === id ? respuesta.dato : c) : [...estado[propiedad], respuesta.dato];
          }
          $(`#editor-admin-${tipo}`).close(); renderizarAdministracion();
          avisar(id ? `${{catalogo:'Asignatura',insignia:'Insignia',nivel:'Nivel',reto:'Reto'}[tipo]} actualizad${tipo === 'catalogo' || tipo === 'insignia' ? 'a' : 'o'}.` : { catalogo: 'Asignatura creada.', insignia: 'Insignia creada.', nivel: 'Nivel creado.', reto: 'Reto semanal asignado.' }[tipo], 'exito');
        } catch (error) { f.querySelector('.error-campo').textContent = error.message; avisar(error.message, 'error'); }
      });
    });
  }
  $('#form-admin-reto').elements.metrica.addEventListener('change', () => {
    const f = $('#form-admin-reto'); f.elements.objetivo.disabled = f.elements.metrica.value === 'historica';
  });
  $('#tipo-correccion').addEventListener('change', actualizarCorreccion);
  $('#admin-correccion-cuenta').addEventListener('change', async () => {
    $('#tipo-correccion').value = ''; $('#resultado-correccion').textContent = '';
    estado.puntosAdmin = []; estado.insigniasCuentaAdmin = []; actualizarCorreccion();
    try { await cargarDetalleAdministrativo(); } catch (error) { avisar(error.message, 'error'); }
  });
  for (const [id, tipo] of [['form-admin-punto','punto'],['form-admin-asignar-insignia','asignar-insignia'],['form-admin-retirar','retirar']]) {
    $(`#${id}`).addEventListener('submit', evento => {
      evento.preventDefault(); const f = evento.currentTarget;
      duranteEnvio(f, async () => {
        try {
          const operacion = tipo === 'retirar' ? $('#tipo-correccion').value : tipo;
          const motivo = f.elements.motivo.value.trim();
          if (!motivo) throw new Error('Debes indicar el motivo de la corrección.');
          const datos = tipo === 'punto' ? { cantidad: Number(f.elements.cantidad.value), origen: f.elements.origen.value, motivo } : tipo === 'asignar-insignia' ? { id_insignia: f.elements.id_insignia.value, motivo } : { motivo };
          const cuenta = await confirmarCorreccion(operacion, datos, f.elements.registro?.selectedOptions[0]?.textContent);
          if (!cuenta) return;
          if (tipo === 'retirar' && cuenta !== $('#admin-correccion-cuenta').value) return;
          const ruta = tipo === 'punto' ? '/puntos' : tipo === 'asignar-insignia' ? '/cuenta-insignias' : operacion === 'eliminar-punto' ? `/puntos/${f.elements.registro.value}` : `/cuenta-insignias/${cuenta}/${f.elements.registro.value}`;
          await api(ruta, { method: tipo === 'retirar' ? 'DELETE' : 'POST', body: JSON.stringify(tipo === 'retirar' ? datos : { id_cuenta: cuenta, ...datos }) });
          f.reset(); await cargarDetalleAdministrativo(cuenta);
          const mensaje = tipo === 'punto' ? 'Puntos registrados y estudiante notificado.' : tipo === 'asignar-insignia' ? 'Insignia asignada y estudiante notificado.' : operacion === 'eliminar-punto' ? 'Movimiento corregido.' : 'Insignia revocada.';
          $('#resultado-correccion').textContent = `5 · Resultado: ${mensaje}`; avisar(mensaje, 'exito');
        } catch (error) { $('#resultado-correccion').textContent = error.message; avisar(error.message, 'error'); }
      });
    });
  }

}

/** Punto de entrada del navegador. Intenta restaurar una sesión de la pestaña. */
/** RF01/HU01: registra eventos y recupera una sesión si hay token. */
async function iniciar() {
  prepararValidacionVisual();
  inicializarSelectoresHorario();
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
  $('#mostrar-reenvio-verificacion').hidden = !verificacion;
  $('#mostrar-reenvio-verificacion').addEventListener('click', () => {
    const formulario = $('#form-reenviar-verificacion');
    formulario.hidden = !formulario.hidden;
    $('#mostrar-reenvio-verificacion').setAttribute('aria-expanded', String(!formulario.hidden));
    if (!formulario.hidden) formulario.elements.correo.focus();
  });
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
    if (boton.getAttribute('aria-busy') === 'true') return;
    boton.setAttribute('aria-busy', 'true');
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
    } finally { boton.removeAttribute('aria-busy'); }
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
      } catch (error) { f.elements.activar.checked = Boolean(estado.cuenta.mfa_correo); avisar(error.message, 'error'); }
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
