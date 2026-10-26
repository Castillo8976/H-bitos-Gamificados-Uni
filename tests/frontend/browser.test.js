'use strict';

/** RF01/HU01, RF03/HU03, RF10/HU10, RF11/HU08/HU28 y RF14/HU14:
 * recorre flujos reales con Chrome/CDP y una base de ensayo. El puerto 9333
 * debe estar libre; el proceso y perfil creados pertenecen solo a esta prueba.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'studyquest-browser-'));
process.env.DATABASE_STORAGE = path.join(directory, 'database.sqlite');
process.env.JWT_SECRET = 'secreto-pruebas-navegador';

const sequelize = require('../../src/database');
const { inicializarEsquema } = require('../../src/config/schema');
const authService = require('../../src/services/authService');
const Cuenta = require('../../src/models/Cuenta');
const app = require('../../src/app');
const planificador = require('../../src/services/planificadorRecordatoriosService');
const Notificacion = require('../../src/models/Notificacion');

function localizarNavegador() {
  const candidatos = [
    process.env.CHROME_PATH,
    process.platform === 'win32' ? path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe') : '/usr/bin/google-chrome',
    process.platform === 'win32' ? path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe') : '/usr/bin/chromium'
  ].filter(Boolean);
  const ejecutable = candidatos.find(candidato => fs.existsSync(candidato));
  if (!ejecutable) throw new Error('No se encontró Chrome/Chromium. Configure CHROME_PATH para ejecutar la prueba de navegador.');
  return ejecutable;
}

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

async function esperarHttp(url, intentos = 80) {
  for (let intento = 0; intento < intentos; intento += 1) {
    try { const respuesta = await fetch(url); if (respuesta.ok) return respuesta; } catch (_) { /* reintento */ }
    await esperar(100);
  }
  throw new Error(`No respondió ${url}`);
}

class Cdp {
  constructor(url) {
    this.id = 0; this.pendientes = new Map(); this.errores = [];
    this.socket = new WebSocket(url);
  }
  async conectar() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
    this.socket.addEventListener('message', evento => {
      const mensaje = JSON.parse(evento.data);
      if (mensaje.method === 'Runtime.exceptionThrown') {
        const detalle = mensaje.params.exceptionDetails;
        this.errores.push(detalle.exception?.description || detalle.text);
      }
      if (mensaje.method === 'Runtime.consoleAPICalled' && mensaje.params.type === 'error') {
        this.errores.push(mensaje.params.args?.map(item => item.value || item.description).filter(Boolean).join(' ') || 'console.error');
      }
      if (!mensaje.id) return;
      const pendiente = this.pendientes.get(mensaje.id);
      if (!pendiente) return;
      this.pendientes.delete(mensaje.id);
      if (mensaje.error) pendiente.reject(new Error(mensaje.error.message)); else pendiente.resolve(mensaje.result);
    });
  }
  enviar(method, params = {}) {
    const id = ++this.id;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pendientes.set(id, { resolve, reject }));
  }
  async evaluar(expression) {
    const resultado = await this.enviar('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (resultado.exceptionDetails) throw new Error(resultado.exceptionDetails.text);
    return resultado.result.value;
  }
  cerrar() { this.socket.close(); }
}

async function esperarCondicion(cdp, expresion, intentos = 80) {
  let ultimoError;
  for (let intento = 0; intento < intentos; intento += 1) {
    try {
      if (await cdp.evaluar(`Boolean(${expresion})`)) return;
    } catch (error) {
      ultimoError = error;
    }
    await esperar(100);
  }
  throw new Error(`No se cumplió la condición: ${expresion}. Último error: ${ultimoError?.message ?? ultimoError ?? 'ninguno'}`);
}

async function autenticar(cdp, correo) {
  await cdp.evaluar(`(async()=>{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({correo:${JSON.stringify(correo)},contrasena:'ClaveSegura123!'})});const d=await r.json();sessionStorage.setItem('studyquest_token',d.token);location.reload();return r.status})()`);
  await esperarCondicion(cdp, "document.readyState==='complete' && document.querySelector('#aplicacion')?.hidden === false");
}

async function run() {
  await inicializarEsquema();
  const { id_catalogo_materia } = await require('../helpers/catalogo').sembrarCatalogo();
  for (const [nombre, correo, rol] of [
    ['Estudiante Browser', 'estudiante-browser@test.local', 'Estudiante'],
    ['Administrador Browser', 'admin-browser@test.local', 'Administrador'],
    ['Revisor Browser', 'revisor-browser@test.local', 'Revisor institucional']
  ]) {
    const cuenta = await authService.register({ nombre, correo, contrasena: 'ClaveSegura123!', materia: { id_catalogo_materia } });
    if (rol !== 'Estudiante') await Cuenta.update({ rol }, { where: { id_cuenta: cuenta.id_cuenta } });
  }

  const servidor = await new Promise((resolve, reject) => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia));
    instancia.once('error', reject);
  });
  const puerto = servidor.address().port;
  const puertoCdp = 9333;
  const chrome = spawn(localizarNavegador(), [
    '--headless=new', '--no-sandbox', '--disable-gpu', `--remote-debugging-port=${puertoCdp}`,
    `--user-data-dir=${path.join(directory, 'chrome')}`, '--remote-allow-origins=*', 'about:blank'
  ], { stdio: 'ignore' });

  let cdp;
  try {
    await esperarHttp(`http://127.0.0.1:${puertoCdp}/json/version`);
    const objetivo = await fetch(`http://127.0.0.1:${puertoCdp}/json/new?http://127.0.0.1:${puerto}`, { method: 'PUT' }).then(r => r.json());
    cdp = new Cdp(objetivo.webSocketDebuggerUrl); await cdp.conectar();
    await cdp.enviar('Runtime.enable'); await cdp.enviar('Page.enable');
    await esperarCondicion(cdp, "document.querySelector('#form-login')");
    await esperarCondicion(cdp, "document.readyState==='complete'");
    await esperarCondicion(cdp, "document.querySelector('#form-registro select').options.length === 2");
    assert.equal(await cdp.evaluar(`(()=>{const t=document.querySelector('#tab-login');t.focus();t.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));return document.activeElement.id==='tab-registro'&&document.activeElement.getAttribute('aria-selected')==='true'})()`), true);
    assert.equal(await cdp.evaluar(`(()=>{const t=document.querySelector('#tab-registro');t.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));return document.activeElement.id==='tab-login'&&document.activeElement.getAttribute('aria-selected')==='true'})()`), true);

    // RN26: catálogo vacío impide el registro; al reactivarlo se puede elegir una asignatura.
    const CatalogoMateria = require('../../src/models/CatalogoMateria');
    await CatalogoMateria.update({ activo: false }, { where: { id_catalogo_materia } });
    await cdp.evaluar("document.querySelector('#tab-registro').click()");
    await esperarCondicion(cdp, "document.querySelector('#aviso-catalogo-registro').textContent.includes('No hay asignaturas disponibles') && document.querySelector('#form-registro [type=submit]').disabled");
    await CatalogoMateria.update({ activo: true }, { where: { id_catalogo_materia } });
    await cdp.evaluar("document.querySelector('#tab-login').click();document.querySelector('#tab-registro').click()");
    await esperarCondicion(cdp, "document.querySelector('#form-registro select').options.length === 2 && !document.querySelector('#form-registro [type=submit]').disabled");
    await cdp.evaluar(`(()=>{const f=document.querySelector('#form-registro');f.elements.nombre.value='Registro Navegador';f.elements.correo.value='registro-browser@test.local';f.elements.contrasena.value='ClaveSegura123!';f.elements.id_catalogo_materia.value=${JSON.stringify(id_catalogo_materia)};f.requestSubmit()})()`);
    await esperarCondicion(cdp, "document.querySelector('#aplicacion').hidden === false");
    assert.equal(await Cuenta.count({ where: { correo: 'registro-browser@test.local' } }), 1);
    await cdp.evaluar("document.querySelector('[data-vista=materias]').click()");
    await cdp.evaluar("document.querySelector('#mostrar-form-materia').click()");
    await esperarCondicion(cdp, "document.querySelector('#form-materia select').options.length === 2");
    await cdp.evaluar(`(()=>{const f=document.querySelector('#form-materia');f.elements.id_catalogo_materia.value=${JSON.stringify(id_catalogo_materia)};const fr=f.querySelector('[data-franja-horario]'),d=fr.querySelector('[data-horario-dia]');d.value='Lunes';d.dispatchEvent(new Event('change',{bubbles:true}));fr.querySelector('[data-horario-inicio]').value='600';fr.querySelector('[data-horario-fin]').value='660';f.requestSubmit()})()`);
    await esperarCondicion(cdp, "document.querySelector('#lista-materias').textContent.includes('Lunes')");
    const cuentaRegistro = await Cuenta.findOne({ where: { correo: 'registro-browser@test.local' } });
    assert.equal(await require('../../src/models/Materia').count({ where: { id_cuenta: cuentaRegistro.id_cuenta, id_catalogo_materia } }), 2);

    await autenticar(cdp, 'estudiante-browser@test.local');
    assert.equal(await cdp.evaluar("document.querySelector('#usuario-rol').textContent"), 'Estudiante');
    assert.equal(await cdp.evaluar("document.querySelector('#form-perfil').elements.nombre.value"), 'Estudiante Browser');
    assert.equal(await cdp.evaluar("document.querySelectorAll('#form-preferencias').length"), 1);
    assert.deepEqual(await cdp.evaluar(`Array.from(document.querySelectorAll('input:not([type=hidden]),select,textarea')).filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).map(e=>e.id||e.name)`), []);

    // HU06/HU18/RN10/RN28: crear, duplicar, editar y completar desde controles reales.
    await cdp.evaluar("document.querySelector('[data-vista=gamificacion]').click();document.querySelector('#mostrar-form-reto').click()");
    assert.equal(await cdp.evaluar("document.activeElement===document.querySelector('#form-reto [name=descripcion]')"), true);
    assert.equal(await cdp.evaluar("document.querySelector('#form-reto').elements.semana.value === semanaActualReto()"), true);
    await cdp.evaluar(`(()=>{const f=document.querySelector('#form-reto');f.elements.descripcion.value='Reto desde Chrome';f.elements.tipo_condicion.value='minutos';f.elements.objetivo.value=30;f.elements.puntos_recompensa.value=15;f.elements.semana.value='2026-W48';f.requestSubmit()})()`);
    await esperarCondicion(cdp, "document.querySelector('#panel-form-reto').hidden && estado.retos.some(r=>r.descripcion==='Reto desde Chrome')");
    const retoBrowserId = await cdp.evaluar("estado.retos.find(r=>r.descripcion==='Reto desde Chrome').id_reto");
    assert.equal(await cdp.evaluar("estado.retos.find(r=>r.descripcion==='Reto desde Chrome').condicion"), 'minutos:30');
    await cdp.evaluar(`(()=>{document.querySelector('#mostrar-form-reto').click();const f=document.querySelector('#form-reto');f.elements.descripcion.value='Semana duplicada';f.elements.objetivo.value=2;f.elements.puntos_recompensa.value=10;f.elements.semana.value='2026-W48';f.requestSubmit()})()`);
    await esperarCondicion(cdp, "document.querySelector('#avisos .error')");
    assert.match(await cdp.evaluar("document.querySelector('#avisos').textContent"), /El registro ya existe/i);
    assert.equal(await cdp.evaluar("estado.retos.length"), 1);
    await cdp.evaluar("document.querySelector('#cancelar-reto').click();document.querySelector('#lista-retos-metas [data-accion=editar-reto]').click()");
    assert.deepEqual(await cdp.evaluar(`(()=>{const f=document.querySelector('#form-reto');return [f.elements.descripcion.value,f.elements.tipo_condicion.value,f.elements.objetivo.value,f.elements.puntos_recompensa.value,f.elements.semana.value,f.elements.progreso.value]})()`), ['Reto desde Chrome', 'minutos', '30', '15', '2026-W48', '0']);
    await cdp.evaluar("(()=>{const f=document.querySelector('#form-reto');f.elements.puntos_recompensa.value=23;f.elements.progreso.value=2;f.requestSubmit()})()");
    await esperarCondicion(cdp, "document.querySelector('#panel-form-reto').hidden && estado.retos[0].puntos_recompensa===23 && estado.retos[0].progreso===2");
    const retoGuardado = await require('../../src/models/Reto').findByPk(retoBrowserId);
    assert.equal(retoGuardado.puntos_recompensa, 23);
    assert.equal(retoGuardado.progreso, 2);
    await cdp.evaluar("document.querySelector('#lista-retos-metas [data-accion=estado-reto]').click()");
    await esperarCondicion(cdp, 'estado.retos[0].activo === false');
    assert.equal(await cdp.evaluar("document.querySelector('#lista-retos-metas [data-accion=completar-reto]')===null"), true);
    await cdp.evaluar("document.querySelector('#lista-retos-metas [data-accion=estado-reto]').click()");
    await esperarCondicion(cdp, 'estado.retos[0].activo === true');
    const puntosAntesReto = await cdp.evaluar('estado.totalPuntos');
    await cdp.evaluar("document.querySelector('#lista-retos-metas [data-accion=eliminar-reto]').click()");
    await esperarCondicion(cdp, "document.querySelector('#modal-accion').open");
    await cdp.evaluar("document.querySelector('#cancelar-accion').click()");
    assert.equal(await cdp.evaluar('estado.retos[0].completado'), false);
    await cdp.evaluar("document.querySelector('#lista-retos-metas [data-accion=completar-reto]').click()");
    await esperarCondicion(cdp, "document.querySelector('#modal-accion').open");
    await cdp.evaluar("document.querySelector('#confirmar-accion').click()");
    await esperarCondicion(cdp, 'estado.retos[0].completado && estado.totalPuntos === '+(puntosAntesReto + 23));
    assert.equal(await cdp.evaluar("document.querySelector('#gamificacion-puntos').textContent"), String(puntosAntesReto + 23));
    assert.equal(await cdp.evaluar("document.querySelectorAll('#lista-retos-metas [data-accion=completar-reto],#lista-retos-metas [data-accion=editar-reto],#lista-retos-metas [data-accion=eliminar-reto]').length"), 0);
    // Reintento del mismo crédito contra API real: el contrato es idempotente (200).
    await cdp.evaluar(`api('/retos/${retoBrowserId}/completar',{method:'PATCH'}).then(()=>recargarGamificacion())`);
    assert.equal(await cdp.evaluar('estado.totalPuntos'), puntosAntesReto + 23);
    assert.deepEqual(await sequelize.query("SELECT COUNT(*) AS n, SUM(cantidad) AS total FROM punto WHERE origen = 'Reto' AND id_origen = :id", { replacements: { id: retoBrowserId }, plain: true }), { n: 1, total: 23 });

    // P04/P05 y objetivo 6: la acción real crea y completa una tarea y abre la recompensa.
    await cdp.evaluar("document.querySelector('[data-vista=tareas]').click();document.querySelector('#mostrar-form-tarea').click()");
    assert.equal(await cdp.evaluar("document.activeElement===document.querySelector('#form-tarea [name=nombre]')"), true);
    await cdp.evaluar(`(()=>{const f=document.querySelector('#form-tarea');f.elements.nombre.value='Tarea desde Chrome';f.elements.fecha_entrega.value='2027-12-31';f.elements.prioridad.value='Alta';f.requestSubmit()})()`);
    await esperarCondicion(cdp, "document.querySelector('#lista-tareas [data-accion=completar-tarea]')");
    await cdp.evaluar("document.querySelector('#lista-tareas [data-accion=iniciar-tarea]').click()");
    await esperarCondicion(cdp, "document.querySelector('#lista-tareas').textContent.includes('En progreso')");
    // RF04/HU25: backend real y notificación nativa simulada para controlar permisos.
    // No se afirma entrega por el sistema operativo; sí persistencia y no repetición.
    await cdp.evaluar(`window.NotificacionOriginal=window.Notification; window.avisosPrueba=[];
      window.Notification=class { static permission='granted'; static async requestPermission(){return this.permission;}
      constructor(titulo, opciones){window.avisosPrueba.push(opciones);} }`);
    assert.equal(await planificador.procesarPendientes(new Date('2027-12-30T12:00:00Z')), 1);
    await cdp.evaluar('actualizarAvisos()');
    assert.equal(await cdp.evaluar('window.avisosPrueba.length'), 1);
    await cdp.evaluar('actualizarAvisos()');
    assert.equal(await cdp.evaluar('window.avisosPrueba.length'), 1);
    const estudianteId = await cdp.evaluar('estado.cuenta.id_cuenta');
    // RF13/HU13: guardar controles reales persiste preferencias y silencia solo
    // las alertas nativas. La bandeja interna conserva ambos avisos.
    await cdp.evaluar(`(()=>{document.querySelector('[data-vista=configuracion]').click();
      const f=document.querySelector('#form-preferencias');
      f.elements.notificaciones_recordatorios.checked=false;
      f.elements.notificaciones_retos.checked=false;f.requestSubmit();})()`);
    await esperarCondicion(cdp, 'estado.preferencias.notificaciones_retos === false && estado.preferencias.notificaciones_recordatorios === false');
    assert.equal(await cdp.evaluar("api('/preferencias').then(r=>r.dato.notificaciones_retos)"), false);
    await Notificacion.bulkCreate([
      { id_notificacion: 'prueba-reto-silenciado', id_cuenta: estudianteId, tipo: 'Reto', mensaje: 'Reto silenciado' },
      { id_notificacion: 'prueba-recordatorio-silenciado', id_cuenta: estudianteId, tipo: 'Sistema', mensaje: 'Recordatorio: silenciado' }
    ]);
    await cdp.evaluar('actualizarAvisos()');
    assert.equal(await cdp.evaluar('window.avisosPrueba.length'), 1);
    assert.equal(await cdp.evaluar("estado.notificaciones.filter(n=>n.id_notificacion.endsWith('-silenciado')).length"), 2);
    await cdp.evaluar(`(()=>{const f=document.querySelector('#form-preferencias');
      f.elements.notificaciones_recordatorios.checked=true;
      f.elements.notificaciones_retos.checked=true;f.requestSubmit();})()`);
    await esperarCondicion(cdp, 'estado.preferencias.notificaciones_retos === true && estado.preferencias.notificaciones_recordatorios === true');
    await cdp.evaluar('actualizarAvisos()');
    assert.equal(await cdp.evaluar('window.avisosPrueba.length'), 1, 'No reproduce avisos antiguos al reactivar');
    await Notificacion.bulkCreate([
      { id_notificacion: 'prueba-reto-reactivado', id_cuenta: estudianteId, tipo: 'Reto', mensaje: 'Reto reactivado' },
      { id_notificacion: 'prueba-recordatorio-reactivado', id_cuenta: estudianteId, tipo: 'Sistema', mensaje: 'Recordatorio: reactivado' }
    ]);
    await cdp.evaluar('actualizarAvisos()');
    assert.equal(await cdp.evaluar('window.avisosPrueba.length'), 3);
    await cdp.evaluar('window.avisosPrueba.splice(1)'); // Conserva la base de las siguientes pruebas.
    await cdp.evaluar("document.querySelector('[data-vista=tareas]').click()");
    await Notificacion.create({ id_notificacion: 'prueba-denegado', id_cuenta: estudianteId, tipo: 'Sistema', mensaje: 'Aviso con permiso denegado' });
    await cdp.evaluar("Notification.permission='denied';solicitarPermisoAvisos().then(()=>actualizarAvisos())");
    assert.equal(await cdp.evaluar('window.avisosPrueba.length'), 1);
    assert.equal(await cdp.evaluar("document.querySelector('#lista-notificaciones').textContent.includes('Aviso con permiso denegado')"), true);
    await Notificacion.create({ id_notificacion: 'prueba-enfoque', id_cuenta: estudianteId, tipo: 'Sistema', mensaje: 'Aviso sin interrumpir enfoque' });
    await cdp.evaluar("Notification.permission='granted';estado.temporizador.activo=true;actualizarAvisos()");
    assert.equal(await cdp.evaluar('window.avisosPrueba.length'), 1);
    await cdp.evaluar('estado.temporizador.activo=false;window.Notification=window.NotificacionOriginal');
    await cdp.evaluar("document.querySelector('#lista-tareas [data-accion=completar-tarea]').click()");
    await esperarCondicion(cdp, "document.querySelector('#modal-recompensa').open");
    assert.equal(await cdp.evaluar("document.querySelector('#detalle-recompensa').textContent.includes('puntos')"), true);
    await cdp.evaluar("document.querySelector('#cerrar-recompensa').click()");

    // P06: una sesión iniciada desde la interfaz se persiste mediante la API real.
    await cdp.evaluar("document.querySelector('[data-vista=pomodoro]').click();document.querySelector('#iniciar-temporizador').click()");
    await esperarCondicion(cdp, "estado.temporizador.transcurrido > 0");
    await cdp.evaluar("document.querySelector('#guardar-temporizador').click()");
    await esperarCondicion(cdp, "document.querySelector('#modal-recompensa').open");
    await cdp.evaluar("document.querySelector('#cerrar-recompensa').click()");

    await cdp.evaluar("document.querySelector('[data-vista=estadisticas]').click()");
    await esperarCondicion(cdp, "document.querySelector('#metricas-estadisticas').children.length >= 4");
    assert.equal(await cdp.evaluar("document.activeElement.closest('section')?.id"), 'vista-estadisticas');
    await cdp.evaluar("document.querySelector('[data-vista=exportacion]').click();document.querySelector('#boton-exportar').click()");
    await esperarCondicion(cdp, "document.querySelector('#estado-exportacion').textContent.includes('exitosamente')");
    assert.equal(await cdp.evaluar("document.querySelector('[data-vista=administracion]').hidden"), true);

    // RF01/HU30/RN27: Cancelar no envía la desactivación; Confirmar la envía una sola vez, limpia la sesión y muestra el acceso.
    const estudianteActiva = async () => (await Cuenta.findOne({ where: { correo: 'estudiante-browser@test.local' } })).activa;
    await cdp.evaluar("document.querySelector('[data-vista=configuracion]').click()");
    await cdp.evaluar("window.desactivaciones=0;const f=window.fetch;window.fetch=(u,o)=>{if(o?.method==='DELETE'&&/\\/cuentas\\/[^/]+$/.test(String(u)))window.desactivaciones++;return f(u,o)}");
    await cdp.evaluar("document.querySelector('#desactivar-cuenta').click()");
    assert.equal(await cdp.evaluar("document.querySelector('#modal-accion').open"), true);
    assert.equal(await cdp.evaluar("document.activeElement.id"), 'cancelar-accion');
    await cdp.evaluar("document.querySelector('#cancelar-accion').click()");
    assert.equal(await cdp.evaluar("document.querySelector('#modal-accion').open"), false);
    assert.equal(await cdp.evaluar('window.desactivaciones'), 0);
    assert.equal(await estudianteActiva(), true);
    await cdp.evaluar("document.querySelector('#desactivar-cuenta').click();document.querySelector('#confirmar-accion').click()");
    assert.equal(await cdp.evaluar("document.querySelector('#confirmar-accion').disabled"), true);
    assert.equal(await cdp.evaluar('window.desactivaciones'), 0);
    await cdp.evaluar("(()=>{const input=document.querySelector('#modal-accion [name=verificacion]');input.value='estudiante-browser@test.local';input.dispatchEvent(new Event('input',{bubbles:true}));const c=document.querySelector('#confirmar-accion');c.click();c.click()})()");
    await esperarCondicion(cdp, "!document.querySelector('#acceso').hidden");
    assert.equal(await cdp.evaluar('window.desactivaciones'), 1);
    assert.equal(await cdp.evaluar("sessionStorage.getItem('studyquest_token')"), null);
    assert.equal(await cdp.evaluar("document.querySelector('#avisos').textContent.includes('desactivada')"), true);
    assert.equal(await estudianteActiva(), false);

    await cdp.evaluar("sessionStorage.clear();location.reload()"); await esperarCondicion(cdp, "!document.querySelector('#acceso').hidden");
    await autenticar(cdp, 'admin-browser@test.local');
    assert.equal(await cdp.evaluar("document.querySelector('#usuario-rol').textContent"), 'Administrador');
    assert.ok(await cdp.evaluar("document.querySelectorAll('#lista-usuarios-admin .item').length >= 3"));
    assert.equal(await cdp.evaluar("document.querySelector('[data-vista=tareas]').hidden"), true);

    await cdp.evaluar("sessionStorage.clear();location.reload()"); await esperarCondicion(cdp, "!document.querySelector('#acceso').hidden");
    await autenticar(cdp, 'revisor-browser@test.local');
    assert.equal(await cdp.evaluar("document.querySelector('#usuario-rol').textContent"), 'Revisor institucional · Solo lectura');
    await esperarCondicion(cdp, "document.querySelector('#metricas-institucionales').children.length >= 4");
    assert.equal(await cdp.evaluar("document.querySelector('[data-vista=administracion]').hidden"), true);

    await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await cdp.evaluar('document.documentElement.scrollWidth <= window.innerWidth'), true);
    assert.deepEqual(cdp.errores, []);
    console.log('✅ Chrome: Estudiante, Administrador, Revisor y responsive verificados sin errores');
  } finally {
    if (cdp) cdp.cerrar();
    await new Promise(resolve => {
      if (chrome.exitCode !== null) return resolve();
      chrome.once('close', resolve);
      chrome.kill();
      setTimeout(resolve, 2000);
    });
    await new Promise(resolve => servidor.close(resolve));
    await sequelize.close();
    for (let intento = 0; intento < 5; intento += 1) {
      try {
        fs.rmSync(directory, { recursive: true, force: true });
        break;
      } catch (error) {
        if (error.code !== 'EPERM' && error.code !== 'EBUSY') throw error;
        await esperar(250);
      }
    }
  }
}

run().catch(error => { console.error('❌ Falló la validación en Chrome'); console.error(error.stack || error); process.exitCode = 1; });
