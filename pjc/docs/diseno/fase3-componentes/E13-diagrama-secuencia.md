## Diagrama de Secuencia

**Diagramas gráficos vigentes (Draw.io), flujos críticos — Seq-01 a Seq-05:**

| Diagrama | CU modelado | Archivo |
|---|---|---|
| Seq-01 | CU02 — Crear tarea y recordatorio | `docs/diseno/drawio/10a_Secuencia_Seq01_CrearTareaRecordatorio.drawio` |
| Seq-02 | CU03 — Completar tarea | `docs/diseno/drawio/10_Secuencia_Seq02_CompletarTarea.drawio` |
| Seq-03 | CU04 — Sesión Pomodoro | `docs/diseno/drawio/10c_Secuencia_Seq03_SesionPomodoro.drawio` |
| Seq-04 | CU05 — Tablero de Avance Personal | `docs/diseno/drawio/10d_Secuencia_Seq04_TableroAvance.drawio` |
| Seq-05 | CU06 — Desbloqueo de insignia | `docs/diseno/drawio/10e_Secuencia_Seq05_DesbloqueoInsignia.drawio` |

Los participantes usan el patrón UML `<<boundary>>`/`<<control>>`/`<<database>>`; su clasificación y correspondencia con las 13 entidades de E7 está documentada en `M10_diagramas_secuencia.md`.

**Cobertura CRUD completa (Seq-CRUD-01 a 13):** además de los 5 diagramas gráficos, `M10_diagramas_secuencia.md` documenta una especificación textual UML (actor → boundary → control → entity/database, con flujo alternativo) para cada una de las 13 entidades del diccionario — incluidas las que no tienen diagrama gráfico dedicado (`materia`, `insignia`, `cuenta_insignia`, `reto`, `meta`, `preferencia_visual`, `nivel_cuenta`, `notificacion`).

> **Corrección (revisión septiembre 2026):** este documento apuntaba a `DiagramaSecuencia.png`, una imagen que en realidad era un diagrama de clases obsoleto de la versión 100% offline/localStorage, mal etiquetada. Se reemplazó por los 5 diagramas Draw.io reales más la cobertura textual de M10.