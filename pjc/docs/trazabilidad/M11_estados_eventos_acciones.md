# Tabla 11 — Estados → Eventos, Acciones, RF/Reglas de Negocio

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.11 Artefactos de Trazabilidad

> Entidad analizada: **Tarea** — la entidad más representativa del sistema, con ciclo de vida completo desde su creación hasta su eliminación.

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
