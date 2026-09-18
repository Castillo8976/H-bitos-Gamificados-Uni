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
| E1 — Estudiante | Datos de registro, tareas, sesiones Pomodoro, preferencias visuales, filtros de búsqueda, solicitud de exportación | Confirmaciones, puntos, insignias, estadísticas del Tablero de Avance Personal (calculadas en tiempo real), alertas de vencimiento, lista filtrada, archivo `datos.json` | RF01–RF15, RNF06, RNF07 |
| E4 — Revisor institucional | Solicitud de estadísticas grupales (solo lectura) | Estadísticas de progreso académico en pantalla, calculadas en tiempo real | RF11 |
| E5 — Administrador del sistema | Gestión de cuentas, configuración de insignias y niveles | Estado actualizado del sistema, confirmación de cambios | RF01, RF05, RF07, RNF12 |
| E6 — Notifications API | Permiso de notificaciones concedido por el navegador | Alerta local emergente en la pantalla del dispositivo | RF04, RNF15 |

> **Corrección de alcance (alineada con `E1-tabla-contexto.md` y `M1_entidades_externas.md`):** se retiraron las filas de `E2 — Usuario registrado` (sus flujos quedaron incorporados en E1), `E3 — Colaborador` y `E7 — localStorage`. La persistencia ahora ocurre en SQLite a través del servidor Node.js/Express, que es un componente interno y no una entidad externa.

## Detalle de Flujos de Datos

### E1 — Estudiante → Sistema

| Operación | Datos de entrada | Datos de salida |
|---|---|---|
| Registro de cuenta | Nombre, correo, contraseña, materia | Cuenta activa, redirección al Dashboard |
| Crear tarea | Nombre, fecha entrega, prioridad, materia | Tarea guardada, recordatorio programado |
| Completar tarea | ID de tarea | Puntos sumados, insignia desbloqueada (si aplica) |
| Iniciar Pomodoro | ID de tarea (opcional), modo (enfoque/libre) | Sesión guardada, horas reflejadas en el Tablero de Avance Personal |
| Personalizar interfaz | Tema de color, modo oscuro, avatar | Preferencias persistidas, interfaz actualizada |
| Filtrar tareas | Materia, prioridad, estado, fechas, texto | Lista de tareas filtrada |
| Exportar datos | Solicitud de descarga | Archivo `datos.json` generado y descargado (sin `contrasena_hash`) |

### E6 — Notifications API → Sistema

| Condición | Acción del sistema |
|---|---|
| Usuario concede permiso | El sistema programa recordatorios automáticos 24h antes de cada entrega |
| Usuario rechaza permiso | El recordatorio se guarda en SQLite pero no dispara notificación nativa |
| Fecha programada llega | El sistema dispara la alerta y marca `enviado = true` para no reenviar |

### Persistencia — Sistema interno (SQLite vía servidor)

| Operación | Módulo origen | Datos involucrados |
|---|---|---|
| `guardar` | Todos los módulos (a través del servidor) | Tareas, sesiones, puntos, insignias, preferencias |
| `leer` | Tablero de Avance Personal, módulo de autenticación | Historial completo del usuario |
| `eliminar` | Módulo de tareas | Tareas eliminadas y sus recordatorios en cascada |
| `exportarJSON` | `ExportadorDatos` (CU09) | Snapshot completo de los datos del usuario |
