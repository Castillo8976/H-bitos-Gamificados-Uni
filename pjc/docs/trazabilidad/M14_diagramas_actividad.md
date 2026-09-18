# Tabla 14 — Diagramas de Actividad → CU, CRUD, Reglas de Negocio

**Proyecto:** Plataforma Web Gamificada
**Sección:** 9.14 Artefactos de Trazabilidad (agregada agosto 2026)

> Este documento no existía en el repositorio. El checklist de revisión pedía "Diagrama de actividades y diagramas de secuencia por cada CRUD", pero solo había diagramas de secuencia (M10), y estaban mapeados a Casos de Uso generales, no a cada CRUD específico. Se agregó un diagrama de actividades por cada CRUD principal (Act-01 a Act-07).

---

## Diagramas de actividad completados

| Diagrama | CU / CRUD cubierto | Archivo | RN involucradas |
|---|---|---|---|
| **Act-01** Completar tarea y recibir recompensa | CU03 / `tareaCrud`, `puntoCrud`, `insigniaCrud`, `retoCrud` | `docs/diseno/imagenes/ActividadCompletarTarea.svg` ✅ existe | RN07, RN08, RN10, RN11 |
| **Act-02** Registrar cuenta | CU01 / `cuentaCrud` | `docs/diseno/drawio/Act02_RegistrarCuenta.drawio` ✅ existe | RN01, RN02, RN03 |
| **Act-03** Gestionar tarea (crear/editar/eliminar) | CU02, CU07, HU19 / `tareaCrud` | `docs/diseno/drawio/Act03_GestionarTarea.drawio` ✅ existe | RN04, RN05, RN06 |
| **Act-04** Sesión de estudio Pomodoro | CU04 / `sesionEstudioCrud` | `docs/diseno/imagenes/Act04_SesionEstudio.svg` ✅ existe | — (regla de duración pendiente de confirmar, ver M9) |
| **Act-05** Evaluar progreso de reto y meta | CU06 / `retoCrud`, `metaCrud` | `docs/diseno/drawio/Act05_RetoMeta.drawio` ✅ existe | RN10, RN12, RN13 |
| **Act-06** Disparar recordatorio y notificación | CU10 / `recordatorioCrud`, `notificacionCrud` | `docs/diseno/drawio/Act06_RecordatorioNotificacion.drawio` ✅ existe | RN16, RN17, RN18, RN19 |
| **Act-07** Personalizar configuración visual | CU08 / `preferenciaVisualCrud` | `docs/diseno/drawio/Act07_PreferenciaVisual.drawio` ✅ existe | RF13, RNF04 |

> **Corrección (checklist DISEÑO, ítem 6):** los 7 diagramas de actividad (Act-01 a Act-07) ya existen como archivos `.drawio` en `docs/diseno/drawio/`. Hasta septiembre de 2026 solo Act-01 y Act-04 existían (como SVG en `docs/diseno/imagenes/`); los cinco restantes se dibujaron después con el mismo estilo, usando las reglas de negocio de `10-reglas-de-negocio.md`.

Act-01 se eligió primero como plantilla porque es el flujo con más ramas de decisión del sistema (insignia, reto se evalúan en cadena). Los seis restantes (Act-02 a Act-07) cubren cada CRUD principal del sistema, cerrando el punto "diagrama de actividades por cada CRUD" del checklist original.

> **Nota (agosto 2026):** `ActividadCompletarTarea.svg` (Act-01) fue actualizado: el paso final ya no dice "Actualizar reporte semanal", ahora dice "Tablero de Avance se actualiza (tiempo real)", reflejando que el Tablero se calcula al momento de la consulta sin ninguna acción explícita en este flujo.



## Diagramas de secuencia — cobertura por CRUD (complemento a M10)

M10 ya cubre Seq-01 a Seq-05 mapeados a CU02–CU06. Para cumplir "por cada CRUD" de forma más literal, faltan diagramas de secuencia específicos para:

- `cuentaCrud` (registro/login) — actualmente cubierto solo indirectamente por Seq-01.
- `preferenciaVisualCrud` (CU08) — sin diagrama de secuencia propio.
- `notificacionCrud` / `recordatorioCrud` (CU10) — sin diagrama de secuencia propio.
- `nivelCuentaCrud` — entidad agregada en esta revisión (ver M9), sin diagrama de secuencia.

**Recomendación:** priorizar Seq-06 (`preferenciaVisualCrud`) y Seq-07 (`recordatorioCrud`/`notificacionCrud`) porque son los dos CRUD con más lógica condicional que aún no tienen ningún diagrama de comportamiento asociado.
