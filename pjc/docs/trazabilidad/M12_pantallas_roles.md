# Tabla 12 — Pantallas → Roles, CU, RF, Wireframes

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.12 Artefactos de Trazabilidad

> Esta matriz verifica que cada pantalla del sistema esté asociada a un rol, cubra al menos un Caso de Uso, tenga su RF justificante y, donde aplica, un wireframe de referencia.

---

| ID Pantalla | Nombre | Rol | CU asociado | HU asociada | RF relacionado | Wireframe |
|---|---|---|---|---|---|---|
| P01 | Login | Todos | CU01 | HU01 | RF01 | W01 |
| P02 | Registro | Usuario nuevo | CU01 | HU01 | RF01, RNF12 | — |
| P03 | Dashboard (hub central) | Estudiante | CU02–CU06 | HU02–HU08, HU10, HU12, HU15, HU17, HU18 | RF02–RF12, RF15 | W02 |
| P04 | Lista de tareas | Estudiante | CU02, CU03, CU07 | HU02, HU03, HU09, HU19 | RF02, RF03, RF09 | W03 |
| P05 | Detalle/edición de tarea | Estudiante | CU02 | HU02, HU19 | RF02, RF04 | — |
| P06 | Modo Pomodoro / Historial de sesiones | Estudiante | CU04, CU12 | HU10, HU12, HU21 | RF10, RF11, RF12 | W04 |
| P07 | Agenda de materias | Estudiante | CU01 | HU01, HU16 | RF01, RF09 | — |
| P08 | Panel de gamificación | Estudiante | CU06 | HU05, HU06, HU07, HU18 | RF05, RF06, RF07 | W05 |
| P09 | Insignias obtenidas | Estudiante | CU06 | HU05, HU07 | RF05, RF07 | — |
| P10 | Reto semanal activo | Estudiante | CU06 | HU06, HU18 | RF06 | — |
| P11 | Tablero de Avance Personal | Estudiante | CU05 | HU08, HU11, HU15, HU17 | RF08, RF11, RF15 | — |
| P12 | Filtros y búsqueda de tareas | Estudiante | CU07 | HU09 | RF09 | — |
| P13 | Configuración / Perfil | Estudiante | CU08, CU11 | HU13, HU20 | RF01, RF13, RNF04, RNF12 | W06 |
| P14 | Exportar datos | Estudiante | CU09 | HU14 | RF14, RNF04 | — |
| P15 | Panel de administración | Administrador | CU13, CU14 | HU22, HU23, HU26, HU27 | RF01, RF05, RF07, RNF12 | — |
| P16 | Gestión de usuarios | Administrador | CU13 | HU27 | RF01, RNF12 | — |
| P17 | Gestión de insignias, niveles y retos | Administrador | CU13, CU14 | HU22, HU23, HU26 | RF05, RF07 | — |
| P18 | Tablero institucional (solo lectura) | Revisor institucional | CU16 | HU28 | RF11 | — |
| P19 | Notificaciones | Estudiante | CU15 | HU24 | RF04, RNF15 | — |
| P20 | Recordatorios | Estudiante | CU10 | HU04, HU25 | RF04, RNF15 | — |

> **Corrección (revisión septiembre 2026):** P19 y P20 cubren CU15/HU24 y CU10/HU04-HU25. P15–P17 cubren CU13–CU14 y HU22, HU23, HU26 y HU27. P13 incorpora CU11/HU20 y P06 incorpora CU12/HU21. Con estas correspondencias, CU01–CU16 y todas las pantallas P01–P20 quedan vinculados documentalmente.

## Cobertura completa de casos de uso

| CU | Pantalla(s) de origen |
|---|---|
| CU01 | P01, P02, P07 |
| CU02 | P03, P04, P05 |
| CU03 | P03, P04 |
| CU04 | P03, P06 |
| CU05 | P03, P11 |
| CU06 | P03, P08, P09, P10 |
| CU07 | P04, P12 |
| CU08 | P13 |
| CU09 | P14 |
| CU10 | P20 |
| CU11 | P13 |
| CU12 | P06 |
| CU13 | P15, P16, P17 |
| CU14 | P15, P17 |
| CU15 | P19 |
| CU16 | P18 |
