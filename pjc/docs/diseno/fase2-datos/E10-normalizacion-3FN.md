# E10 — Normalización hasta Tercera Forma Normal (3FN)

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Entregable:** 10 — Normalización (3FN)  
**Fase:** 2 — Diseño de Datos  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  
**Institución:** Uniremington · Medellín · 2025  

---

## Descripción general

Todas las tablas del sistema cumplen **1FN, 2FN y 3FN**. Se documentan tres excepciones marcadas como **desnormalizaciones deliberadas**, justificadas por requisitos no funcionales de rendimiento y consistencia histórica.

---

## Primera Forma Normal (1FN) — Eliminar grupos repetitivos

**Regla:** cada celda contiene un único valor atómico; no puede haber listas ni columnas repetidas en la misma fila.

**Análisis:** Todas las tablas cumplen 1FN. El caso más importante es la relación N:M entre `cuenta` e `insignia`, que podría haberse modelado como una lista de insignias dentro de `cuenta`. Se resolvió correctamente con la tabla de asociación `cuenta_insignia`, donde cada fila contiene un solo par (id_cuenta, id_insignia). El campo `horario` en `materia` se mantiene como `VARCHAR` atómico dentro del alcance del proyecto.

**Resultado: todas las tablas cumplen 1FN sin cambios estructurales.**

---

## Segunda Forma Normal (2FN) — Eliminar dependencias parciales

**Regla:** aplica **solo a tablas con PK compuesta**. Cada atributo no clave debe depender de **toda** la PK, no solo de parte de ella.

**Análisis:** La única tabla con PK compuesta es `cuenta_insignia` (`id_cuenta`, `id_insignia`). El único atributo no clave es `fecha_obtenida`, que depende de la combinación completa:
- La misma insignia obtenida por distintos estudiantes tiene distintas fechas.
- El mismo estudiante puede obtener distintas insignias en distintas fechas.

No existe dependencia parcial. Las demás tablas tienen PK simple (UUID), por lo que la 2FN se cumple trivialmente.

**Resultado: ningún cambio necesario. El diseño garantiza dependencias totales.**

---

## Tercera Forma Normal (3FN) — Eliminar dependencias transitivas

**Regla:** ningún atributo no clave debe depender de otro atributo no clave.

---

## Análisis tabla por tabla

| Tabla | 1FN ✓ | 2FN ✓ | 3FN / Excepción |
|---|---|---|---|
| **cuenta** | Valores atómicos. Sin grupos repetitivos. | PK simple → 2FN trivial. | ✅ Cumple 3FN sin excepciones. |
| **materia** | Valores atómicos. | PK simple → 2FN trivial. | ✅ Cumple 3FN sin excepciones. |
| **tarea** | Valores atómicos. | PK simple → 2FN trivial. | ✅ Cumple 3FN. nombre de materia no está; se obtiene por JOIN. |
| **sesion_estudio** | Valores atómicos. | PK simple → 2FN trivial. | ✅ Cumple 3FN sin excepciones. |
| **insignia** | Valores atómicos. | PK simple → 2FN trivial. | ✅ Cumple 3FN sin excepciones. |
| **cuenta_insignia** | Valores atómicos. | PK compuesta: fecha_obtenida depende del par completo → No hay dependencia parcial. | ✅ Cumple 3FN sin excepciones. |
| **punto** | Valores atómicos. | PK simple → 2FN trivial. | ✅ Cumple 3FN sin excepciones. |
| **reto** | Valores atómicos. | PK simple → 2FN trivial. | ⚠️ **EXCEPCIÓN:** `completado` podría derivarse de `progreso`. Se mantiene explícito para rendimiento (desnormalización controlada). |
| **meta** | Valores atómicos. | PK simple → 2FN trivial. | ⚠️ **EXCEPCIÓN:** `cumplida` podría derivarse de `valor_actual >= valor_objetivo`. Se mantiene para consistencia histórica. |
| **recordatorio** | Valores atómicos. | PK simple → 2FN trivial. | ✅ Cumple 3FN sin excepciones. |
| **reporte** | Valores atómicos. | PK simple → 2FN trivial. | ⚠️ **EXCEPCIÓN:** `tareas_completadas`, `horas_estudiadas` y `puntos_obtenidos` podrían calcularse. Snapshot histórico deliberado por RNF02. |
| **preferencia_visual** | Valores atómicos. | PK simple → 2FN trivial. | ✅ Cumple 3FN sin excepciones. |

---

## Análisis de casos específicos de 3FN

### Tabla `cuenta`

```
id_cuenta → nombre            ✓ dependencia directa de PK
id_cuenta → correo            ✓ dependencia directa de PK
id_cuenta → contrasena_hash   ✓ dependencia directa de PK
id_cuenta → fecha_registro    ✓ dependencia directa de PK
id_cuenta → activa            ✓ dependencia directa de PK
```
**Sin dependencias transitivas. Cumple 3FN.**

### Tabla `tarea`

```
id_tarea → nombre          ✓ dependencia directa de PK
id_tarea → id_materia      ✓ FK, no un atributo derivado
id_tarea → prioridad       ✓ dependencia directa de PK
id_tarea → estado          ✓ dependencia directa de PK
```
El nombre de la materia **no está** en `tarea` (solo el FK `id_materia`). Se obtiene con JOIN a `materia`. **Cumple 3FN.**

### Tabla `cuenta_insignia`

```
(id_cuenta, id_insignia) → fecha_obtenida   ✓ dependencia del par completo
```
No existe ningún atributo que dependa solo de `id_cuenta` ni solo de `id_insignia`. **Cumple 2FN y 3FN.**

---

## Desnormalizaciones deliberadas documentadas

### EXCEPCIÓN 1 — Tabla `reto` (campo `completado`)

| Aspecto | Detalle |
|---|---|
| **Atributo** | `completado BOOLEAN` |
| **Posible derivación** | `completado` podría calcularse evaluando si `progreso` alcanzó la condición del reto |
| **Justificación** | Se mantiene explícito para **rendimiento** (evita evaluar la condición en cada lectura) y para **consistencia**: si la condición cambia, el historial queda intacto |
| **Tipo de desnormalización** | Controlada — no es un error de diseño |
| **RF** | RF06 |

### EXCEPCIÓN 2 — Tabla `meta` (campo `cumplida`)

| Aspecto | Detalle |
|---|---|
| **Atributo** | `cumplida BOOLEAN` |
| **Posible derivación** | Podría derivarse de `valor_actual >= valor_objetivo` |
| **Justificación** | Se mantiene explícito porque `valor_objetivo` podría cambiar; la **consistencia histórica** requiere el campo. Un reporte pasado debe reflejar si la meta se cumplió al momento de evaluarse, no con el objetivo actual |
| **Tipo de desnormalización** | Controlada — justificada por consistencia histórica |
| **RF** | RF15 |

### EXCEPCIÓN 3 — Tabla `reporte` (campos calculables)

| Aspecto | Detalle |
|---|---|
| **Atributos** | `tareas_completadas`, `horas_estudiadas`, `puntos_obtenidos` |
| **Posible derivación** | Podrían calcularse con queries sobre `tarea`, `sesion_estudio` y `punto` respectivamente |
| **Justificación** | **Snapshot histórico deliberado** — son reportes semanales cerrados. Si se recalcularan dinámicamente, cambiarían al agregarse nuevos datos. Además, RNF02 exige respuesta ≤ 2 segundos, lo que prohíbe queries agregadas en tiempo real |
| **Tipo de desnormalización** | Controlada — justificada por RNF02 (rendimiento) y por la semántica de un reporte histórico |
| **RF** | RF11 |

---

## Resumen de conformidad

| Forma Normal | Tablas conformes | Excepciones documentadas |
|---|---|---|
| **1FN** | 12/12 | 0 |
| **2FN** | 12/12 | 0 |
| **3FN** | 9/12 | 3 (deliberadas y documentadas) |

> **Conclusión:** El modelo cumple 3FN. Las tres excepciones son **desnormalizaciones deliberadas**, documentadas con su justificación técnica y de negocio. No representan errores de diseño sino decisiones arquitectónicas conscientes.
