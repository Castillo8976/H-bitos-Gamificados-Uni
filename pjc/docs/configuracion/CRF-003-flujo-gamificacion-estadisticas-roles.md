# CRF-003 — Flujo de gamificación, estadísticas y vistas por rol

**Fecha:** 20 de septiembre de 2026  
**Responsables:** Juan David Castillo Mena · Alejandro Cardona Jaramillo  
**Estado:** Implementado; pendiente de aprobación formal para Línea Base 1

## Solicitud

Completar los objetivos 6 a 10 de Construcción: coordinar las reglas que estaban
implementadas como operaciones aisladas, calcular indicadores sin una tabla
`reporte`, exportar los datos propios y habilitar las pantallas aprobadas para
Estudiante, Administrador y Revisor institucional.

## Decisiones

1. Completar una tarea entrega **10 puntos** y registrar una sesión válida entrega
   **5 puntos**. Cada movimiento conserva `origen` e `id_origen`.
2. El índice único parcial `uq_punto_evento(id_cuenta, origen, id_origen)` impide
   recompensar dos veces el mismo evento. Los movimientos administrativos sin
   `id_origen` continúan permitidos.
3. La condición de un reto usa `metrica:objetivo`, por ejemplo `tareas:5`,
   `sesiones:7`, `pomodoros:10` o `minutos:120`. Las condiciones históricas sin
   prefijo se interpretan como tareas para conservar compatibilidad. Una sesión
   Pomodoro avanza las métricas `sesiones`, `pomodoros` y `minutos`; una sesión
   libre avanza `sesiones` y `minutos`.
4. Las metas existentes determinan la unidad por su descripción: tareas por
   defecto; minutos, sesiones o Pomodoros cuando esas palabras aparecen.
5. El Revisor consulta únicamente cifras globales agregadas de cuentas activas
   con rol Estudiante. No recibe nombres, correos, identificadores ni filas.
6. RF14 se implementa solamente en JSON, tal como fue aprobado.
7. Como la entidad `tarea` aprobada no posee fecha de creación, el indicador
   `tareas_creadas` representa las tareas actualmente registradas por la cuenta;
   `tareas_completadas` sí se limita al periodo mediante `fecha_completada`.
8. Toda corrección administrativa de puntos o insignias exige un motivo,
   permite asignar o retirar el registro correspondiente y genera una
   notificación para la cuenta afectada.

## Impacto y evidencia

| Elemento | Resultado |
|---|---|
| E11 / `Punto.js` | Índice único parcial para idempotencia |
| RN | RN22–RN25 formalizan puntuación, condición, transacción y privacidad |
| M9 | `GamificacionService`, `EstadisticasService` y `ExportadorDatos` |
| M15 / M16 | Endpoints, pantallas y casos de prueba trazados |
| Pruebas | `objectives-6-10.test.js`, `api.test.js`, `static.test.js` |
