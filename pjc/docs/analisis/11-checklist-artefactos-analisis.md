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
| 1 | Objetivos específicos | **Parcial** | OE01–OE05 ya tienen relación explícita con RF. OE06 es un objetivo de proceso y debe confirmarse si se conserva como objetivo específico o se traslada a metodología. |
| 2 | HU del CRUD por entidad y RF por acción de ventana | **Parcial** | Existen 19 HU, pero no cubren explícitamente el CRUD de las 13 entidades ni contienen criterios de aceptación. Tampoco existe inventario botón/acción → RF → HU. |
| 3 | Casos de uso general y específicos | **Parcial** | Existen 10 CU específicos con RF y se corrigió su persistencia a SQLite, pero falta separar y documentar formalmente el caso de uso general y normalizar los actores. |
| 4 | Requisitos de interfaz externa | **Parcial** | Existe M1, pero incluye `localStorage` como sistema externo, conserva actores sin CU y no existe un catálogo formal de requisitos de interfaz. |
| 5 | Metodología de trabajo | **Completo** | Está definida y justificada como desarrollo incremental por fases y ya referencia las matrices M1–M14. |
| 6 | Tipo de investigación | **Completo** | Se define y justifica un enfoque mixto y una investigación aplicada, con relación a las técnicas de elicitación. |
| 7 | HU, RF, RNF y RN actualizados | **Parcial** | Las RN están catalogadas, pero falta una ERS central; los RF/RNF solo aparecen dispersos y los RNF no están asociados formalmente con ISO 25010 ni formulados para pruebas. |
| 8 | Matriz RF ↔ HU ↔ CU | **Faltante** | Hay relaciones parciales en distintos archivos, pero no existe una matriz única RF ↔ HU ↔ CU con cobertura bidireccional y criterios de aceptación ↔ atributos del MER. |

**Conclusión:** 2 puntos completos, 5 parciales y 1 faltante. La fase de Análisis aún no puede declararse cerrada.

---

## 1. Revisión de objetivos específicos

### Evidencia existente

El archivo `05-objetivos-especificos.md` contiene seis objetivos específicos relacionados con tareas, Pomodoro, gamificación, tablero, personalización y aplicación de principios de ingeniería de software.

### Validación

| Objetivo | Cobertura funcional identificable | Estado |
|---|---|---|
| OE01 — Gestión de tareas, agenda y recordatorios | RF01, RF02, RF03, RF04 y RF09 | Trazado en el artefacto. |
| OE02 — Pomodoro y registro de sesiones | RF10, RF11 y RF12 | Trazado en el artefacto. |
| OE03 — Puntos, insignias y retos | RF03, RF05, RF06 y RF07 | Trazado en el artefacto. |
| OE04 — Tablero de progreso | RF08 y RF11 | Trazado en el artefacto. |
| OE05 — Configuración y personalización | RF13 y RF14; RNF04, RNF06 y RNF07 | Trazado en el artefacto y corregido para usar SQLite. |
| OE06 — Aplicación de ingeniería de software | No corresponde directamente a una función del producto | Requiere tratarse como objetivo de proceso y relacionarlo con los artefactos, no forzar un RF funcional. |

### Ajustes requeridos

1. Incorporar los identificadores OE01–OE06 en la redacción principal, además de la tabla de trazabilidad ya agregada.
2. Confirmar con la docente si OE06 se conserva como objetivo específico de proceso o se traslada a la metodología.
3. Si se conserva OE06, demostrarlo mediante los entregables de Análisis, Diseño y Construcción, sin asignarle artificialmente un RF funcional.

---

## 2. HU del CRUD por entidad y RF por acción de ventana

### Evidencia existente

`07-casos-de-uso.md` contiene HU01–HU19. M12 relaciona pantallas con CU y RF, pero trabaja a nivel de pantalla y no a nivel de acción o botón.

### Cobertura por entidad

| Entidad aprobada | HU existente relacionada | Vacío que debe documentarse |
|---|---|---|
| `cuenta` | HU01 | Consultar, actualizar, desactivar/eliminar y autenticarse no están separados con criterios de aceptación. |
| `materia` | HU01, HU16 | Falta separar crear, consultar, actualizar y eliminar/desactivar. |
| `tarea` | HU02, HU03, HU09, HU19 | La actualización aparece solo como flujo alternativo; faltan criterios de aceptación por operación. |
| `sesion_estudio` | HU10 | Falta documentar consulta, actualización y eliminación de sesiones. |
| `insignia` | HU05 | La administración del catálogo no tiene HU ni CU del actor responsable. |
| `cuenta_insignia` | HU05 | Desbloqueo y consulta son automáticos; revocación no tiene HU ni CU. |
| `punto` | HU03, HU07 | Otorgamiento y consulta están implícitos; eliminación administrativa no tiene HU ni CU. |
| `reto` | HU06, HU18 | Existe gestión parcial; faltan criterios de aceptación por operación. |
| `meta` | HU15, HU17 | Existe gestión parcial; faltan criterios de aceptación por operación. |
| `recordatorio` | HU04 | Falta HU explícita para consultar, activar/desactivar y eliminar. |
| `preferencia_visual` | HU13 | Crear/obtener/actualizar están agrupados; eliminación/restablecimiento no está especificado. |
| `nivel_cuenta` | HU07 de forma indirecta | No existe HU para administrar el catálogo ni criterio para evaluar el nivel. |
| `notificacion` | HU04 de forma indirecta | No existe HU explícita para listar, marcar como leída o eliminar notificaciones. |

### Hallazgo de trazabilidad de interfaz

M12 demuestra pantalla → CU → RF, pero no satisface la condición del checklist para cada acción. Por ejemplo, en una pantalla de tareas deben aparecer por separado las acciones `Crear`, `Consultar`, `Editar`, `Completar`, `Eliminar`, `Filtrar` y `Buscar`, cada una con su RF y HU de origen.

### Ajustes requeridos

1. Mantener las HU existentes que sean válidas y agregar criterios de aceptación verificables.
2. Dividir o complementar las HU cuando una operación CRUD no quede expresamente cubierta.
3. Diferenciar operaciones del estudiante, operaciones automáticas del sistema y mantenimiento de catálogos por un actor autorizado.
4. Crear el inventario pantalla → botón/acción → RF → HU → CU.
5. No crear pantallas administrativas nuevas únicamente para completar una tabla: primero debe confirmarse con la docente si `insignia` y `nivel_cuenta` serán catálogos administrables o datos semilla.

---

## 3. Casos de uso general y específicos

### Evidencia existente

Existen CU01–CU10 con actores, precondición, flujo normal, flujos alternativos y postcondición. Todos tienen al menos un RF asociado en la tabla resumen.

### Inconsistencias

- No se distingue documentalmente entre el caso de uso general del sistema y los casos de uso específicos.
- CU01, CU02, CU08, CU09 y CU10 ya fueron corregidos para describir persistencia en SQLite mediante el servidor.
- Los actores `Estudiante`, `Usuario registrado` y `Persona con discapacidad física` se alternan sin una jerarquía formal de actores.
- El Administrador aparece en M1 y M12, pero no tiene caso de uso asociado.
- `Colaborador` y `Revisor institucional` aparecen como entidades externas, aunque su participación no está sustentada completamente por CU propios.
- Las HU están incluidas dentro del documento de CU, pero no tienen criterios de aceptación ni referencia directa a un CU en cada fila.

### Ajustes requeridos

1. Conservar CU01–CU10 y corregir sus referencias de persistencia a SQLite mediante el backend.
2. Documentar el caso de uso general como límite del sistema y usar los CU específicos para detallar objetivos del actor.
3. Normalizar la jerarquía de actores y eliminar duplicidades semánticas.
4. Confirmar o retirar actores administrativos/institucionales que no tengan requisitos y CU aprobados.
5. Agregar a cada CU: identificador, objetivo, actor principal, actores secundarios, disparador, precondiciones, flujo principal numerado, excepciones, postcondiciones, RF, HU y RN aplicables.

---

## 4. Requisitos de interfaz externa

### Evidencia existente

M1 relaciona entidades externas, RF, CU y participación en el Diagrama de Contexto Arquitectónico.

### Inconsistencias

- `localStorage` está registrado como sistema subordinado, aunque ya no es el mecanismo de persistencia aprobado.
- La API de notificaciones del navegador sí constituye una interfaz externa técnica, pero necesita un requisito de interfaz verificable.
- Administrador, Colaborador y Revisor institucional no tienen cobertura completa RF ↔ CU.
- No se documentan de manera formal las interfaces de usuario, software y comunicación que requiere una ERS.

### Ajustes requeridos

1. Retirar `localStorage` del contexto vigente.
2. Documentar la interacción navegador ↔ servidor HTTP y servidor ↔ SQLite como interfaces internas de arquitectura, sin confundirlas con actores humanos.
3. Especificar la interfaz con Notifications API: solicitud de permiso, estados permitido/denegado y comportamiento alternativo.
4. Formular requisitos de interfaz con identificador, descripción, origen, entradas, salidas y criterio de validación.

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

- Existen HU01–HU19.
- Todas tienen formato básico “Como…, quiero…, para…”.
- Ninguna presenta criterios de aceptación estructurados.
- No todas las entidades y acciones CRUD están cubiertas de forma explícita.

### Requisitos funcionales

- Se utilizan RF01–RF15 en los documentos.
- No existe un archivo ERS que defina de forma oficial cada RF con descripción, entradas, proceso, salidas, prioridad, fuente y criterio de aceptación.
- Las descripciones disponibles están repartidas entre alcance, CU y leyendas de matrices.

### Requisitos no funcionales

- Se citan identificadores hasta RNF15, pero no existe un catálogo completo y controlado.
- Los RNF no están relacionados sistemáticamente con características de calidad ISO/IEC 25010.
- Algunos RNF conservan la persistencia en `localStorage`, incompatible con la arquitectura vigente.
- Faltan métricas, condiciones y métodos de prueba para demostrar cumplimiento.

### Reglas de negocio

- `10-reglas-de-negocio.md` cataloga RN01–RN19 y relaciona cada regla con entidades y RF/CU.
- Las HU y los RF no incluyen todavía una columna o sección que indique qué RN aplican.
- El propio documento mantiene una sección “Pendiente de verificación con el equipo”; por tanto, aún no puede considerarse aprobado.

### Ajustes requeridos

1. Crear una ERS central sin cambiar los identificadores RF01–RF15 ya usados.
2. Definir cada RNF con el patrón: condición, comportamiento esperado, métrica, umbral, atributo ISO 25010 y método de prueba.
3. Agregar criterios de aceptación a todas las HU.
4. Relacionar cada HU y RF con las RN que condicionan su ejecución.
5. Corregir todas las referencias vigentes a `localStorage` dentro de Análisis.

---

## 8. Matriz de trazabilidad RF ↔ HU ↔ CU

### Cobertura nominal recuperable

Los RF01–RF15 aparecen relacionados con al menos una HU y un CU dentro de `07-casos-de-uso.md`. Sin embargo, esa relación no está presentada como una matriz única ni permite revisar trazabilidad en ambos sentidos.

### Vacíos

- No existe una tabla consolidada RF → HU → criterios de aceptación → CU.
- No existe la revisión inversa HU → RF ni CU → RF para detectar elementos huérfanos.
- No se relacionan objetivos específicos con RF.
- No se relacionan acciones de interfaz con RF y HU.
- No se relacionan atributos mencionados en criterios de aceptación con los nombres aprobados del MER.
- M2 mezcla HU dentro de la columna “RF que lo justifica” y omite `cuenta_insignia`, `nivel_cuenta` y `notificacion`.
- M5 también omite esas tres entidades y conserva RNF04 como persistencia en `localStorage`.

### Estructura mínima requerida

| OE | RF | HU | Criterio de aceptación | CU | RN | Entidad/atributo | Pantalla/acción |
|---|---|---|---|---|---|---|---|
| OE identificable | RF aprobado | HU de origen | Resultado verificable | CU que realiza el flujo | Regla aplicable | Nombre exacto del modelo aprobado | Pantalla y botón/acción |

La matriz debe permitir comprobar que no exista un objetivo, RF, HU, CU, entidad o acción de pantalla sin origen y sin destino trazable.

---

## Orden recomendado de corrección

1. **Definir y aprobar la ERS:** catálogo formal RF01–RF15 y RNF con ISO 25010.
2. **Cerrar los objetivos específicos:** incorporar los identificadores en la redacción y resolver la clasificación de OE06.
3. **Completar las HU:** CRUD por entidad, criterios de aceptación y RN aplicables.
4. **Actualizar CU01–CU10:** arquitectura vigente, actores y trazabilidad HU/RF/RN.
5. **Construir la matriz consolidada:** OE ↔ RF ↔ HU ↔ CU ↔ RN ↔ entidad/atributo ↔ pantalla/acción.
6. **Corregir M1 y matrices relacionadas:** retirar elementos obsoletos y eliminar actores o funciones no aprobados.
7. **Integrar el contenido aprobado al documento Word:** el repositorio no contiene actualmente un archivo `.docx`; debe identificarse el documento maestro antes de hacer esta integración.

---

## Dudas puntuales para consultar a la docente

1. ¿Las 13 entidades requieren una HU CRUD completa incluso cuando son catálogos o registros automáticos, como `nivel_cuenta`, `cuenta_insignia` y `punto`?
2. ¿El Administrador, el Colaborador y el Revisor institucional continúan dentro del alcance aprobado? Actualmente aparecen en matrices, pero no cuentan con cobertura completa de casos de uso.
3. ¿La docente exige un estándar específico para la ERS —por ejemplo IEEE 830/29148— o basta con el formato institucional acompañado de criterios verificables?
4. ¿Cuál archivo Word es el documento maestro de la entrega? No hay archivos `.docx`, `.doc` ni `.odt` dentro del repositorio actual.
5. ¿El periodo y encabezado deben conservar “Ingeniería de Software II — 2025” como origen histórico o actualizarse a “Ingeniería de Software III — 2026” en todos los artefactos vigentes?
