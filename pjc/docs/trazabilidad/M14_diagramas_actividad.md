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

## Matriz de cobertura CRUD de actividades

Los siete diagramas agrupan entidades relacionadas en flujos funcionales. La siguiente matriz demuestra la cobertura CRUD sin asumir operaciones que las reglas de negocio declaran como no aplicables.

| Entidad E7 | Crear | Consultar | Actualizar / acción equivalente | Eliminar / acción equivalente | Actividad que lo sustenta | HU |
|---|---|---|---|---|---|---|
| `cuenta` | Registrar | Perfil / administración | Actualizar perfil | Desactivar | Act-02 | HU01, HU20, HU27 |
| `materia` | Sí | Sí | Sí | Sí | Act-02, Act-03 | HU01, HU16 |
| `tarea` | Sí | Sí | Editar / completar | Sí | Act-01, Act-03 | HU02, HU03, HU09, HU19 |
| `sesion_estudio` | Sí | Sí | Sí | Sí | Act-04 | HU10, HU21 |
| `insignia` | Administración | Sí | Administración | Administración | Act-01, Act-05 | HU05, HU22 |
| `cuenta_insignia` | Desbloquear | Sí | No aplica | Revocar | Act-01 | HU05, HU26 |
| `punto` | Otorgar | Sí / calcular | No aplica | Corrección autorizada | Act-01, Act-05 | HU03, HU07, HU26 |
| `reto` | Sí | Sí | Progreso / completar / editar | Sí | Act-05 | HU06, HU18 |
| `meta` | Sí | Sí | Progreso / editar | Sí | Act-05 | HU15, HU17 |
| `recordatorio` | Automática / manual | Sí | Activar / desactivar / marcar enviado | Sí | Act-03, Act-06 | HU04, HU25 |
| `preferencia_visual` | Automática | Sí | Guardar / restablecer | En cascada | Act-07 | HU01, HU13 |
| `nivel_cuenta` | Administración | Sí / evaluar | Administración | Administración | Act-01, Act-05 | HU07, HU23 |
| `notificacion` | Automática | Sí | Marcar leída | Sí / limpiar leídas | Act-06 | HU24 |

Las acciones especiales mantienen la semántica aprobada en las HU: `cuenta_insignia` se desbloquea o revoca; `punto` es un ledger sin edición; `preferencia_visual` se crea automáticamente; `notificacion` se genera por eventos; y la cuenta se desactiva para conservar el historial.



## Diagramas de secuencia — cobertura por CRUD (complemento a M10)

M10 conserva Seq-01 a Seq-05 como diagramas visuales de los flujos críticos y agrega Seq-CRUD-01 a Seq-CRUD-13 como especificaciones textuales UML de la cobertura por entidad. Estas especificaciones incluyen participantes, mensajes, métodos reales, alternativas y excepciones CRUD; por tanto, `cuenta`, `materia`, `tarea`, `sesion_estudio`, `insignia`, `cuenta_insignia`, `punto`, `reto`, `meta`, `recordatorio`, `preferencia_visual`, `nivel_cuenta` y `notificacion` quedan trazadas sin modificar los archivos Draw.io existentes.
