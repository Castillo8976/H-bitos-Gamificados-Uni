# M6 — Matriz de Trazabilidad: Relaciones MER → Cardinalidades → Reglas de Negocio

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Artefacto:** M6 — Trazabilidad Fase 2 (Datos)  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  
**Institución:** Uniremington · Medellín · 2025  

---

## Descripción

Esta matriz conecta cada relación del MER Conceptual (E8) con su cardinalidad, la implementación en el Modelo Relacional (E9), la acción referencial en el DDL (E11) y la regla de negocio que la justifica.

---

## Matriz M6

| Entidad A | Relación | Entidad B | Cardinalidad | Implementación FK | Acción referencial | Regla de negocio / RF |
|---|---|---|---|---|---|---|
| **cuenta** | tiene | preferencia_visual | **1 : 1** | UNIQUE(id_cuenta) en preferencia_visual | ON DELETE CASCADE | Cada cuenta tiene exactamente una configuración visual. Se crea automáticamente al registrarse. RF13. |
| **cuenta** | registra | materia | **1 : N** | id_cuenta FK en materia | ON DELETE CASCADE | Un estudiante puede tener muchas materias; cada materia pertenece a una cuenta. Mínimo 1 al registrarse. RF01. |
| **cuenta** | crea | tarea | **1 : N** | id_cuenta FK en tarea | ON DELETE CASCADE | Un estudiante puede crear muchas tareas. Cada tarea pertenece a una sola cuenta. RF02. |
| **materia** | agrupa | tarea | **1 : N (opt)** | id_materia FK nullable en tarea | ON DELETE SET NULL | Una materia puede agrupar muchas tareas. Una tarea puede no tener materia. RF09. |
| **cuenta** | realiza | sesion_estudio | **1 : N** | id_cuenta FK en sesion_estudio | ON DELETE CASCADE | Un estudiante puede registrar muchas sesiones. RF10. |
| **tarea** | se asocia a | sesion_estudio | **1 : N (opt)** | id_tarea FK nullable en sesion_estudio | ON DELETE SET NULL | Una tarea puede tener múltiples sesiones. La sesión puede existir sin tarea. RF10. |
| **cuenta** | acumula | punto | **1 : N** | id_cuenta FK en punto | ON DELETE CASCADE | Un estudiante tiene muchos registros de puntos. El total es la suma. RF03, RF07. |
| **cuenta** | desbloquea | insignia | **N : M** | PK compuesta en cuenta_insignia | ON DELETE CASCADE (ambas) | Un estudiante desbloquea muchas insignias; una insignia puede obtenerse por muchos estudiantes. RF05. |
| **cuenta** | participa en | reto | **1 : N** | id_cuenta FK en reto + UNIQUE(id_cuenta, semana) | ON DELETE CASCADE | Un reto semanal por estudiante, acumulando muchos a lo largo del tiempo. RF06. |
| **cuenta** | recibe | meta | **1 : N** | id_cuenta FK en meta + UNIQUE(id_cuenta, semana) | ON DELETE CASCADE | Una meta semanal por cuenta. Se acumula semana a semana. RF15. |
| **tarea** | genera | recordatorio | **1 : N** | id_tarea FK en recordatorio | ON DELETE CASCADE | Al crear una tarea con fecha se genera un recordatorio automático. Una tarea puede tener varios. RF04. |
| **cuenta** | genera | reporte | **1 : N** | id_cuenta FK en reporte + UNIQUE(id_cuenta, semana) | ON DELETE CASCADE | Un reporte semanal por cuenta. Se acumula semana a semana. RF11. |

---

## Resumen de cardinalidades por tipo

| Tipo de cardinalidad | Relaciones | Entidades involucradas |
|---|---|---|
| **1:1** | 1 | cuenta ↔ preferencia_visual |
| **1:N obligatoria** | 9 | cuenta → materia, tarea, sesion_estudio, punto, reto, meta, reporte; tarea → recordatorio; cuenta → cuenta_insignia (lado 1) |
| **1:N opcional (nullable)** | 2 | materia → tarea (opt), tarea → sesion_estudio (opt) |
| **N:M** | 1 | cuenta ↔ insignia (resuelta por cuenta_insignia) |
| **Total** | **12** | |

---

## Decisiones de integridad referencial

| Relación | Acción elegida | Alternativa descartada | Razón de la elección |
|---|---|---|---|
| cuenta → tarea | CASCADE | RESTRICT | Las tareas pertenecen exclusivamente al estudiante; sin cuenta no tienen sentido |
| materia → tarea | SET NULL | CASCADE | La tarea puede existir sin materia asociada; el estudiante puede haberla creado sin clasificar |
| tarea → sesion_estudio | SET NULL | CASCADE | La sesión de estudio tiene valor histórico propio; puede existir aunque se borre la tarea |
| tarea → recordatorio | CASCADE | SET NULL | El recordatorio no tiene razón de existir sin la tarea que lo generó |
| cuenta → cuenta_insignia | CASCADE | RESTRICT | Al eliminar una cuenta, sus insignias desbloqueadas no tienen utilidad |
| insignia → cuenta_insignia | CASCADE | RESTRICT | Al eliminar una insignia del catálogo, se eliminan todos los registros de obtención |
