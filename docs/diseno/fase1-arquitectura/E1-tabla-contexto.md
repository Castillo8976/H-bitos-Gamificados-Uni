# E1 — Tabla de Contexto

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software II — Uniremington  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  

---


La tabla de contexto define el sistema central y todas las entidades externas que interactúan con él, estableciendo los límites del sistema y sus relaciones con el entorno.

## Sistema Central

> **Plataforma Web Gamificada de Hábitos de Estudio**  
> Aplicación web estática (HTML, CSS, JavaScript) desplegada en GitHub Pages, con almacenamiento en `localStorage`. Opera 100 % offline tras la primera carga.

## Entidades Externas

| ID | Entidad Externa | Tipo | Descripción |
|---|---|---|---|
| E1 | Estudiante / Persona con discapacidad física | Usuario principal | Actor central. Crea cuenta, registra materias, gestiona tareas y recibe recompensas gamificadas. Interfaz accesible (fuente 14px, responsive). |
| E2 | Usuario registrado | Usuario secundario | Persona registrada con acceso a tareas, filtros, recordatorios, personalización visual y exportación de datos. |
| E3 | Colaborador | Entidad par | Aporta retos, metas sugeridas y frases motivacionales. No gestiona usuarios ni tiene acceso administrativo. |
| E4 | Revisor institucional | Sistema superior | Docente o coordinador con acceso de solo lectura a reportes de progreso y métricas de uso. |
| E5 | Administrador del sistema | Sistema superior | Acceso total. Gestiona cuentas, configura insignias y retos, supervisa integridad y seguridad. |
| E6 | Notifications API del navegador | Sistema subordinado | API nativa del navegador. Lanza alertas locales sin servidor. Activable/desactivable desde configuración. |
| E7 | localStorage del navegador | Sistema subordinado | Almacena datos JSON en el dispositivo del usuario. Sin base de datos externa. Funciona 100 % offline. |

## Representación del Contexto

```
  ┌──────────────────────────────────────────────────────┐
  │           SISTEMA CENTRAL                            │
  │   Plataforma Web Gamificada de Hábitos de Estudio    │
  │                                                      │
  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
  │  │ Módulo Auth │  │ Módulo Tareas│  │  Módulo    │  │
  │  │             │  │   y Agenda   │  │  Pomodoro  │  │
  │  └─────────────┘  └──────────────┘  └────────────┘  │
  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
  │  │  Módulo     │  │   Módulo     │  │  Módulo    │  │
  │  │Gamificación │  │  Reportes    │  │  Config.   │  │
  │  └─────────────┘  └──────────────┘  └────────────┘  │
  └──────────────────────────────────────────────────────┘
       ▲            ▲            ▲             ▲
       │            │            │             │
   E1/E2        E3/E4/E5       E6            E7
 Estudiantes   Colaborador   Notif. API  localStorage
