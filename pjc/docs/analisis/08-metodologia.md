# Metodología de Trabajo

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio
**Asignatura:** Ingeniería de Software II — Uniremington
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño
**Docente:** Gloria Amparo Lora Patiño

---

## Metodología adoptada: Desarrollo Incremental por Fases

El equipo trabajó bajo un enfoque de **desarrollo incremental por fases**, alineado con la estructura de entregables (E1–E17) definida para la asignatura y documentado semana a semana en `BITACORA.md`.

### Justificación de la elección

No se adoptó un marco formal como Scrum o Kanban con roles y ceremonias completas, porque:

- El equipo lo conforman **2 personas** (no requiere Scrum Master ni Product Owner separados).
- El cronograma está fijado por las fases académicas de la asignatura (Análisis → Diseño → Construcción), no por sprints autogestionados.
- Cada entregable (E1 a E17) actúa como un incremento verificable y revisado por la docente, lo cual cumple el mismo propósito que un sprint review sin la sobrecarga de ceremonias formales.

Sin embargo, el proceso real **sí tiene características incrementales/ágiles**, evidenciadas en `BITACORA.md`:

| Característica ágil presente | Evidencia en el proyecto |
|---|---|
| Iteraciones cortas con entregable verificable | Entradas semanales en BITACORA.md (Semana 3, 4, 5/6) con objetivo concreto por semana |
| Retrospectiva informal por iteración | Cada entrada documenta "¿Qué problema encontré?" y "¿Cómo lo resolví?" |
| Priorización de tablas maestras antes que transaccionales | Semana 3: modelos base (`cuenta`, `materia`, `insignia`) → Semana 4: modelos transaccionales (`tarea`, `punto`, `reto`, etc.) |
| Trazabilidad continua a requisitos | Comentarios `// CU-XX \| RF-XX \| E12` agregados en cada método desde la Semana 5/6 |
| Corrección continua sobre marcha | Ajustes de rutas de importación y de índices compuestos detectados y corregidos en iteraciones posteriores, no pospuestos a un "hardening" final |

### Fases del proyecto

```
Fase 1 — Análisis           → Planteamiento del problema, elicitación, casos de uso, alcance
Fase 2 — Diseño de Datos    → MER, normalización 3FN, diccionario de datos, DDL
Fase 3 — Diseño de Componentes → Arquitectura, diagrama de clases, de secuencia, de despliegue
Fase 4 — Diseño de Interfaz → Wireframes, mapa de navegación, prototipo interactivo
Fase 5 — Construcción       → Implementación Node.js/Express/Sequelize/SQLite, CRUD por entidad
```

Cada fase se cierra con documentación verificable (los entregables E1–E17 en `/docs`) antes de iniciar la siguiente, pero permite ajustes retroactivos cuando la implementación revela inconsistencias con el diseño (por ejemplo, los índices `UNIQUE(id_cuenta, semana)` agregados en la Semana 5/6 tras compararlos con el DDL original).

### Herramientas de gestión

- **Control de versiones:** Git/GitHub, con historial de commits organizado por fase (`Análisis: ...`, `Diseño: ...`, `Semana X: ...`).
- **Documentación de proceso:** `BITACORA.md` (registro de avance y decisiones técnicas del día a día) y `DECISIONES.md` (decisiones arquitectónicas justificadas y respaldadas por artefactos de diseño).
- **Trazabilidad:** matrices M1–M13 en `/docs/trazabilidad`, que conectan entidades, RF, casos de uso, clases y diagramas.

---

> **Nota:** este documento se agregó en la revisión de agosto 2026 para cubrir el punto "revisar la metodología en que están trabajando" del checklist de Análisis y Diseño. Si el equipo considera que el nombre formal debe ser otro (por ejemplo, si en clase se pidió explícitamente "Scrum adaptado" o "Cascada con retroalimentación"), ajustar el título y la justificación en consecuencia — el contenido factual (fases, evidencia en bitácora) es válido en cualquier caso.
