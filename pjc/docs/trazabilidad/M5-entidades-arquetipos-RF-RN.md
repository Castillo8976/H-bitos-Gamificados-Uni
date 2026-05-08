# M5 — Matriz de Trazabilidad: Entidades → Arquetipos → RF → Reglas de Negocio

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Artefacto:** M5 — Trazabilidad Fase 2 (Datos)  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  
**Institución:** Uniremington · Medellín · 2025  

---

## Descripción

Esta matriz conecta cada entidad del modelo de datos con su arquetipo conceptual, los requisitos funcionales que la originan y las reglas de negocio que la gobiernan. Trazabilidad vertical: **E7 (Diccionario) → E4 (Arquetipos) → Requisitos → Negocio**.

---

## Matriz M5

| Entidad (tabla) | Arquetipo | RF asociado | Regla de negocio principal |
|---|---|---|---|
| **cuenta** | Cuenta, Estudiante | RF01 · RNF12 | Correo único · contraseña cifrada (nunca texto plano) · mínimo una materia al registrarse · entidad raíz de la que dependen todas las demás |
| **materia** | Materia | RF01 · RF09 | Pertenece a una cuenta · nombre obligatorio · mínimo una al registrarse · se usa para filtrar tareas |
| **tarea** | Tarea | RF02 · RF03 · RF09 | prioridad IN {Alta, Media, Baja} · al completar suma puntos (RF03) · filtrable por materia/prioridad/fecha · genera recordatorio automático (RF04) |
| **sesion_estudio** | Sesión de estudio | RF10 · RF11 · RF12 | duracion_minutos > 0 · vinculable a tarea (nullable) · modo_enfoque bloquea notificaciones durante Pomodoro · contribuye al cálculo de horas en reportes |
| **insignia** | Insignia | RF05 | Catálogo global independiente del estudiante · nombre y condición únicos · se desbloquea automáticamente al cumplirse la condición |
| **cuenta_insignia** | Insignia (N:M) | RF05 | PK compuesta (id_cuenta, id_insignia) garantiza que el mismo estudiante no obtenga la misma insignia dos veces · se crea automáticamente |
| **punto** | Punto | RF03 · RF07 | cantidad > 0 · origen IN {Tarea, Reto, Sesion} · total de puntos de una cuenta = suma de todos sus registros en esta tabla |
| **reto** | Reto | RF06 | 1 reto por semana por estudiante (UNIQUE id_cuenta + semana) · se reinicia semanalmente · al completar genera registro en punto con origen=Reto |
| **meta** | Meta | RF15 | 1 meta por semana por cuenta · objetivo no supera 120% del promedio histórico · valor_actual se actualiza automáticamente · cumplida se mantiene explícita por consistencia histórica |
| **recordatorio** | Recordatorio | RF04 · RNF15 | Se genera automáticamente al crear una tarea con fecha · mínimo 24 h antes de la entrega · no se reenvía si enviado=TRUE · se elimina en cascada si se borra la tarea |
| **reporte** | Reporte | RF11 | 1 reporte por semana · campos son snapshot histórico (desnormalización deliberada por RNF02 — respuesta ≤ 2s) · se genera automáticamente al cierre de semana |
| **preferencia_visual** | Preferencia visual | RF13 · RNF04 | Relación 1:1 con cuenta (UNIQUE en id_cuenta) · se crea automáticamente al registrar cuenta · tema IN {6 colores definidos} · datos persisten al reiniciar (RNF04) |

---

## Leyenda de RF

| RF | Descripción |
|---|---|
| RF01 | Registro de cuenta y materias |
| RF02 | Creación y gestión de tareas |
| RF03 | Sistema de puntos por tareas completadas |
| RF04 | Recordatorios automáticos |
| RF05 | Sistema de insignias |
| RF06 | Retos semanales gamificados |
| RF07 | Panel de puntos acumulados |
| RF09 | Filtros y búsqueda de tareas |
| RF10 | Cronómetro Pomodoro |
| RF11 | Reportes semanales |
| RF12 | Modo enfoque (bloqueo de notificaciones) |
| RF13 | Personalización visual |
| RF15 | Metas semanales sugeridas |
| RNF02 | Tiempo de respuesta ≤ 2 segundos |
| RNF04 | Persistencia de datos en localStorage |
| RNF12 | Contraseñas cifradas |
| RNF15 | Notificaciones con Notifications API |
