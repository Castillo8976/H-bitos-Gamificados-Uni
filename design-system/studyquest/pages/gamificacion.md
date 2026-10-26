# Gamificación — diferencias respecto al maestro

> Componentes de puntos, niveles, insignias, retos y metas usados en Estudiante (y en solo lectura en Administración). Solo diferencias; el resto, `MASTER.md`.

## Principios
- Adulta y basada en datos: cifras, barras de progreso y estados; sin mascotas, confeti ni sonidos.
- Solo se muestra lo que entrega la API. Nada de datos, recompensas o predicciones inventadas.

## Componentes
- **Barra de progreso:** `role="progressbar"` con `aria-valuenow/min/max` y texto visible «X / Y». Relleno `--progreso`, pista `--superficie-2`, alto 8px, `--radio-pill`.
- **Insignia:** tarjeta compacta (icono SVG 24px, nombre, criterio). Estados «Obtenida» (borde `--logro`) y «Bloqueada» (opacidad .55 + texto).
- **Reto:** chip de estado con texto (Activo / Completado / Inactivo) + condición en lenguaje natural + recompensa en puntos.
- **Meta semanal:** muestra la semana ISO en texto («Semana 43 · 2026»). La sugerencia fija de 5 actividades se rotula «Sugerencia estándar», nunca como recomendación personalizada. Consultar la sugerencia no guarda nada; acciones: Aceptar · Personalizar · Crear meta propia.

## Color
Puntos e insignias `--logro` · nivel `--nivel` · avance `--progreso`. No dependen del tema salvo `--nivel`.
