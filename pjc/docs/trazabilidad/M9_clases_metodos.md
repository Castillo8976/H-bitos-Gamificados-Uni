# Tabla 9 — Clases → Métodos, CU, RF

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.9 Artefactos de Trazabilidad

> Esta matriz verifica que cada clase del diagrama de clases tenga sus métodos justificados por un Caso de Uso y un Requisito Funcional.

El diagrama vigente contiene las **13 clases de entidad** correspondientes a las 13 tablas aprobadas en E7. Los nombres físicos del diccionario se escriben en `snake_case` y sus clases UML equivalentes en `PascalCase`. `ExportadorDatos`, cuando se documenta, es una clase de servicio y no una entidad persistente ni una tabla; por tanto, no incrementa el conteo de entidades del modelo.

**Fuente gráfica vigente:** `docs/diseno/fase3-componentes/E12-diagrama-clases.drawio`.

---

| Clase | Métodos | CU que lo origina | RF asociado |
|---|---|---|---|
| `Cuenta` | `crearCuenta`, `listarCuentas`, `obtenerCuenta`, `actualizarCuenta`, `eliminarCuenta`, `registrar`, `autenticar`, `cerrarSesion`, `obtenerPerfil` | CU01, CU11, CU13 | RF01, RNF12, RN21 |
| `Materia` | `crearMateria`, `listarMaterias`, `obtenerMateria`, `actualizarMateria`, `eliminarMateria` | CU01, CU13 | RF01, RF09 |
| `Tarea` | `crearTarea`, `listarTareas`, `obtenerTarea`, `actualizarTarea`, `completarTarea`, `eliminarTarea` | CU02, CU03, CU07 | RF02, RF03, RF04, RF09 |
| `SesionEstudio` | `crearSesionEstudio`, `listarSesionesEstudio`, `obtenerSesionEstudio`, `actualizarSesionEstudio`, `eliminarSesionEstudio`, `calcularHorasSemana` | CU04, CU12 | RF10, RF11, RF12 |
| `Insignia` | `crearInsignia`, `listarInsignias`, `obtenerInsignia`, `actualizarInsignia`, `eliminarInsignia`, `sembrarInsignias` | CU06, CU13 | RF05 |
| `CuentaInsignia` | `desbloquearInsignia`, `listarInsigniasDesbloqueadas`, `tieneInsignia`, `revocarInsignia`, `evaluarInsignias` | CU03, CU06, CU14 | RF05 |
| `Punto` | `otorgarPuntos`, `listarPuntos`, `obtenerPunto`, `eliminarPunto`, `calcularTotalPuntos`, `calcularPuntosSemana` | CU03, CU05, CU06, CU14 | RF03, RF07, RF08 |
| `Reto` | `crearReto`, `listarRetos`, `obtenerReto`, `actualizarProgresoReto`, `completarReto`, `actualizarReto`, `eliminarReto` | CU06, CU13 | RF06 |
| `Meta` | `crearMeta`, `listarMetas`, `obtenerMeta`, `actualizarProgresoMeta`, `actualizarMeta`, `eliminarMeta` | CU05 | RF15 |
| `Recordatorio` | `crearRecordatorio`, `generarRecordatorioAutomatico`, `listarRecordatorios`, `obtenerRecordatorio`, `marcarRecordatorioEnviado`, `toggleRecordatorio`, `eliminarRecordatorio` | CU02, CU10 | RF04, RNF15 |
| `PreferenciaVisual` | `crearPreferenciaVisual`, `obtenerPreferenciaVisual`, `actualizarPreferenciaVisual`, `obtenerOCrearPreferenciaVisual`, `eliminarPreferenciaVisual` | CU08 | RF13, RNF04 |
| `NivelCuenta` | `crearNivel`, `listarNiveles`, `obtenerNivel`, `actualizarNivel`, `eliminarNivel`, `evaluarNivelCuenta`, `sembrarNiveles` | CU03, CU06, CU13 | RF07 |
| `Notificacion` | `crearNotificacion`, `listarNotificaciones`, `contarNotificacionesNoLeidas`, `marcarNotificacionLeida`, `marcarTodasLeidas`, `eliminarNotificacion`, `limpiarNotificacionesLeidas` | CU15 | RF04, RNF15 |

### Clases de servicio de Construcción

Estas clases no representan tablas nuevas. Coordinan entidades del modelo y
mantienen la lógica fuera de los controladores HTTP.

| Clase de servicio | Métodos públicos | CU / HU | RF / RN |
|---|---|---|---|
| `GamificacionService` | `completarTareaConGamificacion`, `registrarSesionConGamificacion` | CU03, CU04, CU06 · HU03, HU05–HU07, HU10, HU15, HU17 | RF03, RF05–RF07, RF10, RF15 · RN22–RN24 |
| `EstadisticasService` | `obtenerEstadisticasSemana`, `obtenerIndicadoresInstitucionales` | CU05, CU16 · HU08, HU11, HU28 | RF08, RF11, RF15 · RN14, RN21, RN25 |
| `ExportadorDatos` | `exportarDatosPersonales` | CU09 · HU14 | RF14 · RN21 |

> **Nota de corrección (agosto 2026):** la clase `Reporte` fue **eliminada** por decisión del equipo (ver `E7-diccionario-datos.md` y `10-reglas-de-negocio.md` RN14). Sus responsabilidades se redistribuyeron: `obtenerEstadisticas` pasó a ser un cálculo en tiempo real sobre `Tarea`/`SesionEstudio`/`Punto`, y `exportar` pasó a una clase utilitaria `ExportadorDatos` que no depende de una tabla propia.

> **Nota de corrección (septiembre 2026):** `NivelCuenta` y `Notificacion` forman parte de las 13 clases de entidad del modelo vigente. El archivo oficial editable es `docs/diseno/fase3-componentes/E12-diagrama-clases.drawio`; `DiagramaClases.png` y `DiagramaClasesActualizado.svg` se conservan únicamente como exportaciones o referencias históricas y no determinan el conteo actual.

---

## Equivalencia E7 → clase UML → comportamiento

| Entidad E7 (`snake_case`) | Clase UML (`PascalCase`) | Secuencias / actividades relacionadas |
|---|---|---|
| `cuenta` | `Cuenta` | Act-02 |
| `materia` | `Materia` | Act-02, Act-03 |
| `tarea` | `Tarea` | Seq-01, Seq-02, Act-01, Act-03 |
| `sesion_estudio` | `SesionEstudio` | Seq-03, Seq-04, Act-04 |
| `insignia` | `Insignia` | Seq-02, Seq-05, Act-01 |
| `cuenta_insignia` | `CuentaInsignia` | Seq-05, Act-01 |
| `punto` | `Punto` | Seq-02, Seq-04, Act-01 |
| `reto` | `Reto` | Act-01, Act-05 |
| `meta` | `Meta` | Seq-04, Act-05 |
| `recordatorio` | `Recordatorio` | Seq-01, Act-03, Act-06 |
| `preferencia_visual` | `PreferenciaVisual` | Act-07 |
| `nivel_cuenta` | `NivelCuenta` | Act-01, Act-05 |
| `notificacion` | `Notificacion` | Act-06 |

Los participantes de interfaz, control o persistencia que aparecen en los diagramas de secuencia no representan tablas adicionales. Su clasificación y correspondencia con las entidades anteriores se documenta en M10.
