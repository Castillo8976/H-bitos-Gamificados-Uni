# E1 — Tabla de Contexto

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software II — Uniremington  
**Autores:** Juan David Castillo Mena · Alejandro Cardona Jaramillo  
**Docente:** Gloria Amparo Lora Patiño  

---


La tabla de contexto define el sistema central y todas las entidades externas que interactúan con él, estableciendo los límites del sistema y sus relaciones con el entorno.

## Sistema Central

> **Plataforma Web Gamificada de Hábitos de Estudio**  
> Aplicación web con frontend HTML/CSS/JavaScript y persistencia en SQLite mediante un servidor Node.js/Express (ver `12-especificacion-requisitos-software.md`). El navegador, el servidor y SQLite son componentes internos de la solución, no entidades externas.

## Entidades Externas

| ID | Entidad Externa | Tipo | Descripción |
|---|---|---|---|
| E1 | Estudiante / Persona con discapacidad física | Usuario principal | Actor central. Crea cuenta, registra materias, gestiona tareas y recibe recompensas gamificadas. Interfaz accesible (fuente ≥14px, responsive). "Usuario registrado" es un estado de este mismo actor, no un actor diferente (ver `07-casos-de-uso.md`). |
| E4 | Revisor institucional | Usuario de solo lectura | Docente o coordinador con acceso de solo lectura al Tablero de Avance Personal y métricas de uso, calculadas en tiempo real (CU16). |
| E5 | Administrador del sistema | Usuario autorizado | Gestiona cuentas y catálogos de gamificación (insignias, niveles); no modifica el historial append-only de puntos (CU13, CU14). |
| E6 | Notifications API del navegador | Sistema externo | API nativa del navegador. Lanza alertas locales según el permiso concedido. Activable/desactivable desde configuración (CU10, CU15). |

> **Corrección de alcance (alineada con `M1_entidades_externas.md`):** se retiraron `E2 — Usuario registrado` (fusionado con Estudiante, no es un actor distinto), `E3 — Colaborador` (sin autenticación, caso de uso ni intercambio implementado que lo sustente) y `E7 — localStorage` (la persistencia vigente es SQLite vía Node.js/Express; el navegador ya no persiste datos localmente). Los IDs E1, E4, E5, E6 se conservan sin renumerar para no romper referencias cruzadas en E2 y en el DCA.

## Representación del Contexto

```
  ┌──────────────────────────────────────────────────────┐
  │           SISTEMA CENTRAL                            │
  │   Plataforma Web Gamificada de Hábitos de Estudio    │
  │        (Node.js/Express + SQLite)                    │
  │                                                      │
  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
  │  │ Módulo Auth │  │ Módulo Tareas│  │  Módulo    │  │
  │  │             │  │   y Agenda   │  │  Pomodoro  │  │
  │  └─────────────┘  └──────────────┘  └────────────┘  │
  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
  │  │  Módulo     │  │   Módulo     │  │  Módulo    │  │
  │  │Gamificación │  │  Tablero     │  │  Config.   │  │
  │  └─────────────┘  └──────────────┘  └────────────┘  │
  └──────────────────────────────────────────────────────┘
       ▲                  ▲                    ▲
       │                  │                    │
      E1                E4/E5                  E6
   Estudiante    Revisor / Administrador   Notif. API
