# E2 — Tabla de Interacciones

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software II — Uniremington  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  

---


La tabla de interacciones describe los flujos de datos entre cada entidad externa y el sistema central, especificando entradas, salidas y los requisitos que justifican cada interacción.

## Interacciones por Entidad

| Entidad Externa | Entrada al sistema | Salida del sistema | RF/RNF asociado |
|---|---|---|---|
| E1 — Estudiante | Datos de registro, tareas, sesiones Pomodoro, preferencias visuales | Confirmaciones, puntos, insignias, reportes semanales, alertas de vencimiento | RF01–RF15, RNF06, RNF07 |
| E2 — Usuario registrado | Filtros de búsqueda, configuración visual, solicitud de exportación | Lista de tareas filtrada, preferencias aplicadas, archivo `datos.json` | RF09, RF13, RF14 |
| E3 — Colaborador | Retos semanales, metas sugeridas, frases motivacionales | Reto activo visible para el estudiante en su panel | RF06, RF15 |
| E4 — Revisor institucional | Solicitud de reporte grupal (solo lectura) | Reporte de progreso académico en pantalla | RF11 |
| E5 — Administrador del sistema | Gestión de cuentas, configuración de insignias y retos | Estado actualizado del sistema, confirmación de cambios | RF01, RF05, RF06, RNF12 |
| E6 — Notifications API | Permiso de notificaciones concedido por el SO | Alerta local emergente en la pantalla del dispositivo | RF04, RNF15 |
| E7 — localStorage | Operaciones de lectura/escritura desde los módulos JS | Datos JSON recuperados o confirmación de escritura exitosa | RF14, RNF01, RNF04 |

## Detalle de Flujos de Datos

### E1/E2 — Estudiante → Sistema

| Operación | Datos de entrada | Datos de salida |
|---|---|---|
| Registro de cuenta | Nombre, correo, contraseña, materia | Cuenta activa, redirección al Dashboard |
| Crear tarea | Nombre, fecha entrega, prioridad, materia | Tarea guardada, recordatorio programado |
| Completar tarea | ID de tarea | Puntos sumados, insignia desbloqueada (si aplica) |
| Iniciar Pomodoro | ID de tarea (opcional), modo (enfoque/libre) | Sesión guardada, horas actualizadas en reporte |
| Personalizar interfaz | Tema de color, modo oscuro, avatar | Preferencias persistidas, interfaz actualizada |
| Exportar datos | Solicitud de descarga | Archivo `datos.json` generado y descargado |

### E6 — Notifications API → Sistema

| Condición | Acción del sistema |
|---|---|
| Usuario concede permiso | El sistema programa recordatorios automáticos 24h antes de cada entrega |
| Usuario rechaza permiso | El recordatorio se guarda en localStorage pero no dispara notificación nativa |
| Fecha programada llega | El sistema dispara la alerta y marca `enviado = true` para no reenviar |

### E7 — localStorage → Sistema

| Operación | Módulo origen | Datos involucrados |
|---|---|---|
| `guardar` | Todos los módulos | Tareas, sesiones, puntos, insignias, preferencias |
| `leer` | Módulo de reportes, módulo de autenticación | Historial completo del usuario |
| `eliminar` | Módulo de tareas | Tareas eliminadas y sus recordatorios en cascada |
| `exportarJSON` | Módulo de almacenamiento | Snapshot completo de los datos del usuario |
