'use strict';

// Pruebas del cliente sin servidor, navegador ni acceso a SQLite.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const fuente = fs.readFileSync(require.resolve('../../src/public/app.js'), 'utf8');
function cliente() {
  const contexto = vm.createContext({ sessionStorage: { getItem: () => null }, console, URLSearchParams });
  vm.runInContext(fuente.replace(/\niniciar\(\);\s*$/, ''), contexto);
  return contexto;
}
function control({ disabled = false, boton = false } = {}) {
  const atributos = new Map();
  return { disabled, type: 'submit', matches: () => boton, querySelectorAll: () => [],
    setAttribute: (k, v) => atributos.set(k, v), getAttribute: k => atributos.get(k), removeAttribute: k => atributos.delete(k) };
}

test('condiciones reconocidas legibles y condiciones históricas conservadas', () => {
  const c = cliente();
  for (const [dato, esperado] of [['tareas:5', 'Completar 5 tareas'], ['sesiones:3', 'Registrar 3 sesiones'], ['pomodoros:2', 'Completar 2 pomodoros'], ['minutos:90', 'Estudiar 90 minutos'], ['condicion_historica', 'condicion_historica']]) {
    assert.equal(c.condicionLegible(dato), esperado);
  }
  assert.equal(c.semanaLegible('2026-W01'), 'Semana 1 · 2026');
});

test('duranteEnvio bloquea envíos simultáneos y restaura controles después del error', async () => {
  const c = cliente();
  const habilitado = control(), deshabilitado = control({ disabled: true });
  const formulario = control(); formulario.querySelectorAll = () => [habilitado, deshabilitado];
  let rechazar, ejecuciones = 0;
  const pendiente = c.duranteEnvio(formulario, () => { ejecuciones++; return new Promise((_, reject) => { rechazar = reject; }); });
  assert.equal(formulario.getAttribute('aria-busy'), 'true');
  assert.equal(habilitado.disabled, true);
  await c.duranteEnvio(formulario, () => { ejecuciones++; });
  assert.equal(ejecuciones, 1);
  rechazar(new Error('Servicio no disponible'));
  await assert.rejects(pendiente, /Servicio no disponible/);
  assert.equal(habilitado.disabled, false);
  assert.equal(deshabilitado.disabled, true);
  assert.equal(formulario.getAttribute('aria-busy'), undefined);
});

test('nivel mide el tramo actual, llena la barra en el máximo y la oculta sin niveles', () => {
  const c = cliente(), nodos = new Map();
  c.document = { querySelector: selector => {
    if (!nodos.has(selector)) nodos.set(selector, { setAttribute(k, v) { this[k] = String(v); } });
    return nodos.get(selector);
  } };
  vm.runInContext(`estado.totalPuntos = 40; estado.niveles = [{ nombre: 'Inicial', puntos_minimos: 0 }, { nombre: 'Siguiente', puntos_minimos: 200 }]; renderizarResumen();`, c);
  const barra = nodos.get('#progreso-nivel');
  assert.equal(barra.hidden, false);
  assert.equal(barra.max, 200);
  assert.equal(barra.value, 40);
  assert.equal(barra['aria-valuenow'], '40');
  assert.match(nodos.get('#detalle-progreso-nivel').textContent, /40 \/ 200 puntos/);
  // Tramo del nivel actual: 600 pts entre 500 y 1000 es un 20 %, no un 60 %.
  vm.runInContext(`estado.totalPuntos = 600; estado.niveles = [{ nombre: 'Inicial', puntos_minimos: 0 }, { nombre: 'Medio', puntos_minimos: 500 }, { nombre: 'Alto', puntos_minimos: 1000 }]; renderizarResumen();`, c);
  assert.equal(barra.value, 100);
  assert.equal(barra.max, 500);
  assert.match(nodos.get('#detalle-progreso-nivel').textContent, /600 \/ 1000 puntos · 20 % del nivel actual · Siguiente: Alto/);
  vm.runInContext('estado.totalPuntos = 1200; renderizarResumen();', c);
  assert.equal(barra.hidden, false);
  assert.equal(barra.value, barra.max);
  assert.equal(nodos.get('#detalle-progreso-nivel').textContent, '1200 puntos · Nivel máximo alcanzado.');
  vm.runInContext('estado.niveles = []; renderizarResumen();', c);
  assert.equal(barra.hidden, true);
  assert.equal(nodos.get('#detalle-progreso-nivel').textContent, 'Sin siguiente nivel disponible.');
});

test('vencimientos distinguen hoy, vencida y completada; texto de usuario escapado', () => {
  const c = cliente();
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  assert.equal(c.entregaLegible({ fecha_entrega: fecha, estado: 'Pendiente' }), 'Vence hoy');
  assert.match(c.entregaLegible({ fecha_entrega: '2000-01-01', estado: 'Pendiente' }), /^Vencida/);
  assert.doesNotMatch(c.entregaLegible({ fecha_entrega: '2000-01-01', estado: 'Completada' }), /Vencida/);
  assert.equal(c.escapar('<img onerror="alert(1)">'), '&lt;img onerror=&quot;alert(1)&quot;&gt;');
});

test('crear meta con error conserva sugerencia y formulario, sin éxito ni refresco', async () => {
  const c = cliente(), mensajes = [];
  const panel = control();
  c.document = { querySelector: selector => {
    assert.equal(selector, '#panel-meta');
    return panel;
  } };
  c.api = async () => { throw new Error('semana no es una semana ISO válida'); };
  c.avisar = (mensaje, tipo) => mensajes.push({ mensaje, tipo });
  vm.runInContext(`estado.metaSugerida = { descripcion: 'Sugerencia sin guardar' }; estado.editandoMeta = true;`, c);
  await c.crearMeta({ semana: '2021-W53', descripcion: 'Inválida', valor_objetivo: 5 });
  assert.deepEqual(mensajes, [{ mensaje: 'semana no es una semana ISO válida', tipo: 'error' }]);
  assert.equal(vm.runInContext('estado.metaSugerida.descripcion', c), 'Sugerencia sin guardar');
  assert.equal(vm.runInContext('estado.editandoMeta', c), true);
  assert.equal(vm.runInContext('estado.metas.length', c), 0);
  assert.equal(panel.getAttribute('aria-busy'), undefined);
});

test('institucional: periodo sin estudiantes no inventa horas ni promedios; preserva ceros reales', () => {
  const c = cliente(), nodos = new Map([
    ['#periodo-institucional', { textContent: 'Entre enero y febrero' }],
    ['#metricas-institucionales', { innerHTML: '' }]
  ]);
  c.document = { querySelector: selector => nodos.get(selector) };
  vm.runInContext('estado.institucionales = { estudiantes_activos: 0, tareas_completadas: 0 }; renderizarInstitucionales();', c);
  let html = nodos.get('#metricas-institucionales').innerHTML;
  assert.match(html, /Sin datos en el periodo/);
  assert.doesNotMatch(html, /undefined|NaN|Promedio|class="tarjeta metrica"/);
  vm.runInContext(`estado.institucionales = { estudiantes_activos: 1, tareas_completadas: 0, minutos_estudiados: 0, sesiones_realizadas: 0, puntos_obtenidos: 0, promedio_minutos_por_estudiante: 0, promedio_puntos_por_estudiante: 0 }; renderizarInstitucionales();`, c);
  html = nodos.get('#metricas-institucionales').innerHTML;
  assert.equal((html.match(/class="tarjeta metrica"/g) || []).length, 8);
  assert.match(html, /Horas estudiadas<\/span><strong>Sin datos<\/strong>/);
  assert.match(html, /Tareas completadas<\/span><strong>0<\/strong>/);
  assert.match(html, /Promedio de minutos por estudiante<\/span><strong>0<\/strong>/);
  assert.match(html, /minutos \/ estudiante · Entre enero y febrero/);
});

test('institucional: rango inválido evita API; carga y fallo no conservan métricas obsoletas', async () => {
  const c = cliente(), hasta = control(); hasta.value = '2026-01-01';
  const f = { elements: { fecha_inicio: { value: '2026-02-01' }, fecha_fin: hasta } };
  const panel = control(); panel.textContent = 'Datos antiguos';
  const error = {}, periodo = {};
  c.document = { querySelector: selector => ({ '#form-institucional': f, '#metricas-institucionales': panel, '#error-periodo-institucional': error, '#periodo-institucional': periodo })[selector] };
  let solicitudes = 0, rechazar;
  c.api = () => { solicitudes++; return new Promise((_, reject) => { rechazar = reject; }); };
  await c.cargarInstitucionales();
  assert.equal(solicitudes, 0); assert.equal(hasta.getAttribute('aria-invalid'), 'true');
  assert.match(error.textContent, /Hasta debe ser igual o posterior/);
  hasta.value = '2026-02-28';
  const pendiente = c.cargarInstitucionales();
  assert.equal(solicitudes, 1); assert.equal(panel.getAttribute('aria-busy'), 'true');
  assert.equal(panel.textContent, 'Cargando indicadores…');
  rechazar(new Error('Servicio no disponible'));
  await assert.rejects(pendiente, /Servicio no disponible/);
  assert.equal(panel.getAttribute('aria-busy'), undefined);
  assert.equal(panel.textContent, 'No se pudieron cargar los indicadores. Vuelve a consultar.');
});

test('tablas administrativas escapan etiquetas y conservan semántica y estados vacíos', () => {
  const c = cliente();
  const html = c.tablaAdmin('<Catálogo>', ['Nombre', '<Acciones>'], [['&lt;dato&gt;', 'Editar']]);
  assert.match(html, /<caption[^>]*>&lt;Catálogo&gt;<\/caption>/);
  assert.match(html, /<th scope="col">&lt;Acciones&gt;<\/th>/);
  assert.match(html, /<tr class="item">/);
  assert.match(html, /data-etiqueta="&lt;Acciones&gt;"/);
  assert.match(c.tablaAdmin('Vacía', [], []), /No hay resultados para estos filtros/);
});

test('fases 4 y 5 conservan vistas independientes, IDs únicos y contratos de formulario', () => {
  const html = fs.readFileSync(require.resolve('../../src/public/index.html'), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
  assert.equal(new Set(ids).size, ids.length);
  for (const nombre of ['administracion','usuarios','asignaturas','insignias','niveles','retos','correcciones']) {
    assert.match(html, new RegExp(`id="vista-${nombre}"[^>]*data-seccion="${nombre}"[^>]*data-roles="Administrador"`));
    assert.match(html, new RegExp(`data-vista="${nombre}" data-roles="Administrador"`));
  }
  const institucional = html.match(/<section id="vista-institucional"[\s\S]*?<\/section>/)[0];
  assert.match(institucional, /Vista de solo lectura · Datos agregados y anónimos/);
  assert.doesNotMatch(institucional, /data-accion|data-editor-admin|name="(?:correo|nombre|id_cuenta)"/);
  for (const tipo of ['catalogo','insignia','nivel','reto']) assert.match(html, new RegExp(`<dialog id="editor-admin-${tipo}"[\\s\\S]*?<form id="form-admin-${tipo}"`));
  assert.doesNotMatch(fuente, /guardar-usuario|activa-\$\{cuenta\.id_cuenta\}/);
});

test('lista compartida: orden configurable, filtros dinámicos y paginación conservan compatibilidad', () => {
  const c = cliente(), nodos = [];
  let pendiente, renderizado;
  function nodo(tag) {
    const n = { tag, children: [], options: [], value: '', textContent: '', listeners: {}, atributos: {},
      append(...hijos) { this.children.push(...hijos); },
      setAttribute(k,v) { this.atributos[k] = v; },
      add(opcion) { this.options.push(opcion); if (this.options.length === 1) this.value = opcion.value; },
      replaceChildren() { this.children = []; this.options = []; },
      addEventListener(k,fn) { this.listeners[k] = fn; },
      emitir(k) { this.listeners[k](); },
      get selectedIndex() { return this.options.findIndex(o => o.value === this.value); }
    }; nodos.push(n); return n;
  }
  c.document = { createElement: nodo }; c.Option = function(texto, valor) { return { textContent: String(texto), value: String(valor) }; };
  c.setTimeout = fn => { pendiente = fn; return 1; }; c.clearTimeout = () => {};
  const datos = Array.from({ length: 12 }, (_,i) => ({ nombre: `Nombre ${String(i).padStart(2,'0')}`, puntos: i, estado: 'activo' }));
  let opciones = [['activo','Activos']];
  const lista = c.crearListaCliente({ contenedor: nodo('div'), obtenerDatos: () => datos, buscar: n => n.nombre,
    filtros: [{ label: 'Estado', opciones: () => opciones, filtrar: (n,v) => n.estado === v }],
    opcionesOrden: [['asc','Puntos ascendentes'],['desc','Puntos descendentes'],['puntos','Puntos por columna']], ordenar: (a,b) => a.puntos-b.puntos,
    renderizar: items => { renderizado = items; }
  });
  const obtener = label => nodos.find(n => n.atributos['aria-label'] === label);
  lista.actualizar(); assert.equal(renderizado.length, 10); assert.equal(renderizado[0].puntos, 0);
  nodos.find(n => n.textContent === 'Siguiente').emitir('click'); assert.equal(renderizado.length, 2);
  const orden = obtener('Orden'); orden.value = 'desc'; orden.emitir('change');
  assert.equal(renderizado[0].puntos, 11);
  orden.value = 'puntos'; orden.emitir('change'); assert.equal(renderizado[0].puntos, 0);
  const tamano = obtener('Por página'); tamano.value = '20'; tamano.emitir('change'); assert.equal(renderizado.length, 12);
  const busqueda = nodos.find(n => n.type === 'search'); busqueda.value = 'Nombre 11'; busqueda.emitir('input'); pendiente();
  assert.equal(renderizado.length, 1); assert.equal(renderizado[0].puntos, 11);
  opciones = [...opciones, ['inactivo','Inactivos']]; lista.actualizar();
  assert.equal(obtener('Estado').options.length, 3);
  obtener('Estado').value = 'inactivo'; obtener('Estado').emitir('change'); assert.equal(renderizado.length, 0);
  // Un consumidor anterior puede omitir las opciones y conserva Nombre A–Z / Z–A.
  c.crearListaCliente({ contenedor: nodo('div'), obtenerDatos: () => [], buscar: n => n.nombre, ordenar: () => 0, renderizar: () => {} });
  const ordenAnterior = nodos.filter(n => n.atributos['aria-label'] === 'Orden').at(-1);
  assert.deepEqual(ordenAnterior.options.map(o => o.value), ['asc','desc']);
});

test('correcciones: resumen identifica estudiante y motivo; retiros exigen correo exacto', async () => {
  const c = cliente(), confirmaciones = [];
  c.document = { querySelector: selector => {
    if (selector === '#admin-correccion-cuenta') return { value: 'estudiante' };
    if (selector === '#admin-insignia-correccion') return { selectedOptions: [{ textContent: 'Primera tarea' }] };
    throw new Error(`Selector inesperado: ${selector}`);
  } };
  vm.runInContext(`estado.cuentasAdmin = [{ id_cuenta: 'estudiante', nombre: 'Ana', correo: 'ana@example.test' }];`, c);
  c.confirmarAccion = async opciones => { confirmaciones.push(opciones); return true; };
  assert.equal(await c.confirmarCorreccion('punto', { cantidad: 12, origen: 'Tarea', motivo: 'Ajuste documentado' }), 'estudiante');
  assert.equal(confirmaciones[0].peligro, false);
  assert.equal(confirmaciones[0].verificacion, undefined);
  assert.ok(confirmaciones[0].detalle.includes('Motivo: Ajuste documentado'));
  assert.ok(confirmaciones[0].detalle.includes('Otorgar 12 puntos · Tarea.'));
  for (const tipo of ['eliminar-punto','revocar']) {
    await c.confirmarCorreccion(tipo, { motivo: 'Registro duplicado' }, 'Registro seleccionado');
    const confirmacion = confirmaciones.at(-1);
    assert.equal(confirmacion.peligro, true); assert.equal(confirmacion.verificacion, 'ana@example.test');
    assert.ok(confirmacion.detalle.includes('Ana'));
    assert.match(confirmacion.detalle.join(' '), /Registro seleccionado.*permanente/);
  }
  c.confirmarAccion = async () => false;
  assert.equal(await c.confirmarCorreccion('asignar-insignia', { motivo: 'Reconocimiento' }), false);
});

test('cuenta: 409 conserva estado local, muestra mensaje y no anuncia éxito', async () => {
  const c = cliente(), mensajes = [], solicitudes = [];
  const boton = control({ boton: true }); boton.dataset = { accion: 'estado-usuario', id: 'estudiante' };
  c.confirmarAccion = async () => true;
  c.avisar = (mensaje,tipo) => mensajes.push({ mensaje,tipo });
  c.api = async (ruta, opciones) => { solicitudes.push({ ruta, datos: JSON.parse(opciones.body) }); const e = new Error('No se puede desactivar o degradar al último Administrador activo'); e.status = 409; throw e; };
  let refrescos = 0; c.renderizarAdministracion = () => { refrescos++; };
  vm.runInContext(`estado.cuentasAdmin = [{ id_cuenta: 'estudiante', nombre: 'Ana', correo: 'ana@example.test', rol: 'Administrador', activa: true }];`, c);
  await c.manejarAccion({ target: { closest: () => boton } });
  assert.deepEqual(solicitudes, [{ ruta: '/cuentas/estudiante', datos: { activa: false } }]);
  assert.equal(vm.runInContext('estado.cuentasAdmin[0].activa', c), true);
  assert.equal(refrescos, 0); assert.equal(mensajes.length, 1); assert.equal(mensajes[0].tipo, 'error');
  assert.match(mensajes[0].mensaje, /último Administrador activo/);
  assert.equal(boton.getAttribute('aria-busy'), undefined);
});
