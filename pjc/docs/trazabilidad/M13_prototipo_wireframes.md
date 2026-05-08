# Tabla 13 — Prototipo → Wireframes, Interacciones, Pantallas Destino

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.13 Artefactos de Trazabilidad

> Esta matriz verifica que el prototipo interactivo cubra los flujos de navegación críticos, defina las interacciones de cada pantalla y establezca la pantalla de destino de cada acción.

---

## Interacciones simuladas por pantalla

| Pantalla | Elemento | Interacción | Resultado visual |
|---|---|---|---|
| P01 Login | Botón "Iniciar sesión" | Clic válido | Slide horizontal → P03 Dashboard |
| P01 Login | Botón "Iniciar sesión" | Clic inválido | Banner de error rojo bajo el formulario |
| P03 Dashboard | Checkbox tarea | Clic | Tachado + `X pts` flotante animado |
| P03 Dashboard | "Nueva tarea" | Clic | Panel lateral deslizante con formulario |
| P04 Lista tareas | Tarjeta | Clic | Expansión con opciones Editar / Completar / Eliminar |
| P06 Pomodoro | Botón "Iniciar" | Clic | Timer animado; fondo cambia a modo focus |
| P06 Pomodoro | Fin ciclo Pomodoro | Automático | Notificación + sonido + transición a descanso |
| P08 Gamificación | Insignia bloqueada | Hover | Tooltip con condición para desbloquear |
| P08 Gamificación | Nueva insignia | Automático | Modal de celebración con animación de brillo |
| P13 Configuración | Toggle modo oscuro | Clic | Toda la interfaz cambia a paleta oscura al instante |
| P13 Configuración | Selector de tema | Clic en color | Preview inmediato del tema en la pantalla |

---

## Flujo principal de navegación

| Desde | Elemento | Hacia | Transición |
|---|---|---|---|
| P01 Login | Botón "Iniciar sesión" | P03 Dashboard | Slide horizontal |
| P01 Login | Enlace "Regístrate" | P02 Registro | Slide horizontal |
| P02 Registro | Registro exitoso | P03 Dashboard | Fade in |
| P03 Dashboard | Sección "Mis tareas" | P04 Lista tareas | Slide |
| P03 Dashboard | Botón "Iniciar sesión" | P06 Pomodoro | Slide vertical |
| P03 Dashboard | Ícono engranaje | P13 Configuración | Panel desde la derecha |
| P03 Dashboard | Sección "Mis logros" | P08 Gamificación | Slide |
| P04 Lista tareas | Tarjeta de tarea | P05 Detalle | Expansión modal |
| P08 Gamificación | Tab "Insignias" | P09 | Tab switch sin recarga |
| Cualquier pantalla | Botón "Atrás" | P03 Dashboard | Slide |

---

## Criterios de validación del prototipo

1. Los 5 flujos principales son completables sin instrucciones: registro, crear tarea, completar tarea, iniciar Pomodoro y ver logros.
2. Los mensajes de error son comprensibles y los estados vacíos son informativos.
3. Accesibilidad: contraste mínimo 4.5:1, fuente ≥ 14 px en toda la interfaz (RNF06), navegación con máximo 3 clics (RNF07).
4. El modo oscuro no rompe ninguna vista y los colores de prioridad son distinguibles.
