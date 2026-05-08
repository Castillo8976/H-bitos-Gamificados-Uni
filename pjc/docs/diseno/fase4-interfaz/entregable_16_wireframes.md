# Entregable 16 — Wireframes de Baja Fidelidad

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio — *Tu Agenda Inteligente*  
**Asignatura:** Ingeniería de Software II  
**Institución:** Uniremington — Medellín  
**Fase:** Fase 4 — Diseño de Interfaz de Usuario

---

## Descripción general

Los wireframes muestran la estructura visual de las pantallas principales de forma esquemática. El propósito es definir la disposición de los elementos, las zonas de contenido y las acciones disponibles para el usuario, sin colores definitivos ni tipografías de diseño.

Se documentan **6 wireframes** correspondientes a las pantallas principales del sistema:

| ID | Pantalla | Pantalla destino | CU asociado | RF relacionado |
|----|----------|-----------------|-------------|----------------|
| W01 | Login | P01 | CU01 | RF01 |
| W02 | Dashboard principal | P03 | CU02–CU06 | RF02–RF11 |
| W03 | Lista de tareas | P04 | CU02, CU03, CU07 | RF02, RF03, RF09 |
| W04 | Modo Pomodoro / Cronómetro | P06 | CU04 | RF10, RF12 |
| W05 | Panel de gamificación | P08 | CU06 | RF05, RF06, RF07 |
| W06 | Configuración / Preferencias | P13 | CU08 | RF13, RNF04 |

---

## W01 — Login (P01)

**Rol:** todos los usuarios  
**Acceso desde:** URL raíz de la aplicación  
**CU asociado:** CU01 · **RF:** RF01

### Estructura de zonas

```
┌─────────────────────────────────────────┐
│                                         │
│            [ LOGO / NOMBRE ]            │  ← Zona de marca
│         Tu Agenda Inteligente           │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│         ┌───────────────────┐           │
│         │  Correo           │           │  ← Campo de texto
│         └───────────────────┘           │
│                                         │
│         ┌───────────────────┐           │
│         │  Contraseña       │           │  ← Campo de texto (oculto)
│         └───────────────────┘           │
│                                         │
│         [ Iniciar sesión ]              │  ← Botón primario
│                                         │
│         ¿No tienes cuenta?              │
│         [ Regístrate aquí ]             │  ← Enlace de navegación
│                                         │
├─────────────────────────────────────────┤
│  [ Banner de error ] (oculto por def.)  │  ← Zona de feedback
└─────────────────────────────────────────┘
```

### Componentes y acciones

| Zona | Componente | Acción | Resultado |
|------|-----------|--------|-----------|
| Marca | Logo + nombre de la app | — | Identidad visual |
| Formulario | Campo correo | Ingreso de texto | Valida formato email |
| Formulario | Campo contraseña | Ingreso de texto | Oculta caracteres |
| CTA principal | Botón "Iniciar sesión" | Clic válido | Navega a P03 Dashboard (slide →) |
| CTA principal | Botón "Iniciar sesión" | Clic inválido | Muestra banner de error rojo |
| Enlace | "Regístrate aquí" | Clic | Navega a P02 Registro (slide →) |
| Feedback | Banner de error | Automático | Aparece bajo el formulario con mensaje descriptivo |

### Notas de diseño

- El formulario se centra verticalmente en pantalla (sin sidebar).
- El banner de error es invisible por defecto; aparece solo tras un intento fallido.
- Fuente mínima 14px en todos los campos (RNF06).
- Contraste de placeholder ≥ 4.5:1 (RNF06).

---

## W02 — Dashboard principal (P03)

**Rol:** Estudiante  
**Acceso desde:** Login exitoso o registro exitoso  
**CU asociado:** CU02, CU03, CU04, CU05, CU06 · **RF:** RF02–RF11

### Estructura de zonas

```
┌──────────────────────────────────────────────────────────┐
│  [ Logo ]   Tu Agenda Inteligente   [Avatar] [⚙ Config]  │  ← Navbar
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────┐  ┌───────────────────────┐    │
│  │  Bienvenido, [Nombre]│  │   🏆 Puntos: 0        │    │  ← Zona resumen
│  │  Semana actual       │  │   Nivel: Principiante  │    │
│  └──────────────────────┘  └───────────────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Mis tareas próximas              [ + Nueva ]    │   │  ← Zona tareas
│  │  ○ [Nombre tarea] · [Materia] · [Fecha]          │   │
│  │  ○ [Nombre tarea] · [Materia] · [Fecha]          │   │
│  │  ○ [Nombre tarea] · [Materia] · [Fecha]          │   │
│  │                          [ Ver todas →]          │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌────────────────────┐  ┌───────────────────────────┐  │
│  │  Sesión de estudio │  │  Progreso semanal         │  │  ← Zona acciones
│  │  [ Iniciar ▶ ]     │  │  ████░░░░ 3/7 tareas     │  │
│  │  Modo Pomodoro     │  │  2.5h · 120 pts           │  │
│  └────────────────────┘  └───────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  Mis logros recientes             [ Ver todos →] │   │  ← Zona logros
│  │  [🌟] [🔥] [⏱] [🔒] [🔒] [🔒]                   │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [ 🏠 Inicio ] [ ✓ Tareas ] [ ⏱ Pomodoro ] [ 🏆 Logros ] │  ← Barra navegación inferior
└──────────────────────────────────────────────────────────┘
```

### Componentes y acciones

| Zona | Componente | Acción | Resultado |
|------|-----------|--------|-----------|
| Navbar | Ícono engranaje ⚙ | Clic | Abre panel de configuración P13 (desde la derecha) |
| Navbar | Avatar | Clic | Muestra menú de perfil |
| Resumen | Tarjeta de puntos y nivel | Visual | Muestra acumulado de la semana |
| Tareas | Checkbox de tarea | Clic | Tachado + animación `+X pts` flotante |
| Tareas | Botón "+ Nueva" | Clic | Panel lateral deslizante con formulario de creación |
| Tareas | Enlace "Ver todas →" | Clic | Navega a P04 Lista de tareas (slide →) |
| Acciones | Botón "Iniciar ▶" | Clic | Navega a P06 Pomodoro (slide vertical ↑) |
| Progreso | Barra de progreso semanal | Visual | Muestra ratio tareas completadas / total |
| Logros | Insignia desbloqueada | Hover | Muestra nombre de la insignia |
| Logros | Insignia bloqueada 🔒 | Hover | Muestra tooltip con condición para desbloquear |
| Logros | "Ver todos →" | Clic | Navega a P08 Gamificación (slide →) |
| Nav inferior | Tab "Tareas" | Clic | Navega a P04 |
| Nav inferior | Tab "Pomodoro" | Clic | Navega a P06 |
| Nav inferior | Tab "Logros" | Clic | Navega a P08 |

### Notas de diseño

- El Dashboard muestra máximo 3 tareas próximas para no saturar la pantalla.
- La barra de progreso es el mismo componente reutilizable del E17.
- Las insignias bloqueadas se muestran en gris; las desbloqueadas, en su color de categoría.
- Máximo 3 clics desde aquí para llegar a cualquier funcionalidad (RNF07).

---

## W03 — Lista de tareas (P04)

**Rol:** Estudiante  
**Acceso desde:** Dashboard (sección "Mis tareas" o tab inferior)  
**CU asociado:** CU02, CU03, CU07 · **RF:** RF02, RF03, RF09

### Estructura de zonas

```
┌──────────────────────────────────────────────────────────┐
│  ← Atrás        Mis tareas            [ + Nueva tarea ]  │  ← Header
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  [ 🔍 Buscar tarea... ]                           │   │  ← Zona búsqueda
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Filtros:  [Materia ▾]  [Prioridad ▾]  [Estado ▾]  [X]  │  ← Zona filtros
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ○  [Nombre tarea]           [Alta]  Vence: 12/05 │   │  ← Tarjeta tarea
│  │    Materia: Ingeniería de Software II             │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ○  [Nombre tarea]          [Media]  Vence: 15/05 │   │  ← Tarjeta tarea
│  │    Materia: Bases de Datos                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ ✓  [Nombre tarea]           [Baja]  Completada   │   │  ← Tarjeta completada
│  │    Materia: Cálculo                               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [ Estado vacío: "No hay tareas con estos filtros" ]    │  ← Estado vacío (condicional)
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [ 🏠 Inicio ] [ ✓ Tareas ] [ ⏱ Pomodoro ] [ 🏆 Logros ] │  ← Nav inferior
└──────────────────────────────────────────────────────────┘
```

### Componentes y acciones

| Zona | Componente | Acción | Resultado |
|------|-----------|--------|-----------|
| Header | Botón "+ Nueva tarea" | Clic | Panel lateral deslizante con formulario |
| Header | Botón "← Atrás" | Clic | Regresa a P03 Dashboard (slide ←) |
| Búsqueda | Campo de texto | Escritura | Filtra lista en tiempo real por nombre |
| Filtros | Selector "Materia" | Clic | Despliega materias registradas |
| Filtros | Selector "Prioridad" | Clic | Opciones: Alta / Media / Baja |
| Filtros | Selector "Estado" | Clic | Opciones: Pendiente / En progreso / Completada / Vencida |
| Filtros | Botón X (limpiar) | Clic | Remueve todos los filtros activos |
| Tarjeta tarea | Checkbox ○ | Clic | Marca como completada + animación `+X pts` |
| Tarjeta tarea | Área de tarjeta | Clic | Expande con opciones: Editar / Completar / Eliminar (P05) |
| Tarjeta tarea | Chip de prioridad | Visual | Borde izquierdo: rojo=Alta · ámbar=Media · verde=Baja |
| Estado vacío | Mensaje | Automático | Aparece cuando ninguna tarea coincide con los filtros |

### Panel lateral — Formulario nueva tarea

```
┌───────────────────────────────┐
│  Nueva tarea              [X] │
├───────────────────────────────┤
│  Nombre *                     │
│  [ ________________________ ] │
│                               │
│  Fecha de entrega *           │
│  [ dd/mm/aaaa          📅 ]   │
│                               │
│  Prioridad *                  │
│  ( ) Alta  ( ) Media  ( ) Baja│
│                               │
│  Materia (opcional)           │
│  [ Seleccionar materia... ▾ ] │
│                               │
│  [ Guardar tarea ]            │
└───────────────────────────────┘
```

### Notas de diseño

- Las tarjetas con prioridad Alta tienen borde izquierdo rojo; Media, ámbar; Baja, verde.
- Las tareas completadas se muestran con texto tachado y opacidad reducida.
- Las tareas vencidas tienen fondo coral suave y etiqueta "Vencida".
- Los filtros son acumulativos (pueden combinarse).

---

## W04 — Modo Pomodoro / Cronómetro (P06)

**Rol:** Estudiante  
**Acceso desde:** Dashboard (botón "Iniciar" o tab inferior) · Detalle de tarea  
**CU asociado:** CU04 · **RF:** RF10, RF12

### Estructura de zonas

```
┌──────────────────────────────────────────────────────────┐
│  ← Atrás         Concentración Total                     │  ← Header
├──────────────────────────────────────────────────────────┤
│                                                          │
│         ┌────────────────────────────────┐              │
│         │   Vinculado a:                 │              │  ← Zona tarea vinculada
│         │   [ Seleccionar tarea... ▾ ]   │              │
│         └────────────────────────────────┘              │
│                                                          │
│         ┌────────────────────────────────┐              │
│         │                                │              │
│         │           25:00                │              │  ← Zona timer
│         │       (fuente grande)          │              │
│         │                                │              │
│         │    [ ▶ Iniciar ]               │              │  ← CTA principal
│         │                                │              │
│         └────────────────────────────────┘              │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Modo:  ( ● ) Pomodoro 25/5    ( ) Libre          │ │  ← Selector de modo
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  🔔 Modo enfoque activo — notificaciones bloqueadas │ │  ← Banner enfoque (condicional)
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Sesiones hoy: 0   ·   Tiempo total: 0h 0m         │ │  ← Zona estadísticas
│  └────────────────────────────────────────────────────┘ │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [ 🏠 Inicio ] [ ✓ Tareas ] [ ⏱ Pomodoro ] [ 🏆 Logros ] │
└──────────────────────────────────────────────────────────┘
```

### Componentes y acciones

| Zona | Componente | Acción | Resultado |
|------|-----------|--------|-----------|
| Tarea vinculada | Selector desplegable | Clic | Lista de tareas pendientes para vincular (opcional) |
| Timer | Display "25:00" | Visual | Cuenta regresiva animada en tiempo real |
| Timer | Fondo del timer | Automático | Cambia a violeta suave `#EEEDFE` en modo enfoque · verde suave `#E1F5EE` en descanso |
| CTA | Botón "▶ Iniciar" | Clic | Inicia cuenta regresiva + muestra banner de modo enfoque + cambia a "⏸ Pausar" |
| CTA | Botón "⏸ Pausar" | Clic | Detiene el cronómetro; puede reanudarse |
| CTA | Botón "⏹ Detener y guardar" | Clic | Guarda sesión en `sesion_estudio` + navega de vuelta |
| CTA | Botón "⏹ Cancelar" | Clic | Descarta la sesión sin guardar |
| Modo | Radio "Pomodoro 25/5" | Selección | Ciclos de 25 min enfoque + 5 min descanso |
| Modo | Radio "Libre" | Selección | Cronómetro ascendente sin ciclos |
| Banner | "Modo enfoque activo" | Automático | Aparece al iniciar · desaparece al pausar/detener |
| Fin ciclo | Notificación del navegador | Automático | Muestra alerta de descanso vía Notifications API |
| Estadísticas | Contadores de sesión | Visual | Se actualiza al guardar cada sesión |

### Estados del timer

```
Estado inicial:   [ ▶ Iniciar ]           → fondo neutro
En enfoque:       [ ⏸ Pausar ] [ ⏹ ]     → fondo #EEEDFE + banner activo
En pausa:         [ ▶ Reanudar ] [ ⏹ ]   → fondo neutro
En descanso:      [ ⏸ Pausar ] [ ⏹ ]     → fondo #E1F5EE
```

### Notas de diseño

- El display del timer usa fuente monoespaciada grande (Bold 700, 48px).
- La transición entre modo enfoque y descanso es `transition: background 1s`.
- El banner de modo enfoque bloquea visualmente la zona de notificaciones (RF12).
- El botón "Detener y guardar" solo aparece cuando hay una sesión activa o pausada.

---

## W05 — Panel de gamificación (P08)

**Rol:** Estudiante  
**Acceso desde:** Dashboard (sección "Mis logros" o tab inferior)  
**CU asociado:** CU06 · **RF:** RF05, RF06, RF07

### Estructura de zonas

```
┌──────────────────────────────────────────────────────────┐
│  ← Atrás         Juega y Aprende                         │  ← Header
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │  🏆  Puntos totales: 320     Nivel: Explorador   │   │  ← Zona resumen
│  │  ████████░░░░  320 / 500 para siguiente nivel    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  [ Insignias ]  [ Reto semanal ]  [ Historial ]          │  ← Tabs
│  ─────────────                                           │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │  ← Vista tab "Insignias"
│  │                                                  │   │
│  │  [ 🌟 ]  [ 🔥 ]  [ ⏱ ]  [ 🔒 ]  [ 🔒 ]  [ 🔒 ] │   │
│  │  Primeros  Racha   5h est. ──────────────────    │   │
│  │  pasos     3 días                                │   │
│  │                                                  │   │
│  │  [ 🔒 ]  [ 🔒 ]  [ 🔒 ]  [ 🔒 ]  [ 🔒 ]  [ 🔒 ] │   │
│  │  (tooltip al hover: condición para desbloquear)  │   │
│  │                                                  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [ 🏠 Inicio ] [ ✓ Tareas ] [ ⏱ Pomodoro ] [ 🏆 Logros ] │
└──────────────────────────────────────────────────────────┘
```

### Vista tab "Reto semanal"

```
┌──────────────────────────────────────────────────────────┐
│  Reto de esta semana                                      │
│                                                          │
│  🎯 Completa 5 tareas antes del viernes                  │
│                                                          │
│  Progreso:  ███░░  3 / 5 tareas                          │
│                                                          │
│  Recompensa al completar:  +50 pts  🏆                   │
│                                                          │
│  Tiempo restante:  2 días                                │
└──────────────────────────────────────────────────────────┘
```

### Componentes y acciones

| Zona | Componente | Acción | Resultado |
|------|-----------|--------|-----------|
| Resumen | Barra de nivel | Visual | Muestra progreso hacia el siguiente nivel |
| Tabs | Tab "Insignias" | Clic | Muestra grilla de insignias (tab switch sin recarga) |
| Tabs | Tab "Reto semanal" | Clic | Muestra reto activo con progreso |
| Tabs | Tab "Historial" | Clic | Lista de insignias y puntos obtenidos por fecha |
| Insignia desbloqueada | Ícono SVG circular | Hover | Muestra nombre y descripción de la insignia |
| Insignia bloqueada 🔒 | Ícono gris | Hover | Tooltip: condición para desbloquear |
| Nueva insignia | Modal automático | Automático | Aparece con animación de brillo al desbloquear |
| Reto semanal | Barra de progreso | Visual | Actualiza en tiempo real al completar tareas |

### Modal de celebración (insignia nueva)

```
┌─────────────────────────────────┐
│                                 │
│         ✨ ¡Nuevo logro! ✨     │
│                                 │
│            [ 🌟 ]               │
│       Primeros Pasos            │
│  Completaste tu primera tarea   │
│                                 │
│          + 10 puntos            │
│                                 │
│         [ ¡Genial! ]            │
└─────────────────────────────────┘
```

### Notas de diseño

- Las insignias desbloqueadas tienen el color SVG de su categoría; las bloqueadas son gris opaco.
- El modal de celebración usa animación CSS `@keyframes` de brillo (`glow`).
- El progreso del reto semanal se sincroniza con el módulo de tareas automáticamente.
- Los tabs no recargan la página (comportamiento SPA con `display: none/block`).

---

## W06 — Configuración / Preferencias (P13)

**Rol:** Estudiante  
**Acceso desde:** Ícono engranaje ⚙ del Dashboard (panel desde la derecha)  
**CU asociado:** CU08 · **RF:** RF13, RNF04

### Estructura de zonas

```
┌──────────────────────────────────────────────────────────┐
│  ← Atrás        Configuración                            │  ← Header
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Apariencia                                              │  ← Sección
│  ┌──────────────────────────────────────────────────┐   │
│  │  Tema de color                                    │   │
│  │  ( 🟣 ) ( 🟢 ) ( 🟡 ) ( 🔴 ) ( 🔵 ) ( 💚 )      │   │  ← Selector de tema
│  │  Violeta  Teal  Ámbar  Coral  Azul   Verde        │   │
│  │                                                  │   │
│  │  Modo oscuro                    [ ○── ]  OFF     │   │  ← Toggle
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Perfil                                                  │  ← Sección
│  ┌──────────────────────────────────────────────────┐   │
│  │  Avatar                                          │   │
│  │  [😊] [🧑‍💻] [📚] [🎓] [🦄] [🚀]                │   │  ← Selector avatar
│  │                                                  │   │
│  │  Nombre de usuario                               │   │
│  │  [ ________________________ ]                    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Notificaciones                                          │  ← Sección
│  ┌──────────────────────────────────────────────────┐   │
│  │  Recordatorios de tareas        [ ──● ]  ON      │   │
│  │  Alertas de reto semanal        [ ──● ]  ON      │   │
│  │  [ Solicitar permiso al navegador ]               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  Datos                                                   │  ← Sección
│  ┌──────────────────────────────────────────────────┐   │
│  │  [ 📥 Exportar mis datos (JSON) ]                 │   │  ← Enlace a P14
│  │  [ 🗑 Eliminar todos mis datos ]                  │   │  ← Acción destructiva
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│                    [ Guardar cambios ]                   │  ← CTA principal
│                                                          │
├──────────────────────────────────────────────────────────┤
│  [ 🏠 Inicio ] [ ✓ Tareas ] [ ⏱ Pomodoro ] [ 🏆 Logros ] │
└──────────────────────────────────────────────────────────┘
```

### Componentes y acciones

| Zona | Componente | Acción | Resultado |
|------|-----------|--------|-----------|
| Apariencia | Selector de tema (6 colores) | Clic en color | Preview inmediato del tema en toda la pantalla |
| Apariencia | Toggle modo oscuro | Clic | Toda la interfaz cambia a paleta oscura al instante |
| Perfil | Selector de avatar | Clic en emoji | Selecciona avatar para el perfil |
| Perfil | Campo nombre | Edición | Actualiza el nombre mostrado en el Dashboard |
| Notificaciones | Toggle recordatorios | Clic | Activa/desactiva alertas de tareas (Notifications API) |
| Notificaciones | Botón "Solicitar permiso" | Clic | Muestra diálogo nativo del navegador para notificaciones |
| Datos | Botón "Exportar JSON" | Clic | Navega a P14 · inicia descarga del archivo `datos.json` |
| Datos | Botón "Eliminar datos" | Clic | Muestra diálogo de confirmación antes de borrar |
| CTA | Botón "Guardar cambios" | Clic | Persiste `preferencia_visual` en localStorage · navega a P03 (slide ←) |
| Header | Botón "← Atrás" | Clic sin guardar | Descarta cambios · restaura preferencias anteriores |

### Notas de diseño

- El preview del tema es en tiempo real: al hacer clic en un color, la pantalla actual cambia inmediatamente (antes de guardar).
- El botón "Eliminar todos mis datos" es rojo/coral con texto de advertencia; requiere confirmación con diálogo modal.
- Los toggles de notificaciones quedan deshabilitados si el navegador tiene el permiso denegado.
- "Guardar cambios" persiste en `localStorage` bajo la clave `preferencia_visual` (1:1 con cuenta · UNIQUE).

---

## Trazabilidad del entregable

### Tabla 12 — Pantallas → Roles → CU → RF → Wireframes

| Pantalla | Rol | CU asociado | RF relacionado | Wireframe |
|----------|-----|-------------|----------------|-----------|
| P01 Login | Todos | CU01 | RF01 | W01 |
| P02 Registro | Usuario nuevo | CU01 | RF01, RNF12 | — |
| P03 Dashboard | Estudiante | CU02–CU06 | RF02–RF11 | W02 |
| P04 Lista de tareas | Estudiante | CU02, CU03, CU07 | RF02, RF03, RF09 | W03 |
| P05 Detalle/edición tarea | Estudiante | CU02 | RF02 | — |
| P06 Pomodoro | Estudiante | CU04 | RF10, RF12 | W04 |
| P07 Agenda | Estudiante | CU01 | RF01 | — |
| P08 Gamificación | Estudiante | CU06 | RF05, RF06, RF07 | W05 |
| P09 Insignias | Estudiante | CU06 | RF05 | — |
| P10 Reto semanal | Estudiante | CU06 | RF06 | — |
| P11 Reportes | Estudiante | CU05 | RF08, RF11, RF15 | — |
| P12 Filtros | Estudiante | CU07 | RF09 | — |
| P13 Configuración | Estudiante | CU08 | RF13, RNF04 | W06 |
| P14 Exportar datos | Estudiante | CU09 | RF14 | — |
| P15 Panel admin | Administrador | — | RF01, RF05, RF06, RNF12 | — |
| P18 Reportes instit. | Revisor institucional | CU05 | RF11 | — |

### RF y RNF cubiertos por este entregable

| Tipo | Identificadores |
|------|----------------|
| Requisitos funcionales | RF01 · RF02 · RF03 · RF04 · RF05 · RF06 · RF07 · RF09 · RF10 · RF12 · RF13 · RF14 |
| Requisitos no funcionales | RNF04 · RNF06 · RNF07 · RNF14 |
| Casos de uso cubiertos | CU01 · CU02 · CU03 · CU04 · CU06 · CU08 |

---

*Entregable 16 de 17 — Fase 4: Diseño de Interfaz de Usuario*
