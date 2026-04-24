# Casos de Uso

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software II — Uniremington  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  

---


Se identificaron **10 casos de uso principales** derivados de las historias de usuario y los requisitos funcionales. Cada caso de uso representa un objetivo completo del actor, con flujo normal, flujos alternativos y postcondiciones verificables.

---

## Resumen de Casos de Uso

| ID | Nombre | RF Asociado |
|---|---|---|
| CU01 | Registrar cuenta y materias | RF01 |
| CU02 | Gestionar tareas académicas | RF02, RF04, RF09 |
| CU03 | Completar tarea y recibir recompensa | RF03, RF05, RF06, RF07, RF11 |
| CU04 | Realizar sesión de estudio Pomodoro | RF10, RF12 |
| CU05 | Ver reportes y progreso semanal | RF08, RF11, RF15 |
| CU06 | Gestionar insignias y retos | RF05, RF06 |
| CU07 | Filtrar y buscar tareas | RF09 |
| CU08 | Personalizar configuración visual | RF13, RNF04 |
| CU09 | Exportar datos personales | RF14, RNF04 |
| CU10 | Gestionar recordatorios | RF04, RNF15 |

---

## CU01 — Registrar cuenta y materias

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante, Persona con discapacidad física |
| **Precondición** | El estudiante accede a la URL de la aplicación por primera vez. |
| **Flujo normal** | 1. El estudiante pulsa "Crear cuenta". 2. Ingresa nombre, correo y contraseña. 3. Agrega al menos una materia con su horario. 4. El sistema valida los datos, cifra la contraseña y guarda en `localStorage`. 5. El sistema crea la preferencia visual predeterminada y redirige al Dashboard. |
| **Flujos alternativos** | A1: Correo ya registrado → el sistema muestra "Este correo ya existe". A2: Contraseña débil → el sistema solicita mínimo 6 caracteres. A3: Sin materia → el sistema bloquea el registro hasta agregar al menos una. |
| **Postcondición** | La cuenta queda activa, los datos persisten en `localStorage` y el estudiante accede al Dashboard. |

---

## CU02 — Gestionar tareas académicas

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante, Usuario registrado |
| **Precondición** | El usuario tiene una sesión activa en el sistema. |
| **Flujo normal** | 1. El usuario pulsa "Nueva tarea". 2. Ingresa nombre, fecha de entrega, prioridad y materia (opcional). 3. El sistema valida que la fecha sea futura y el nombre no esté vacío. 4. Guarda la tarea en `localStorage` con estado "Pendiente". 5. Programa un recordatorio automático para 24 horas antes de la fecha de entrega. 6. La tarea aparece en la lista con su chip de prioridad. |
| **Flujos alternativos** | A1: Fecha en el pasado → "La fecha debe ser futura". A2: Nombre vacío → "El nombre es obligatorio". A3: El usuario edita una tarea existente → los cambios se persisten y el recordatorio se reprograma. |
| **Postcondición** | La tarea queda guardada con estado "Pendiente" y el recordatorio programado. |

---

## CU03 — Completar tarea y recibir recompensa

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante |
| **Precondición** | Existe al menos una tarea con estado "Pendiente" o "En progreso". |
| **Flujo normal** | 1. El estudiante activa el checkbox de la tarea. 2. El sistema cambia el estado a "Completada" y registra la fecha. 3. El sistema suma los puntos correspondientes. 4. Verifica si se cumple alguna condición de insignia. 5. Si se desbloquea una insignia, muestra animación de celebración. 6. Actualiza el reporte semanal y el panel de progreso. |
| **Flujos alternativos** | A1: Insignia ya obtenida → solo suma puntos sin mostrar animación. A2: Progreso del reto semanal completado → el sistema otorga los puntos del reto. |
| **Postcondición** | La tarea queda en estado "Completada", los puntos se acumulan y el reporte semanal se actualiza. |

---

## CU04 — Realizar sesión de estudio Pomodoro

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante |
| **Precondición** | El estudiante tiene una sesión activa en el sistema. |
| **Flujo normal** | 1. El estudiante pulsa "Iniciar sesión de estudio". 2. Opcionalmente vincula la sesión a una tarea. 3. El cronómetro inicia en modo Pomodoro (25 min enfoque). 4. El sistema muestra el banner "Modo enfoque activo — notificaciones bloqueadas". 5. Al terminar el ciclo, muestra notificación de descanso. 6. El estudiante pulsa "Detener y guardar". 7. El sistema guarda la sesión con su duración y actualiza el reporte. |
| **Flujos alternativos** | A1: El estudiante cancela sin guardar → la sesión se descarta. A2: El estudiante pausa → el cronómetro se detiene y puede reanudarse. A3: Modo cronómetro libre → el estudiante define su propio tiempo. |
| **Postcondición** | La sesión queda guardada y las horas aparecen en el reporte semanal. |

---

## CU05 — Ver reportes y progreso semanal

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante, Usuario registrado |
| **Precondición** | El usuario tiene al menos una tarea o sesión registrada. |
| **Flujo normal** | 1. El usuario accede a la sección "Reportes". 2. El sistema genera el reporte de la semana actual. 3. Muestra tareas completadas, horas estudiadas, puntos obtenidos y barra de progreso de la meta. 4. El usuario puede navegar entre reportes de semanas anteriores. 5. El sistema muestra un mensaje motivacional si el progreso es inferior al 50 %. |
| **Flujos alternativos** | A1: Sin actividad en la semana → muestra "0 tareas, 0h, 0 pts" con mensaje motivador. A2: Meta cumplida → el sistema muestra mensaje de felicitación. |
| **Postcondición** | El estudiante visualiza su progreso semanal actualizado. |

---

## CU06 — Gestionar insignias y retos

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante |
| **Precondición** | El estudiante tiene una sesión activa y ha realizado al menos una acción en el sistema. |
| **Flujo normal** | 1. El sistema evalúa automáticamente las condiciones de insignias tras cada acción. 2. Si se cumple una condición, desbloquea la insignia y la muestra en el panel. 3. Semanalmente, el sistema genera un reto nuevo. 4. El estudiante puede ver el reto activo con su condición, progreso y puntos de recompensa. 5. Al cumplir el reto, otorga los puntos y muestra celebración. |
| **Flujos alternativos** | A1: Insignia ya obtenida → el sistema no la duplica. A2: Reto no completado en la semana → el sistema lo reinicia la semana siguiente. |
| **Postcondición** | Las insignias quedan registradas y los puntos del reto se suman. |

---

## CU07 — Filtrar y buscar tareas

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante, Usuario registrado |
| **Precondición** | El usuario tiene una sesión activa y al menos una tarea registrada. |
| **Flujo normal** | 1. El usuario accede al módulo de lista de tareas. 2. El sistema muestra todas las tareas con estado, prioridad y fecha de entrega. 3. El usuario selecciona filtros: materia, prioridad (Alta/Media/Baja), estado (Pendiente/Completada/Vencida) o rango de fechas. 4. El sistema filtra la lista en tiempo real. 5. El usuario puede limpiar los filtros para volver a la lista completa. |
| **Flujos alternativos** | A1: Ninguna tarea cumple los criterios → "No se encontraron tareas con estos filtros". A2: El usuario escribe en el campo de búsqueda → el sistema filtra por coincidencia parcial del nombre. |
| **Postcondición** | El usuario visualiza únicamente las tareas que corresponden a los filtros aplicados. |

---

## CU08 — Personalizar configuración visual

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa en el sistema. |
| **Flujo normal** | 1. El usuario accede a "Configuración / Preferencias". 2. El sistema carga las preferencias actuales desde `localStorage`. 3. El usuario selecciona un tema de color (purple, teal, amber, coral, blue, green). 4. El sistema aplica el nuevo tema inmediatamente (preview en tiempo real). 5. El usuario puede activar o desactivar el modo oscuro con un toggle. 6. El usuario selecciona un avatar de la galería. 7. El usuario pulsa "Guardar cambios" y el sistema persiste las preferencias. |
| **Flujos alternativos** | A1: El usuario cierra sin guardar → el sistema restaura las preferencias anteriores. A2: El usuario activa modo oscuro → toda la interfaz cambia a la paleta oscura sin recargar la página. |
| **Postcondición** | Las preferencias quedan guardadas en `localStorage` y la interfaz refleja el tema y modo elegidos. |

---

## CU09 — Exportar datos personales

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante, Usuario registrado |
| **Precondición** | El usuario tiene una sesión activa y al menos un registro guardado en `localStorage`. |
| **Flujo normal** | 1. El usuario accede a "Exportar datos" desde Configuración. 2. El sistema muestra un resumen de los datos disponibles. 3. El usuario pulsa "Exportar como JSON". 4. El sistema recopila todos los datos del usuario almacenados en `localStorage`. 5. Genera un archivo `datos.json` mediante la Blob/Download API del navegador. 6. El navegador inicia la descarga automática. 7. El sistema muestra confirmación "Tus datos han sido exportados exitosamente". |
| **Flujos alternativos** | A1: No hay datos guardados → "No tienes datos registrados para exportar" y deshabilita el botón. A2: El navegador bloquea la descarga automática → el sistema muestra un enlace directo. |
| **Postcondición** | El usuario dispone de un archivo JSON con toda su información académica. |

---

## CU10 — Gestionar recordatorios

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa y el navegador ha concedido permiso para notificaciones. |
| **Flujo normal** | 1. Al crear una tarea con fecha de entrega, el sistema programa automáticamente un recordatorio 24 horas antes. 2. El sistema muestra una lista de recordatorios activos. 3. El usuario puede desactivar un recordatorio con el toggle Activo/Inactivo. 4. El sistema actualiza el campo en `localStorage`. 5. Cuando llega la fecha programada, el sistema dispara la notificación. 6. Una vez enviada, el sistema marca `enviado = true` para no reenviar. |
| **Flujos alternativos** | A1: Navegador sin permiso de notificaciones → el sistema solicita el permiso; si se rechaza, el recordatorio se guarda pero no dispara notificación nativa. A2: El usuario reactiva un recordatorio → el sistema lo reprograma si la fecha aún no ha pasado. A3: La tarea es eliminada → el sistema elimina el recordatorio en cascada. |
| **Postcondición** | Los recordatorios activos se ejecutan automáticamente y quedan marcados como enviados. |

---

## Historias de Usuario

| ID | Historia | RF |
|---|---|---|
| HU01 | Como Estudiante, quiero registrar mi cuenta e ingresar al menos una materia, para acceder a la plataforma con mi información personalizada. | RF01, RNF12 |
| HU02 | Como Estudiante, quiero crear tareas con nombre, fecha de entrega y prioridad, para no olvidar mis compromisos académicos. | RF02, RF09 |
| HU03 | Como Estudiante, quiero marcar una tarea como completada, para ganar puntos automáticamente y ver mi avance en el panel. | RF03, RF07 |
| HU04 | Como Estudiante, quiero recibir un recordatorio automático 24 horas antes de la fecha de entrega, para no olvidar entregas importantes. | RF04, RNF15 |
| HU05 | Como Estudiante, quiero desbloquear insignias al cumplir metas específicas, para sentir reconocimiento por mi esfuerzo. | RF05 |
| HU06 | Como Estudiante, quiero participar en retos semanales generados automáticamente, para tener un desafío adicional que me motive. | RF06, RF07 |
| HU07 | Como Estudiante, quiero ver mi total de puntos acumulados e historial de recompensas, para conocer mi progreso gamificado. | RF07, RF08 |
| HU08 | Como Estudiante, quiero ver un reporte semanal con tareas completadas, horas estudiadas y puntos obtenidos. | RF08, RF11 |
| HU09 | Como Estudiante, quiero filtrar mis tareas por materia, prioridad o estado, para encontrar rápidamente lo que necesito gestionar. | RF09 |
| HU10 | Como Estudiante, quiero usar un cronómetro Pomodoro vinculado a una tarea, para concentrarme en bloques de tiempo definidos. | RF10, RF12 |
| HU11 | Como Estudiante, quiero consultar reportes de semanas anteriores, para revisar mi evolución histórica. | RF11 |
| HU12 | Como Estudiante, quiero activar el modo enfoque durante una sesión Pomodoro, para bloquear notificaciones no esenciales. | RF12, RNF13 |
| HU13 | Como Estudiante, quiero personalizar el tema de color y activar el modo oscuro de la plataforma. | RF13, RNF04 |
| HU14 | Como Estudiante, quiero exportar todos mis datos en formato JSON, para hacer un respaldo de mi información académica. | RF14 |
| HU15 | Como Estudiante, quiero recibir una meta semanal sugerida con base en mi historial, para tener un objetivo alcanzable. | RF15 |
