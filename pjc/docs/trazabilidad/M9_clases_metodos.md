# Tabla 9 — Clases → Métodos, CU, RF

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.9 Artefactos de Trazabilidad

> Esta matriz verifica que cada clase del diagrama de clases tenga sus métodos justificados por un Caso de Uso y un Requisito Funcional.

---

| Clase | Métodos | CU que lo origina | RF asociado |
|---|---|---|---|
| `Cuenta` | `registrar`, `iniciarSesion`, `cifrarContraseña` | CU01 | RF01, RNF12 |
| `Cuenta` | `obtenerPerfil`, `actualizarDatos` | CU08 | RF13 |
| `Tarea` | `crear`, `editar`, `eliminar` | CU02 | RF02 |
| `Tarea` | `marcarCompletada` | CU03 | RF03 |
| `Tarea` | `filtrar(criterio)` | CU07 | RF09 |
| `SesionEstudio` | `iniciar`, `pausar`, `detener` | CU04 | RF10 |
| `SesionEstudio` | `activarModoEnfoque` | CU04 | RF12 |
| `Insignia` | `verificarCondicion`, `desbloquear` | CU06 | RF05 |
| `Punto` | `otorgar`, `calcularTotal` | CU03, CU06 | RF03, RF07 |
| `Reto` | `generar`, `actualizarProgreso`, `completar` | CU06 | RF06 |
| `Meta` | `sugerir`, `actualizar`, `evaluar` | CU05 | RF15 |
| `Recordatorio` | `programar`, `cancelar`, `toggleActivo` | CU10 | RF04, RNF15 |
| `Reporte` | `generar`, `obtenerEstadisticas` | CU05 | RF11 |
| `Reporte` | `exportar` | CU09 | RF14 |
| `PreferenciaVisual` | `guardar`, `cargar`, `aplicarTema` | CU08 | RF13, RNF04 |
| `NivelCuenta` | `crearNivel`, `listarNiveles`, `actualizarNivel`, `eliminarNivel`, `sembrarNiveles` | CU06 | RF07 |
| `NivelCuenta` | `evaluarNivelCuenta(totalPuntos)` | CU03, CU06 | RF07 |
| `Notificacion` | `crearNotificacion`, `listarNotificaciones`, `marcarNotificacionLeida`, `marcarTodasLeidas`, `eliminarNotificacion`, `limpiarNotificacionesLeidas` | CU10 | RF04, RNF15 |

> **Nota de corrección (agosto 2026):** se agregaron `NivelCuenta` y `Notificacion` porque ambas existen como modelos y CRUD completos en `/src` (`nivelCuentaCrud.js`, `notificacionCrud.js`) pero no aparecían en esta matriz ni en el Diagrama de Clases (`DiagramaClases.png`). **Pendiente:** actualizar el diagrama de clases UML (imagen) para incluir estas dos clases con su relación hacia `Cuenta`.
