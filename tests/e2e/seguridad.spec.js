'use strict';
const { test, expect } = require('@playwright/test');
const { ADMIN, fechaFutura, semanaActual } = require('./datos');
const { registrarAPI, loginAPI, api, autorizacion, sinSecretos } = require('./ayudas');

for (const ruta of ['/auth/perfil', '/cuentas', '/materias', '/tareas', '/sesiones', '/preferencias', '/retos', '/metas', '/recordatorios', '/notificaciones', '/puntos', '/insignias', '/niveles', '/exportacion/datos', '/estadisticas/institucionales']) {
  test(`sin sesión GET ${ruta} responde 401`, async ({ request }) => {
    expect((await request.get(`/api${ruta}`)).status()).toBe(401);
  });
}

test('Estudiante recibe 403 en operaciones de Administrador', async ({ request }) => {
  const estudiante = await registrarAPI(request);
  const headers = autorizacion(estudiante.token);
  const casos = [
    ['get', '/cuentas'], ['get', '/catalogo-materias?todas=true'], ['get', '/estadisticas/institucionales'],
    ['post', '/catalogo-materias', { nombre: 'Prohibida' }],
    ['post', '/insignias', { nombre: 'No autorizada', descripcion: 'Prueba', condicion: '1_tareas' }],
    ['post', '/niveles', { nombre: 'Prohibido', descripcion: 'Prueba', puntos_minimos: 1, orden: 1 }],
    ['post', '/puntos', { id_cuenta: estudiante.cuenta.id_cuenta, cantidad: 100, origen: 'Reto', motivo: 'Intento' }],
    ['post', '/notificaciones', { id_cuenta: estudiante.cuenta.id_cuenta, tipo: 'Sistema', mensaje: 'Intento' }],
    ['patch', `/cuentas/${estudiante.cuenta.id_cuenta}/seguridad`, { correo_verificado: true }],
  ];
  for (const [metodo, ruta, data] of casos) {
    expect((await request[metodo](`/api${ruta}`, { headers, ...(data ? { data } : {}) })).status(), `${metodo} ${ruta}`).toBe(403);
  }
});

test('dos Estudiantes no pueden leer, editar ni borrar recursos ajenos', async ({ request }) => {
  const primero = await registrarAPI(request);
  const segundo = await registrarAPI(request);
  const materia = (await api(request, primero.token, 'get', '/materias')).datos[0];
  const tarea = (await api(request, primero.token, 'post', '/tareas', { nombre: 'Tarea privada', prioridad: 'Media', fecha_entrega: fechaFutura(), id_materia: materia.id_materia }, 201)).dato;
  const reto = (await api(request, primero.token, 'post', '/retos', { descripcion: 'Reto privado', condicion: 'tareas:3', puntos_recompensa: 15, semana: semanaActual() }, 201)).dato;
  const meta = (await api(request, primero.token, 'post', '/metas', { descripcion: 'Meta privada', valor_objetivo: 100, semana: semanaActual() }, 201)).dato;
  const sesion = (await api(request, primero.token, 'post', '/sesiones', { duracion_minutos: 1, modo_enfoque: false }, 201)).dato;
  const recordatorio = (await api(request, primero.token, 'post', '/recordatorios', { id_tarea: tarea.id_tarea, fecha_programada: fechaFutura(2), mensaje: 'Recordatorio privado' }, 201)).dato;
  const recursos = [
    ['cuentas', primero.cuenta.id_cuenta, { nombre: 'Nombre robado' }],
    ['materias', materia.id_materia, { horario: 'Cambio ajeno' }],
    ['tareas', tarea.id_tarea, { nombre: 'Cambio ajeno' }],
    ['retos', reto.id_reto, { descripcion: 'Cambio ajeno' }],
    ['metas', meta.id_meta, { descripcion: 'Cambio ajeno' }],
    ['sesiones', sesion.id_sesion, { duracion_minutos: 2 }],
  ];
  const headers = autorizacion(segundo.token);
  for (const [recurso, id, data] of recursos) {
    for (const metodo of ['get', 'put', 'delete']) {
      const respuesta = await request[metodo](`/api/${recurso}/${id}`, { headers, ...(metodo === 'put' ? { data } : {}) });
      expect([403, 404], `${metodo} ${recurso}/${id}`).toContain(respuesta.status());
    }
    // El propietario sigue viendo su registro intacto después de todos los intentos.
    const propio = (await api(request, primero.token, 'get', `/${recurso}/${id}`)).dato;
    for (const [campo, valor] of Object.entries(data)) expect(propio[campo]).not.toBe(valor);
  }
  for (const [metodo, ruta, data] of [
    ['get', `/recordatorios/${recordatorio.id_recordatorio}`],
    ['patch', `/recordatorios/${recordatorio.id_recordatorio}`, { activo: false }],
    ['patch', `/tareas/${tarea.id_tarea}/completar`],
    ['patch', `/retos/${reto.id_reto}/estado`, { activo: false }],
    ['patch', `/retos/${reto.id_reto}/completar`],
    ['post', '/tareas', { nombre: 'Referencia ajena', fecha_entrega: fechaFutura(), prioridad: 'Alta', id_materia: materia.id_materia }],
    ['post', '/recordatorios', { id_tarea: tarea.id_tarea, fecha_programada: fechaFutura(2), mensaje: 'Intento' }],
  ]) {
    const respuesta = await request[metodo](`/api${ruta}`, { headers, ...(data ? { data } : {}) });
    expect([403, 404], `${metodo} ${ruta}`).toContain(respuesta.status());
  }
  for (const recurso of ['tareas', 'materias', 'sesiones', 'retos', 'metas', 'recordatorios']) {
    const lista = (await api(request, segundo.token, 'get', `/${recurso}?id_cuenta=${primero.cuenta.id_cuenta}`)).datos;
    expect(lista.every(r => r.id_cuenta === segundo.cuenta.id_cuenta)).toBe(true);
  }
});

test('perfil, cuentas, exportación y login nunca exponen hashes ni secretos', async ({ request }) => {
  const estudiante = await registrarAPI(request);
  const admin = await loginAPI(request, ADMIN);
  const login = await loginAPI(request, estudiante);
  await sinSecretos(login);
  await sinSecretos(await api(request, estudiante.token, 'get', '/auth/perfil'));
  await sinSecretos(await api(request, admin.token, 'get', '/cuentas'));
  const exportacion = await api(request, estudiante.token, 'get', '/exportacion/datos');
  await sinSecretos(exportacion);
  expect(exportacion.cuenta.id_cuenta).toBe(estudiante.cuenta.id_cuenta);
  expect(JSON.stringify(exportacion)).not.toContain(ADMIN.correo);
  expect(JSON.stringify(exportacion)).not.toContain(estudiante.contrasena);
});

test('un reto con semana duplicada falla sin escrituras parciales', async ({ request }) => {
  const estudiante = await registrarAPI(request);
  const datos = { descripcion: 'Original intacto', condicion: 'tareas:2', puntos_recompensa: 20, semana: semanaActual() };
  await api(request, estudiante.token, 'post', '/retos', datos, 201);
  const antes = {};
  for (const recurso of ['retos', 'puntos', 'notificaciones']) antes[recurso] = await api(request, estudiante.token, 'get', `/${recurso}`);
  const respuesta = await request.post('/api/retos', { headers: autorizacion(estudiante.token), data: { ...datos, descripcion: 'Duplicado rechazado' } });
  expect(respuesta.status()).toBe(409);
  await sinSecretos(await respuesta.json());
  for (const recurso of ['retos', 'puntos', 'notificaciones']) {
    expect(await api(request, estudiante.token, 'get', `/${recurso}`)).toEqual(antes[recurso]);
  }
});
