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
- La comparación campo por campo y acción por acción de los seis wireframes principales deja diferencias verificables entre el prototipo y la construcción.

## 3.1 Matriz de diferencias verificadas

La siguiente matriz se levantó comparando `entregable_16_wireframes.md`, `entregable_17_prototipo_interactivo.md` y `src/public/index.html`. Una diferencia solo puede aceptarse como válida si está respaldada por un requisito, el mapa de navegación o un CRF aprobado.

| Prototipo | Elementos que sí coinciden | Diferencias o elementos faltantes | Acción de cierre |
|---|---|---|---|
| W01 / P01 Login | Correo, contraseña, inicio de sesión y creación de cuenta | La construcción usa pestañas en lugar del enlace “Regístrate aquí” y añade textos informativos de marca | Registrar la decisión visual en CRF o ajustar al flujo del prototipo |
| W02 / P03 Dashboard | Resumen, tareas, Pomodoro y acceso a módulos | Falta avatar/configuración en la cabecera, falta la barra inferior y el bloque de logros; se usa navegación lateral y se muestran métricas adicionales | CRF para la navegación y componentes adicionales, o ajustar la pantalla |
| W03 / P04 Tareas | Búsqueda, materia, prioridad, estado, limpieza, creación, edición, “En progreso” y eliminación | El estado “Vencida” se calcula visualmente por fecha y no se persiste como estado | Aceptado: “Vencida” es una vista derivada; `CRF-005` documenta “En progreso” |
| W04 / P06 Pomodoro | Tarea opcional, contador, iniciar, pausa/reanudación, detener/guardar, cancelar, modo libre, descanso automático y aviso de enfoque | La notificación del navegador depende del permiso concedido por el usuario | Aceptado y documentado en `CRF-005` |
| W05 / P08 Gamificación | Puntos, nivel, progreso, tabs Insignias/Reto/Historial, historial de puntos, retos y metas, modal de recompensa | El historial separado de insignias por fecha queda fuera del flujo actual | Registrar como mejora posterior o CRF específico si se exige |
| W06 / P13 Configuración | Tema, modo oscuro, avatar, edición de nombre, correo, exportación, toggles de notificaciones y eliminación confirmada | El permiso del navegador se solicita al iniciar el temporizador, no desde un botón independiente de configuración | Aceptado y documentado en `CRF-005` |

Las pantallas P02 y P05–P20 que no tienen wireframe independiente requieren además una validación contra el mapa de navegación, los requisitos y las acciones documentadas. Su existencia funcional no demuestra por sí sola equivalencia visual exacta.

## 4. Criterio de cierre recomendado

Para cerrar este punto, se requieren estas condiciones:

1. Decidir para cada diferencia si se implementa el elemento del prototipo o se conserva la variante construida.
2. Crear y aprobar un CRF por cada diferencia de alcance que no sea equivalente 1:1, indicando motivo, responsable, impacto, artefactos afectados y aprobación OCI.
3. Repetir la revisión visual y adjuntar evidencia de las pantallas corregidas o de los CRF aprobados.

Después de esta implementación, el punto 10 queda **Parcial avanzado**: las diferencias principales ya tienen controles visibles, comportamiento y documentación de cambio. Para marcarlo **Cumple** todavía falta la revisión visual final en Chrome, aprobación de OCI del `CRF-005` y decidir si el historial separado de insignias es obligatorio.
