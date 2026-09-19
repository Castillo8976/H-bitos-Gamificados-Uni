# Tabla 10 — Diagramas de Secuencia → CU, Clases, Flujos Alternativos

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.10 Artefactos de Trazabilidad

> Esta matriz verifica que cada diagrama de secuencia cubra el flujo normal del caso de uso asociado, identifique sus participantes UML y documente al menos un flujo alternativo.

---

| Diagrama | CU modelado | Participantes UML | Flujo normal cubierto | Flujo alternativo cubierto |
|---|---|---|---|---|
| **Seq-01** Crear tarea y recordatorio | CU02 | `InterfazTareas`, `ModuloTareas`, `ModuloNotificaciones`, `Almacenamiento` | Ingresa datos → valida → guarda → programa recordatorio → confirma | A1: datos inválidos → error de validación sin guardar |
| **Seq-02** Completar tarea | CU03 | `InterfazTareas`, `ModuloTareas`, `ModuloRecompensas`, `Almacenamiento` | Marca tarea → actualiza estado → suma puntos → verifica insignia → muestra logro | A1: insignia ya obtenida → solo suma puntos sin animación |
| **Seq-03** Sesión Pomodoro | CU04 | `InterfazPomodoro`, `ModuloPomodoro`, `ModuloTareas`, `Almacenamiento` | Inicia cronómetro → ciclo focus/descanso → guarda sesión → actualiza estadísticas | A1: pausa manual → guarda tiempo parcial |
| **Seq-04** Consulta del Tablero de Avance Personal | CU05 | `InterfazTablero`, `ServicioEstadisticas`, `Almacenamiento` | Solicita tablero → calcula estadísticas en tiempo real (SUM/COUNT) → muestra dashboard, sin generar snapshot | A1: sin datos suficientes → muestra estado vacío informativo |
| **Seq-05** Desbloqueo de insignia | CU06 | `ModuloRecompensas`, `Almacenamiento`, `InterfazGamificación` | Verifica condición → desbloquea insignia → registra fecha → muestra modal de celebración | A1: condición no cumplida → actualiza contador de progreso |

---

## Notas de cobertura

- Los diagramas Seq-01 a Seq-03 cubren los flujos más críticos del sistema (gestión de tareas, recompensas y tiempo).
- Cada diagrama documenta mínimo 1 flujo alternativo verificando robustez ante errores o condiciones especiales.
- Los participantes de tipo `<<entity>>` corresponden a las clases del Diagrama de Clases y a las entidades de E7. Los participantes de tipo `<<boundary>>`, `<<control>>` y `<<database>>` representan responsabilidades arquitectónicas y no nuevas entidades persistentes.

## Clasificación de participantes y correspondencia

| Participante de secuencia | Tipo UML | Correspondencia documental |
|---|---|---|
| `InterfazTareas` | `<<boundary>>` | Pantallas P04 Lista de tareas y P05 Detalle/edición de tarea. |
| `ModuloTareas` | `<<control>>` | Coordina operaciones de `Tarea` y la programación de `Recordatorio`. |
| `ModuloNotificaciones` | `<<control>>` | Coordina `Recordatorio` y `Notificacion`; no es una tabla. |
| `InterfazPomodoro` | `<<boundary>>` | Pantalla P06 Pomodoro. |
| `ModuloPomodoro` | `<<control>>` | Coordina las operaciones de `SesionEstudio`. |
| `ModuloRecompensas` | `<<control>>` | Coordina `Punto`, `Insignia`, `CuentaInsignia`, `Reto` y `NivelCuenta`. |
| `InterfazTablero` | `<<boundary>>` | Pantallas P03 Dashboard y P11 Tablero. |
| `ServicioEstadisticas` | `<<control>>` | Calcula en tiempo real datos de `Tarea`, `SesionEstudio`, `Punto` y `Meta`, sin tabla `reporte`. |
| `InterfazGamificación` | `<<boundary>>` | Pantallas P08 Gamificación y P09 Insignias. |
| `Almacenamiento` | `<<database>>` | Persistencia de las 13 entidades definidas en E7; no es una clase de entidad adicional. |

Esta clasificación permite conservar los nombres conceptuales de los diagramas de secuencia sin confundirlos con clases persistentes. Cuando un mensaje consulta o modifica información, la entidad afectada debe corresponder a una de las 13 equivalencias documentadas en M9.
