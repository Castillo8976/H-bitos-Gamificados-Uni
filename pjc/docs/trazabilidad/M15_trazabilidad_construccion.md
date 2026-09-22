# M15 — Trazabilidad de construcción: RF → HU → método → endpoint

**Estado:** Implementado y comprobado mediante `tests/api/api.test.js`  
**Arquitectura:** Modelo → Servicio → Controlador → Ruta Express  
**Control de acceso:** JWT, rol y propiedad de `id_cuenta`

Esta matriz enlaza los requisitos aprobados con la construcción HTTP. Los servicios de `src/services` exponen los métodos ya documentados en M9; los controladores traducen HTTP sin definir tablas y las rutas se limitan a URL, middleware, validación y controlador.

| Entidad | RF / HU / CU | Métodos M9 utilizados | Endpoints principales | Acceso |
|---|---|---|---|---|
| `cuenta` | RF01 · HU01/HU20/HU27 · CU01/CU11/CU13 | `crearCuenta`, `listarCuentas`, `obtenerCuenta`, `actualizarCuenta`, `registrar`, `autenticar`, `cerrarSesion`, `obtenerPerfil` | `POST /api/auth/registro`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/perfil`, `GET/PUT/DELETE /api/cuentas/:id` | Propietario; administración global para Administrador |
| `materia` | RF01/RF09 · HU01/HU16 · CU01 | `crearMateria`, `listarMaterias`, `obtenerMateria`, `actualizarMateria`, `eliminarMateria` | `GET/POST /api/materias`, `GET/PUT/DELETE /api/materias/:id` | Propietario o Administrador |
| `tarea` | RF02/RF03/RF09 · HU02/HU03/HU09/HU19 · CU02/CU03/CU07 | `crearTarea`, `listarTareas`, `obtenerTarea`, `actualizarTarea`, `completarTarea`, `eliminarTarea` | `GET/POST /api/tareas`, `GET/PUT/DELETE /api/tareas/:id`, `PATCH /api/tareas/:id/completar` | Propietario o Administrador |
| `preferencia_visual` | RF13 · HU01/HU13 · CU08 | `obtenerOCrearPreferenciaVisual`, `obtenerPreferenciaVisual`, `actualizarPreferenciaVisual` | `GET/PUT /api/preferencias` | Propietario |
| `sesion_estudio` | RF10/RF11/RF12 · HU10/HU21 · CU04/CU12 | `crearSesionEstudio`, `listarSesionesEstudio`, `obtenerSesionEstudio`, `actualizarSesionEstudio`, `eliminarSesionEstudio` | `GET/POST /api/sesiones`, `GET/PUT/DELETE /api/sesiones/:id` | Propietario o Administrador |
| `recordatorio` | RF04 · HU04/HU25 · CU02/CU10 | `crearRecordatorio`, `listarRecordatorios`, `obtenerRecordatorio`, `toggleRecordatorio`, `eliminarRecordatorio` | `GET/POST /api/recordatorios`, `GET/PATCH/DELETE /api/recordatorios/:id` | Propietario o Administrador |
| `notificacion` | RF04 · HU24 · CU15 | `crearNotificacion`, `listarNotificaciones`, `marcarNotificacionLeida`, `marcarTodasLeidas`, `eliminarNotificacion` | `GET /api/notificaciones`, `PATCH /api/notificaciones/:id/leida`, `PATCH /api/notificaciones/leidas`, `DELETE /api/notificaciones/:id` | Propietario; creación del Sistema/Administrador |
| `punto` | RF03/RF07 · HU03/HU07/HU26 · CU03/CU06/CU14 | `otorgarPuntos`, `listarPuntos`, `obtenerPunto`, `calcularTotalPuntos`, `eliminarPunto` | `GET /api/puntos`, `GET /api/puntos/:id`, `POST/DELETE /api/puntos...` | Lectura propia; corrección administrativa |
| `insignia` | RF05 · HU05/HU22 · CU06/CU13 | `crearInsignia`, `listarInsignias`, `obtenerInsignia`, `actualizarInsignia`, `eliminarInsignia` | `GET /api/insignias...`, `POST/PUT/DELETE /api/insignias...` | Lectura autenticada; mantenimiento administrativo |
| `cuenta_insignia` | RF05 · HU05/HU26 · CU06/CU14 | `desbloquearInsignia`, `listarInsigniasDesbloqueadas`, `revocarInsignia` | `GET/POST /api/cuenta-insignias`, `DELETE /api/cuenta-insignias/:id_cuenta/:id_insignia` | Lectura propia; asignación/corrección administrativa |
| `nivel_cuenta` | RF07 · HU07/HU23 · CU06/CU13 | `crearNivel`, `listarNiveles`, `obtenerNivel`, `actualizarNivel`, `eliminarNivel` | `GET /api/niveles...`, `POST/PUT/DELETE /api/niveles...` | Lectura autenticada; mantenimiento administrativo |
| `reto` | RF06 · HU06/HU18 · CU06 | `crearReto`, `listarRetos`, `obtenerReto`, `actualizarReto`, `completarReto`, `eliminarReto` | `GET/POST /api/retos`, `GET/PUT/DELETE /api/retos/:id`, `PATCH /api/retos/:id/completar` | Propietario o Administrador |
| `meta` | RF15 · HU15/HU17 · CU05 | `crearMeta`, `listarMetas`, `obtenerMeta`, `actualizarMeta`, `actualizarProgresoMeta`, `eliminarMeta` | `GET/POST /api/metas`, `GET/PUT/DELETE /api/metas/:id`, `PATCH /api/metas/:id/progreso` | Propietario o Administrador |

## Excepciones CRUD aprobadas

- `cuenta` se desactiva para conservar historial.
- `punto` es un ledger: no se edita; la corrección autorizada elimina el movimiento.
- `cuenta_insignia` se desbloquea o revoca; no tiene actualización intermedia.
- `preferencia_visual` se crea automáticamente y pertenece únicamente a su cuenta.
- `notificacion` se crea por eventos del sistema o administración y el estudiante controla lectura/eliminación.

## Flujos integrados de los objetivos 6–10

| RF → HU → CU | Clase y método | Endpoint | Pantalla / acción | Prueba |
|---|---|---|---|---|
| RF03/RF05–RF07/RF15 → HU03/HU05–HU07/HU15/HU17 → CU03/CU06 | `GamificacionService.completarTareaConGamificacion()` | `PATCH /api/tareas/:id/completar` | P04, botón **Completar** | `TC-O6-TAREA`, `TC-O6-DUPLICADO`, `TC-O6-ROLLBACK` en `objectives-6-10.test.js` |
| RF05/RF07/RF10 → HU05/HU07/HU10 → CU04/CU06 | `GamificacionService.registrarSesionConGamificacion()` | `POST /api/sesiones` | P06, botón **Detener y guardar** | `TC-O6-SESION` en `objectives-6-10.test.js` |
| RF08/RF11/RF15 → HU08/HU11/HU15/HU17 → CU05 | `EstadisticasService.obtenerEstadisticasSemana()` | `GET /api/estadisticas/semanales` | P11, **Consultar periodo** | `TC-O7-SEMANA` en integración y API |
| RF14 → HU14 → CU09 | `ExportadorDatos.exportarDatosPersonales()` | `GET /api/exportacion/datos` | P14, **Descargar datos.json** | `TC-O8-PRIVACIDAD` en integración y API |
| RF01/RF05/RF07 → HU22/HU23/HU26/HU27 → CU13/CU14 | Servicios CRUD aprobados | `/api/cuentas`, `/api/insignias`, `/api/niveles`, `/api/retos`, `/api/puntos`, `/api/cuenta-insignias` | P15–P17 | Casos administrativos de `api.test.js` |
| RF11 → HU28 → CU16 | `EstadisticasService.obtenerIndicadoresInstitucionales()` | `GET /api/estadisticas/institucionales` | P18, **Consultar indicadores** | `TC-O10-REVISOR` en integración y API |

## Evidencia

### Correcciones administrativas — CRF-004

| RF / HU | Clase y método | Endpoint | Acción | Prueba |
|---|---|---|---|---|
| RF07 / HU26 | `CorreccionAdministrativaService.otorgarPuntos` | `POST /api/puntos` | Asignar puntos con motivo | `admin-corrections.test.js`: alta, permisos y rollback |
| RF07 / HU26 | `CorreccionAdministrativaService.retirarPuntos` | `DELETE /api/puntos/:id` | Eliminar movimiento incorrecto | `admin-corrections.test.js`: retiro, ausencia y rollback |
| RF05 / HU26 | `CorreccionAdministrativaService.asignarInsignia` | `POST /api/cuenta-insignias` | Asignar insignia con motivo | `admin-corrections.test.js`: alta, duplicado y rollback |
| RF05 / HU26 | `CorreccionAdministrativaService.revocarInsignia` | `DELETE /api/cuenta-insignias/:id_cuenta/:id_insignia` | Revocar asignación | `admin-corrections.test.js`: revocación, ausencia y rollback |

Las cuatro acciones pertenecen a P17 y verifican administrador activo en el
servicio, además de la autorización HTTP. El diagrama gráfico se actualizará
en la etapa de correspondencia de clases; esta matriz no sustituye ese cambio.

### Comandos de verificación

- `npm run test:architecture`: verifica límites MVC.
- `npm run test:schema`: verifica E7 → E11 → modelos → SQLite.
- `npm run test:integration`: verifica la capa de servicios/datos.
- `npm run test:api`: verifica autenticación, roles, propiedad, validación, errores, los 13 recursos y los endpoints de los objetivos 6–10.
- `npm run test:frontend`: verifica que P01–P20 y las acciones construidas estén publicadas.
