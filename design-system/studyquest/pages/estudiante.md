# Estudiante — diferencias respecto al maestro

> Perfil: **Estudiante** · Vistas: dashboard, materias, tareas, pomodoro, gamificacion, estadisticas, recordatorios, notificaciones, configuracion, exportacion. Solo diferencias; el resto, `MASTER.md`.

## Carácter
Dashboard de productividad académica con gamificación adulta: el progreso se comunica con cifras, barras y estados, no con ilustraciones.

## Navegación
- Barra lateral agrupada: **Estudio** (Inicio, Materias, Tareas, Pomodoro) · **Progreso** (Gamificación, Tablero) · **Avisos** (Recordatorios, Notificaciones) · **Cuenta** (Configuración, Exportar).
- El contador de notificaciones aparece en el ítem del sidebar y en el botón de notificaciones del encabezado (visible también con el drawer cerrado).

## Configuración
- Secciones separadas: Perfil · Seguridad · Preferencias visuales · Notificaciones · Exportación · **Zona de peligro** (tarjeta con borde `--error`, al final, acciones con confirmación crítica).

## Dashboard (`#vista-dashboard`)
- Orden: encabezado con saludo + acción principal «Nueva tarea» → fila de 4 métricas existentes (`#metrica-puntos`, `#metrica-nivel`, `#metrica-pendientes`, `#metrica-sesiones`) → columnas: próximas tareas (1.25fr) | sesión de estudio + reto semanal (1fr).
- La acción «Iniciar Pomodoro» es `.secundario`; solo «Nueva tarea» es `.primario`.

## Gamificación
- Nivel actual con barra de progreso al siguiente (`--progreso`, `role="progressbar"` con `aria-valuenow/min/max`) y texto «X / Y puntos».
- Insignias en rejilla de tarjetas compactas: icono SVG, nombre, criterio; bloqueadas con opacidad .55 + texto «Bloqueada».
- Colores: puntos e insignias `--logro`; nivel `--nivel`; avance y sesiones `--progreso`.

## Pomodoro
- Temporizador `clamp(3rem, 10vw, 5rem)`, `tabular-nums`, centrado; controles debajo (Iniciar `.primario`, Pausar/Reiniciar `.secundario`).
- Estado anunciado con `aria-live="polite"` solo al cambiar de fase, no cada segundo.

## Tareas
- Filtros en una fila ≥1024px (búsqueda 2fr + 3 selects); en móvil, búsqueda visible y filtros en panel plegable.
- Prioridad: borde izquierdo + chip con texto. Completada: tachado + `--texto-suave`.

## Recompensas
- `#modal-recompensa` sobrio (maestro §5 Feedback); se muestra como máximo una vez por acción.
