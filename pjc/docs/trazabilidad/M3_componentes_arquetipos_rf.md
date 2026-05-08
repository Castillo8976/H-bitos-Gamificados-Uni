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
| Módulo de recompensas | Punto, Insignia | RF03, RF05, RF07, RF08 | `sumarPuntos`, `verificarInsignia`, `mostrarMensaje` |
| Módulo de retos | Reto, Meta | RF06, RF15 | `generarRetoSemanal`, `actualizarProgreso`, `sugerirMeta` |
| Módulo de reportes | Reporte | RF11 | `generarReporteSemanal`, `obtenerEstadisticas`, `exportarDatos` |
| Módulo de notificaciones | Recordatorio | RF04, RNF15 | `solicitarPermiso`, `programarAlerta`, `toggleNotificaciones` |
| Módulo de almacenamiento | localStorage | RNF01, RNF04, RF14 | `guardar`, `leer`, `eliminar`, `exportarJSON` |
