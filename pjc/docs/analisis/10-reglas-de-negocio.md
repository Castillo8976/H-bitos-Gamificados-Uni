# Reglas de Negocio (RN)

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio
**Asignatura:** Ingeniería de Software III — Uniremington
**Autores:** Juan David Castillo Mena · Alejandro Cardona Jaramillo
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
| **RN14** | El Tablero de Avance Personal **no persiste** un snapshot: `tareas_completadas`, `horas_estudiadas` y `puntos_obtenidos` de cualquier semana se calculan en el momento de la consulta con `COUNT`/`SUM` sobre `tarea`, `sesion_estudio` y `punto`. | `tarea`, `sesion_estudio`, `punto` | RF08, RF11 / CU05 | Reemplaza a `reporteCrud.generarReporteSemanal()`, eliminado en agosto 2026 |
| **RN15** | El nivel de una cuenta se determina evaluando el total de puntos acumulados contra la tabla de niveles (`nivel_cuenta`), ordenada por `orden`. | `nivel_cuenta`, `punto` | RF07 / CU06 | `nivelCuentaCrud.evaluarNivelCuenta(totalPuntos)` |
| **RN16** | Cada notificación pertenece a exactamente una cuenta y se elimina en cascada si la cuenta se elimina. | `notificacion`, `cuenta` | RF04 / CU10 | `Notificacion.belongsTo(Cuenta)`, `onDelete: 'CASCADE'` |
| **RN17** | Una notificación queda marcada `leida = false` por defecto; solo cambia a `true` cuando el usuario la marca explícitamente o usa "marcar todas como leídas". | `notificacion` | RF04 | `notificacionCrud.marcarNotificacionLeida()`, `marcarTodasLeidas()` |
| **RN18** | Un recordatorio ya `enviado = true` no vuelve a dispararse, para evitar notificaciones duplicadas. | `recordatorio` | RF04, RNF15 / CU10 | Descrito en flujo normal de CU10, paso 6 |
| **RN19** | Si el navegador rechaza el permiso de notificaciones, el recordatorio se guarda igual en base de datos pero no dispara notificación nativa. | `recordatorio` | RF04 / CU10 (A1) | Flujo alternativo A1 de CU10 |
| **RN20** | Una sesión de estudio debe registrar una duración entera mayor que cero; puede asociarse a una tarea propia o permanecer sin tarea para representar estudio libre. | `sesion_estudio`, `tarea` | RF10 / CU04, CU12 | `sesionEstudioCrud.crearSesionEstudio()`, `actualizarSesionEstudio()` |
| **RN21** | El estudiante solo puede consultar o modificar registros asociados a su propia cuenta; las operaciones globales requieren permisos administrativos y la consulta institucional es de solo lectura. | Todas las entidades dependientes de `cuenta` | RF01–RF15 / CU01–CU16 | Validación de propietario y rol antes de cada operación |
| **RN22** | Completar una tarea acredita 10 puntos y registrar una sesión válida acredita 5; cada evento se identifica por cuenta, origen e `id_origen`. | `tarea`, `sesion_estudio`, `punto` | RF03, RF07, RF10 / CU03, CU04 | `GamificacionService` · CRF-003 |
| **RN23** | El mismo evento no puede acreditarse dos veces; tarea, recompensa, progreso, insignias y notificaciones se confirman o revierten dentro de una transacción. | `tarea`, `punto`, `reto`, `meta`, `cuenta_insignia`, `notificacion` | RF03, RF05–RF07, RF15 / CU03, CU06 | índice `uq_punto_evento` y transacción `IMMEDIATE` |
| **RN24** | Una condición automática de reto usa `metrica:objetivo`: `tareas`, `sesiones`, `pomodoros` o `minutos`. Una sesión Pomodoro suma simultáneamente una sesión, un Pomodoro y sus minutos; una sesión libre suma una sesión y sus minutos. | `reto`, `meta`, `sesion_estudio` | RF06, RF10, RF15 / CU04, CU06 | `GamificacionService.actualizarRetos()` · `actualizarMetas()` · CRF-003 |
| **RN25** | Los indicadores institucionales son agregados globales de estudiantes activos y no exponen identificadores, nombres, correos ni filas individuales. | `cuenta`, `tarea`, `sesion_estudio`, `punto` | RF11 / CU16 | `EstadisticasService.obtenerIndicadoresInstitucionales()` |
| **RN26** *(implementada en el código local; pendiente de revisión docente, Decisión #10)* | La materia de un estudiante debe seleccionarse del catálogo institucional vigente (`catalogo_materia` con `activo` = verdadero); no se admite texto libre. Una asignatura del catálogo con materias asociadas no se elimina, solo se desactiva. | `catalogo_materia`, `materia` | RF01 / CU01, CU13 / HU01, HU16, HU29 | Validación de existencia y estado `activo` del catálogo antes de crear o cambiar una `materia`; restricción de borrado (RESTRICT) en la FK. Implementado en `f62c5e5` (D-1) y `3eb2b71` (D-2): `catalogoMateriaService.obtenerActiva`, registro y `materiaService` dentro de una transacción |
| **RN27** *(implementada en el código local; pendiente de revisión docente, Decisión #08)* | El Estudiante puede desactivar solo su propia cuenta; el Administrador puede desactivar o reactivar cualquier cuenta. Una cuenta desactivada no puede iniciar sesión, sus datos se conservan y solo el Administrador puede reactivarla. | `cuenta` | RF01 / CU11, CU13 / HU27, HU30 | `activa = false` impide el acceso y no elimina registros; autorización por propietario o rol. Implementado en `28b601a`: `cuentaCrud.desactivarCuenta` incrementa `version_sesion` y `authenticateRequest` rechaza los JWT anteriores |
| **RN28** *(implementada en el código local; pendiente de revisión docente, Decisión #09)* | El Estudiante propietario y el Administrador pueden activar, desactivar y reactivar un reto. El progreso automático se acumula únicamente mientras el reto está activo; la desactivación no revoca puntos ni libera la semana reservada por UNIQUE(`id_cuenta`, `semana`), y la reactivación no vuelve a otorgar una recompensa ya acreditada. Los retos se crean manualmente, no por generación semanal automática. | `reto`, `punto` | RF06 / CU06 / HU06, HU18 | Campo `reto.activo` y control de progreso por estado; el registro de puntos conserva idempotencia (RN10, RN23). Implementado en `b113445`: `PATCH /api/retos/:id/estado`, `retoCrud.activarReto`/`desactivarReto` y filtro `activo` en `GamificacionService` |

---

## Relación con Requisitos No Funcionales

Varias reglas de negocio existen específicamente para cumplir un RNF, no solo un RF:

- **RN07, RN09** (ledger de puntos) sostienen la trazabilidad histórica que necesita el Tablero de Avance Personal para calcular totales por semana.
- **RN14** (cálculo en tiempo real del tablero) reemplaza al antiguo snapshot de `reporte`. El equipo aceptó el costo de la consulta agregada en cada carga a cambio de eliminar la redundancia de datos; si en el futuro esto violara RNF02 (respuesta ≤ 2 segundos) con muchos usuarios, sería el momento de reconsiderar un caché o snapshot.
- **RN02** (contraseña cifrada) cumple **RNF12** (seguridad de credenciales).
- **RN06, RN16** (eliminación en cascada) sostienen la integridad referencial exigida implícitamente por el diseño relacional (E9, E11).

---

## Estado de validación

El catálogo RN01–RN28 documenta las restricciones identificadas en los requisitos, casos de uso, modelos y operaciones vigentes. RN22–RN25 describen el flujo transaccional, la idempotencia, las condiciones automáticas y la privacidad institucional implementadas bajo CRF-003. RN26–RN28 están implementadas en el código local (Fases 4 a 6) como decisiones del equipo #08–#10, pendientes de revisión docente; la base principal aún no tiene aplicadas sus migraciones. Su presencia en este catálogo no acredita cumplimiento de todas las rutas: los pendientes se detallan en M17. Toda modificación futura de código o alcance deberá revisar este catálogo y actualizar la matriz de trazabilidad antes de aprobarse.

> **RN26 (22 de septiembre de 2026):** regla derivada de la observación de la docente sobre la materia inicial. **Actualización (24 de octubre de 2026):** implementada en el código local con `catalogo_materia` (D-1, `f62c5e5`) y la selección obligatoria en el registro y en «Nueva materia» (D-2, `3eb2b71`), por Decisión #10 del equipo. Pendiente: revisión docente, migración de la base principal y carga inicial de asignaturas reales; las seis materias anteriores siguen sin asociación (M2 no ejecutada).
>
> **RN27–RN28 (19 de octubre de 2026):** reglas aprobadas para la línea documental. **Actualización (24 de octubre de 2026):** RN27 implementada en `28b601a` (Decisión #08) y RN28 en `b113445` (Decisión #09), ambas pendientes de revisión docente. La decisión sobre proteger a la última cuenta Administradora activa sigue abierta.
