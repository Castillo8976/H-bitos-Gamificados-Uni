# E7 — Diccionario de Datos

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Entregable:** 7 — Diccionario de Datos  
**Fase:** 2 — Diseño de Datos  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  
**Institución:** Uniremington · Medellín · 2025  

---

## Descripción general

Define las **14 entidades** del dominio con sus atributos, tipos de datos, restricciones de integridad y reglas de negocio. Cada entidad está vinculada a sus Requisitos Funcionales (RF) y es trazable al MER Conceptual, Modelo Relacional y DDL.

> **Nota de corrección (agosto 2026):** este documento originalmente listaba 12 entidades. Se agregaron `nivel_cuenta` y `notificacion` (entradas 13 y 14), que ya existían como modelos Sequelize y CRUD completos en `/src` pero no estaban documentadas aquí ni en el MER/DDL. **Pendiente:** actualizar `E8-modelo-entidad-relacion.md`, `E9-modelo-relacional.md` y `E11-script-DDL-v2.sql` para incluir estas dos tablas.

---

## 1. `cuenta` — Identidad digital del estudiante `RF01 · RNF12`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_cuenta (PK)** | VARCHAR(36) | No | UUID generado automáticamente. Clave primaria del sistema. |
| **nombre** | VARCHAR(60) | No | Nombre completo del estudiante registrado. |
| **correo** | VARCHAR(100) | No | Correo electrónico. UNIQUE — no puede repetirse en el sistema. |
| **contrasena_hash** | VARCHAR(255) | No | Contraseña cifrada. Nunca en texto plano (RNF12). |
| **fecha_registro** | DATE | No | Fecha de creación de la cuenta. DEFAULT CURRENT_DATE. |
| **activa** | BOOLEAN/INT | No | TRUE = cuenta activa. FALSE = suspendida. DEFAULT TRUE. |

> **Reglas:** correo único · contraseña siempre cifrada · datos persisten al reiniciar (RNF04) · entidad raíz de la que dependen todas las demás.

---

## 2. `materia` — Asignatura universitaria del estudiante `RF01 · RF09`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_materia (PK)** | VARCHAR(36) | No | Identificador único de la materia. |
| **id_cuenta (FK→cuenta)** | VARCHAR(36) | No | Propietaria. ON DELETE CASCADE. Cardinalidad N:1 con cuenta. |
| **nombre** | VARCHAR(80) | No | Nombre de la asignatura. Obligatorio. |
| **horario** | VARCHAR(100) | Sí | Días y horas de clase. Nullable si el estudiante no lo registra. |
| **activa** | BOOLEAN/INT | No | TRUE = materia activa en el semestre. DEFAULT TRUE. |

> **Reglas:** pertenece a una cuenta · mínimo una materia al registrarse (RF01) · se usa para filtrar tareas (RF09).

---

## 3. `tarea` — Objeto central del sistema de gestión académica `RF02 · RF03 · RF09`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_tarea (PK)** | VARCHAR(36) | No | Identificador único de la tarea. |
| **id_cuenta (FK→cuenta)** | VARCHAR(36) | No | Propietaria. ON DELETE CASCADE. |
| **id_materia (FK→materia)** | VARCHAR(36) | Sí | Materia asociada. ON DELETE SET NULL. Nullable. |
| **nombre** | VARCHAR(120) | No | Título descriptivo de la tarea. |
| **fecha_entrega** | DATE | No | Fecha límite para completar la tarea. |
| **prioridad** | VARCHAR(10) | No | CHECK IN ('Alta','Media','Baja'). Chip visual en UI. |
| **estado** | VARCHAR(15) | No | CHECK IN ('Pendiente','Completada'). DEFAULT 'Pendiente'. |
| **fecha_completada** | DATE | Sí | NULL mientras esté pendiente. Se asigna al marcar completada. |

> **Reglas:** prioridad restringida a {Alta, Media, Baja} · al completar suma puntos (RF03) · filtrable por materia/prioridad/fecha (RF09) · genera recordatorio automático (RF04).

---

## 4. `sesion_estudio` — Bloque de tiempo Pomodoro o libre `RF10 · RF11 · RF12`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_sesion (PK)** | VARCHAR(36) | No | Identificador único de la sesión. |
| **id_cuenta (FK→cuenta)** | VARCHAR(36) | No | Cuenta que realizó la sesión. ON DELETE CASCADE. |
| **id_tarea (FK→tarea)** | VARCHAR(36) | Sí | Tarea asociada. ON DELETE SET NULL. Nullable. |
| **fecha** | DATE | No | Fecha de la sesión. DEFAULT CURRENT_DATE. |
| **duracion_minutos** | INTEGER | No | Duración en minutos. CHECK > 0. |
| **modo_enfoque** | BOOLEAN/INT | No | TRUE = sesión Pomodoro. FALSE = cronómetro libre. |

> **Reglas:** duración > 0 · se usa para calcular horas en reportes (RF11) · modo_enfoque bloquea notificaciones durante la sesión (RF12).

---

## 5. `insignia` — Reconocimiento visual por logros (entidad fuerte) `RF05`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_insignia (PK)** | VARCHAR(36) | No | Identificador único de la insignia. |
| **nombre** | VARCHAR(80) | No | Nombre descriptivo del logro. UNIQUE. |
| **descripcion** | VARCHAR(200) | No | Descripción del logro que representa. |
| **condicion** | VARCHAR(100) | No | Regla de cumplimiento (ej. 5_tareas_seguidas). UNIQUE. |
| **icono** | VARCHAR(50) | Sí | Nombre del archivo de ícono visual. Nullable. |

> **Reglas:** se desbloquea automáticamente al cumplir la condición · la misma insignia no puede desbloquearse dos veces por el mismo estudiante (garantizado por PK compuesta en cuenta_insignia).

---

## 6. `cuenta_insignia` — Resolución N:M insignias desbloqueadas `RF05`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_cuenta (PK·FK→cuenta)** | VARCHAR(36) | No | Cuenta del estudiante. ON DELETE CASCADE. |
| **id_insignia (PK·FK→insignia)** | VARCHAR(36) | No | Insignia desbloqueada. ON DELETE CASCADE. |
| **fecha_obtenida** | DATE | No | Fecha en que se desbloqueó. DEFAULT CURRENT_DATE. |

> **Reglas:** PK compuesta (id_cuenta, id_insignia) garantiza unicidad · se crea automáticamente al cumplirse la condición · resuelve la única relación N:M del sistema.

---

## 7. `punto` — Registro acumulable de recompensas gamificadas `RF03 · RF07`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_punto (PK)** | VARCHAR(36) | No | Identificador único del registro de puntos. |
| **id_cuenta (FK→cuenta)** | VARCHAR(36) | No | Cuenta que obtuvo los puntos. ON DELETE CASCADE. |
| **cantidad** | INTEGER | No | Puntos otorgados en este registro. CHECK > 0. |
| **origen** | VARCHAR(20) | No | CHECK IN ('Tarea','Reto','Sesion'). Fuente del punto. |
| **id_origen** | VARCHAR(36) | Sí | ID del objeto que generó los puntos. Referencia polimórfica. |
| **fecha** | DATE | No | Fecha en que se otorgaron. DEFAULT CURRENT_DATE. |

> **Reglas:** cantidad > 0 · origen en {Tarea, Reto, Sesion} · el total de puntos de una cuenta es la suma de todos sus registros (RF07).

---

## 8. `reto` — Desafío semanal automático gamificado `RF06`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_reto (PK)** | VARCHAR(36) | No | Identificador único del reto. |
| **id_cuenta (FK→cuenta)** | VARCHAR(36) | No | Cuenta asignada. ON DELETE CASCADE. |
| **descripcion** | VARCHAR(200) | No | Texto legible del desafío. |
| **condicion** | VARCHAR(100) | No | Regla de cumplimiento evaluable por el sistema. |
| **puntos_recompensa** | INTEGER | No | Puntos al completar el reto. CHECK > 0. |
| **semana** | VARCHAR(10) | No | Formato YYYY-WNN. UNIQUE combinado con id_cuenta. |
| **progreso** | INTEGER | No | Avance actual. DEFAULT 0. CHECK >= 0. |
| **completado** | BOOLEAN/INT | No | TRUE = reto completado. DEFAULT FALSE. |

> **Reglas:** 1 reto por semana por estudiante (UNIQUE id_cuenta + semana) · se reinicia semanalmente · al completar genera registro en punto con origen=Reto.

---

## 9. `meta` — Objetivo semanal de rendimiento del estudiante `RF15`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_meta (PK)** | VARCHAR(36) | No | Identificador único de la meta. |
| **id_cuenta (FK→cuenta)** | VARCHAR(36) | No | Cuenta destinataria. ON DELETE CASCADE. |
| **semana** | VARCHAR(10) | No | Formato YYYY-WNN. UNIQUE por cuenta. |
| **descripcion** | VARCHAR(200) | No | Texto de la meta sugerida. |
| **valor_objetivo** | INTEGER | No | Valor numérico objetivo. CHECK > 0. |
| **valor_actual** | INTEGER | No | Progreso actual. DEFAULT 0. CHECK >= 0. |
| **cumplida** | BOOLEAN/INT | No | TRUE = meta alcanzada. DEFAULT FALSE. |

> **Reglas:** 1 meta por semana · objetivo no supera 120% del promedio histórico · valor_actual se actualiza automáticamente · cumplida se mantiene explícita para consistencia histórica (desnormalización deliberada).

---

## 10. `recordatorio` — Alerta automática antes de la fecha límite `RF04 · RNF15`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_recordatorio (PK)** | VARCHAR(36) | No | Identificador único del recordatorio. |
| **id_tarea (FK→tarea)** | VARCHAR(36) | No | Tarea asociada. ON DELETE CASCADE. |
| **id_cuenta (FK→cuenta)** | VARCHAR(36) | No | Cuenta destinataria. ON DELETE CASCADE. |
| **fecha_programada** | DATE | No | CHECK >= fecha_entrega - 1 día (mínimo 24 h antes). |
| **mensaje** | VARCHAR(200) | No | Texto de la notificación mostrada al estudiante. |
| **enviado** | BOOLEAN/INT | No | TRUE = ya fue enviado. DEFAULT FALSE. |
| **activo** | BOOLEAN/INT | No | FALSE = desactivado por el usuario. DEFAULT TRUE. |

> **Reglas:** se genera automáticamente al crear una tarea con fecha · mínimo 24 h antes de la entrega · no se reenvía si enviado=TRUE · depende de tarea (entidad débil).

---

## 11. `reporte` — Resumen semanal histórico de rendimiento `RF11`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_reporte (PK)** | VARCHAR(36) | No | Identificador único del reporte. |
| **id_cuenta (FK→cuenta)** | VARCHAR(36) | No | Cuenta propietaria. ON DELETE CASCADE. |
| **semana** | VARCHAR(10) | No | Formato YYYY-WNN. UNIQUE por cuenta. |
| **tareas_completadas** | INTEGER | No | Cantidad de tareas completadas en la semana. CHECK >= 0. |
| **horas_estudiadas** | DECIMAL(5,2) | No | Total de horas en sesiones de la semana. CHECK >= 0. |
| **puntos_obtenidos** | INTEGER | No | Total de puntos ganados en la semana. CHECK >= 0. |
| **fecha_generado** | DATE | No | Fecha de generación del reporte. DEFAULT CURRENT_DATE. |

> **Reglas:** 1 reporte por semana · campos son snapshot histórico deliberado (desnormalización justificada por RNF02 — respuesta ≤2s) · se generan automáticamente al cierre de semana.

---

## 12. `preferencia_visual` — Configuración de interfaz (relación 1:1 con cuenta) `RF13 · RNF04`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_preferencia (PK)** | VARCHAR(36) | No | Identificador único de la preferencia. |
| **id_cuenta (FK→cuenta)** | VARCHAR(36) | No | UNIQUE. ON DELETE CASCADE. Garantiza relación 1:1. |
| **tema** | VARCHAR(20) | No | CHECK IN ('purple','teal','amber','coral','blue','green'). |
| **modo_oscuro** | BOOLEAN/INT | No | TRUE = modo oscuro activo. DEFAULT FALSE. |
| **avatar** | VARCHAR(50) | Sí | Nombre del avatar seleccionado. Nullable. |
| **fecha_actualizado** | DATE | No | Última modificación. DEFAULT CURRENT_DATE. |

> **Reglas:** relación 1:1 con cuenta garantizada por UNIQUE en id_cuenta · se crea automáticamente al registrar cuenta · se carga al iniciar sesión.

---

## 13. `nivel_cuenta` — Nivel de progreso gamificado `RF07`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_nivel (PK)** | VARCHAR(36) | No | UUID generado automáticamente. |
| **nombre** | VARCHAR(60) | No | Nombre visible del nivel. UNIQUE. Ej: 'Principiante', 'Experto'. |
| **descripcion** | VARCHAR(200) | No | Descripción del nivel y sus beneficios. |
| **puntos_minimos** | INTEGER | No | Umbral mínimo de puntos para alcanzar el nivel. DEFAULT 0. |
| **orden** | INTEGER | No | Orden jerárquico del nivel (1 = básico). DEFAULT 1. |
| **icono** | VARCHAR(50) | Sí | Nombre del archivo de ícono. Nullable. |

> **Reglas:** catálogo global (tabla maestra, sin FK) · una cuenta alcanza un nivel evaluando `SUM(punto.cantidad)` contra `puntos_minimos` (método `evaluarNivelCuenta`) · relación conceptual 1:1 con `cuenta` (una cuenta tiene un nivel activo en un momento dado).

---

## 14. `notificacion` — Notificación in-app del sistema `RF04 · RNF15`

| Campo (PK/FK) | Tipo | Nulo | Descripción / Reglas |
|---|---|---|---|
| **id_notificacion (PK)** | VARCHAR(36) | No | UUID generado automáticamente. |
| **id_cuenta (FK→cuenta)** | VARCHAR(36) | No | Destinataria. ON DELETE CASCADE. Cardinalidad N:1 con cuenta. |
| **tipo** | VARCHAR(20) | No | CHECK IN ('Insignia','Reto','Meta','Nivel','Sistema'). |
| **mensaje** | VARCHAR(200) | No | Texto mostrado al usuario. |
| **leida** | BOOLEAN/INT | No | TRUE = ya vista. DEFAULT FALSE. Alimenta el contador de no leídas. |
| **fecha** | DATE | No | Fecha de generación. DEFAULT CURRENT_DATE. |

> **Reglas:** entidad transaccional, distinta de `recordatorio` (que está ligado a una `tarea` específica) · se genera ante eventos de insignia, reto, meta o subida de nivel · `leida = false` por defecto hasta que el usuario la marque.

---

## Resumen de entidades

| # | Entidad | Tipo | RF principal |
|---|---|---|---|
| 1 | cuenta | Fuerte (raíz) | RF01, RNF12 |
| 2 | materia | Fuerte | RF01, RF09 |
| 3 | tarea | Fuerte | RF02, RF03, RF09 |
| 4 | sesion_estudio | Débil | RF10, RF11, RF12 |
| 5 | insignia | Fuerte (catálogo) | RF05 |
| 6 | cuenta_insignia | Asociación N:M | RF05 |
| 7 | punto | Débil | RF03, RF07 |
| 8 | reto | Débil | RF06 |
| 9 | meta | Débil | RF15 |
| 10 | recordatorio | Débil | RF04, RNF15 |
| 11 | reporte | Débil | RF11 |
| 12 | preferencia_visual | Débil (1:1) | RF13, RNF04 |
| 13 | nivel_cuenta | Fuerte (catálogo) | RF07 |
| 14 | notificacion | Débil | RF04, RNF15 |
