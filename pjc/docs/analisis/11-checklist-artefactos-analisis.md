# Checklist de Artefactos — Fase de Análisis

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software III — Uniremington  
**Fuente de validación:** hoja `ANÁLISIS` del archivo `Ingenieria de Software 3.xlsx`  
**Fecha de revisión:** 12 de septiembre de 2026  

---

## Propósito

Este documento registra la revisión de los ocho puntos del checklist de Análisis entregado por la docente. La validación se realizó sobre los artefactos existentes en `docs/analisis` y las matrices relacionadas de `docs/trazabilidad`. El objetivo es actualizar y corregir lo construido, sin reemplazar los documentos que ya cumplen su función.

### Criterios de estado

- **Completo:** el artefacto existe, es consistente con la arquitectura vigente y cumple la condición de trazabilidad del checklist.
- **Parcial:** el artefacto existe, pero presenta vacíos de contenido, trazabilidad o consistencia.
- **Faltante:** no existe un artefacto que permita demostrar el cumplimiento.

---

## Resultado general

| N.° | Artefacto o actividad | Estado | Hallazgo principal |
|---:|---|---|---|
| 1 | Objetivos específicos | **Completo** | OE01–OE05 están identificados y relacionados con RF. El antiguo OE06 se trasladó correctamente a Lineamiento Metodológico. |
| 2 | HU del CRUD por entidad y RF por acción de ventana | **Completo** | HU01–HU28 tienen criterios de aceptación; las 13 entidades cuentan con cobertura CRUD o excepción justificada y existe inventario acción → RF → HU → CU. |
| 3 | Casos de uso general y específicos | **Completo** | CUG01 delimita el sistema; CU01–CU16 están documentados y el modelo de actores fue normalizado. |
| 4 | Requisitos de interfaz externa | **Completo** | M1 fue corregida y la ERS define RIE01–RIE05 con entradas, salidas, requisitos y criterios de aceptación. |
| 5 | Metodología de trabajo | **Completo** | Está definida y justificada como desarrollo incremental por fases y ya referencia las matrices M1–M14. |
| 6 | Tipo de investigación | **Completo** | Se define y justifica un enfoque mixto y una investigación aplicada, con relación a las técnicas de elicitación. |
| 7 | HU, RF, RNF y RN actualizados | **Completo** | La ERS consolida RF01–RF15 y RNF01–RNF15; los RNF incluyen ISO 25010, métrica y prueba; RN01–RN21 están validadas. |
| 8 | Matriz RF ↔ HU ↔ CU | **Completo** | Existe una matriz única y bidireccional OE ↔ RF ↔ HU ↔ CU ↔ RN ↔ datos ↔ pantalla/acción. |

**Conclusión:** los 8 puntos del checklist cuentan con evidencia documental y trazabilidad. La fase de Análisis queda completa a nivel de artefactos del repositorio.

---

## 1. Revisión de objetivos específicos

### Evidencia existente

El archivo `05-objetivos-especificos.md` contiene cinco objetivos específicos del producto relacionados con tareas, Pomodoro, gamificación, tablero y personalización. La aplicación de principios de ingeniería de software quedó clasificada como lineamiento metodológico.

### Validación

| Objetivo | Cobertura funcional identificable | Estado |
|---|---|---|
| OE01 — Gestión de tareas, agenda y recordatorios | RF01, RF02, RF03, RF04 y RF09 | Trazado en el artefacto. |
| OE02 — Pomodoro y registro de sesiones | RF10, RF11 y RF12 | Trazado en el artefacto. |
| OE03 — Puntos, insignias y retos | RF03, RF05, RF06 y RF07 | Trazado en el artefacto. |
| OE04 — Tablero de progreso | RF08 y RF11 | Trazado en el artefacto. |
| OE05 — Configuración y personalización | RF13 y RF14; RNF04, RNF06 y RNF07 | Trazado en el artefacto y corregido para usar SQLite. |
| Lineamiento metodológico — Aplicación de ingeniería de software | No requiere RF funcional | Trasladado fuera de los objetivos específicos y verificable mediante los artefactos del proyecto. |

### Ajustes realizados

1. Se incorporaron los identificadores OE01–OE05 en la redacción principal.
2. El antiguo OE06 se trasladó a Lineamiento Metodológico porque no representa una capacidad del producto.
3. Todos los objetivos específicos vigentes tienen uno o más RF asociados.

---

## 2. HU del CRUD por entidad y RF por acción de ventana

### Evidencia existente

`07-casos-de-uso.md` contiene el índice HU01–HU28. `13-historias-usuario-criterios-aceptacion.md` documenta sus criterios y cobertura CRUD. `14-matriz-trazabilidad-analisis.md` relaciona cada acción con RF, HU y CU.

### Cobertura por entidad

| Entidad aprobada | HU relacionada | Cobertura actual |
|---|---|---|
| `cuenta` | HU01, HU20, HU27 | Crear, consultar, actualizar y desactivar. |
| `materia` | HU01, HU16 | Crear, consultar, actualizar y eliminar. |
| `tarea` | HU02, HU03, HU09, HU19 | Crear, consultar, actualizar, completar, filtrar y eliminar. |
| `sesion_estudio` | HU10, HU21 | Crear, consultar, actualizar y eliminar. |
| `insignia` | HU05, HU22 | Consultar/desbloquear y CRUD administrativo del catálogo. |
| `cuenta_insignia` | HU05, HU26 | Desbloquear, consultar y revocar; actualizar no aplica. |
| `punto` | HU03, HU07, HU26 | Otorgar, consultar y corregir; actualizar no aplica por RN07. |
| `reto` | HU06, HU18 | Crear, consultar, actualizar, completar y eliminar. |
| `meta` | HU15, HU17 | Crear, consultar, actualizar, evaluar y eliminar. |
| `recordatorio` | HU04, HU25 | Crear automáticamente, consultar, activar/desactivar y eliminar. |
| `preferencia_visual` | HU01, HU13 | Crear automáticamente, consultar, actualizar y restablecer. |
| `nivel_cuenta` | HU07, HU23 | Consultar/evaluar y CRUD administrativo del catálogo. |
| `notificacion` | HU24 | Crear automáticamente, consultar, marcar como leída y eliminar. |

### Trazabilidad de interfaz

M12 demuestra pantalla → CU → RF y `14-matriz-trazabilidad-analisis.md` completa el nivel acción/botón → RF → HU → CU. En tareas aparecen por separado `Crear`, `Consultar`, `Editar`, `Completar`, `Eliminar`, `Filtrar` y `Buscar`.

### Ajustes realizados

1. Se conservaron HU01–HU19 y se agregaron HU20–HU28 para los vacíos reales.
2. Se añadieron criterios de aceptación verificables.
3. Se diferenciaron acciones del Estudiante, del Administrador y automáticas del Sistema.
4. Se justificaron las operaciones no aplicables por integridad.
5. Se creó el inventario pantalla → acción → RF → HU → CU.

---

## 3. Casos de uso general y específicos

### Evidencia existente

Existen CUG01 y CU01–CU16 con actores, precondición, flujo normal, flujos alternativos, postcondición y trazabilidad. Todos tienen al menos un RF asociado.

### Ajustes realizados

- CUG01 distingue el caso de uso general de los casos específicos.
- CU01, CU02, CU08, CU09 y CU10 ya fueron corregidos para describir persistencia en SQLite mediante el servidor.
- `Usuario registrado` se definió como estado del Estudiante y la accesibilidad como condición de calidad.
- Administrador y Revisor institucional cuentan con CU explícitos; Colaborador fue retirado por falta de sustento.
- Las HU cuentan con criterios de aceptación y referencia a CU.

La estructura completa se mantiene en `07-casos-de-uso.md` y su trazabilidad consolidada en `14-matriz-trazabilidad-analisis.md`.

---

## 4. Requisitos de interfaz externa

### Evidencia existente

M1 relaciona entidades externas, RF, CU y participación en el Diagrama de Contexto Arquitectónico.

### Ajustes realizados

- Se retiró `localStorage` de M1 y de la arquitectura vigente de Análisis.
- Notifications API se documentó como interfaz RIE04 con flujo permitido/denegado.
- Los actores vigentes tienen cobertura RF ↔ CU.
- RIE01–RIE05 formalizan interfaz de usuario, comunicación, persistencia, notificaciones y exportación.

La evidencia se encuentra en M1 y en la sección 6 de `12-especificacion-requisitos-software.md`.

---

## 5. Metodología de trabajo

### Evidencia existente

`08-metodologia.md` define desarrollo incremental por fases y lo justifica mediante el tamaño del equipo, el esquema académico, la bitácora y los entregables E1–E17.

### Estado

El punto está cubierto. La referencia a las matrices ya fue actualizada de M1–M13 a M1–M14; debe mantenerse la evidencia de iteraciones en `BITACORA.md`.

---

## 6. Tipo de investigación

### Evidencia existente

`09-tipo-investigacion.md` clasifica el proyecto con enfoque mixto —cuantitativo y cualitativo— y finalidad aplicada. La justificación se relaciona con encuesta, entrevistas, observación y benchmarking documentados en `06-tecnicas-de-elicitacion.md`.

### Estado

El punto está cubierto documentalmente. Para la entrega en Word deben anexarse o referenciarse los instrumentos y evidencias de aplicación de encuesta y entrevista, si están disponibles.

---

## 7. Actualización de HU, RF, RNF y RN

### Historias de usuario

- Existen HU01–HU28.
- Todas conservan el formato “Como…, quiero…, para…”.
- Todas tienen criterios de aceptación estructurados en `13-historias-usuario-criterios-aceptacion.md`.
- Las 13 entidades y sus acciones CRUD están cubiertas o tienen una excepción de integridad justificada.

### Requisitos funcionales

- RF01–RF15 están consolidados en `12-especificacion-requisitos-software.md`.
- Cada RF define descripción verificable, actor, entradas, resultado, origen, prioridad, HU/CU y RN.

### Requisitos no funcionales

- RNF01–RNF15 forman un catálogo completo y controlado dentro de la ERS.
- Cada RNF se relaciona con una característica de ISO/IEC 25010.
- RNF04 define persistencia en SQLite.
- Todos incluyen métrica, umbral y método de validación.

### Reglas de negocio

- `10-reglas-de-negocio.md` cataloga RN01–RN21 y relaciona cada regla con entidades y RF/CU.
- Las HU y los RF indican las RN aplicables.
- El catálogo incluye estado de validación y control para cambios futuros.

### Evidencia de cierre

1. ERS: `12-especificacion-requisitos-software.md`.
2. HU y criterios: `13-historias-usuario-criterios-aceptacion.md`.
3. RN: `10-reglas-de-negocio.md`.
4. Trazabilidad: `14-matriz-trazabilidad-analisis.md`.

---

## 8. Matriz de trazabilidad RF ↔ HU ↔ CU

### Cobertura consolidada

`14-matriz-trazabilidad-analisis.md` permite revisar RF → HU → CU y la relación inversa. También conecta objetivos, reglas de negocio, entidades/atributos y acciones de pantalla. M2 y M5 fueron actualizadas para incluir `cuenta_insignia`, `nivel_cuenta` y `notificacion`, y RNF04 ya corresponde a SQLite.

### Estructura mínima requerida

| OE | RF | HU | Criterio de aceptación | CU | RN | Entidad/atributo | Pantalla/acción |
|---|---|---|---|---|---|---|---|
| OE identificable | RF aprobado | HU de origen | Resultado verificable | CU que realiza el flujo | Regla aplicable | Nombre exacto del modelo aprobado | Pantalla y botón/acción |

La matriz debe permitir comprobar que no exista un objetivo, RF, HU, CU, entidad o acción de pantalla sin origen y sin destino trazable.

---

## Estado de cierre

Los ajustes documentales requeridos por la hoja ANÁLISIS fueron ejecutados. Como actividad de entrega, queda integrar estos artefactos al documento Word maestro cuando el equipo lo incorpore al repositorio y anexar las evidencias originales de encuesta/entrevista si la docente las solicita.

---

## Confirmaciones administrativas pendientes

1. Identificar el documento Word maestro; no hay archivos `.docx`, `.doc` ni `.odt` dentro del repositorio actual.
2. Adjuntar o referenciar los instrumentos originales de encuesta y entrevista, si forman parte de la entrega evaluable.
