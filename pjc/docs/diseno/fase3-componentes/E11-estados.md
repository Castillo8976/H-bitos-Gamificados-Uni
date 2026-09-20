## Diagramas de Estados

El diagrama gráfico existente representa a **Tarea**, la entidad con el ciclo de vida más amplio. Para cumplir el checklist de Diseño sin alterar el archivo Draw.io aprobado, este documento incorpora también la especificación textual de los estados de `cuenta`, `materia`, `sesion_estudio`, `reto`, `meta`, `recordatorio` y `notificacion`. Las transiciones, acciones y reglas se detallan en M11.

### `Tarea`

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

---

## Especificaciones textuales complementarias

### `Cuenta`

```text
[Inicio] ── registrar cuenta ──> Activa
Activa ── desactivar cuenta ──> Inactiva
Inactiva ── reactivar cuenta ──> Activa
Activa/Inactiva ── eliminación administrativa autorizada ──> [Eliminada]
```

`activa` es el atributo persistido. La desactivación conserva el historial y restringe el acceso; la eliminación física solo procede bajo control administrativo. RF01 · CU11/CU13 · HU27 · RN21.

### `Materia`

```text
[Inicio] ── registrar materia ──> Activa
Activa ── cerrar/desactivar materia ──> Inactiva
Inactiva ── reactivar materia ──> Activa
Activa/Inactiva ── eliminar materia ──> [Eliminada]
```

`activa` es el atributo persistido. Al eliminar una materia, sus tareas no se eliminan: `id_materia` pasa a `NULL`. RF01, RF09 · HU16 · RN21.

### `SesionEstudio`

```text
[Inicio] ── iniciar cronómetro ──> En curso
En curso ── pausar ──> Pausada
Pausada ── reanudar ──> En curso
En curso/Pausada ── detener y guardar ──> [Finalizada]
En curso/Pausada ── cancelar sin guardar ──> [Cancelada]
```

Los estados son **transitorios de interfaz**: `sesion_estudio` no tiene columna `estado`; solo se persiste la sesión finalizada con una duración positiva. `modo_enfoque` representa el modo de trabajo, no un estado del ciclo de vida. RF10, RF12 · CU04/CU12 · RN20, RN21.

### `Reto`

```text
[Inicio] ── crear reto ──> En progreso (completado = false)
En progreso ── actualizar progreso sin alcanzar condición ──> En progreso
En progreso ── alcanzar condición/completar ──> [Completado]
En progreso ── eliminar ──> [Eliminado]
```

`Completado` es absorbente: RN10 impide completar nuevamente el reto y duplicar la recompensa. RF06 · CU06 · HU06/HU18 · RN10, RN21.

### `Meta`

```text
[Inicio] ── crear meta ──> En progreso (cumplida = false)
En progreso ── actualizar valor sin alcanzar objetivo ──> En progreso
En progreso ── valor_actual >= valor_objetivo ──> [Cumplida]
En progreso ── eliminar ──> [Eliminada]
```

`Cumplida` se conserva para mantener el historial y no se revierte automáticamente aunque después cambie el objetivo. RF15 · CU05 · HU15/HU17 · RN12, RN13, RN21.

### `Recordatorio`

```text
[Inicio] ── programar ──> Programado (activo = true, enviado = false)
Programado ── desactivar ──> Desactivado (activo = false, enviado = false)
Desactivado ── activar ──> Programado
Programado ── llega fecha y se procesa ──> [Enviado] (enviado = true)
Programado/Desactivado ── eliminar o eliminar tarea ──> [Eliminado]
```

Un recordatorio enviado no vuelve a dispararse. Si el permiso del navegador está denegado, el registro se conserva sin alerta nativa. RF04, RNF15 · CU10 · RN18, RN19, RN21.

### `Notificacion`

```text
[Inicio] ── generar evento ──> No leída (leida = false)
No leída ── marcar como leída ──> Leída (leida = true)
No leída/Leída ── eliminar ──> [Eliminada]
Leída ── limpiar notificaciones leídas ──> [Eliminada]
```

“Marcar todas” aplica la transición No leída → Leída a cada notificación de la cuenta. RF04, RNF15 · CU15 · HU24 · RN16, RN17, RN21.

---

## Decisión sobre entidades sin diagrama de estados

| Entidad | Decisión justificada |
|---|---|
| `insignia` | Catálogo; sus modificaciones son CRUD, no estados del registro. |
| `cuenta_insignia` | Asociación inmutable: existe al desbloquearse y se elimina al revocarse; no posee atributo de estado. |
| `punto` | Evento de ledger append-only; no se edita ni cambia de estado. |
| `preferencia_visual` | `tema`, `modo_oscuro` y `avatar` son valores configurables, no estados de ciclo de vida. |
| `nivel_cuenta` | Catálogo de umbrales; el nivel alcanzado se deriva del total de puntos y no es un estado almacenado en `cuenta`. |

Esta decisión limita los modelos de estado a las entidades que tienen una transición persistida o un ciclo transitorio relevante para un RF/RN, evitando presentar operaciones CRUD comunes como estados UML.
