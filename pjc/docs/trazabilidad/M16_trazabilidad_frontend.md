# M16 — Trazabilidad del frontend funcional

**Estado:** Flujos enumerados implementados; verificación parcial en Chrome, no cierre del checklist  
**Fuente visual:** W01–W06 y P01–P20  
**Código:** `src/public/index.html`, `styles.css` y `app.js`

Esta matriz documenta las pantallas estudiantiles, administrativas e
institucionales conectadas con la API real. La visibilidad por rol complementa,
pero no sustituye, la autorización obligatoria del servidor.

| RF / HU / CU | Pantalla | Acción visible | Endpoint utilizado | Método del frontend | Prueba |
|---|---|---|---|---|---|
| RF01 · HU01 · CU01 | P01 Login | Iniciar sesión | `POST /api/auth/login` | `iniciarSesion()` | `tests/api/api.test.js` |
| RF01 · HU01 · CU01 | P02 Registro | Crear cuenta con materia inicial | `POST /api/auth/registro` | manejador de `form-registro` | API + `tests/frontend/static.test.js` |
| RF01 · HU20 · CU11 | P13 Perfil | Consultar y editar nombre/correo propios | `GET /api/auth/perfil`, `PUT /api/cuentas/:id` | `renderizarUsuario()` y manejador de `form-perfil` | API + frontend estático |
| RF01/RF09 · HU16 · CU01 | P07 Materias | Crear, editar y eliminar | `/api/materias` | manejadores de materia | API |
| RF02 · HU02/HU19 · CU02 | P04/P05 Tareas | Crear, editar y eliminar | `/api/tareas` | manejadores de tarea | API |
| RF03 · HU03 · CU03 | P04 Tareas | Marcar como completada | `PATCH /api/tareas/:id/completar` | `manejarAccion()` | API |
| RF09 · HU09 · CU07 | P04/P12 Tareas | Buscar y filtrar | Cálculo local sobre respuesta de `GET /api/tareas` | `renderizarTareas()` | Frontend estático |
| RF10/RF11 · HU10/HU21 · CU04/CU12 | P06/P08 Sesiones | Crear, consultar, editar y eliminar sesiones propias | `GET/POST/PUT/DELETE /api/sesiones` | `guardarSesion()`, `renderizarSesiones()` y `manejarAccion()` | API + frontend estático |
| RF12 · HU12 · CU04 | P06 Pomodoro | Activar modo de enfoque durante la sesión | estado visual `.enfoque` y avisos del navegador | `alternarTemporizador()` y `actualizarAvisos()` | Chrome + frontend estático |
| RF05–RF07 · HU05–HU08 · CU06 | P08–P10 Gamificación | Consultar puntos, nivel, insignias, retos y metas | endpoints de lectura correspondientes | `renderizarGamificacion()` | API |
| RF06 · HU18 · CU06 | P08 Reto semanal | Editar y eliminar reto propio | `PUT/DELETE /api/retos/:id` | acciones `editar-reto` y `eliminar-reto` | API + frontend estático |
| RF15 · HU17 · CU05 | P08 Meta semanal | Editar y eliminar meta propia | `PUT/DELETE /api/metas/:id` | acciones `editar-meta` y `eliminar-meta` | API + frontend estático |
| RF04 · HU04/HU25 · CU10 | P20 Recordatorios | Crear, activar, desactivar y eliminar | `/api/recordatorios` | manejador de recordatorios | API |
| RF04 · HU24 · CU15 | P19 Notificaciones | Consultar, marcar leída y eliminar | `/api/notificaciones` | `renderizarNotificaciones()` y `manejarAccion()` | API |
| RF13 · HU13 · CU08 | P13 Configuración | Cambiar tema y modo oscuro | `GET/PUT /api/preferencias` | `aplicarPreferencias()` | API + frontend estático |
| RF08/RF11/RF15 · HU08/HU11/HU15/HU17 · CU05 | P11 Tablero | Elegir periodo y consultar indicadores | `GET /api/estadisticas/semanales` | `cargarEstadisticas()` | Integración + API + frontend estático |
| RF14 · HU14 · CU09 | P14 Exportar datos | Descargar `datos.json` | `GET /api/exportacion/datos` | manejador de `boton-exportar` | Integración + API + frontend estático |
| RF01 · HU27 · CU13 | P15/P16 Administración y usuarios | Consultar, cambiar rol y activar/desactivar | `GET /api/cuentas`, `PUT /api/cuentas/:id` | `renderizarAdministracion()` / `guardar-usuario` | API + frontend estático |
| RF05/RF07 · HU22/HU23/HU26 · CU13/CU14 | P17 Catálogos y correcciones | Crear, editar y eliminar catálogos; asignar o retirar puntos e insignias con motivo | endpoints de insignias, niveles, retos, puntos y asignaciones | formularios administrativos y `manejarAccion()` | API + Chrome |
| RF11 · HU28 · CU16 | P18 Tablero institucional | Consultar agregados anónimos | `GET /api/estadisticas/institucionales` | `cargarInstitucionales()` | Integración + API + frontend estático |

## Decisiones y límites

- El JWT se conserva en `sessionStorage`; los datos académicos no se duplican
  en almacenamiento del navegador.
- Completar tareas y registrar sesiones muestra el resultado real de la
  transacción: puntos, insignias, reto, meta y nivel.
- P11 y P18 calculan indicadores en tiempo real; no crean una tabla `reporte`.
- P14 descarga exclusivamente JSON y excluye `contrasena_hash`.
- P15–P17 solo aparecen para Administrador; P18 aparece para Administrador y
  Revisor institucional. El backend vuelve a comprobar el rol.
- La estructura toma como referencia los wireframes; falta la comparación
  exhaustiva de campos y acciones. Las correcciones administrativas ampliadas
  están descritas en CRF-003, pendiente de aprobación formal. Ver M17.
- Los controles de formulario conservan etiqueta accesible, las pestañas de
  acceso admiten flechas/Home/End y el foco se mueve al título de cada vista o
  al primer campo al abrir el editor de tareas. Chrome verifica estas reglas,
  la navegación por rol y el ancho móvil de 390 px.
