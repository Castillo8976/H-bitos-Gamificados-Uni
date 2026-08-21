# Tabla 14 — Diagramas de Actividad → CU, CRUD, Reglas de Negocio

**Proyecto:** Plataforma Web Gamificada
**Sección:** 9.14 Artefactos de Trazabilidad (agregada agosto 2026)

> Este documento no existía en el repositorio. El checklist de revisión pedía "Diagrama de actividades y diagramas de secuencia por cada CRUD", pero solo había diagramas de secuencia (M10), y estaban mapeados a Casos de Uso generales, no a cada CRUD específico. Se agregó un primer diagrama de actividades completo como modelo, y se deja el resto planificado para que el equipo los complete con la misma estructura.

---

## Diagrama de actividades completado

| Diagrama | CU / CRUD cubierto | Archivo | RN involucradas |
|---|---|---|---|
| **Act-01** Completar tarea y recibir recompensa | CU03 / `tareaCrud`, `puntoCrud`, `insigniaCrud`, `retoCrud`, `reporteCrud` | `docs/diseno/imagenes/ActividadCompletarTarea.svg` | RN07, RN08, RN10, RN11, RN14 |

Este diagrama se eligió primero porque es el flujo con más ramas de decisión del sistema (insignia, reto y reporte se evalúan en cadena), por lo que sirve como plantilla de referencia para los demás.

---

## Diagramas de actividad pendientes por CRUD (plantilla para completar)

El equipo debe generar un diagrama de actividades por cada CRUD principal, siguiendo la misma estructura de Act-01 (inicio → validación → decisión → ramas → fin). A continuación el flujo textual ya redactado para que solo falte dibujarlo en la herramienta de diagramación:

| Diagrama sugerido | CRUD | Flujo base (ya documentado en 07-casos-de-uso.md) |
|---|---|---|
| Act-02 | `cuentaCrud` (CU01) | Ingresar datos → validar correo único (RN01) → validar contraseña ≥ 6 caracteres → ¿tiene al menos 1 materia? (RN03) → cifrar contraseña (RN02) → crear preferencia visual default → fin |
| Act-03 | `tareaCrud` (CU02, CU07) | Ingresar datos → validar fecha futura (RN04) → validar nombre no vacío → guardar → programar recordatorio (RN05) → [alternativo: editar / eliminar → elimina recordatorio en cascada (RN06)] |
| Act-04 | `sesionEstudioCrud` (CU04) | Iniciar cronómetro → ¿modo Pomodoro o libre? → ciclo focus/descanso → ¿pausó el usuario? → guardar sesión con duración → actualizar reporte |
| Act-05 | `retoCrud` / `metaCrud` (CU06) | Generar reto semanal → evaluar progreso tras cada acción → ¿progreso ≥ condición? → completar reto (RN10) / actualizar meta (RN12, RN13) |
| Act-06 | `recordatorioCrud` / `notificacionCrud` (CU10) | Programar recordatorio 24h antes → ¿permiso de notificaciones concedido? (alternativo A1) → disparar notificación → marcar enviado (RN18) |
| Act-07 | `preferenciaVisualCrud` (CU08) | Cargar preferencias → seleccionar tema/modo oscuro → preview inmediato → guardar cambios / restaurar si se cierra sin guardar |

---

## Diagramas de secuencia — cobertura por CRUD (complemento a M10)

M10 ya cubre Seq-01 a Seq-05 mapeados a CU02–CU06. Para cumplir "por cada CRUD" de forma más literal, faltan diagramas de secuencia específicos para:

- `cuentaCrud` (registro/login) — actualmente cubierto solo indirectamente por Seq-01.
- `preferenciaVisualCrud` (CU08) — sin diagrama de secuencia propio.
- `notificacionCrud` / `recordatorioCrud` (CU10) — sin diagrama de secuencia propio.
- `nivelCuentaCrud` — entidad agregada en esta revisión (ver M9), sin diagrama de secuencia.

**Recomendación:** priorizar Seq-06 (`preferenciaVisualCrud`) y Seq-07 (`recordatorioCrud`/`notificacionCrud`) porque son los dos CRUD con más lógica condicional que aún no tienen ningún diagrama de comportamiento asociado.
