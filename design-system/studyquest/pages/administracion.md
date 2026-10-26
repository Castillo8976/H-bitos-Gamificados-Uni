# Administración — diferencias respecto al maestro

> Perfil: **Administrador** · Solo diferencias; el resto, `MASTER.md`.

## Carácter
Consola empresarial modular: densidad alta, prioridad a escaneo y control. Hereda tema y modo del usuario.

## Navegación (grupo «Administración» del sidebar)
Resumen · Usuarios · Asignaturas · Insignias · Niveles · Retos · Correcciones · Indicadores.
Cada destino es su propia vista (`data-vista`); nunca se navega por scroll hasta un formulario.

## Patrón por módulo
- Encabezado de vista + barra de herramientas (maestro §5 Búsqueda) + tabla paginada.
- Alta/edición en `<dialog>` o panel contextual abierto por «Nuevo …» / «Editar».
- Densidad: padding de tarjeta `--esp-4`; tablas en ≥720px, tarjetas compactas en <720px.

## Módulos
- **Usuarios:** columnas Nombre | Correo | Rol | Estado | Acciones. Búsqueda nombre/correo, filtros rol y estado, orden por columna, paginación. Cambiar rol en diálogo que muestra usuario, rol actual → nuevo; el 409 (último administrador) se muestra en el diálogo. **Desactivar** = confirmación crítica (maestro §5) mostrando nombre, correo, rol y estado reales.
- **Asignaturas:** búsqueda, filtro activas/inactivas, total, orden alfabético, paginación 10/20/50, acciones editar · activar/desactivar · eliminar.
- **Insignias / Niveles:** módulos separados. Niveles muestran la progresión (puntos mínimos ordenados) como escala horizontal.
- **Retos:** filtros por estudiante, semana, estado; la condición se muestra en lenguaje natural («Completar 5 tareas»), nunca `tareas:5` crudo. Completar/acreditar es exclusivo del Estudiante: sin esa acción aquí.
- **Correcciones:** asistente en pasos — estudiante → tipo → formulario único de ese tipo → motivo → resumen de consecuencias → confirmación → resultado.

## Contenido
- Sin códigos P15/P16/P17 en títulos visibles.
