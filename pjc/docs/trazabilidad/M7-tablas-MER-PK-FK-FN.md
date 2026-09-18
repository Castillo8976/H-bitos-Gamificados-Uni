# M7 — Matriz de Trazabilidad: Tablas Relacionales → MER → PK → FK → Forma Normal

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Artefacto:** M7 — Trazabilidad Fase 2 (Datos)  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  
**Institución:** Uniremington · Medellín · 2025  

---

## Descripción

Esta matriz conecta cada tabla del Modelo Relacional (E9) con su entidad de origen en el MER (E8), su clave primaria, sus claves foráneas y su estado de normalización (E10). Trazabilidad horizontal: **MER ↔ Modelo Relacional ↔ Normalización**.

---

## Matriz M7

| Tabla | Entidad MER | PK | FK(s) | Acción referencial | 1FN | 2FN | 3FN | Excepción documentada |
|---|---|---|---|---|---|---|---|---|
| **cuenta** | Fuerte (raíz) | id_cuenta VARCHAR(36) | — | — | ✅ | ✅ | ✅ | — |
| **preferencia_visual** | Débil 1:1 | id_preferencia VARCHAR(36) | id_cuenta → cuenta | CASCADE | ✅ | ✅ | ✅ | — |
| **materia** | Fuerte | id_materia VARCHAR(36) | id_cuenta → cuenta | CASCADE | ✅ | ✅ | ✅ | — |
| **tarea** | Fuerte | id_tarea VARCHAR(36) | id_cuenta → cuenta CASCADE · id_materia → materia SET NULL | CASCADE / SET NULL | ✅ | ✅ | ✅ | — |
| **sesion_estudio** | Débil | id_sesion VARCHAR(36) | id_cuenta → cuenta CASCADE · id_tarea → tarea SET NULL | CASCADE / SET NULL | ✅ | ✅ | ✅ | — |
| **insignia** | Fuerte (catálogo) | id_insignia VARCHAR(36) | — | — | ✅ | ✅ | ✅ | — |
| **nivel_cuenta** | Fuerte (catálogo) | id_nivel VARCHAR(36) | — (relación con cuenta es derivada, sin FK) | — | ✅ | ✅ | ✅ | — |
| **cuenta_insignia** | Asociación N:M | (id_cuenta, id_insignia) PK compuesta | id_cuenta → cuenta CASCADE · id_insignia → insignia CASCADE | CASCADE · CASCADE | ✅ | ✅ (fecha_obtenida depende del par completo) | ✅ | — |
| **punto** | Débil | id_punto VARCHAR(36) | id_cuenta → cuenta | CASCADE | ✅ | ✅ | ✅ | — |
| **reto** | Débil | id_reto VARCHAR(36) | id_cuenta → cuenta | CASCADE | ✅ | ✅ | ⚠️ | completado podría derivarse de progreso. Se mantiene explícito por rendimiento. |
| **meta** | Débil | id_meta VARCHAR(36) | id_cuenta → cuenta | CASCADE | ✅ | ✅ | ⚠️ | cumplida podría derivarse de valor_actual >= valor_objetivo. Se mantiene por consistencia histórica. |
| **recordatorio** | Débil | id_recordatorio VARCHAR(36) | id_tarea → tarea CASCADE · id_cuenta → cuenta CASCADE | CASCADE · CASCADE | ✅ | ✅ | ✅ | — |
| **notificacion** | Débil | id_notificacion VARCHAR(36) | id_cuenta → cuenta | CASCADE | ✅ | ✅ | ✅ | — |

---

## Restricciones adicionales por tabla

| Tabla | Restricción UNIQUE | Restricciones CHECK | Valores DEFAULT |
|---|---|---|---|
| cuenta | correo | — | fecha_registro = DATE('now'), activa = 1 |
| preferencia_visual | id_cuenta (garantiza 1:1) | tema IN (6 colores) | tema = 'purple', modo_oscuro = 0, fecha_actualizado = DATE('now') |
| materia | — | activa IN (0,1) | activa = 1 |
| tarea | — | prioridad IN ('Alta','Media','Baja'), estado IN ('Pendiente','Completada') | estado = 'Pendiente' |
| sesion_estudio | — | duracion_minutos > 0, modo_enfoque IN (0,1) | fecha = DATE('now'), modo_enfoque = 0 |
| insignia | nombre, condicion | — | — |
| nivel_cuenta | nombre | puntos_minimos >= 0, orden > 0 | puntos_minimos = 0, orden = 1 |
| cuenta_insignia | — (PK compuesta) | — | fecha_obtenida = DATE('now') |
| punto | — | cantidad > 0, origen IN ('Tarea','Reto','Sesion') | fecha = DATE('now') |
| reto | (id_cuenta, semana) | puntos_recompensa > 0, progreso >= 0, completado IN (0,1) | progreso = 0, completado = 0 |
| meta | (id_cuenta, semana) | valor_objetivo > 0, valor_actual >= 0, cumplida IN (0,1) | valor_actual = 0, cumplida = 0 |
| recordatorio | — | enviado IN (0,1), activo IN (0,1) | enviado = 0, activo = 1 |
| notificacion | — | tipo IN ('Insignia','Reto','Meta','Nivel','Sistema'), leida IN (0,1) | leida = 0, fecha = DATE('now') |

---

## Leyenda

| Símbolo | Significado |
|---|---|
| ✅ | Cumple la forma normal sin excepciones |
| ⚠️ | Tiene una excepción deliberada documentada (desnormalización controlada) |
| PK | Clave primaria |
| FK | Clave foránea |
| CASCADE | ON DELETE CASCADE — si se borra el padre, se borran los hijos |
| SET NULL | ON DELETE SET NULL — si se borra el padre, la FK del hijo queda NULL |
