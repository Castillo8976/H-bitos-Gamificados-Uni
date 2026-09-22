# M18 — Matriz unificada de trazabilidad de Construcción: RF ↔ HU ↔ clase/método ↔ pantalla/botón

**Fecha:** 22 de septiembre de 2026
**Cubre:** punto 7 del checklist de Construcción — *"Revisar consistencia RF ↔ HU ↔ clase/método ↔ pantalla/botón (matriz de trazabilidad de construcción)"*.
**Fuente:** cruce entre `12-especificacion-requisitos-software.md`, `13-historias-usuario-criterios-aceptacion.md`, `M9_clases_metodos.md`, `M15_trazabilidad_construccion.md`, `M16_trazabilidad_frontend.md` y el código real (`src/services/*.js`, `src/routes/*.js`, `src/public/app.js`, `src/public/index.html`).

M15 documenta RF→HU→método→endpoint. M16 documenta RF→HU→pantalla→endpoint. Ninguno de los
dos, por separado, arma la cadena completa de 4 eslabones que pide el punto 7, y ese cruce es
justamente el que expone los eslabones rotos. Esta matriz une ambos y verifica cada eslabón
contra el código fuente, no solo contra la documentación.

## Convención de estado

- ✅ **Cadena completa** — los 4 eslabones existen y son verificables en el código.
- 🟡 **Cadena parcial** — el backend y el endpoint existen, pero el eslabón pantalla/botón
  usa una etiqueta genérica en la documentación (no rompe la funcionalidad, sí la trazabilidad
  literal exigida por el ejemplo del checklist).
- ❌ **Cadena rota** — falta un eslabón real: no existe botón/pantalla para esa HU específica,
  aunque el método de backend sí exista.

## Matriz por requisito

| RF | HU | CU | Clase.método (backend) | Endpoint | Pantalla | Botón / acción | Prueba | Estado |
|---|---|---|---|---|---|---|---|---|
| RF01 | HU01 | CU01 | `Cuenta.registrar`, `Cuenta.autenticar`, `Cuenta.cerrarSesion` | `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/logout` | P01 Login, P02 Registro | `#form-login` (submit) → `iniciarSesion()`; `#form-registro` (submit); `#boton-salir` → `cerrarSesion()` | `tests/api/api.test.js` | ✅ |
| RF01 | HU16 | CU01 | `Materia.actualizarMateria`, `Materia.eliminarMateria` | `PUT/DELETE /api/materias/:id` | P07 Materias | `data-accion="editar-materia"`, `data-accion="eliminar-materia"` | `tests/api/api.test.js` | ✅ |
| RF01 | HU20 | CU11 | `Cuenta.obtenerPerfil` | `GET /api/auth/perfil` | P13 Perfil | *(ninguno — solo lectura)* | API | ❌ **Rota.** `Cuenta.actualizarCuenta` existe en el backend y en M9, pero no hay formulario ni botón para editarlo. El propio código lo reconoce: `app.js:269` — *"RF01/HU20: presenta el perfil consultado; no implementa su edición."* |
| RF01 | HU27 | CU13 | `Cuenta.listarCuentas`, `Cuenta.actualizarCuenta` | `GET /api/cuentas`, `PUT /api/cuentas/:id` | P15/P16 Administración | `renderizarAdministracion()`, `data-accion="guardar-usuario"` | `tests/api/api.test.js` | ✅ |
| RF02 | HU02 | CU02 | `TareaService.crearTarea` | `POST /api/tareas` | P04/P05 Tareas | `#mostrar-form-tarea` → `abrirTarea()`, `#form-tarea` (submit) | `tests/api/api.test.js`, `tests/integration/reminders.test.js` | ✅ |
| RF02 | HU19 | CU02 | `TareaService.actualizarTarea`, `eliminarTarea` | `PUT/DELETE /api/tareas/:id` | P04/P05 Tareas | `data-accion="editar-tarea"`, `data-accion="eliminar-tarea"` | `tests/api/api.test.js` | ✅ |
| RF03 | HU03 | CU03 | `GamificacionService.completarTareaConGamificacion` | `PATCH /api/tareas/:id/completar` | P04 Tareas | `data-accion="completar-tarea"` | `tests/integration/objectives-6-10.test.js` (`TC-O6-TAREA`, `TC-O6-DUPLICADO`, `TC-O6-ROLLBACK`) | ✅ |
| RF04 | HU04, HU25 | CU02, CU10 | `TareaService.crearTarea`/`actualizarTarea` → `PlanificadorRecordatoriosService.sincronizarAutomatico`; `Recordatorio.toggleRecordatorio`, `eliminarRecordatorio` | `POST/PUT /api/tareas`, `PATCH/DELETE /api/recordatorios/:id` | P05 Tareas, P20 Recordatorios | `#form-recordatorio` (submit), `data-accion="alternar-recordatorio"`, `data-accion="eliminar-recordatorio"` | `tests/integration/reminders.test.js` | ✅ |
| RF04 | HU24 | CU15 | `Notificacion.marcarNotificacionLeida`, `marcarTodasLeidas`, `eliminarNotificacion` | `PATCH /api/notificaciones/:id/leida`, `PATCH /api/notificaciones/leidas`, `DELETE /api/notificaciones/:id` | P19 Notificaciones | `data-accion="leer-notificacion"`, `#marcar-notificaciones`, `data-accion="eliminar-notificacion"` | API | ✅ |
| RF05 | HU05 | CU06 | `CuentaInsignia.evaluarInsignias`, `desbloquearInsignia` | *(automático, sin endpoint directo del estudiante)* | P08 Gamificación | *(sin botón — desbloqueo automático)* | `tests/integration/objectives-6-10.test.js` | ✅ (por diseño, sin botón) |
| RF05 | HU22 | CU13 | `Insignia.crearInsignia`, `actualizarInsignia`, `eliminarInsignia` | `POST/PUT/DELETE /api/insignias/:id` | P17 Catálogos | `#form-admin-insignia` (submit), `data-accion="editar-insignia-admin"`, `data-accion="eliminar-insignia-admin"` | `tests/api/api.test.js` | ✅ |
| RF05 | HU26 | CU14 | `CorreccionAdministrativaService.asignarInsignia`, `revocarInsignia` | `POST /api/cuenta-insignias`, `DELETE /api/cuenta-insignias/:id_cuenta/:id_insignia` | P17 Catálogos | `#form-admin-asignar-insignia` (submit), `data-accion="revocar-insignia-admin"` | `tests/integration/admin-corrections.test.js` | ✅ |
| RF06 | HU06 | CU06 | `Reto.actualizarProgresoReto`, `completarReto` | *(automático dentro de la transacción de gamificación)* | P08 Gamificación | *(sin botón — progreso automático)* | `tests/integration/objectives-6-10.test.js` | ✅ (por diseño, sin botón) |
| RF06 | HU18 | CU06 | `Reto.actualizarReto`, `eliminarReto` | `PUT/DELETE /api/retos/:id` | *(ninguna vista de Estudiante)* | *(no existe)* — solo existen `data-accion="editar-reto-admin"` / `"eliminar-reto-admin"` en P17, de **Administrador** | — | ❌ **Rota.** HU18 dice explícitamente *"Como **Estudiante**, quiero editar o eliminar un reto activo"*; el único CRUD visual de retos que hay en la app es el administrativo (P17), no uno para el dueño del reto. |
| RF07 | HU07 | CU06 | `Punto.calcularTotalPuntos`, `NivelCuenta.evaluarNivelCuenta` | `GET /api/puntos`, `GET /api/estadisticas/...` | P08–P10 Gamificación | *(sin botón — panel de lectura)* | `tests/integration/*.test.js` | ✅ |
| RF07 | HU23 | CU13 | `NivelCuenta.crearNivel`, `actualizarNivel`, `eliminarNivel` | `POST/PUT/DELETE /api/niveles/:id` | P17 Catálogos | `#form-admin-nivel` (submit), `data-accion="editar-nivel-admin"`, `data-accion="eliminar-nivel-admin"` | `tests/api/api.test.js` | ✅ |
| RF07 | HU26 | CU14 | `CorreccionAdministrativaService.otorgarPuntos`, `retirarPuntos` | `POST /api/puntos`, `DELETE /api/puntos/:id` | P17 Catálogos | `#form-admin-punto` (submit), `data-accion="eliminar-punto-admin"` | `tests/integration/admin-corrections.test.js` | ✅ |
| RF08 | HU07, HU08 | CU05, CU06 | `EstadisticasService.obtenerEstadisticasSemana` | `GET /api/estadisticas/semanales` | P08–P10 Gamificación, P11 Tablero | `renderizarGamificacion()`, `#form-estadisticas` (submit) → `cargarEstadisticas()` | `tests/integration/objectives-6-10.test.js` (`TC-O7-SEMANA`) | 🟡 **Parcial.** M16 solo etiqueta la fila de P08–P10 como "RF05–RF07"; RF08 no aparece nombrado ahí aunque la pantalla sí cumple su criterio. Corregible con una etiqueta, no con código. |
| RF09 | HU09 | CU07 | `TareaService.listarTareas` (filtro en cliente) | `GET /api/tareas` | P04/P12 Tareas | `#buscar-tarea`, `#filtro-prioridad`, `#filtro-estado` → `renderizarTareas()` | Frontend estático | ✅ |
| RF10 | HU10 | CU04 | `SesionEstudio` (creación vía `GamificacionService.registrarSesionConGamificacion`) | `POST /api/sesiones` | P06 Pomodoro | `#iniciar-temporizador` → `alternarTemporizador()`; `#guardar-temporizador` → `guardarSesion()` | `tests/integration/objectives-6-10.test.js` (`TC-O6-SESION`) | ✅ |
| RF10, RF11 | HU21 | CU12 | `SesionEstudio.actualizarSesionEstudio`, `eliminarSesionEstudio` | `PUT/DELETE /api/sesiones/:id` | *(ninguna vista)* | *(no existe)* | — | ❌ **Rota.** El backend expone actualizar/eliminar sesión (M9, M15), pero no hay lista de sesiones en la interfaz ni botones de edición/eliminación — solo un contador (`#metrica-sesiones`). Coincide con lo ya señalado en M17: *"No existe todavía todo el flujo visual de historial editable, sesión libre y descansos."* |
| RF11 | HU08, HU11 | CU05 | `EstadisticasService.obtenerEstadisticasSemana` | `GET /api/estadisticas/semanales` | P11 Tablero | `#form-estadisticas` (submit) → `cargarEstadisticas()` | `tests/integration/objectives-6-10.test.js` | ✅ |
| RF11 | HU28 | CU16 | `EstadisticasService.obtenerIndicadoresInstitucionales` | `GET /api/estadisticas/institucionales` | P18 Tablero institucional | `#form-institucional` (submit) → `cargarInstitucionales()` | `tests/integration/objectives-6-10.test.js` (`TC-O10-REVISOR`) | ✅ |
| RF12 | HU12 | CU04 | *(sin clase de entidad propia — control de UI sobre `SesionEstudio.modo_enfoque`)* | *(ninguno — es un estado de cliente, no persiste por sí solo)* | P06 Pomodoro | `#iniciar-temporizador` → `alternarTemporizador()` (agrega clase `.enfoque`); supresión de avisos nativos en `actualizarAvisos()` | Chrome (`tests/frontend/browser.test.js`, según CRF-004) | 🟡 **Parcial.** La funcionalidad existe y está probada en Chrome, pero **no aparece como fila propia en M15 ni en M16** — quedó implícita dentro de la fila general de RF10/Pomodoro. Es un vacío de la matriz documental, no del código. |
| RF13 | HU13 | CU08 | `PreferenciaVisual.obtenerOCrearPreferenciaVisual`, `actualizarPreferenciaVisual` | `GET/PUT /api/preferencias` | P13 Configuración | `#form-preferencias` (submit, `change` en tema/modo oscuro) → `aplicarPreferencias()` | API + frontend estático | ✅ |
| RF14 | HU14 | CU09 | `ExportadorDatos.exportarDatosPersonales` | `GET /api/exportacion/datos` | P14 Exportar | `#boton-exportar` (click) | `tests/integration/objectives-6-10.test.js` (`TC-O8-PRIVACIDAD`) | ✅ |
| RF15 | HU15 | CU05 | `Meta.crearMeta` | *(automático — se crea junto con el ciclo semanal)* | P08 Gamificación | *(sin botón — sugerida por el sistema)* | `tests/integration/objectives-6-10.test.js` | ✅ (por diseño, sin botón) |
| RF15 | HU17 | CU05 | `Meta.actualizarMeta`, `eliminarMeta` | `PUT/DELETE /api/metas/:id` | *(ninguna vista de Estudiante)* | *(no existe)* | — | ❌ **Rota.** HU17: *"Como Estudiante, quiero editar o eliminar una meta semanal"*. `renderizarGamificacion()` solo muestra las metas como texto de solo lectura (`$('#lista-retos-metas')`), sin ningún `data-accion` de edición o eliminación, ni en el backend hay ruta consumida desde el cliente para ello. |

## Cadenas rotas o parciales (resumen)

| # | RF · HU | Tipo de ruptura | Eslabón faltante | Qué falta para cerrarla |
|---|---|---|---|---|
| 1 | RF01 · HU20 | ❌ Rota | Pantalla/botón | Un formulario de edición de perfil (nombre/correo) en P13, conectado a `PUT /api/cuentas/:id` (el endpoint y el método `actualizarCuenta` ya existen). |
| 2 | RF06 · HU18 | ❌ Rota | Pantalla/botón (para el rol correcto) | Un `data-accion="editar-reto"` / `"eliminar-reto"` visible para el **Estudiante** dueño del reto (hoy solo existe la variante administrativa). |
| 3 | RF10/RF11 · HU21 | ❌ Rota | Pantalla/botón | Una vista de historial de sesiones con acciones de editar/eliminar, conectada a `PUT/DELETE /api/sesiones/:id` (ya implementados). |
| 4 | RF15 · HU17 | ❌ Rota | Pantalla/botón | Un `data-accion="editar-meta"` / `"eliminar-meta"` en la tarjeta de meta dentro de Gamificación, conectado a `PUT/DELETE /api/metas/:id` (ya implementados). |
| 5 | RF12 · HU12 | 🟡 Parcial | Documentación (M15/M16) | Agregar una fila explícita RF12/HU12 en M15 y M16; el código y la prueba de Chrome ya existen, solo falta que la matriz lo nombre. |
| 6 | RF08 · HU07/HU08 | 🟡 Parcial | Documentación (M16) | Ajustar la fila de P08–P10 en M16 para incluir "RF08" en el rótulo, no solo RF05–RF07. |

**Conclusión:** de las 15 RF (28 HU), **4 cadenas están rotas de verdad** (backend implementado,
sin pantalla/botón para la HU específica) y **2 son solo un vacío de rotulado en la
documentación** (la funcionalidad y la prueba ya existen). Las 4 rotas coinciden exactamente con
brechas que **M17 ya venía señalando de forma general** ("edición de perfil", "CRUD visual de
metas/retos del estudiante", "historial de sesiones editable"); esta matriz las ancla ahora a la
HU exacta y al método de backend exacto que ya está listo para consumirse, así que cerrar cada
una es estrictamente trabajo de frontend (agregar botón + `data-accion` + llamada a la API
existente), no de backend.
