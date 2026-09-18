## Diagrama de Estados

Entidad analizada: **Tarea** — la única entidad con ciclo de vida completo (creación → estados intermedios → estados finales absorbentes).

> **Aclaración importante:** la columna `tarea.estado` en la base de datos solo admite dos valores (`CHECK estado IN ('Pendiente','Completada')`, ver `E11-script-DDL-v2.sql`). **Vencida** y **En progreso** son estados *derivados* que la interfaz calcula (comparando `fecha_entrega` con la fecha actual, o verificando si existe una `sesion_estudio` activa vinculada), no valores adicionales almacenados en la columna. El diagrama de estados documenta el ciclo de vida conceptual completo, incluyendo esos estados calculados.

| Estado | Tipo | Descripción | RF |
|---|---|---|---|
| Pendiente | Persistido | Estado inicial tras crear la tarea. | RF02 |
| En progreso | Derivado (UI) | Existe una `sesion_estudio` activa vinculada a esta tarea. | RF10 |
| Vencida | Derivado (UI) | `fecha_entrega` ya pasó y `estado` sigue en `Pendiente`. | RF04 |
| Completada | Persistido | El estudiante la marcó como terminada; suma puntos y evalúa insignias. | RF03, RF05 |
| Eliminada | Final (registro borrado) | Acción irreversible; recordatorios se eliminan en cascada. | RF02 |

Ver la matriz de transiciones completa (evento disparador, acción del sistema y RF/regla asociada) en `M11_estados_eventos_acciones.md`.

![Diagrama de estados](../imagenes/DGEstados.png)