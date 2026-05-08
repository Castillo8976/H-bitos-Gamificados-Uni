# Entregable 15 — Mapa de Navegación

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio — *Tu Agenda Inteligente*  
**Asignatura:** Ingeniería de Software II  
**Institución:** Uniremington — Medellín  
**Fase:** Fase 4 — Diseño de Interfaz de Usuario

---

## Descripción general

El mapa muestra las **18 pantallas del sistema** organizadas por módulo, con los flujos de navegación entre ellas. El Dashboard (P03) es el **hub central** desde el que se accede a todos los módulos. Los roles con acceso restringido (Administrador y Revisor institucional) entran por URLs directas sin pasar por el flujo de estudiante.

Principio de navegación aplicado: máximo **3 clics** desde el Dashboard para llegar a cualquier funcionalidad (RNF07).

---

## 1. Inventario de pantallas

| ID | Pantalla | Rol | Módulo | Wireframe |
|----|----------|-----|--------|-----------|
| P01 | Login | Todos | Autenticación | W01 |
| P02 | Registro | Usuario nuevo | Autenticación | — |
| P03 | Dashboard (hub central) | Estudiante | General | W02 |
| P04 | Lista de tareas | Estudiante | Tareas | W03 |
| P05 | Detalle / edición de tarea | Estudiante | Tareas | — |
| P06 | Modo Pomodoro / Cronómetro | Estudiante | Pomodoro | W04 |
| P07 | Agenda de materias | Estudiante | Agenda | — |
| P08 | Panel de gamificación | Estudiante | Gamificación | W05 |
| P09 | Insignias obtenidas | Estudiante | Gamificación | — |
| P10 | Reto semanal activo | Estudiante | Gamificación | — |
| P11 | Reportes semanales | Estudiante | Reportes | — |
| P12 | Filtros y búsqueda de tareas | Estudiante | Tareas | — |
| P13 | Configuración / Preferencias | Estudiante | Configuración | W06 |
| P14 | Exportar datos | Estudiante | Configuración | — |
| P15 | Panel de administración | Administrador | Administración | — |
| P16 | Gestión de usuarios | Administrador | Administración | — |
| P17 | Gestión de insignias y retos | Administrador | Administración | — |
| P18 | Reportes institucionales | Revisor institucional | Reportes | — |

---

## 2. Mapa de navegación — vista estructural

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ACCESO AL SISTEMA                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   [P01 Login] ──────────────────────────────► [P03 Dashboard]      │
│        │  (credenciales válidas · slide →)            ▲            │
│        │                                               │            │
│        ▼  (enlace "Regístrate")                        │ (fade in)  │
│   [P02 Registro] ─────────────────────────────────────┘            │
│        (registro exitoso)                                           │
│                                                                     │
│   [P15 Panel admin]  ◄── URL directa /admin     (Administrador)    │
│   [P18 Reportes instit.] ◄── URL directa /revisor (Revisor inst.)  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    P03 — DASHBOARD (hub central)                    │
│                    Rol: Estudiante                                  │
├───────────────┬──────────────┬──────────────┬───────────────────────┤
│  Módulo       │  Módulo      │  Módulo      │  Módulo               │
│  TAREAS       │  POMODORO    │  GAMIFICACIÓN│  CONFIGURACIÓN        │
│               │              │              │                       │
│  [P04]        │  [P06]       │  [P08]       │  [P13]                │
│  Lista tareas │  Pomodoro    │  Gamificación│  Configuración        │
│     │         │              │     │        │     │                 │
│     ▼         │              │     ├──►[P09]│     └──► [P14]        │
│  [P05]        │              │     │  Insign│        Exportar       │
│  Detalle tarea│              │     └──►[P10]│                       │
│     │         │              │        Reto  │                       │
│     └──►[P12] │              │              │                       │
│        Filtros│              │              │                       │
├───────────────┴──────────────┴──────────────┴───────────────────────┤
│  Módulo AGENDA          │  Módulo REPORTES                          │
│  [P07] Agenda materias  │  [P11] Reportes semanales                 │
└─────────────────────────┴───────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│               ZONA DE ADMINISTRACIÓN (acceso restringido)           │
│                                                                     │
│  [P15 Panel admin] ──► [P16 Gestión usuarios]                       │
│                    └──► [P17 Gestión insignias y retos]             │
│                    └──► [P18 Reportes institucionales]  ◄── Revisor │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Flujos de navegación detallados

### 3.1 Flujo de autenticación

| Desde | Elemento / condición | Hacia | Transición | CU |
|-------|---------------------|-------|------------|-----|
| — (URL raíz) | Primera visita | P01 Login | Carga directa | CU01 |
| P01 Login | Credenciales válidas → botón "Iniciar sesión" | P03 Dashboard | Slide horizontal → | CU01 |
| P01 Login | Credenciales inválidas | P01 (mismo) | Banner de error rojo | CU01 |
| P01 Login | Enlace "Regístrate aquí" | P02 Registro | Slide → | CU01 |
| P02 Registro | Registro exitoso | P03 Dashboard | Fade in | CU01 |
| P02 Registro | Ya tiene cuenta → "Iniciar sesión" | P01 Login | Slide ← | CU01 |

### 3.2 Flujo principal — Dashboard hacia módulos

| Desde | Elemento | Hacia | Transición | CU | RF |
|-------|----------|-------|------------|----|----|
| P03 Dashboard | Sección "Mis tareas" / tab ✓ | P04 Lista tareas | Slide → | CU02, CU07 | RF02, RF09 |
| P03 Dashboard | Botón "Iniciar ▶" sesión | P06 Pomodoro | Slide vertical ↑ | CU04 | RF10 |
| P03 Dashboard | Sección "Mis logros" / tab 🏆 | P08 Gamificación | Slide → | CU06 | RF05, RF06 |
| P03 Dashboard | Ícono engranaje ⚙ | P13 Configuración | Panel desde la derecha | CU08 | RF13 |
| P03 Dashboard | Sección "Reportes" | P11 Reportes | Slide → | CU05 | RF11 |
| P03 Dashboard | Sección "Agenda" | P07 Agenda | Slide → | CU01 | RF01 |

### 3.3 Flujo módulo Tareas

| Desde | Elemento | Hacia | Transición | CU | RF |
|-------|----------|-------|------------|----|----|
| P04 Lista tareas | Clic en tarjeta de tarea | P05 Detalle / edición | Expansión / modal | CU02 | RF02 |
| P04 Lista tareas | Filtros activos | P12 Filtros y búsqueda | — (inline, sin navegación) | CU07 | RF09 |
| P04 Lista tareas | Checkbox tarea | P04 (mismo) | Animación +Xpts | CU03 | RF03 |
| P05 Detalle tarea | Botón "← Atrás" | P04 Lista tareas | Slide ← | — | — |
| P05 Detalle tarea | Botón "Guardar cambios" | P04 Lista tareas | Slide ← | CU02 | RF02 |
| P05 Detalle tarea | Botón "Eliminar" | P04 Lista tareas | Slide ← + elimina | CU02 | RF02 |

### 3.4 Flujo módulo Pomodoro

| Desde | Elemento | Hacia | Transición | CU | RF |
|-------|----------|-------|------------|----|----|
| P06 Pomodoro | Fin ciclo (automático) | P06 (mismo) | Notificación + transición a descanso | CU04 | RF10, RF12 |
| P06 Pomodoro | Botón "Detener y guardar" | P03 Dashboard | Slide ↓ | CU04 | RF10 |
| P06 Pomodoro | Botón "Cancelar" | P03 Dashboard | Slide ↓ (sin guardar) | CU04 | — |
| P06 Pomodoro | Botón "← Atrás" | P03 Dashboard | Slide ↓ | — | — |

### 3.5 Flujo módulo Gamificación

| Desde | Elemento | Hacia | Transición | CU | RF |
|-------|----------|-------|------------|----|----|
| P08 Gamificación | Tab "Insignias" | P09 Insignias obtenidas | Tab switch (sin recarga) | CU06 | RF05 |
| P08 Gamificación | Tab "Reto semanal" | P10 Reto semanal activo | Tab switch (sin recarga) | CU06 | RF06 |
| P08 Gamificación | Insignia desbloqueada (automático) | P08 (mismo) | Modal de celebración con brillo | CU06 | RF05 |
| P09 Insignias | Botón "← Atrás" | P08 Gamificación | Tab switch ← | — | — |
| P10 Reto semanal | Botón "← Atrás" | P08 Gamificación | Tab switch ← | — | — |

### 3.6 Flujo módulo Configuración

| Desde | Elemento | Hacia | Transición | CU | RF |
|-------|----------|-------|------------|----|----|
| P13 Configuración | Botón "Exportar JSON" | P14 Exportar datos | Slide → | CU09 | RF14 |
| P13 Configuración | Botón "Guardar cambios" | P03 Dashboard | Slide ← + aplica tema | CU08 | RF13 |
| P13 Configuración | Botón "← Atrás" (sin guardar) | P03 Dashboard | Panel cierra desde la derecha | CU08 | — |
| P14 Exportar datos | Botón "← Atrás" | P13 Configuración | Slide ← | — | — |

### 3.7 Flujo módulo Reportes

| Desde | Elemento | Hacia | Transición | CU | RF |
|-------|----------|-------|------------|----|----|
| P11 Reportes | Navegación entre semanas | P11 (mismo) | Actualización inline | CU05 | RF11 |
| P11 Reportes | Botón "← Atrás" | P03 Dashboard | Slide ← | — | — |

### 3.8 Flujo módulo Administración (acceso restringido)

| Desde | Elemento | Hacia | Transición | Rol |
|-------|----------|-------|------------|-----|
| URL `/admin` | Acceso directo | P15 Panel admin | Carga directa | Administrador |
| P15 Panel admin | Sección "Usuarios" | P16 Gestión usuarios | Slide → | Administrador |
| P15 Panel admin | Sección "Gamificación" | P17 Gestión insignias y retos | Slide → | Administrador |
| URL `/revisor` | Acceso directo | P18 Reportes institucionales | Carga directa | Revisor institucional |

### 3.9 Regla global — botón "Atrás"

| Desde cualquier pantalla | Elemento | Hacia | Transición |
|--------------------------|----------|-------|-----------|
| Cualquier pantalla secundaria | Botón "← Atrás" | P03 Dashboard | Slide ← |

---

## 4. Pantallas por módulo — resumen

### Módulo Autenticación
```
P01 Login  ←→  P02 Registro
```

### Módulo General
```
P03 Dashboard  (hub central)
```

### Módulo Tareas
```
P03 Dashboard
    └──► P04 Lista de tareas
              ├──► P05 Detalle / edición de tarea
              └──── P12 Filtros y búsqueda (inline)
```

### Módulo Pomodoro
```
P03 Dashboard
    └──► P06 Modo Pomodoro / Cronómetro
```

### Módulo Agenda
```
P03 Dashboard
    └──► P07 Agenda de materias
```

### Módulo Gamificación
```
P03 Dashboard
    └──► P08 Panel de gamificación
              ├──► P09 Insignias obtenidas  (tab switch)
              └──► P10 Reto semanal activo  (tab switch)
```

### Módulo Reportes
```
P03 Dashboard
    └──► P11 Reportes semanales
P15 Panel admin
    └──► P18 Reportes institucionales  (solo Revisor)
```

### Módulo Configuración
```
P03 Dashboard
    └──► P13 Configuración / Preferencias
              └──► P14 Exportar datos
```

### Módulo Administración (acceso por URL directa)
```
URL /admin
    └──► P15 Panel de administración
              ├──► P16 Gestión de usuarios
              └──► P17 Gestión de insignias y retos

URL /revisor
    └──► P18 Reportes institucionales
```

---

## 5. Reglas de navegación

**R1 — Hub central:** todas las pantallas del rol Estudiante son accesibles desde P03 en máximo 2 clics directos (RNF07: ≤ 3 clics para cualquier función).

**R2 — Retorno universal:** el botón "← Atrás" en cualquier pantalla secundaria lleva siempre a P03 Dashboard, nunca a una pantalla intermedia no relacionada.

**R3 — Tabs sin recarga:** las sub-pantallas de Gamificación (P09, P10) se implementan como tabs con `display: none/block`. No generan una navegación de página completa.

**R4 — Panel lateral:** la Configuración (P13) se abre como panel deslizante desde la derecha, sin abandonar la vista del Dashboard. Al cerrar, el Dashboard queda en el estado que estaba.

**R5 — Acceso restringido:** P15, P16, P17 y P18 no son alcanzables desde el flujo normal de estudiante. Requieren URL directa y validación de rol en el módulo de autenticación.

**R6 — Persistencia de estado:** al volver de una pantalla secundaria (ej. P05 → P04), la lista de tareas conserva los filtros activos y la posición de scroll.

---

## 6. Trazabilidad del entregable

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
| P16 Gestión usuarios | Administrador | — | RF01, RNF12 | — |
| P17 Gestión insignias/retos | Administrador | — | RF05, RF06 | — |
| P18 Reportes instit. | Revisor institucional | CU05 | RF11 | — |

### RF y RNF cubiertos por este entregable

| Tipo | Identificadores |
|------|----------------|
| Requisitos funcionales | RF01 · RF02 · RF03 · RF04 · RF05 · RF06 · RF07 · RF08 · RF09 · RF10 · RF11 · RF12 · RF13 · RF14 · RF15 |
| Requisitos no funcionales | RNF04 · RNF07 · RNF12 |
| Casos de uso cubiertos | CU01 · CU02 · CU03 · CU04 · CU05 · CU06 · CU07 · CU08 · CU09 · CU10 |

---

*Entregable 15 de 17 — Fase 4: Diseño de Interfaz de Usuario*
