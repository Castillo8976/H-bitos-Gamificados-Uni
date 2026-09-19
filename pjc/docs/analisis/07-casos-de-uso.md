# Casos de Uso

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software III — Uniremington
**Autores:** Juan David Castillo Mena · Alejandro Cardona Jaramillo  
**Docente:** Gloria Amparo Lora Patiño  

---


Se identificaron **16 casos de uso específicos** derivados de las historias de usuario y los requisitos funcionales. Cada caso de uso representa un objetivo completo del actor, con flujo normal, flujos alternativos y postcondiciones verificables.

## Caso de Uso General del Sistema

**CUG01 — Gestionar hábitos de estudio mediante una plataforma web gamificada:** el Estudiante se registra y utiliza los módulos de agenda, tareas, Pomodoro, gamificación, tablero, recordatorios, notificaciones, configuración y exportación. El Administrador mantiene las cuentas y los catálogos globales autorizados. El Revisor institucional únicamente consulta indicadores agregados. El rectángulo del sistema comprende CU01–CU16 y la Notifications API permanece como sistema externo de apoyo.

## Modelo de Actores

| Actor | Clasificación | Participación |
|---|---|---|
| **Estudiante** | Principal | Ejecuta CU01–CU12 y CU15. “Usuario registrado” se considera un estado del Estudiante, no un actor diferente. |
| **Administrador** | Secundario autorizado | Ejecuta CU13 y CU14 para mantener cuentas, catálogos y correcciones controladas. |
| **Revisor institucional** | Secundario de solo lectura | Ejecuta CU16 sin modificar información. |
| **Notifications API** | Sistema externo | Apoya CU10 y CU15; no es un actor humano. |

La accesibilidad para personas con discapacidad física es una condición de calidad aplicable al actor Estudiante mediante RNF06 y RNF14; no constituye un actor con objetivos funcionales diferentes.

---

## Resumen de Casos de Uso

| ID | Nombre | RF Asociado |
|---|---|---|
| CU01 | Registrar cuenta y materias | RF01 |
| CU02 | Gestionar tareas académicas | RF02, RF04, RF09 |
| CU03 | Completar tarea y recibir recompensa | RF03, RF05, RF06, RF07, RF11 |
| CU04 | Realizar sesión de estudio Pomodoro | RF10, RF12 |
| CU05 | Ver Tablero de Avance Personal | RF08, RF11, RF15 |
| CU06 | Gestionar insignias y retos | RF05, RF06 |
| CU07 | Filtrar y buscar tareas | RF09 |
| CU08 | Personalizar configuración visual | RF13, RNF04 |
| CU09 | Exportar datos personales | RF14, RNF04 |
| CU10 | Gestionar recordatorios | RF04, RNF15 |
| CU11 | Gestionar perfil de cuenta | RF01, RNF12 |
| CU12 | Gestionar historial de sesiones | RF10, RF11 |
| CU13 | Administrar cuentas y catálogos | RF01, RF05, RF07 |
| CU14 | Corregir movimientos y asignaciones | RF05, RF07 |
| CU15 | Gestionar notificaciones internas | RF04, RNF15 |
| CU16 | Consultar indicadores institucionales | RF11 |

---

## CU01 — Registrar cuenta y materias

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El estudiante accede a la URL de la aplicación por primera vez. |
| **Flujo normal** | 1. El estudiante pulsa "Crear cuenta". 2. Ingresa nombre, correo y contraseña. 3. Agrega al menos una materia con su horario. 4. El sistema valida los datos, cifra la contraseña y guarda la cuenta y la materia en SQLite mediante el servidor. 5. El sistema crea la preferencia visual predeterminada y redirige al Dashboard. |
| **Flujos alternativos** | A1: Correo ya registrado → el sistema muestra "Este correo ya existe". A2: Contraseña débil → el sistema solicita mínimo 6 caracteres. A3: Sin materia → el sistema bloquea el registro hasta agregar al menos una. |
| **Postcondición** | La cuenta queda activa, los datos persisten en SQLite y el estudiante accede al Dashboard. |

---

## CU02 — Gestionar tareas académicas

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa en el sistema. |
| **Flujo normal** | 1. El usuario pulsa "Nueva tarea". 2. Ingresa nombre, fecha de entrega, prioridad y materia (opcional). 3. El sistema valida que la fecha sea futura y el nombre no esté vacío. 4. Guarda la tarea en SQLite mediante el servidor con estado "Pendiente". 5. Programa un recordatorio automático para 24 horas antes de la fecha de entrega. 6. La tarea aparece en la lista con su chip de prioridad. |
| **Flujos alternativos** | A1: Fecha en el pasado → "La fecha debe ser futura". A2: Nombre vacío → "El nombre es obligatorio". A3: El usuario edita una tarea existente → los cambios se persisten y el recordatorio se reprograma. |
| **Postcondición** | La tarea queda guardada con estado "Pendiente" y el recordatorio programado. |

---

## CU03 — Completar tarea y recibir recompensa

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | Existe al menos una tarea con estado "Pendiente" o "En progreso". |
| **Flujo normal** | 1. El estudiante activa el checkbox de la tarea. 2. El sistema cambia el estado a "Completada" y registra la fecha. 3. El sistema suma los puntos correspondientes. 4. Verifica si se cumple alguna condición de insignia. 5. Si se desbloquea una insignia, muestra animación de celebración. 6. Actualiza el panel de progreso (cálculo en tiempo real, sin tabla de reporte). |
| **Flujos alternativos** | A1: Insignia ya obtenida → solo suma puntos sin mostrar animación. A2: Progreso del reto semanal completado → el sistema otorga los puntos del reto. |
| **Postcondición** | La tarea queda en estado "Completada" y los puntos se acumulan; el Tablero de Avance Personal reflejará el cambio en su próxima consulta. |

---

## CU04 — Realizar sesión de estudio Pomodoro

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El estudiante tiene una sesión activa en el sistema. |
| **Flujo normal** | 1. El estudiante pulsa "Iniciar sesión de estudio". 2. Opcionalmente vincula la sesión a una tarea. 3. El cronómetro inicia en modo Pomodoro (25 min enfoque). 4. El sistema muestra el banner "Modo enfoque activo — notificaciones bloqueadas". 5. Al terminar el ciclo, muestra notificación de descanso. 6. El estudiante pulsa "Detener y guardar". 7. El sistema guarda la sesión con su duración; sus horas quedan disponibles para el cálculo en tiempo real del Tablero de Avance Personal. |
| **Flujos alternativos** | A1: El estudiante cancela sin guardar → la sesión se descarta. A2: El estudiante pausa → el cronómetro se detiene y puede reanudarse. A3: Modo cronómetro libre → el estudiante define su propio tiempo. |
| **Postcondición** | La sesión queda guardada y las horas aparecen en el Tablero de Avance Personal. |

---

## CU05 — Ver Tablero de Avance Personal

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene al menos una tarea o sesión registrada. |
| **Flujo normal** | 1. El usuario accede al Tablero de Avance Personal. 2. El sistema calcula en tiempo real (COUNT/SUM sobre `tarea`, `sesion_estudio` y `punto`) las tareas completadas, horas estudiadas y puntos obtenidos de la semana actual. 3. Muestra estas estadísticas junto con la barra de progreso de la meta activa. 4. El usuario puede filtrar por semanas anteriores usando los mismos datos históricos ya almacenados en `tarea`/`sesion_estudio`/`punto`. 5. El sistema muestra un mensaje motivacional si el progreso es inferior al 50 %. |
| **Flujos alternativos** | A1: Sin actividad en la semana → muestra "0 tareas, 0h, 0 pts" con mensaje motivador. A2: Meta cumplida → el sistema muestra mensaje de felicitación. |
| **Postcondición** | El estudiante visualiza su progreso semanal actualizado. |

> **Nota de corrección (agosto 2026):** este caso de uso se llamaba "Ver reportes y progreso semanal" y dependía de una tabla `reporte` que guardaba un snapshot. El equipo decidió eliminar esa tabla por ser redundante — los mismos datos ya existen en `tarea`, `sesion_estudio` y `punto` — así que ahora el tablero calcula todo en el momento de la consulta, sin persistir nada adicional.

---

## CU06 — Gestionar insignias y retos

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El estudiante tiene una sesión activa y ha realizado al menos una acción en el sistema. |
| **Flujo normal** | 1. El sistema evalúa automáticamente las condiciones de insignias tras cada acción. 2. Si se cumple una condición, desbloquea la insignia y la muestra en el panel. 3. Semanalmente, el sistema genera un reto nuevo. 4. El estudiante puede ver el reto activo con su condición, progreso y puntos de recompensa. 5. Al cumplir el reto, otorga los puntos y muestra celebración. |
| **Flujos alternativos** | A1: Insignia ya obtenida → el sistema no la duplica. A2: Reto no completado en la semana → el sistema lo reinicia la semana siguiente. |
| **Postcondición** | Las insignias quedan registradas y los puntos del reto se suman. |

---

## CU07 — Filtrar y buscar tareas

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa y al menos una tarea registrada. |
| **Flujo normal** | 1. El usuario accede al módulo de lista de tareas. 2. El sistema muestra todas las tareas con estado, prioridad y fecha de entrega. 3. El usuario selecciona filtros: materia, prioridad (Alta/Media/Baja), estado (Pendiente/Completada/Vencida) o rango de fechas. 4. El sistema filtra la lista en tiempo real. 5. El usuario puede limpiar los filtros para volver a la lista completa. |
| **Flujos alternativos** | A1: Ninguna tarea cumple los criterios → "No se encontraron tareas con estos filtros". A2: El usuario escribe en el campo de búsqueda → el sistema filtra por coincidencia parcial del nombre. |
| **Postcondición** | El usuario visualiza únicamente las tareas que corresponden a los filtros aplicados. |

---

## CU08 — Personalizar configuración visual

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa en el sistema. |
| **Flujo normal** | 1. El usuario accede a "Configuración / Preferencias". 2. El sistema consulta las preferencias actuales en SQLite mediante el servidor. 3. El usuario selecciona un tema de color (purple, teal, amber, coral, blue, green). 4. El sistema aplica el nuevo tema inmediatamente (preview en tiempo real). 5. El usuario puede activar o desactivar el modo oscuro con un toggle. 6. El usuario selecciona un avatar de la galería. 7. El usuario pulsa "Guardar cambios" y el sistema persiste las preferencias. |
| **Flujos alternativos** | A1: El usuario cierra sin guardar → el sistema restaura las preferencias anteriores. A2: El usuario activa modo oscuro → toda la interfaz cambia a la paleta oscura sin recargar la página. |
| **Postcondición** | Las preferencias quedan guardadas en SQLite y la interfaz refleja el tema y modo elegidos. |

---

## CU09 — Exportar datos personales

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa y al menos un registro almacenado en la base de datos. |
| **Flujo normal** | 1. El usuario accede a "Exportar datos" desde Configuración. 2. El sistema muestra un resumen de los datos disponibles. 3. El usuario pulsa "Exportar como JSON". 4. El servidor consulta en SQLite los datos asociados a la cuenta. 5. El sistema genera un archivo `datos.json` y lo entrega al navegador. 6. El navegador inicia la descarga. 7. El sistema muestra la confirmación "Tus datos han sido exportados exitosamente". |
| **Flujos alternativos** | A1: No hay datos guardados → "No tienes datos registrados para exportar" y deshabilita el botón. A2: El navegador bloquea la descarga automática → el sistema muestra un enlace directo. |
| **Postcondición** | El usuario dispone de un archivo JSON con toda su información académica. |

---

## CU10 — Gestionar recordatorios

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa y el navegador ha concedido permiso para notificaciones. |
| **Flujo normal** | 1. Al crear una tarea con fecha de entrega, el sistema programa automáticamente un recordatorio 24 horas antes. 2. El sistema muestra una lista de recordatorios activos. 3. El usuario puede desactivar un recordatorio con el toggle Activo/Inactivo. 4. El sistema actualiza el registro en SQLite mediante el servidor. 5. Cuando llega la fecha programada, el sistema dispara la notificación. 6. Una vez enviada, el sistema marca `enviado = true` para no reenviar. |
| **Flujos alternativos** | A1: Navegador sin permiso de notificaciones → el sistema solicita el permiso; si se rechaza, el recordatorio se guarda pero no dispara notificación nativa. A2: El usuario reactiva un recordatorio → el sistema lo reprograma si la fecha aún no ha pasado. A3: La tarea es eliminada → el sistema elimina el recordatorio en cascada. |
| **Postcondición** | Los recordatorios activos se ejecutan automáticamente y quedan marcados como enviados. |

---

## Trazabilidad Detallada de CU01–CU10

Esta tabla complementa las fichas existentes sin repetir sus flujos.

| CU | Objetivo | Disparador | HU | RF | RN aplicables |
|---|---|---|---|---|---|
| CU01 | Registrar cuenta y materias | Seleccionar “Crear cuenta” | HU01, HU16 | RF01 | RN01–RN03, RN21 |
| CU02 | Gestionar tareas | Seleccionar “Nueva tarea”, Editar o Eliminar | HU02, HU19 | RF02, RF04, RF09 | RN04–RN06, RN21 |
| CU03 | Completar tarea y recompensar | Seleccionar Completar | HU03 | RF03, RF05, RF07 | RN07–RN11, RN21 |
| CU04 | Realizar sesión Pomodoro | Seleccionar Iniciar | HU10, HU12 | RF10, RF12 | RN19–RN21 |
| CU05 | Consultar tablero y metas | Abrir Tablero o cambiar semana | HU08, HU11, HU15, HU17 | RF08, RF11, RF15 | RN12–RN14, RN21 |
| CU06 | Gestionar gamificación | Abrir Gamificación o actuar sobre un reto | HU05–HU07, HU18 | RF05–RF08 | RN07–RN11, RN15, RN21 |
| CU07 | Filtrar y buscar tareas | Aplicar un filtro o texto | HU09 | RF09 | RN21 |
| CU08 | Personalizar configuración | Abrir Configuración y guardar/restablecer | HU13 | RF13 | RN21 |
| CU09 | Exportar datos | Seleccionar “Exportar como JSON” | HU14 | RF14 | RN02, RN21 |
| CU10 | Gestionar recordatorios | Abrir Recordatorios o cambiar su estado | HU04, HU25 | RF04 | RN05, RN06, RN18, RN19, RN21 |

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
| HU08 | Como Estudiante, quiero ver en mi Tablero de Avance Personal las tareas completadas, horas estudiadas y puntos obtenidos de la semana. | RF08, RF11 |
| HU09 | Como Estudiante, quiero filtrar mis tareas por materia, prioridad o estado, para encontrar rápidamente lo que necesito gestionar. | RF09 |
| HU10 | Como Estudiante, quiero usar un cronómetro Pomodoro vinculado a una tarea, para concentrarme en bloques de tiempo definidos. | RF10, RF12 |
| HU11 | Como Estudiante, quiero consultar mi progreso de semanas anteriores en el Tablero de Avance Personal, para revisar mi evolución histórica. | RF11 |
| HU12 | Como Estudiante, quiero activar el modo enfoque durante una sesión Pomodoro, para bloquear notificaciones no esenciales. | RF12, RNF13 |
| HU13 | Como Estudiante, quiero personalizar el tema de color y activar el modo oscuro de la plataforma. | RF13, RNF04 |
| HU14 | Como Estudiante, quiero exportar todos mis datos en formato JSON, para hacer un respaldo de mi información académica. | RF14 |
| HU15 | Como Estudiante, quiero recibir una meta semanal sugerida con base en mi historial, para tener un objetivo alcanzable. | RF15 |
| HU16 | Como Estudiante, quiero editar o eliminar una materia registrada, para corregir datos o dar de baja asignaturas que ya no curso. | RF01 |
| HU17 | Como Estudiante, quiero editar o eliminar una meta semanal, para ajustar el objetivo si cambian mis prioridades. | RF15 |
| HU18 | Como Estudiante, quiero editar o eliminar un reto activo, para corregir su descripción o descartarlo si ya no aplica. | RF06 |
| HU19 | Como Estudiante, quiero eliminar una tarea que ya no es relevante, para mantener mi lista de pendientes organizada. | RF02 |
| HU20 | Como Estudiante, quiero consultar y actualizar los datos permitidos de mi cuenta, para mantener mi perfil vigente. | RF01, RNF12 |
| HU21 | Como Estudiante, quiero consultar, corregir o eliminar sesiones registradas, para mantener un historial de estudio confiable. | RF10, RF11 |
| HU22 | Como Administrador, quiero gestionar el catálogo de insignias, para mantener actualizados los reconocimientos. | RF05 |
| HU23 | Como Administrador, quiero gestionar el catálogo de niveles, para mantener actualizados los umbrales de progreso. | RF07 |
| HU24 | Como Estudiante, quiero consultar, marcar y eliminar notificaciones internas, para controlar mis avisos pendientes. | RF04, RNF15 |
| HU25 | Como Estudiante, quiero consultar, activar, desactivar o eliminar recordatorios, para controlar cuándo recibir alertas. | RF04, RNF15 |
| HU26 | Como Administrador, quiero consultar movimientos de puntos y asignaciones de insignias y revocar registros incorrectos, para corregir inconsistencias justificadas. | RF05, RF07 |
| HU27 | Como Administrador, quiero consultar, actualizar o desactivar cuentas, para atender correcciones y necesidades de seguridad. | RF01, RNF12 |
| HU28 | Como Revisor institucional, quiero consultar indicadores agregados de un periodo, para revisar el avance sin modificar datos del estudiante. | RF11 |

> **Nota de corrección (agosto 2026):** HU16–HU19 se agregaron porque el CRUD de `materiaCrud.js`, `metaCrud.js`, `retoCrud.js` y `tareaCrud.js` ya implementa `actualizar*` y `eliminar*` para estas entidades, pero no existían historias de usuario explícitas que los sustentaran — solo aparecían como flujos alternativos dentro de otros casos de uso.

Los criterios de aceptación completos y la cobertura CRUD de HU01–HU28 se encuentran en `13-historias-usuario-criterios-aceptacion.md`.

---

## CU11 — Gestionar perfil de cuenta

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Disparador** | El estudiante selecciona “Mi perfil”. |
| **Precondición** | Cuenta autenticada y activa. |
| **Flujo normal** | 1. El sistema consulta la cuenta sin exponer `contrasena_hash`. 2. El estudiante modifica nombre o correo. 3. El sistema valida unicidad y propiedad. 4. Guarda los cambios y confirma. |
| **Flujos alternativos** | A1: correo duplicado → rechaza el cambio. A2: datos inválidos → informa el campo. |
| **Postcondición** | Los datos permitidos quedan actualizados. |
| **Trazabilidad** | HU20 · RF01 · RN01, RN02 |

## CU12 — Gestionar historial de sesiones

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Disparador** | El estudiante abre su historial de estudio. |
| **Precondición** | Cuenta autenticada. |
| **Flujo normal** | 1. Lista sesiones propias. 2. El estudiante consulta una sesión. 3. Puede corregir duración/modo o eliminarla. 4. El sistema valida y persiste. 5. El tablero refleja el cambio al recalcular. |
| **Flujos alternativos** | A1: duración no positiva → rechaza. A2: sesión ajena o inexistente → no autoriza. |
| **Postcondición** | El historial conserva únicamente sesiones válidas. |
| **Trazabilidad** | HU21 · RF10, RF11 · RN14 |

## CU13 — Administrar cuentas y catálogos

| Campo | Descripción |
|---|---|
| **Actor principal** | Administrador |
| **Disparador** | El Administrador abre el panel autorizado. |
| **Precondición** | Permisos administrativos vigentes. |
| **Flujo normal** | 1. Selecciona cuentas, insignias o niveles. 2. Consulta el registro. 3. Crea o modifica catálogos, o actualiza/desactiva una cuenta. 4. El sistema valida unicidad e integridad. 5. Persiste y confirma. |
| **Flujos alternativos** | A1: registro relacionado impide eliminar → informa la restricción. A2: valor duplicado → rechaza. |
| **Postcondición** | La cuenta o catálogo queda actualizado sin romper referencias. |
| **Trazabilidad** | HU22, HU23, HU27 · RF01, RF05, RF07 · RN01, RN02, RN11, RN15 |

## CU14 — Corregir movimientos y asignaciones

| Campo | Descripción |
|---|---|
| **Actor principal** | Administrador |
| **Disparador** | Se reporta un movimiento o asignación incorrecta. |
| **Precondición** | Permisos administrativos y justificación de la corrección. |
| **Flujo normal** | 1. Consulta puntos o insignias asignadas. 2. Selecciona el registro incorrecto. 3. Confirma la revocación/eliminación. 4. El sistema conserva la regla append-only y recalcula el resultado derivado. |
| **Flujos alternativos** | A1: registro inexistente → no modifica. A2: intento de editar puntos → se rechaza; solo se permite corrección autorizada. |
| **Postcondición** | La inconsistencia queda corregida sin editar movimientos históricos. |
| **Trazabilidad** | HU26 · RF05, RF07 · RN07, RN11 |

## CU15 — Gestionar notificaciones internas

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Sistema externo** | Notifications API, cuando corresponda. |
| **Disparador** | El estudiante abre el centro de notificaciones. |
| **Precondición** | Cuenta autenticada. |
| **Flujo normal** | 1. Lista notificaciones propias. 2. Filtra pendientes. 3. Marca una o todas como leídas, o elimina una notificación. 4. El sistema persiste el cambio. |
| **Flujos alternativos** | A1: notificación ajena o inexistente → no autoriza. A2: permiso nativo denegado → mantiene el aviso in-app. |
| **Postcondición** | El estado leído/no leído y la lista quedan actualizados. |
| **Trazabilidad** | HU24 · RF04 · RN16, RN17, RN19 |

## CU16 — Consultar indicadores institucionales

| Campo | Descripción |
|---|---|
| **Actor principal** | Revisor institucional |
| **Disparador** | El revisor accede a la consulta autorizada. |
| **Precondición** | Acceso de solo lectura autorizado. |
| **Flujo normal** | 1. Selecciona el periodo disponible. 2. El sistema calcula indicadores agregados. 3. Muestra resultados sin permitir edición ni exponer credenciales. |
| **Flujos alternativos** | A1: sin información → muestra estado vacío. A2: acceso no autorizado → deniega la consulta. |
| **Postcondición** | Se muestran indicadores sin modificar ni persistir una tabla `reporte`. |
| **Trazabilidad** | HU28 · RF11 · RN14, RN21 |
