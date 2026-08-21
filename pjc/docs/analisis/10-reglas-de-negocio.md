# Reglas de Negocio (RN)

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio
**Asignatura:** Ingeniería de Software II — Uniremington
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño
**Docente:** Gloria Amparo Lora Patiño

---

> **Nota:** este documento no existía en el repositorio. Las reglas listadas a continuación ya estaban **implementadas en el código** (`/src/crud/*.js`) y mencionadas de forma dispersa en `DECISIONES.md` y `BITACORA.md`, pero nunca se habían formalizado como un catálogo de Reglas de Negocio independiente y trazable a RF/CU. Se agregó en la revisión de agosto de 2026.

---

## Catálogo de Reglas de Negocio

| ID | Regla | Entidad(es) | RF / CU asociado | Implementación |
|---|---|---|---|---|
| **RN01** | El correo electrónico de una cuenta debe ser único en todo el sistema. | `cuenta` | RF01 / CU01 | `cuentaCrud.js` — validación antes de `create` |
| **RN02** | La contraseña nunca se almacena en texto plano; siempre se guarda cifrada (hash). | `cuenta` | RF01, RNF12 / CU01 | `cuentaCrud.js` |
| **RN03** | Una cuenta debe tener al menos una materia registrada para completar el registro. | `cuenta`, `materia` | RF01 / CU01 | Validado en flujo de registro (CU01, A3) |
| **RN04** | Una tarea no puede crearse con fecha de entrega en el pasado. | `tarea` | RF02 / CU02 | `tareaCrud.js` |
| **RN05** | Al crear una tarea con fecha de entrega, el sistema programa automáticamente un recordatorio 24 horas antes. | `tarea`, `recordatorio` | RF04 / CU02, CU10 | Relación `tarea` → `recordatorio` |
| **RN06** | Si una tarea se elimina, su recordatorio asociado se elimina en cascada. | `tarea`, `recordatorio` | RF04 / CU10 (A3) | `ON DELETE CASCADE` en el modelo |
| **RN07** | Los puntos no se acreditan como un contador editable en `cuenta`; se registran como un **ledger inmutable (append-only)** en la tabla `punto`, con `origen` e `id_origen` para saber de qué evento provienen. | `punto` | RF03, RF07 | `puntoCrud.otorgarPuntos()` — Decisión #02 en `DECISIONES.md` |
| **RN08** | La cantidad de puntos otorgada en un evento debe ser mayor a 0; de lo contrario la operación se rechaza. | `punto` | RF03, RF07 | `puntoCrud.otorgarPuntos()` (`if (cantidad <= 0) return null`) |
| **RN09** | El total de puntos de una cuenta se calcula siempre como `SUM(cantidad)` sobre la tabla `punto`, nunca como un campo precalculado. | `punto` | RF07 | `puntoCrud.calcularTotal()` |
| **RN10** | Un reto ya marcado como `completado` no puede volver a completarse ni volver a otorgar sus puntos de recompensa. | `reto` | RF06 / CU06 (A1) | `retoCrud.completarReto()` (`if (reto.completado) return null`) |
| **RN11** | Una insignia ya obtenida por una cuenta no puede duplicarse; solo se suman los puntos correspondientes sin repetir el desbloqueo. | `insignia`, `cuenta_insignia` | RF05 / CU03 (A1), CU06 (A1) | Restricción de unicidad en `cuenta_insignia (id_cuenta, id_insignia)` |
| **RN12** | Una meta se marca como `cumplida = true` automáticamente cuando `valor_actual >= valor_objetivo`, y una vez cumplida no se vuelve a evaluar. | `meta` | RF15 / CU05 | `metaCrud.actualizarProgresoMeta()` |
| **RN13** | El campo `cumplida` de una meta no se recalcula dinámicamente al leer el registro: se mantiene como estaba en el momento en que se evaluó, para preservar el historial aunque cambie `valor_objetivo` después. | `meta` | RF15 | Excepción de 3FN documentada en `E10-normalizacion-3FN.md` (Excepción 2) |
| **RN14** | Un reporte semanal es un **snapshot histórico**: sus campos (`tareas_completadas`, `horas_estudiadas`, `puntos_obtenidos`) se calculan una vez al generarse y no se recalculan después, aunque se agreguen nuevos datos a `tarea`, `sesion_estudio` o `punto`. | `reporte` | RF08, RF11 / CU05 | `reporteCrud.generarReporteSemanal()` — Excepción 3 en `E10-normalizacion-3FN.md`, justificada por RNF02 |
| **RN15** | El nivel de una cuenta se determina evaluando el total de puntos acumulados contra la tabla de niveles (`nivel_cuenta`), ordenada por `orden`. | `nivel_cuenta`, `punto` | RF07 / CU06 | `nivelCuentaCrud.evaluarNivelCuenta(totalPuntos)` |
| **RN16** | Cada notificación pertenece a exactamente una cuenta y se elimina en cascada si la cuenta se elimina. | `notificacion`, `cuenta` | RF04 / CU10 | `Notificacion.belongsTo(Cuenta)`, `onDelete: 'CASCADE'` |
| **RN17** | Una notificación queda marcada `leida = false` por defecto; solo cambia a `true` cuando el usuario la marca explícitamente o usa "marcar todas como leídas". | `notificacion` | RF04 | `notificacionCrud.marcarNotificacionLeida()`, `marcarTodasLeidas()` |
| **RN18** | Un recordatorio ya `enviado = true` no vuelve a dispararse, para evitar notificaciones duplicadas. | `recordatorio` | RF04, RNF15 / CU10 | Descrito en flujo normal de CU10, paso 6 |
| **RN19** | Si el navegador rechaza el permiso de notificaciones, el recordatorio se guarda igual en base de datos pero no dispara notificación nativa. | `recordatorio` | RF04 / CU10 (A1) | Flujo alternativo A1 de CU10 |

---

## Relación con Requisitos No Funcionales

Varias reglas de negocio existen específicamente para cumplir un RNF, no solo un RF:

- **RN07, RN09** (ledger de puntos) sostienen la trazabilidad histórica exigida implícitamente por los reportes semanales.
- **RN14** (snapshot de reporte) existe explícitamente por **RNF02** (tiempo de respuesta ≤ 2 segundos), ya que recalcular agregados en cada lectura violaría ese requisito.
- **RN02** (contraseña cifrada) cumple **RNF12** (seguridad de credenciales).
- **RN06, RN16** (eliminación en cascada) sostienen la integridad referencial exigida implícitamente por el diseño relacional (E9, E11).

---

## Pendiente de verificación con el equipo

Esta lista se construyó a partir del código y la documentación existente. Antes de entregar, conviene que ambos autores revisen si:

1. Faltan reglas de negocio que existan en el código pero no se detectaron aquí (por ejemplo, validaciones específicas dentro de `sesionEstudioCrud.js` sobre duración mínima/máxima del Pomodoro).
2. Alguna regla listada ya no aplica porque cambió la implementación después de esta revisión (agosto 2026).
