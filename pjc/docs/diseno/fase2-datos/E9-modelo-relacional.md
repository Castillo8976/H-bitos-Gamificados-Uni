# E9 — Modelo Relacional

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Entregable:** 9 — Modelo Relacional  
**Fase:** 2 — Diseño de Datos  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  
**Institución:** Uniremington · Medellín · 2025  

---

## Descripción general

El Modelo Relacional transforma las **12 entidades del MER** en tablas con tipos de datos precisos, claves primarias (PK), claves foráneas (FK) y restricciones de integridad referencial. Cada tabla es trazable a su entidad en el Diccionario de Datos (E7), a su relación en el MER (E8) y a su `CREATE TABLE` en el DDL (E11).

---

## 3.1 Tablas, PKs, FKs y Restricciones

| Tabla | PK | FK(s) | Restricciones clave | RF |
|---|---|---|---|---|
| **cuenta** | id_cuenta VARCHAR(36) | — | UNIQUE(correo) · contrasena_hash NOT NULL | RF01 · RNF12 |
| **preferencia_visual** | id_preferencia VARCHAR(36) | id_cuenta → cuenta ON DELETE CASCADE | UNIQUE(id_cuenta) → 1:1 · CHECK tema IN (6 valores) | RF13 |
| **materia** | id_materia VARCHAR(36) | id_cuenta → cuenta ON DELETE CASCADE | nombre NOT NULL · activa DEFAULT 1 | RF01 |
| **tarea** | id_tarea VARCHAR(36) | id_cuenta → cuenta CASCADE · id_materia → materia SET NULL | CHECK prioridad IN (...) · CHECK estado IN (...) · fecha_completada nullable | RF02 · RF03 |
| **sesion_estudio** | id_sesion VARCHAR(36) | id_cuenta → cuenta CASCADE · id_tarea → tarea SET NULL | CHECK duracion_minutos > 0 · modo_enfoque IN (0,1) | RF10 |
| **insignia** | id_insignia VARCHAR(36) | — | UNIQUE(nombre) · UNIQUE(condicion) | RF05 |
| **cuenta_insignia** | (id_cuenta, id_insignia) | id_cuenta → cuenta CASCADE · id_insignia → insignia CASCADE | PK compuesta · fecha_obtenida NOT NULL | RF05 |
| **punto** | id_punto VARCHAR(36) | id_cuenta → cuenta ON DELETE CASCADE | CHECK cantidad > 0 · CHECK origen IN ('Tarea','Reto','Sesion') | RF03 · RF07 |
| **reto** | id_reto VARCHAR(36) | id_cuenta → cuenta ON DELETE CASCADE | UNIQUE(id_cuenta, semana) · CHECK puntos_recompensa > 0 · CHECK progreso >= 0 | RF06 |
| **meta** | id_meta VARCHAR(36) | id_cuenta → cuenta ON DELETE CASCADE | UNIQUE(id_cuenta, semana) · CHECK valor_objetivo > 0 · CHECK valor_actual >= 0 | RF15 |
| **recordatorio** | id_recordatorio VARCHAR(36) | id_tarea → tarea CASCADE · id_cuenta → cuenta CASCADE | fecha_programada CHECK >= fecha_entrega - 1 día | RF04 |
| **reporte** | id_reporte VARCHAR(36) | id_cuenta → cuenta ON DELETE CASCADE | UNIQUE(id_cuenta, semana) · CHECK tareas_completadas >= 0 · CHECK horas_estudiadas >= 0 | RF11 |

---

## 3.2 Esquemas de tablas (notación relacional)

```
cuenta(
  id_cuenta PK,
  nombre,
  correo UNIQUE,
  contrasena_hash,
  fecha_registro,
  activa
)

preferencia_visual(
  id_preferencia PK,
  id_cuenta FK→cuenta UNIQUE,   ← garantiza 1:1
  tema,
  modo_oscuro,
  avatar,
  fecha_actualizado
)

materia(
  id_materia PK,
  id_cuenta FK→cuenta,
  nombre,
  horario,
  activa
)

tarea(
  id_tarea PK,
  id_cuenta FK→cuenta,
  id_materia FK→materia [nullable],
  nombre,
  fecha_entrega,
  prioridad,
  estado,
  fecha_completada [nullable]
)

sesion_estudio(
  id_sesion PK,
  id_cuenta FK→cuenta,
  id_tarea FK→tarea [nullable],
  fecha,
  duracion_minutos,
  modo_enfoque
)

insignia(
  id_insignia PK,
  nombre UNIQUE,
  descripcion,
  condicion UNIQUE,
  icono [nullable]
)

cuenta_insignia(
  id_cuenta PK FK→cuenta,
  id_insignia PK FK→insignia,
  fecha_obtenida
)  ← PK compuesta resuelve N:M

punto(
  id_punto PK,
  id_cuenta FK→cuenta,
  cantidad,
  origen,
  id_origen [nullable],
  fecha
)

reto(
  id_reto PK,
  id_cuenta FK→cuenta,
  descripcion,
  condicion,
  puntos_recompensa,
  semana UNIQUE por cuenta,
  progreso,
  completado
)

meta(
  id_meta PK,
  id_cuenta FK→cuenta,
  semana UNIQUE por cuenta,
  descripcion,
  valor_objetivo,
  valor_actual,
  cumplida
)

recordatorio(
  id_recordatorio PK,
  id_tarea FK→tarea,
  id_cuenta FK→cuenta,
  fecha_programada,
  mensaje,
  enviado,
  activo
)

reporte(
  id_reporte PK,
  id_cuenta FK→cuenta,
  semana UNIQUE por cuenta,
  tareas_completadas,
  horas_estudiadas,
  puntos_obtenidos,
  fecha_generado
)
```

---

## 3.3 Diagrama de integridad referencial

```
                    ┌─────────────┐
                    │   insignia  │
                    └──────┬──────┘
                           │ N:M (resuelta)
          ┌────────────────▼────────────────┐
          │         cuenta_insignia         │
          └────────────────┬────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                         cuenta                          │
│                       (entidad raíz)                    │
└──┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬────┘
   │      │      │      │      │      │      │      │
   ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
materia punto  reto   meta reporte sesion pref_  tarea
                            estudio visual
                                           │
                                    ┌──────▼──────┐
                                    │recordatorio │
                                    └─────────────┘
```

**Leyenda:**
- `CASCADE` = ON DELETE CASCADE → si se borra el padre, se borran los hijos
- `SET NULL` = ON DELETE SET NULL → si se borra el padre, la FK del hijo queda NULL
- `UNIQUE` en id_cuenta de preferencia_visual → garantiza relación 1:1

---

## 3.4 Reglas de integridad referencial

| Relación | Acción en DELETE padre | Justificación |
|---|---|---|
| cuenta → preferencia_visual | CASCADE | Datos personales sin utilidad sin cuenta |
| cuenta → materia | CASCADE | Materias pertenecen al estudiante |
| cuenta → tarea | CASCADE | Tareas son propiedad del estudiante |
| tarea → sesion_estudio | SET NULL | La sesión puede existir aunque se borre la tarea |
| cuenta → sesion_estudio | CASCADE | Sin cuenta no tiene sentido la sesión |
| materia → tarea | SET NULL | La tarea puede existir sin materia asociada |
| tarea → recordatorio | CASCADE | El recordatorio no tiene sentido sin tarea |
| cuenta → recordatorio | CASCADE | Sin cuenta no tiene sentido el recordatorio |
| cuenta → punto | CASCADE | Los puntos son del estudiante |
| cuenta → reto | CASCADE | Los retos son del estudiante |
| cuenta → meta | CASCADE | Las metas son del estudiante |
| cuenta → reporte | CASCADE | Los reportes son del estudiante |
| cuenta → cuenta_insignia | CASCADE | Resolución de N:M, depende de cuenta |
| insignia → cuenta_insignia | CASCADE | Resolución de N:M, depende de insignia |
