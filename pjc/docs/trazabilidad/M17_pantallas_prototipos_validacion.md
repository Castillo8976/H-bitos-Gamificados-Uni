# M17-A — Validación de pantallas vs prototipos aprobados

**Fecha de revisión:** 21 de septiembre de 2026  
**Objetivo:** formalizar qué pantallas ya tienen evidencia de concordancia con el prototipo aprobado y cuáles quedan pendientes por comparación de campos, acciones y alcance.

## 1. Alcance

La revisión del punto 10 no exige que cada pantalla tenga un mockup nuevo; exige que la implementación real quede alineada con los prototipos aprobados W01–W06 y con el mapa P01–P20 del diseño.

La evidencia existente del proyecto está en:

- [entregable_15_mapa_navegacion.md](../diseno/fase4-interfaz/entregable_15_mapa_navegacion.md)
- [entregable_16_wireframes.md](../diseno/fase4-interfaz/entregable_16_wireframes.md)
- [M12_pantallas_roles.md](M12_pantallas_roles.md)
- [M16_trazabilidad_frontend.md](M16_trazabilidad_frontend.md)
- [src/public/index.html](../../src/public/index.html)

## 2. Matriz de cumplimiento por pantalla

| Pantalla | Prototipo / referencia | Estado | Evidencia | Observación |
|---|---|---:|---|---|
| P01 Login | W01 | Cumple | Formulario de acceso en `index.html` y flujo `login` en `app.js` | Coincide con la intención del prototipo principal. |
| P02 Registro | Mapa P02 | Cumple | Formulario de registro y creación de cuenta con materia inicial | La lógica incluye la materia inicial requerida por HU01. |
| P03 Dashboard | W02 | Cumple | Dashboard con métricas, tareas próximas, sesión, gamificación y navegación | El hub central está implementado y responde al prototipo. |
| P04 Lista de tareas | W03 | Cumple | Lista con búsqueda, filtros, creación, edición y completado | La funcionalidad real coincide con la estructura principal del wireframe. |
| P05 Detalle / edición de tarea | Mapa P05 | Parcial | Existencia de detalle modal y edición desde la lista | Hay soporte funcional, pero no hay validación formal de cada campo y acción del prototipo. |
| P06 Pomodoro / sesiones | W04 | Cumple | Temporizador, tarea opcional, guardar sesión y cierre de ciclo | La interactividad de sesión está implementada y comprobada en la API. |
| P07 Agenda / materias | Mapa P07 | Parcial | Formulario y lista de materias | Se implementó la funcionalidad, pero no existe una validación visual detallada del prototipo. |
| P08 Panel de gamificación | W05 | Cumple | Puntos, niveles, insignias, retos y metas | La vista funcional corresponde al prototipo del módulo de gamificación. |
| P09 Insignias obtenidas | Mapa P09 | Parcial | Se listan insignias y estado de desbloqueo | La lógica existe, pero no hay un prototipo de detalle interno verificado. |
| P10 Reto semanal activo | Mapa P10 | Parcial | El reto y la meta aparecen en la vista de gamificación | La pantalla está funcional, aunque no está contrastada con un prototipo específico. |
| P11 Tablero de avance personal | Mapa P11 | Parcial | Se consulta el periodo y se presentan estadísticas semanales | La pantalla funcional existe, pero no está validada detalle a detalle con el prototipo. |
| P12 Filtros y búsqueda de tareas | Mapa P12 | Parcial | Búsqueda y filtros por prioridad/estado | Hay comportamiento funcional, pero faltan comprobaciones de campo/acción frente al prototipo. |
| P13 Configuración / perfil | W06 | Cumple | Perfil, preferencias visuales, tema y modo oscuro | Coincide muy claramente con la intención del wireframe principal. |
| P14 Exportación de datos | Mapa P14 | Parcial | Botón y descarga JSON del contenido personal | La acción existe, pero la comparación formal del prototipo no quedó cerrada. |
| P15 Panel de administración | Mapa P15 | Parcial | Vista de gestión con usuarios, catalogos y correcciones | Existe funcionalidad real, pero falta comparación con un prototipo formal. |
| P16 Gestión de usuarios | Mapa P16 | Parcial | Operaciones de cuentas y roles | Funcional, pero aún no hay validación final de UI como prototipo. |
| P17 Gestión de insignias, niveles y retos | Mapa P17 | Parcial | Panel administrativo con catálogo y retos | Estructura funcional; pendiente comparación exacta de campos y flujo. |
| P18 Tablero institucional | Mapa P18 | Parcial | Indicadores institucionales por periodo | Hay funcionalidad real, pero no se demuestra concordancia prototipo a prototipo. |
| P19 Notificaciones | Mapa P19 | Parcial | Vista de notificaciones y marcado como leídas | Existe y funciona; falta validación del prototipo detallado. |
| P20 Recordatorios | Mapa P20 | Parcial | Alta y listado de recordatorios | Existe funcionalidad, pero no un prototipo de detalle validado. |

## 3. Conclusión de cumplimiento

La situación real es:

- Sí existe una cobertura funcional de la mayoría de las pantallas del mapa de navegación.
- Sí están implementados los flujos principales de acceso, tareas, Pomodoro, gamificación, configuración y administración.
- No está cerrada la validación “campo por campo / acción por acción” para toda la pantalla secundaria y los paneles de administración y reportes.

En consecuencia, el criterio de construcción debe mantenerse en estado Parental de acuerdo con la hoja M17: funcionalmente cubierto, pero no cerrado formalmente como equivalente exacto del prototipo aprobado.

## 4. Criterio de cierre recomendado

Para cerrar este punto, se requieren dos condiciones adicionales:

1. Una matriz de validación visual pantalla a pantalla con campos y acciones comparadas contra un prototipo aprobado.
2. CRF formal para las pantallas o diferencias de alcance que no sean equivalentes 1:1 con el diseño aprobado.

Hasta que esto ocurra, la condición de pantallas acordes a prototipos sigue siendo parcial, aunque la funcionalidad del sistema esté operativa.
