# Tipo de Investigación

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio
**Asignatura:** Ingeniería de Software II — Uniremington
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño
**Docente:** Gloria Amparo Lora Patiño

---

## Tipo de investigación: Enfoque Mixto (Cualitativo + Cuantitativo)

El proyecto se apoya en un **enfoque mixto**, aplicado de forma secuencial: primero una fase cuantitativa de alcance general, seguida de una fase cualitativa de profundización, tal como se documentó en `06-tecnicas-de-elicitacion.md`.

### Componente cuantitativo

**Técnica:** Encuesta digital (Google Forms) a **30 estudiantes** de instituciones privadas de Medellín.

**Por qué es cuantitativo:** los datos se recolectan como variables medibles (porcentajes, frecuencias) que permiten cuantificar la magnitud de un problema y comparar preferencias entre funcionalidades. Ejemplos de resultados:

- 87 % de los encuestados procrastina con frecuencia.
- 93 % mostró interés en un sistema de recompensas.
- Funcionalidades más solicitadas ordenadas por porcentaje (recordatorios 88 %, historial 72 %, estadísticas 68 %, metas semanales 61 %).

Este componente **justifica cuáles módulos priorizar** (los cinco módulos funcionales del alcance responden directamente a las funcionalidades más solicitadas en la encuesta).

### Componente cualitativo

**Técnicas:** Entrevistas semiestructuradas (4 participantes: 2 estudiantes, 2 docentes) y observación directa en dos espacios de estudio universitario.

**Por qué es cualitativo:** el objetivo no es medir frecuencia sino **comprender el porqué** detrás de los patrones — motivaciones, frustraciones y comportamientos que una encuesta cerrada no puede capturar. Ejemplos de hallazgos:

- El obstáculo principal no es la falta de tiempo sino la dificultad para *iniciar* tareas y sostener la concentración.
- Preferencia por herramientas simples con retroalimentación inmediata frente a herramientas genéricas percibidas como complejas (Notion, Google Calendar).
- Patrones de comportamiento observados directamente (alternancia entre estudio y redes sociales cada menos de 5 minutos).

Este componente **justifica decisiones de diseño de experiencia** — por ejemplo, por qué el sistema usa gamificación con retroalimentación inmediata (insignias, animaciones) en lugar de solo una lista de tareas.

### Por qué un enfoque mixto y no uno solo

| Si solo fuera cuantitativo | Si solo fuera cualitativo |
|---|---|
| Sabríamos *qué* funcionalidades pedir, pero no *por qué* fallan las herramientas actuales | Entenderíamos el *por qué*, pero no podríamos priorizar objetivamente entre 5 módulos con datos de 30 usuarios |

El enfoque mixto permite que la encuesta (cuantitativa) defina el alcance funcional, y que las entrevistas y observación (cualitativas) informen las decisiones de UX y de reglas de negocio (por ejemplo, el modo enfoque que bloquea notificaciones responde directamente al hallazgo de "alternancia cada 5 minutos" observado en campo).

### Tipo de investigación según finalidad

Además del enfoque mixto, la investigación es de tipo **aplicada**: no busca generar teoría nueva sobre hábitos de estudio, sino usar el conocimiento recolectado (encuesta + entrevistas + observación + benchmarking) para **diseñar y construir una solución de software concreta** que resuelva el problema identificado en `01-planteamiento-problema.md`.

---

> **Nota:** este documento se agregó en la revisión de agosto 2026 para cubrir el punto "determinar el tipo de investigación (cualitativa o cuantitativa) y justificar" del checklist. Toda la evidencia citada ya existía en `06-tecnicas-de-elicitacion.md`; este documento solo formaliza la clasificación metodológica que faltaba explicitar.
