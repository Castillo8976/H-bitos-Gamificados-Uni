# E8 — Modelo Entidad-Relación Conceptual (MER)

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Entregable:** 8 — Modelo Entidad-Relación Conceptual  
**Fase:** 2 — Diseño de Datos  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  
**Institución:** Uniremington · Medellín · 2025  

---

## Descripción general

El MER Conceptual identifica las **12 entidades** del dominio, clasifica cada una como fuerte, débil o de asociación, y define las **12 relaciones** con sus cardinalidades y justificación de negocio. Toda entidad y relación listada aquí corresponde directamente a una tabla en el Modelo Relacional y a su definición en el DDL.

---

## 2.1 Clasificación de Entidades

| Entidad | Tipo | Clave Primaria | Depende de / Observación |
|---|---|---|---|
| **cuenta** | Fuerte (raíz) | id_cuenta | Entidad raíz del sistema. De ella dependen todas las demás. |
| **materia** | Fuerte | id_materia | Tiene FK a cuenta, pero puede existir conceptualmente sin ella. |
| **tarea** | Fuerte | id_tarea | Entidad central. FK a cuenta y materia (nullable). |
| **insignia** | Fuerte | id_insignia | Catálogo global. No depende de ningún estudiante específico. |
| **sesion_estudio** | Débil | id_sesion + FK id_cuenta | No existe sin cuenta. ON DELETE CASCADE. |
| **preferencia_visual** | Débil · 1:1 | id_preferencia + FK id_cuenta (UNIQUE) | Relación exclusiva con cuenta. Se crea al registrarse. |
| **punto** | Débil | id_punto + FK id_cuenta | No existe sin cuenta. ON DELETE CASCADE. |
| **reto** | Débil | id_reto + FK id_cuenta | No existe sin cuenta. 1 por semana. ON DELETE CASCADE. |
| **meta** | Débil | id_meta + FK id_cuenta | No existe sin cuenta. 1 por semana. ON DELETE CASCADE. |
| **recordatorio** | Débil | id_recordatorio + FK id_tarea | No existe sin tarea. ON DELETE CASCADE de tarea. |
| **reporte** | Débil | id_reporte + FK id_cuenta | No existe sin cuenta. 1 por semana. ON DELETE CASCADE. |
| **cuenta_insignia** | Asociación N:M | (id_cuenta, id_insignia) | Resuelve la única relación N:M. PK compuesta. |

### Justificación de entidades débiles

Las entidades débiles no tienen existencia propia sin su entidad fuerte relacionada:

- `sesion_estudio`, `punto`, `reto`, `meta`, `reporte` y `preferencia_visual` dependen de **cuenta**: si se elimina la cuenta, todos sus datos se eliminan en cascada (ON DELETE CASCADE).
- `recordatorio` depende de **tarea**: si se elimina la tarea, el recordatorio también se elimina. No tiene sentido un recordatorio sin tarea asociada.
- `cuenta_insignia` es una entidad de asociación que resuelve la única relación N:M del sistema.

---

## 2.2 Relaciones y Cardinalidades

| Entidad A | Relación | Entidad B | Cardinalidad | Regla de negocio / RF |
|---|---|---|---|---|
| **cuenta** | tiene | preferencia_visual | **1 : 1** | Cada cuenta tiene exactamente una configuración visual. UNIQUE en id_cuenta. RF13. |
| **cuenta** | registra | materia | **1 : N** | Un estudiante puede tener muchas materias; cada materia pertenece a una cuenta. Mín. 1 al registrarse. RF01. |
| **cuenta** | crea | tarea | **1 : N** | Un estudiante puede crear muchas tareas. Cada tarea pertenece a una sola cuenta. RF02. |
| **materia** | agrupa | tarea | **1 : N (opt)** | Una materia puede agrupar muchas tareas. Una tarea puede no tener materia (nullable). RF09. |
| **cuenta** | realiza | sesion_estudio | **1 : N** | Un estudiante registra muchas sesiones a lo largo del tiempo. RF10. |
| **tarea** | se asocia a | sesion_estudio | **1 : N (opt)** | Una tarea puede tener múltiples sesiones. La sesión puede existir sin tarea (nullable). RF10. |
| **cuenta** | acumula | punto | **1 : N** | Un estudiante tiene muchos registros de puntos. El total es la suma. RF03, RF07. |
| **cuenta** | desbloquea | insignia | **N : M** | Un estudiante desbloquea muchas insignias; una insignia puede obtenerse por muchos estudiantes. Resuelta con cuenta_insignia. RF05. |
| **cuenta** | participa en | reto | **1 : N** | Un reto semanal por estudiante, acumulando muchos a lo largo del tiempo. RF06. |
| **cuenta** | recibe | meta | **1 : N** | Una meta semanal por cuenta, acumulando semana a semana. RF15. |
| **tarea** | genera | recordatorio | **1 : N** | Al crear una tarea con fecha se genera un recordatorio automático. RF04. |
| **cuenta** | genera | reporte | **1 : N** | Un reporte semanal por cuenta, acumulando semana a semana. RF11. |

---

## 2.3 Diagrama Textual del MER

El siguiente diagrama representa las relaciones entre entidades usando notación simplificada.  
Las líneas dobles (`══`) indican relación 1:1 y las flechas (`──→`) relaciones 1:N o N:M.

```
cuenta
  ║ 1:1  ══════════════════════ preferencia_visual
  │ 1:N  ──────────────────────→ materia
  │ 1:N  ──────────────────────→ tarea ──→ (1:N) recordatorio
  │                               └──→ (1:N opt) sesion_estudio
  │ 1:N  ──────────────────────→ sesion_estudio
  │ 1:N  ──────────────────────→ punto
  │ N:M  ──────────────────────→ cuenta_insignia ←── insignia (entidad fuerte)
  │ 1:N  ──────────────────────→ reto
  │ 1:N  ──────────────────────→ meta
  └ 1:N  ──────────────────────→ reporte
```

---

## 2.4 Diagrama MER — Descripción de nodos

### Nodos del diagrama (representación estructurada)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          PLATAFORMA WEB GAMIFICADA                       │
│                         MER CONCEPTUAL — 12 ENTIDADES                    │
└──────────────────────────────────────────────────────────────────────────┘

ENTIDADES FUERTES (independientes):
  [cuenta] ←── entidad raíz
  [materia]
  [tarea]
  [insignia] ←── catálogo global

ENTIDADES DÉBILES (dependen de una entidad fuerte):
  [sesion_estudio]     depende de → cuenta (+ opcional tarea)
  [preferencia_visual] depende de → cuenta (relación 1:1)
  [punto]              depende de → cuenta
  [reto]               depende de → cuenta
  [meta]               depende de → cuenta
  [recordatorio]       depende de → tarea
  [reporte]            depende de → cuenta

ENTIDAD DE ASOCIACIÓN (resuelve N:M):
  [cuenta_insignia]    resuelve → cuenta N:M insignia
                       PK compuesta: (id_cuenta, id_insignia)

RELACIONES CLAVE:
  cuenta ══ 1:1 ══ preferencia_visual
  cuenta ── 1:N ──> materia
  cuenta ── 1:N ──> tarea ── 1:N ──> recordatorio
  tarea  ── 1:N ──> sesion_estudio (opcional)
  cuenta ── 1:N ──> sesion_estudio
  cuenta ── 1:N ──> punto
  cuenta ── N:M ──> insignia  [resuelta por cuenta_insignia]
  cuenta ── 1:N ──> reto
  cuenta ── 1:N ──> meta
  cuenta ── 1:N ──> reporte
```

> **Nota:** Para visualizar el diagrama MER como imagen, ver la carpeta `docs/diseño/imagenes/` del repositorio.

---

## 2.5 Trazabilidad con otros entregables

| Entidad | E7 (Diccionario) | E9 (Modelo Relacional) | E10 (3FN) | E11 (DDL) |
|---|---|---|---|---|
| cuenta | §1 | Tabla cuenta | ✓ 1FN/2FN/3FN | CREATE TABLE cuenta |
| materia | §2 | Tabla materia | ✓ | CREATE TABLE materia |
| tarea | §3 | Tabla tarea | ✓ | CREATE TABLE tarea |
| sesion_estudio | §4 | Tabla sesion_estudio | ✓ | CREATE TABLE sesion_estudio |
| insignia | §5 | Tabla insignia | ✓ | CREATE TABLE insignia |
| cuenta_insignia | §6 | Tabla cuenta_insignia | ✓ PK compuesta (2FN) | CREATE TABLE cuenta_insignia |
| punto | §7 | Tabla punto | ✓ | CREATE TABLE punto |
| reto | §8 | Tabla reto | EXCEPCIÓN deliberada | CREATE TABLE reto |
| meta | §9 | Tabla meta | EXCEPCIÓN deliberada | CREATE TABLE meta |
| recordatorio | §10 | Tabla recordatorio | ✓ | CREATE TABLE recordatorio |
| reporte | §11 | Tabla reporte | EXCEPCIÓN deliberada | CREATE TABLE reporte |
| preferencia_visual | §12 | Tabla preferencia_visual | ✓ | CREATE TABLE preferencia_visual |
