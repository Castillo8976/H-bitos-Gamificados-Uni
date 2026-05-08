# Tabla 10 — Diagramas de Secuencia → CU, Clases, Flujos Alternativos

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.10 Artefactos de Trazabilidad

> Esta matriz verifica que cada diagrama de secuencia cubra el flujo normal del caso de uso asociado, incluya las clases participantes y documente al menos un flujo alternativo.

---

| Diagrama | CU modelado | Clases participantes | Flujo normal cubierto | Flujo alternativo cubierto |
|---|---|---|---|---|
| **Seq-01** Crear tarea y recordatorio | CU02 | `InterfazTareas`, `ModuloTareas`, `ModuloNotificaciones`, `Almacenamiento` | Ingresa datos → valida → guarda → programa recordatorio → confirma | A1: datos inválidos → error de validación sin guardar |
| **Seq-02** Completar tarea | CU03 | `InterfazTareas`, `ModuloTareas`, `ModuloRecompensas`, `Almacenamiento` | Marca tarea → actualiza estado → suma puntos → verifica insignia → muestra logro | A1: insignia ya obtenida → solo suma puntos sin animación |
| **Seq-03** Sesión Pomodoro | CU04 | `InterfazPomodoro`, `ModuloPomodoro`, `ModuloTareas`, `Almacenamiento` | Inicia cronómetro → ciclo focus/descanso → guarda sesión → actualiza estadísticas | A1: pausa manual → guarda tiempo parcial |
| **Seq-04** Generación de reporte | CU05 | `InterfazReportes`, `ModuloReportes`, `Almacenamiento` | Solicita reporte → calcula estadísticas → genera snapshot → muestra dashboard | A1: sin datos suficientes → muestra estado vacío informativo |
| **Seq-05** Desbloqueo de insignia | CU06 | `ModuloRecompensas`, `Almacenamiento`, `InterfazGamificación` | Verifica condición → desbloquea insignia → registra fecha → muestra modal de celebración | A1: condición no cumplida → actualiza contador de progreso |

---

## Notas de cobertura

- Los diagramas Seq-01 a Seq-03 cubren los flujos más críticos del sistema (gestión de tareas, recompensas y tiempo).
- Cada diagrama documenta mínimo 1 flujo alternativo verificando robustez ante errores o condiciones especiales.
- Las clases participantes coinciden con las definidas en el Diagrama de Clases (Entregable 12).
