# Tabla 3 — Componentes/Módulos → Arquetipos, RF, Interfaces

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.3 Artefactos de Trazabilidad

> Esta matriz verifica que cada módulo del sistema agrupe los arquetipos correctos, esté justificado por requisitos funcionales y exponga las interfaces necesarias.

---

| Componente/Módulo | Arquetipos agrupados | RF | Interfaces expuestas |
|---|---|---|---|
| Módulo de autenticación | Estudiante, Cuenta | RF01, RNF12 | `registrarUsuario`, `iniciarSesion`, `cifrarContraseña` |
| Módulo de configuración | Preferencia visual | RF13, RNF04 | `guardarPreferencias`, `cargarPreferencias`, `aplicarTema` |
| Módulo de tareas | Tarea, Materia | RF02, RF03, RF09 | `crearTarea`, `editarTarea`, `marcarCompletada`, `filtrarTareas` |
| Módulo Pomodoro | Sesión de estudio | RF10, RF12 | `iniciarCronometro`, `pausar`, `detener`, `activarModoEnfoque` |
| Módulo de agenda | Materia | RF01, RF09 | `registrarMateria`, `listarMaterias`, `obtenerMateria` |
| Módulo de recompensas | Punto, Insignia, Nivel de cuenta | RF03, RF05, RF07, RF08 | `sumarPuntos`, `verificarInsignia`, `evaluarNivelCuenta`, `mostrarMensaje` |
| Módulo de retos | Reto, Meta | RF06, RF15 | `generarRetoSemanal`, `actualizarProgreso`, `sugerirMeta` |
| Tablero de Avance Personal | Tarea, SesionEstudio, Punto | RF11 | `obtenerEstadisticasSemana` (cálculo en tiempo real), `exportarDatos` |
| Módulo de notificaciones | Recordatorio, Notificación | RF04, RNF15 | `solicitarPermiso`, `programarAlerta`, `crearNotificacion`, `marcarLeida`, `toggleNotificaciones` |
| Módulo de persistencia | Cuenta, Materia, Tarea, SesionEstudio, Punto, Insignia, CuentaInsignia, Reto, Meta, Recordatorio, Notificación, PreferenciaVisual, NivelCuenta | RNF01, RNF04, RF14 | `guardar`, `leer`, `eliminar`, `exportarJSON` (vía servidor Node.js/Express + Sequelize sobre SQLite; ya no localStorage) |

> **Corrección (revisión septiembre 2026):** la última fila decía "Módulo de almacenamiento → localStorage", contradiciendo la arquitectura vigente. La persistencia real es SQLite a través de Sequelize/Express (ver `E1-tabla-contexto.md`, `06-diagrama-despliegue`). También se agregó `Nivel de cuenta` al módulo de recompensas y `Notificación` al módulo de notificaciones, ambas entidades ausentes de la versión original de esta matriz.
