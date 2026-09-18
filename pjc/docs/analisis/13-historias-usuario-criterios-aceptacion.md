# Historias de Usuario y Criterios de Aceptación

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software III — Uniremington  
**Versión:** 1.0  

---

## 1. Criterio de documentación

Este catálogo conserva HU01–HU19 y agrega HU20–HU28 para cubrir operaciones que no estaban expresadas. Cada historia se relaciona con RF, CU, RN y criterios verificables. Las historias no se “normalizan”; sus datos y criterios utilizan los nombres del modelo aprobado para conservar consistencia con el MER.

## 2. Historias del Estudiante

| ID | Historia de usuario | RF / CU | RN | Criterios de aceptación |
|---|---|---|---|---|
| **HU01** | Como Estudiante, quiero registrar mi cuenta e ingresar al menos una materia, para acceder con mi información personalizada. | RF01 / CU01 | RN01–RN03 | Dado un correo no registrado y datos válidos, cuando confirmo el registro, entonces se crean la `cuenta`, su `preferencia_visual` y al menos una `materia`; la contraseña se almacena como hash. |
| **HU02** | Como Estudiante, quiero crear tareas con nombre, fecha de entrega, prioridad y materia opcional, para organizar mis compromisos. | RF02, RF09 / CU02 | RN04, RN05 | Cuando envío `nombre`, `fecha_entrega` futura y `prioridad` válida, entonces se crea `tarea` en estado `Pendiente`; `id_materia` puede ser nulo o pertenecer a mi cuenta. |
| **HU03** | Como Estudiante, quiero completar una tarea, para ganar puntos y ver mi avance. | RF03, RF07 / CU03 | RN07–RN09 | Dada una tarea pendiente propia, cuando pulso Completar, entonces cambia a `Completada`, registra fecha y genera un movimiento positivo de `punto` una sola vez. |
| **HU04** | Como Estudiante, quiero recibir un recordatorio antes de una entrega, para no olvidar compromisos. | RF04 / CU10 | RN05, RN18, RN19 | Al crear una tarea, se programa un `recordatorio`; llegado el momento se muestra una alerta una sola vez si existe permiso y se marca `enviado`. |
| **HU05** | Como Estudiante, quiero desbloquear insignias al cumplir condiciones, para recibir reconocimiento. | RF05 / CU06 | RN11 | Cuando cumplo una condición, se crea una sola asociación `cuenta_insignia`; si ya existe, el sistema no la duplica. |
| **HU06** | Como Estudiante, quiero participar en retos semanales, para mantener una motivación adicional. | RF06, RF07 / CU06 | RN10 | El sistema muestra como máximo un reto por semana; al alcanzar la condición se marca completado y entrega la recompensa una sola vez. |
| **HU07** | Como Estudiante, quiero consultar mis puntos, historial de recompensas y nivel, para conocer mi progreso gamificado. | RF07, RF08 / CU06 | RN07–RN09, RN15 | Al abrir Gamificación, el total coincide con `SUM(punto.cantidad)` y el nivel corresponde al mayor umbral alcanzado. |
| **HU08** | Como Estudiante, quiero ver tareas completadas, horas y puntos de la semana, para autoevaluar mi avance. | RF08, RF11 / CU05 | RN14 | Al abrir el tablero, los valores se calculan con `tarea`, `sesion_estudio` y `punto` del rango elegido, sin consultar una tabla `reporte`. |
| **HU09** | Como Estudiante, quiero filtrar y buscar tareas, para encontrar rápidamente las que necesito gestionar. | RF09 / CU07 | RN04 | Al seleccionar materia, prioridad, estado o fechas, o escribir parte del nombre, solo aparecen tareas propias que cumplen todos los filtros activos. |
| **HU10** | Como Estudiante, quiero usar un cronómetro Pomodoro vinculado opcionalmente a una tarea, para concentrarme. | RF10, RF12 / CU04 | RN20, RN21 | Al detener y guardar una sesión con duración positiva, se crea `sesion_estudio`; `id_tarea` puede ser nulo o corresponder a una tarea propia. |
| **HU11** | Como Estudiante, quiero consultar semanas anteriores, para revisar mi evolución histórica. | RF11 / CU05 | RN14 | Cuando selecciono una semana, el sistema recalcula los indicadores para sus fechas y no altera los datos históricos. |
| **HU12** | Como Estudiante, quiero activar el modo enfoque durante el Pomodoro, para evitar interrupciones. | RF12 / CU04 | RN19 | Mientras `modo_enfoque` está activo se suprimen alertas no esenciales; al finalizar o cancelar, se restaura su comportamiento normal. |
| **HU13** | Como Estudiante, quiero personalizar o restablecer el tema, modo oscuro y avatar, para adaptar la interfaz. | RF13 / CU08 | Relación 1:1 | Al guardar, se actualiza la única `preferencia_visual` de mi cuenta; al restablecer, se aplican valores predeterminados persistentes. |
| **HU14** | Como Estudiante, quiero exportar mis datos en JSON, para conservar un respaldo personal. | RF14 / CU09 | Privacidad por propietario | Al pulsar Exportar se descarga `datos.json` con mis datos y sin `contrasena_hash` ni registros de otras cuentas. |
| **HU15** | Como Estudiante, quiero recibir y consultar una meta semanal sugerida, para contar con un objetivo alcanzable. | RF15 / CU05 | RN12, RN13 | Se crea como máximo una `meta` por semana; cuando `valor_actual >= valor_objetivo`, queda marcada como cumplida. |
| **HU16** | Como Estudiante, quiero editar o eliminar una materia, para corregirla o retirar una asignatura que ya no curso. | RF01 / CU01 | Integridad de FK | Al guardar cambios se actualizan los campos permitidos; al eliminar, sus tareas conservan integridad mediante la regla aprobada para `id_materia`. |
| **HU17** | Como Estudiante, quiero editar o eliminar una meta semanal, para ajustar mis prioridades. | RF15 / CU05 | RN12, RN13 | Solo puedo modificar o eliminar una meta propia; no se permite duplicar `id_cuenta + semana`. |
| **HU18** | Como Estudiante, quiero editar o eliminar un reto activo, para corregirlo o descartarlo. | RF06 / CU06 | RN10 | Solo se modifica o elimina un reto propio; no se permite duplicar `id_cuenta + semana` ni volver a completar uno finalizado. |
| **HU19** | Como Estudiante, quiero eliminar una tarea que ya no es relevante, para mantener organizada mi lista. | RF02 / CU02 | RN06 | Al confirmar la eliminación de una tarea propia, desaparece del listado y sus recordatorios se eliminan en cascada; las sesiones relacionadas conservan la regla `SET NULL`. |
| **HU20** | Como Estudiante, quiero consultar y actualizar los datos permitidos de mi cuenta, para mantener mi perfil vigente. | RF01 / CU11 | RN01, RN02 | Al guardar nombre o correo válidos se actualiza mi cuenta; un correo duplicado se rechaza y nunca se devuelve la contraseña almacenada. |
| **HU21** | Como Estudiante, quiero consultar, corregir o eliminar sesiones registradas, para mantener un historial de estudio confiable. | RF10, RF11 / CU12 | RN14, RN20, RN21 | Solo se gestionan sesiones propias; una actualización exige duración positiva y la eliminación se refleja en el siguiente cálculo del tablero. |
| **HU24** | Como Estudiante, quiero consultar, marcar y eliminar notificaciones internas, para controlar los avisos pendientes. | RF04 / CU15 | RN16, RN17 | Puedo listar mis notificaciones, marcar una o todas como leídas y eliminar únicamente registros pertenecientes a mi cuenta. |
| **HU25** | Como Estudiante, quiero consultar, activar, desactivar o eliminar recordatorios, para controlar cuándo recibir alertas. | RF04 / CU10 | RN18, RN19 | El cambio de `activo` persiste; un recordatorio enviado no se repite y solo puedo gestionar recordatorios propios. |

## 3. Historias del Administrador

| ID | Historia de usuario | RF / CU | RN | Criterios de aceptación |
|---|---|---|---|---|
| **HU22** | Como Administrador, quiero crear, consultar, actualizar y eliminar insignias, para mantener el catálogo de reconocimientos. | RF05 / CU13 | RN11 | Nombre y condición deben ser únicos; antes de eliminar se valida la integridad de asignaciones existentes. |
| **HU23** | Como Administrador, quiero crear, consultar, actualizar y eliminar niveles, para mantener los umbrales de progreso. | RF07 / CU13 | RN15 | Nombre y orden son únicos; `puntos_minimos` no puede ser negativo y la evaluación usa el catálogo ordenado. |
| **HU26** | Como Administrador, quiero consultar movimientos de puntos y asignaciones de insignias y revocar registros incorrectos, para corregir inconsistencias justificadas. | RF05, RF07 / CU14 | RN07, RN11 | Los puntos nunca se editan; una corrección se realiza mediante eliminación autorizada y trazable. Una insignia solo puede revocarse si la asociación existe. |
| **HU27** | Como Administrador, quiero consultar, actualizar o desactivar cuentas, para atender correcciones y seguridad. | RF01 / CU13 | RN01, RN02 | El correo continúa siendo único; la desactivación cambia `activa` sin exponer ni reemplazar directamente `contrasena_hash`. |

## 4. Historia del Revisor institucional

| ID | Historia de usuario | RF / CU | RN | Criterios de aceptación |
|---|---|---|---|---|
| **HU28** | Como Revisor institucional, quiero consultar indicadores agregados de un periodo, para revisar el avance sin modificar datos del estudiante. | RF11 / CU16 | RN14, RN21 | Con autorización de solo lectura, el sistema calcula y muestra indicadores agregados del periodo, sin permitir cambios ni exponer credenciales o contraseñas. |

## 5. Cobertura CRUD por entidad

| Entidad | Crear | Consultar | Actualizar | Eliminar / desactivar | Cobertura HU | Observación |
|---|---|---|---|---|---|---|
| `cuenta` | Sí | Sí | Sí | Desactivar | HU01, HU20, HU27 | Se prefiere desactivación para conservar historial. |
| `materia` | Sí | Sí | Sí | Sí | HU01, HU16 | Propiedad restringida a la cuenta. |
| `tarea` | Sí | Sí | Sí | Sí | HU02, HU03, HU09, HU19 | Completar es una actualización controlada de estado. |
| `sesion_estudio` | Sí | Sí | Sí | Sí | HU10, HU21 | Asociación con tarea opcional. |
| `insignia` | Sí | Sí | Sí | Sí | HU05, HU22 | Catálogo global administrado. |
| `cuenta_insignia` | Desbloquear | Sí | No aplica | Revocar | HU05, HU26 | Una asociación no se edita; se crea o revoca. |
| `punto` | Otorgar | Sí | No aplica | Corrección autorizada | HU03, HU07, HU26 | Ledger append-only según RN07. |
| `reto` | Sí | Sí | Sí | Sí | HU06, HU18 | Un reto por cuenta y semana. |
| `meta` | Sí | Sí | Sí | Sí | HU15, HU17 | Una meta por cuenta y semana. |
| `recordatorio` | Sí | Sí | Activar/desactivar | Sí | HU04, HU25 | `enviado` lo actualiza el sistema. |
| `preferencia_visual` | Automática | Sí | Sí/restablecer | En cascada | HU01, HU13 | Única por cuenta; no requiere botón Eliminar. |
| `nivel_cuenta` | Sí | Sí | Sí | Sí | HU07, HU23 | Catálogo global administrado. |
| `notificacion` | Automática | Sí | Marcar leída | Sí | HU24 | El estudiante no crea avisos manuales. |

## 6. Definición de terminado de una HU

Una HU se considera cubierta cuando:

1. Tiene RF y CU asociados.
2. Sus criterios de aceptación pueden probarse.
3. Usa entidades y atributos del diccionario aprobado.
4. Respeta las RN indicadas.
5. Cada acción visible asociada aparece en la matriz de trazabilidad.
6. No introduce una operación prohibida por una regla de integridad.
