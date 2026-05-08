# Entregable 17 — Prototipo Interactivo

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio — *Tu Agenda Inteligente*  
**Asignatura:** Ingeniería de Software II  
**Institución:** Uniremington — Medellín  
**Fase:** Fase 4 — Diseño de Interfaz de Usuario

---

## Especificaciones de alta fidelidad

El prototipo interactivo traduce los wireframes en especificaciones visuales concretas que permiten validar la experiencia de usuario sin necesidad de código. Está diseñado para implementarse en Figma o directamente en HTML/CSS/JS.

---

## 1. Paleta de colores

| Rol | Nombre | Hex | Uso principal |
|-----|--------|-----|---------------|
| Primario | Violeta plataforma | `#534AB7` | Botones primarios, encabezados, nav activa |
| Primario claro | Violeta suave | `#EEEDFE` | Fondos de tarjetas de cuenta/preferencias |
| Secundario | Verde teal | `#0F6E56` | Confirmaciones, tareas completadas, progreso positivo |
| Secundario claro | Verde teal suave | `#E1F5EE` | Fondos de tarjetas de tareas y materias |
| Acento gamif. | Ámbar | `#854F0B` | Puntos, insignias, retos y recompensas |
| Alerta | Coral | `#993C1D` | Tareas vencidas, errores, botones de peligro |
| Información | Azul | `#185FA5` | Notificaciones informativas, configuración |
| Fondo general | Gris claro | `#F1EFE8` | Fondo de página principal |
| Texto principal | Gris oscuro | `#2C2C2A` | Cuerpo de texto general |
| Modo oscuro fondo | Gris carbón | `#1A1A18` | Fondo en modo oscuro |

---

## 2. Tipografía

| Rol | Fuente | Peso | Tamaño |
|-----|--------|------|--------|
| Cuerpo de texto | Inter / Arial | Regular 400 | 16px |
| Títulos de pantalla | Inter / Arial | SemiBold 600 | 24–32px |
| Encabezados de tarjeta | Inter / Arial | Medium 500 | 14–18px |
| Datos numéricos (puntos, timer) | Inter / Arial | Bold 700 | 28–48px |

---

## 3. Interacciones simuladas

| Pantalla | Elemento | Interacción | Resultado visual |
|----------|----------|-------------|-----------------|
| P01 Login | Botón 'Iniciar sesión' | Clic válido | Slide horizontal → P03 Dashboard |
| P01 Login | Botón 'Iniciar sesión' | Clic inválido | Banner de error rojo bajo el formulario |
| P03 Dashboard | Checkbox tarea | Clic | Tachado + `+X pts` flotante animado |
| P03 Dashboard | '+ Nueva tarea' | Clic | Panel lateral deslizante con formulario |
| P04 Lista tareas | Tarjeta | Clic | Expansión con opciones: Editar / Completar / Eliminar |
| P06 Pomodoro | Botón 'Iniciar' | Clic | Timer animado · fondo cambia a modo focus |
| P06 Pomodoro | Fin ciclo Pomodoro | Automático | Notificación + sonido + transición a descanso |
| P08 Gamificación | Insignia bloqueada | Hover | Tooltip con condición para desbloquear |
| P08 Gamificación | Nueva insignia | Automático | Modal de celebración con animación de brillo |
| P13 Configuración | Toggle modo oscuro | Clic | Toda la interfaz cambia a paleta oscura al instante |
| P13 Configuración | Selector de tema | Clic en color | Preview inmediato del tema en la pantalla |

---

## 4. Pantallas conectadas — flujo principal

| Desde | Elemento | Hacia | Transición |
|-------|----------|-------|-----------|
| P01 Login | Botón 'Iniciar sesión' | P03 Dashboard | Slide horizontal → |
| P01 Login | Enlace 'Regístrate' | P02 Registro | Slide horizontal → |
| P02 Registro | Registro exitoso | P03 Dashboard | Fade in |
| P03 Dashboard | Sección 'Mis tareas' | P04 Lista tareas | Slide → |
| P03 Dashboard | Botón 'Iniciar sesión' | P06 Pomodoro | Slide vertical ↑ |
| P03 Dashboard | Ícono engranaje | P13 Configuración | Panel desde la derecha |
| P03 Dashboard | Sección 'Mis logros' | P08 Gamificación | Slide → |
| P04 Lista tareas | Tarjeta de tarea | P05 Detalle | Expansión / modal |
| P08 Gamificación | Tab 'Insignias' | P09 | Tab switch (sin recarga) |
| Cualquier pantalla | Botón 'Atrás' | P03 Dashboard | Slide ← |

---

## 5. Componentes e iconografía

**Íconos:** librería Lucide Icons (open source, SVG), sin instalación adicional en HTML/CSS.

**Insignias:** SVG circular con fondo del color de su categoría.

| Ícono | Categoría |
|-------|-----------|
| Estrella | Logros de tareas |
| Llama | Rachas |
| Reloj | Tiempo estudiado |
| Trofeo | Retos |

**Barra de progreso:** componente reutilizable con animación CSS de llenado suave.

```css
transition: width 0.5s ease;
```

**Tarjetas de tarea:**

```css
box-shadow: 0 2px 8px rgba(0,0,0,0.08);
border-radius: 12px;
/* Borde izquierdo según prioridad */
border-left: 4px solid;  /* Rojo=Alta · Ámbar=Media · Verde=Baja */
```

**Temporizador Pomodoro:**

```css
font-family: monospace;
/* Modo enfoque */  background: #EEEDFE;
/* Modo descanso */ background: #E1F5EE;
transition: background 1s;
```

**Animación de puntos al completar tarea:**

```css
@keyframes floatPoints {
  0%   { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-40px); }
}
animation: floatPoints 1.2s ease-out forwards;
```

**Modo oscuro:**

```css
/* Variables CSS + clase 'dark' en el elemento raíz */
.dark {
  --bg-primary:    #1A1A18;
  --bg-card:       #26251F;
  --text-primary:  #E8E6DE;
}
```

---

## 6. Validación con el docente

Los cinco flujos principales que deben ser completables sin instrucciones:

1. **Registro** — crear cuenta con correo, contraseña y al menos una materia.
2. **Crear tarea** — ingresar nombre, fecha, prioridad y materia.
3. **Completar tarea** — marcar checkbox y ver animación de puntos.
4. **Iniciar Pomodoro** — iniciar cronómetro vinculado a una tarea.
5. **Ver logros** — acceder al panel de gamificación con insignias y puntos.

**Criterios de aceptación:**

- Mensajes de error comprensibles y estados vacíos informativos.
- Contraste mínimo 4.5:1 en toda la interfaz (RNF06).
- Fuente ≥ 14px en todos los elementos visibles (RNF06).
- Navegación con máximo 3 clics desde el Dashboard a cualquier función (RNF07).
- Modo oscuro no rompe ninguna vista.
- Colores de prioridad (Alta/Media/Baja) distinguibles sin depender solo del color.

---

## Trazabilidad del entregable

### Tabla 13 — Prototipo → Wireframes → Interacciones → Pantallas destino

| Elemento del prototipo | Wireframe origen | Interacción | Pantalla destino | Tipo de transición |
|------------------------|-----------------|-------------|------------------|--------------------|
| Botón 'Iniciar sesión' (válido) | W01 Login | Clic | P03 Dashboard | Slide horizontal → |
| Botón 'Iniciar sesión' (inválido) | W01 Login | Clic | P01 (mismo) | Banner error rojo |
| Enlace 'Regístrate' | W01 Login | Clic | P02 Registro | Slide → |
| Checkbox tarea próxima | W02 Dashboard | Clic | P03 (mismo) | Animación +Xpts · actualiza progreso |
| Botón '+ Nueva tarea' | W02 Dashboard | Clic | P03 (mismo) | Panel lateral deslizante |
| Sección 'Mis tareas' | W02 Dashboard | Clic | P04 Lista tareas | Slide → |
| Botón 'Iniciar sesión de estudio' | W02 Dashboard | Clic | P06 Pomodoro | Slide vertical ↑ |
| Chip de prioridad 'Alta' | W03 Tareas | Visual | — | Color rojo (badge) |
| Tarjeta de tarea | W03 Tareas | Clic | P05 Detalle | Expansión / modal |
| Botón 'Iniciar' Pomodoro | W04 Pomodoro | Clic | P06 (mismo) | Timer animado · fondo modo focus |
| Fin ciclo Pomodoro | W04 Pomodoro | Automático | P06 (mismo) | Notificación + transición descanso |
| Toggle modo oscuro | W06 Config. | Clic | P13 (mismo) | Toda la interfaz cambia al instante |
| Selector de tema | W06 Config. | Clic en color | P13 (mismo) | Preview inmediato del tema |
| Botón 'Guardar cambios' | W06 Config. | Clic | P03 Dashboard | Slide ← con preferencias aplicadas |

### RF y RNF cubiertos por este entregable

| Tipo | Identificadores |
|------|----------------|
| Requisitos funcionales | RF01 · RF02 · RF03 · RF04 · RF05 · RF06 · RF07 · RF08 · RF09 · RF10 · RF11 · RF12 · RF13 · RF14 · RF15 |
| Requisitos no funcionales | RNF04 · RNF06 · RNF07 · RNF14 |
| Casos de uso cubiertos | CU01 · CU02 · CU03 · CU04 · CU05 · CU06 · CU07 · CU08 · CU09 · CU10 |

---

*Entregable 17 de 17 — Fase 4: Diseño de Interfaz de Usuario*
