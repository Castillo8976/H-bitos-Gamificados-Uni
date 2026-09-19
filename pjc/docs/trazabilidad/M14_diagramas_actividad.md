# Tabla 14 — Diagramas de Actividad → CU, CRUD, Reglas de Negocio

**Proyecto:** Plataforma Web Gamificada
**Sección:** 9.14 Artefactos de Trazabilidad (agregada agosto 2026)

> Este documento relaciona los siete flujos de actividad principales con las entidades aprobadas en E7, sus casos de uso, requisitos y reglas de negocio. La existencia de Act-01 a Act-07 no implica que la cobertura de diagramas de secuencia por CRUD esté completa; esa brecha se registra por separado al final del documento.

---

## Diagramas de actividad completados

| Diagrama | Entidades E7 | CU / CRUD cubierto | RF / RNF | RN | Archivo editable |
|---|---|---|---|---|---|
| **Act-01** Completar tarea y recibir recompensa | `tarea`, `punto`, `insignia`, `cuenta_insignia`, `reto`, `nivel_cuenta` | CU03 / `tareaCrud`, `puntoCrud`, `insigniaCrud`, `cuentaInsigniaCrud`, `retoCrud`, `nivelCuentaCrud` | RF03, RF05, RF06, RF07, RF11 | RN07–RN11, RN15, RN21 | `docs/diseno/drawio/08_Actividad_Act01_CompletarTarea.drawio` |
| **Act-02** Registrar cuenta | `cuenta`, `materia` | CU01 / `cuentaCrud`, `materiaCrud` | RF01, RNF12 | RN01–RN03, RN21 | `docs/diseno/drawio/Act02_RegistrarCuenta.drawio` |
| **Act-03** Gestionar tarea (crear/editar/eliminar) | `tarea`, `materia`, `recordatorio` | CU02, CU07 / `tareaCrud`, `recordatorioCrud` | RF02, RF04, RF09 | RN04–RN06, RN21 | `docs/diseno/drawio/Act03_GestionarTarea.drawio` |
| **Act-04** Sesión de estudio Pomodoro | `sesion_estudio`, `tarea` | CU04 / `sesionEstudioCrud` | RF10, RF12 | RN20, RN21 | `docs/diseno/drawio/09_Actividad_Act04_SesionPomodoro.drawio` |
| **Act-05** Evaluar progreso de reto y meta | `reto`, `meta`, `punto`, `nivel_cuenta` | CU05, CU06 / `retoCrud`, `metaCrud`, `nivelCuentaCrud` | RF06, RF07, RF15 | RN10, RN12, RN13, RN15, RN21 | `docs/diseno/drawio/Act05_RetoMeta.drawio` |
| **Act-06** Disparar recordatorio y notificación | `recordatorio`, `notificacion`, `cuenta`, `tarea` | CU10, CU15 / `recordatorioCrud`, `notificacionCrud` | RF04, RNF15 | RN16–RN19, RN21 | `docs/diseno/drawio/Act06_RecordatorioNotificacion.drawio` |
| **Act-07** Personalizar configuración visual | `preferencia_visual`, `cuenta` | CU08 / `preferenciaVisualCrud` | RF13, RNF04 | RN21 | `docs/diseno/drawio/Act07_PreferenciaVisual.drawio` |

> **Corrección (checklist DISEÑO, ítem 6):** los 7 diagramas de actividad (Act-01 a Act-07) existen como archivos `.drawio` en `docs/diseno/drawio/`. Los SVG de Act-01 y Act-04 se conservan como exportaciones históricas; las fuentes editables vigentes son `08_Actividad_Act01_CompletarTarea.drawio` y `09_Actividad_Act04_SesionPomodoro.drawio`.

Act-01 se eligió primero como plantilla porque es el flujo con más ramas de decisión del sistema (insignia y reto se evalúan en cadena). Act-02 a Act-07 complementan los flujos principales, pero no se usa su existencia para afirmar que todos los diagramas de secuencia por CRUD estén terminados.

> **Nota (agosto 2026):** `ActividadCompletarTarea.svg` (Act-01) fue actualizado: el paso final ya no dice "Actualizar reporte semanal", ahora dice "Tablero de Avance se actualiza (tiempo real)", reflejando que el Tablero se calcula al momento de la consulta sin ninguna acción explícita en este flujo.



## Diagramas de secuencia — cobertura por CRUD (complemento a M10)

M10 ya cubre Seq-01 a Seq-05 mapeados a CU02–CU06. Para cumplir "por cada CRUD" de forma más literal, faltan diagramas de secuencia específicos para:

- `cuentaCrud` (registro/login) — actualmente cubierto solo indirectamente por Seq-01.
- `preferenciaVisualCrud` (CU08) — sin diagrama de secuencia propio.
- `notificacionCrud` / `recordatorioCrud` (CU10) — sin diagrama de secuencia propio.
- `nivelCuentaCrud` — entidad agregada en esta revisión (ver M9), sin diagrama de secuencia.

**Recomendación:** priorizar Seq-06 (`preferenciaVisualCrud`) y Seq-07 (`recordatorioCrud`/`notificacionCrud`) porque son los dos CRUD con más lógica condicional que aún no tienen ningún diagrama de comportamiento asociado.
