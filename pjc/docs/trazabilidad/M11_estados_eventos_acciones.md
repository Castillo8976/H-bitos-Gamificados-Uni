# Tabla 11 — Estados → Eventos, Acciones, RF/Reglas de Negocio

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.11 Artefactos de Trazabilidad

> Esta matriz conserva a **Tarea** como caso gráfico principal y documenta además todas las entidades que manejan estados persistidos o transitorios relevantes. Cada transición se justifica mediante RF, RN, CU o restricción del modelo aprobado.

---

## Estados y su justificación

| Estado | Descripción | RF |
|---|---|---|
| **Pendiente** | Estado inicial tras crear la tarea correctamente. El estudiante aún no ha comenzado ni completado. | RF02 |
| **En progreso** | El estudiante inició una sesión de estudio vinculada a esta tarea (cronómetro activo). | RF10 |
| **Completada** | El estudiante marcó la tarea como terminada. Se suman puntos y se verifica si se desbloquea una insignia. | RF03, RF05 |
| **Vencida** | La fecha de entrega pasó y la tarea no fue completada. El sistema actualiza el estado automáticamente. | RF04 |
| **Eliminada** | El estudiante eliminó la tarea. Acción irreversible. Se borran también los recordatorios asociados en cascada. | RF02 |

---

## Matriz de transiciones

| Estado | Evento disparador | Estado destino | Acción del sistema | RF/Regla |
|---|---|---|---|---|
| — (inicio) | `crear` con datos válidos | **Pendiente** | Guarda tarea; programa recordatorio | RF02, RF04 |
| Pendiente | `iniciarCronometro` vinculado | **En progreso** | Inicia `sesionestudio`; activa modo enfoque | RF10, RF12 |
| En progreso | `detenerCronometro` | **Pendiente** | Guarda `sesionestudio` con duración | RF10 |
| Pendiente | `marcarCompletada` | **Completada** | Suma puntos; verifica insignias; registra `fechacompletada` | RF03, RF05 |
| En progreso | `marcarCompletada` | **Completada** | Cierra sesión; suma puntos; verifica insignias | RF03, RF05 |
| Pendiente / En progreso | `DATE(now) > fechaentrega` | **Vencida** | Sistema actualiza estado automáticamente | RF04 |
| Vencida | `marcarCompletada` (tardía) | **Completada** | Suma puntos sin bono extra | RF03 |
| Cualquier activo | `eliminar` | **Eliminada** | Borra tarea y recordatorios `CASCADE` | RF02, ON DELETE CASCADE |

---

## Restricciones de estado

- Los estados **Completada** y **Eliminada** son absorbentes: no pueden transicionar a ningún otro estado.
- El estado **Vencida** es disparado automáticamente por el sistema, no por acción del usuario.

---

## Cuenta — activa / inactiva

| Estado origen | Evento | Estado destino | Acción del sistema | RF / RN / CU |
|---|---|---|---|---|
| — | `crearCuenta()` | Activa | Persiste `activa = true`; cifra contraseña | RF01, RN01, RN02 / CU01 |
| Activa | `actualizarCuenta({ activa: false })` | Inactiva | Suspende acceso y conserva historial | RF01, RN21 / CU13 |
| Inactiva | `actualizarCuenta({ activa: true })` | Activa | Restablece acceso autorizado | RF01, RN21 / CU13 |
| Activa / Inactiva | `eliminarCuenta()` autorizado | Eliminada | Elimina la cuenta y dependencias según FK | RF01, RN21 / CU13 |

## Materia — activa / inactiva

| Estado origen | Evento | Estado destino | Acción del sistema | RF / RN / CU |
|---|---|---|---|---|
| — | `crearMateria()` | Activa | Persiste `activa = true` para la cuenta | RF01, RN03, RN21 / CU01 |
| Activa | `actualizarMateria({ activa: false })` | Inactiva | Oculta la materia del periodo activo | RF09, RN21 / CU01 |
| Inactiva | `actualizarMateria({ activa: true })` | Activa | Reincorpora la materia al periodo | RF09, RN21 / CU01 |
| Activa / Inactiva | `eliminarMateria()` | Eliminada | Elimina materia; tareas conservadas con FK nullable | RF01, RF09, RN21 / CU01 |

## Sesión de estudio — estados transitorios

| Estado origen | Evento | Estado destino | Acción del sistema | RF / RN / CU |
|---|---|---|---|---|
| — | Iniciar cronómetro | En curso | Inicia conteo; puede activar modo enfoque | RF10, RF12, RN20 / CU04 |
| En curso | Pausar | Pausada | Detiene temporalmente el conteo sin persistir sesión final | RF10 / CU04 |
| Pausada | Reanudar | En curso | Continúa el conteo | RF10 / CU04 |
| En curso / Pausada | `crearSesionEstudio()` al detener | Finalizada | Valida duración > 0 y persiste la sesión | RF10, RF11, RN20, RN21 / CU04 |
| En curso / Pausada | Cancelar | Cancelada | Descarta el conteo no guardado | RF10 / CU04 |

> `sesion_estudio` no almacena una columna `estado`. En curso y Pausada son estados transitorios de la interfaz; Finalizada corresponde al registro persistido.

## Reto — en progreso / completado

| Estado origen | Evento | Estado destino | Acción del sistema | RF / RN / CU |
|---|---|---|---|---|
| — | `crearReto()` | En progreso | Persiste `completado = false`, `progreso = 0` | RF06, RN10 / CU06 |
| En progreso | `actualizarProgresoReto()` sin cumplir | En progreso | Actualiza progreso sin recompensa | RF06, RN10 / CU06 |
| En progreso | `completarReto()` | Completado | Persiste `completado = true` y otorga puntos una vez | RF06, RN10 / CU06 |
| Completado | Intentar completar nuevamente | Completado | Rechaza; no duplica puntos | RF06, RN10 / CU06 |
| En progreso | `eliminarReto()` | Eliminado | Elimina el reto autorizado | RF06, RN21 / CU06 |

## Meta — en progreso / cumplida

| Estado origen | Evento | Estado destino | Acción del sistema | RF / RN / CU |
|---|---|---|---|---|
| — | `crearMeta()` | En progreso | Persiste `cumplida = false`, `valor_actual = 0` | RF15, RN12 / CU05 |
| En progreso | `actualizarProgresoMeta()` por debajo del objetivo | En progreso | Actualiza `valor_actual` | RF15, RN12 / CU05 |
| En progreso | `valor_actual >= valor_objetivo` | Cumplida | Persiste `cumplida = true` | RF15, RN12, RN13 / CU05 |
| Cumplida | Cambiar posteriormente el objetivo | Cumplida | Conserva estado histórico; no recalcula automáticamente | RF15, RN13 / CU05 |
| En progreso | `eliminarMeta()` | Eliminada | Elimina la meta autorizada | RF15, RN21 / CU05 |

## Recordatorio — programado / desactivado / enviado

| Estado origen | Evento | Estado destino | Acción del sistema | RF / RN / CU |
|---|---|---|---|---|
| — | `crearRecordatorio()` o `generarRecordatorioAutomatico()` | Programado | Persiste `activo = true`, `enviado = false` | RF04, RN05 / CU02, CU10 |
| Programado | `toggleRecordatorio()` | Desactivado | Persiste `activo = false` | RF04, RN21 / CU10 |
| Desactivado | `toggleRecordatorio()` | Programado | Persiste `activo = true` | RF04, RN21 / CU10 |
| Programado | Fecha programada y proceso de envío | Enviado | Ejecuta `marcarRecordatorioEnviado()`; no reenvía | RF04, RN18, RN19 / CU10 |
| Programado / Desactivado | `eliminarRecordatorio()` o cascada | Eliminado | Elimina el registro | RF04, RN06, RN21 / CU10 |

## Notificación — no leída / leída

| Estado origen | Evento | Estado destino | Acción del sistema | RF / RN / CU |
|---|---|---|---|---|
| — | `crearNotificacion()` | No leída | Persiste `leida = false` | RF04, RN16, RN17 / CU15 |
| No leída | `marcarNotificacionLeida()` | Leída | Persiste `leida = true` | RF04, RN17 / CU15 |
| Varias no leídas | `marcarTodasLeidas()` | Leídas | Actualiza todas las notificaciones de la cuenta | RF04, RN17, RN21 / CU15 |
| No leída / Leída | `eliminarNotificacion()` | Eliminada | Elimina la notificación propia | RF04, RN16, RN21 / CU15 |
| Leída | `limpiarNotificacionesLeidas()` | Eliminada | Elimina en lote solo las leídas de la cuenta | RF04, RN16, RN21 / CU15 |

---

## Cobertura y exclusiones justificadas

| Entidad | ¿Maneja estados? | Evidencia / decisión |
|---|---|---|
| `cuenta` | Sí | `activa`; transiciones documentadas arriba. |
| `materia` | Sí | `activa`; transiciones documentadas arriba. |
| `tarea` | Sí | `estado` persistido y estados derivados; diagrama gráfico vigente. |
| `sesion_estudio` | Sí, transitorios | En curso/Pausada/Finalizada en UI; sin columna `estado`. |
| `reto` | Sí | `completado`; transiciones documentadas arriba. |
| `meta` | Sí | `cumplida`; transiciones documentadas arriba. |
| `recordatorio` | Sí | Combinación de `activo` y `enviado`. |
| `notificacion` | Sí | `leida`; transiciones documentadas arriba. |
| `insignia` | No | Catálogo CRUD sin atributo de estado. |
| `cuenta_insignia` | No | Asociación creada o revocada; no tiene estado mutable. |
| `punto` | No | Evento append-only; no cambia de estado. |
| `preferencia_visual` | No | Sus campos son valores configurables, no estados de ciclo de vida. |
| `nivel_cuenta` | No | Catálogo; el nivel de la cuenta se calcula y no se almacena como estado. |

Con esta clasificación, toda entidad que maneja un estado persistido o transitorio relevante tiene estado, evento, transición, acción y trazabilidad; las demás quedan excluidas mediante una decisión explícita, no por omisión.
