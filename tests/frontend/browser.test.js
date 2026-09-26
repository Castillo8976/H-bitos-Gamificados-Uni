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
  for (let intento = 0; intento < intentos; intento += 1) {
    if (await cdp.evaluar(`Boolean(${expresion})`)) return;
    await esperar(100);
  }
  throw new Error(`No se cumplió la condición: ${expresion}`);
}

async function autenticar(cdp, correo) {
  await cdp.evaluar(`(async()=>{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({correo:${JSON.stringify(correo)},contrasena:'ClaveSegura123!'})});const d=await r.json();sessionStorage.setItem('studyquest_token',d.token);location.reload();return r.status})()`);
  await esperarCondicion(cdp, "!document.querySelector('#aplicacion').hidden");
}

async function run() {
  await inicializarEsquema();
  for (const [nombre, correo, rol] of [
    ['Estudiante Browser', 'estudiante-browser@test.local', 'Estudiante'],
    ['Administrador Browser', 'admin-browser@test.local', 'Administrador'],
    ['Revisor Browser', 'revisor-browser@test.local', 'Revisor institucional']
  ]) {
    const cuenta = await authService.register({ nombre, correo, contrasena: 'ClaveSegura123!', materia: { nombre: 'Materia inicial' } });
    if (rol !== 'Estudiante') await Cuenta.update({ rol }, { where: { id_cuenta: cuenta.id_cuenta } });
  }

  const servidor = await new Promise((resolve, reject) => {
    const instancia = app.listen(0, '127.0.0.1', () => resolve(instancia));
    instancia.once('error', reject);
  });
  const puerto = servidor.address().port;
  const puertoCdp = 9333;
  const chrome = spawn('/usr/bin/google-chrome', [
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
    await esperar(100);
    assert.equal(await cdp.evaluar(`(()=>{const t=document.querySelector('#tab-login');t.focus();t.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));return document.activeElement.id==='tab-registro'&&document.activeElement.getAttribute('aria-selected')==='true'})()`), true);
    assert.equal(await cdp.evaluar(`(()=>{const t=document.querySelector('#tab-registro');t.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true}));return document.activeElement.id==='tab-login'&&document.activeElement.getAttribute('aria-selected')==='true'})()`), true);

    await autenticar(cdp, 'estudiante-browser@test.local');
    assert.equal(await cdp.evaluar("document.querySelector('#usuario-rol').textContent"), 'Estudiante');
    assert.equal(await cdp.evaluar("document.querySelector('#form-perfil').elements.nombre.value"), 'Estudiante Browser');
    assert.equal(await cdp.evaluar("document.querySelectorAll('#form-preferencias').length"), 1);
    assert.deepEqual(await cdp.evaluar(`Array.from(document.querySelectorAll('input:not([type=hidden]),select,textarea')).filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')).map(e=>e.id||e.name)`), []);

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
    await esperar(1100);
    await cdp.evaluar("document.querySelector('#guardar-temporizador').click()");
    await esperarCondicion(cdp, "document.querySelector('#modal-recompensa').open");
    await cdp.evaluar("document.querySelector('#cerrar-recompensa').click()");

    await cdp.evaluar("document.querySelector('[data-vista=estadisticas]').click()");
    await esperarCondicion(cdp, "document.querySelector('#metricas-estadisticas').children.length >= 4");
    assert.equal(await cdp.evaluar("document.activeElement.closest('section')?.id"), 'vista-estadisticas');
    await cdp.evaluar("document.querySelector('[data-vista=exportacion]').click();document.querySelector('#boton-exportar').click()");
    await esperarCondicion(cdp, "document.querySelector('#estado-exportacion').textContent.includes('exitosamente')");
    assert.equal(await cdp.evaluar("document.querySelector('[data-vista=administracion]').hidden"), true);

    await cdp.evaluar("sessionStorage.clear();location.reload()"); await esperarCondicion(cdp, "!document.querySelector('#acceso').hidden");
    await autenticar(cdp, 'admin-browser@test.local');
    assert.equal(await cdp.evaluar("document.querySelector('#usuario-rol').textContent"), 'Administrador');
    assert.ok(await cdp.evaluar("document.querySelectorAll('#lista-usuarios-admin .item').length >= 3"));
    assert.equal(await cdp.evaluar("document.querySelector('[data-vista=tareas]').hidden"), true);

    await cdp.evaluar("sessionStorage.clear();location.reload()"); await esperarCondicion(cdp, "!document.querySelector('#acceso').hidden");
    await autenticar(cdp, 'revisor-browser@test.local');
    assert.equal(await cdp.evaluar("document.querySelector('#usuario-rol').textContent"), 'Revisor institucional');
    await esperarCondicion(cdp, "document.querySelector('#metricas-institucionales').children.length >= 4");
    assert.equal(await cdp.evaluar("document.querySelector('[data-vista=administracion]').hidden"), true);

    await cdp.enviar('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    assert.equal(await cdp.evaluar('document.documentElement.scrollWidth <= window.innerWidth'), true);
    assert.deepEqual(cdp.errores, []);
    console.log('✅ Chrome: Estudiante, Administrador, Revisor y responsive verificados sin errores');
  } finally {
    if (cdp) cdp.cerrar();
    chrome.kill('SIGTERM');
    await new Promise(resolve => servidor.close(resolve));
    await sequelize.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

run().catch(error => { console.error('❌ Falló la validación en Chrome'); console.error(error.stack || error); process.exitCode = 1; });
