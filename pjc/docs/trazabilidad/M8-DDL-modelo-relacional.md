# M8 — Matriz de Trazabilidad: DDL → Modelo Relacional → PK → FK → Restricciones

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Artefacto:** M8 — Trazabilidad Fase 2 (Datos)  
**Autores:** Juan David Castillo Mena · Alejandro Cardona Jaramillo  
**Docente:** Gloria Amparo Lora Patiño  
**Institución:** Uniremington · Medellín · 2025  

---

## Descripción

Esta matriz verifica que cada `CREATE TABLE` del Script DDL (E11) implementa correctamente su tabla del Modelo Relacional (E9), con todas las restricciones de integridad definidas. Trazabilidad final: **E9 (Modelo Relacional) → E11 (DDL) → Restricciones implementadas**.

---

## Matriz M8 — CREATE TABLE verificado

| Tabla DDL | Tabla E9 | PK implementada | FK(s) implementadas | Restricciones CHECK | UNIQUE | DEFAULT | Trazabilidad E7 |
|---|---|---|---|---|---|---|---|
| `CREATE TABLE cuenta` | cuenta | pk_cuenta (id_cuenta) | — | activa IN (0,1) | uq_correo (correo) | activa=1, fecha_registro=DATE('now') | §1 |
| `CREATE TABLE nivel_cuenta` | nivel_cuenta | pk_nivel (id_nivel) | — (relación con cuenta es derivada: SUM(punto.cantidad) vs puntos_minimos, sin FK) | ck_nivel_puntos (puntos_minimos >= 0), ck_nivel_orden (orden > 0) | uq_nivel_nombre (nombre) | puntos_minimos=0, orden=1 | §13 |
| `CREATE TABLE preferencia_visual` | preferencia_visual | pk_preferencia (id_preferencia) | fk_pref_cuenta → cuenta CASCADE | tema IN (6 valores), modo_oscuro IN (0,1) | uq_pref_cuenta (id_cuenta) → garantiza 1:1 | tema='purple', modo_oscuro=0 | §12 |
| `CREATE TABLE materia` | materia | pk_materia (id_materia) | fk_mat_cuenta → cuenta CASCADE | activa IN (0,1) | — | activa=1 | §2 |
| `CREATE TABLE tarea` | tarea | pk_tarea (id_tarea) | fk_tar_cuenta → cuenta CASCADE · fk_tar_materia → materia SET NULL | prioridad IN ('Alta','Media','Baja'), estado IN ('Pendiente','Completada') | — | estado='Pendiente' | §3 |
| `CREATE TABLE sesion_estudio` | sesion_estudio | pk_sesion (id_sesion) | fk_ses_cuenta → cuenta CASCADE · fk_ses_tarea → tarea SET NULL | duracion_minutos > 0, modo_enfoque IN (0,1) | — | fecha=DATE('now'), modo_enfoque=0 | §4 |
| `CREATE TABLE insignia` | insignia | pk_insignia (id_insignia) | — | — | uq_ins_nombre (nombre) · uq_ins_cond (condicion) | — | §5 |
| `CREATE TABLE cuenta_insignia` | cuenta_insignia | pk_ci (id_cuenta, id_insignia) PK compuesta | fk_ci_cta → cuenta CASCADE · fk_ci_ins → insignia CASCADE | — | — (PK compuesta cumple unicidad) | fecha_obtenida=DATE('now') | §6 |
| `CREATE TABLE punto` | punto | pk_punto (id_punto) | fk_pto_cuenta → cuenta CASCADE | cantidad > 0, origen IN ('Tarea','Reto','Sesion') | — | fecha=DATE('now') | §7 |
| `CREATE TABLE reto` | reto | pk_reto (id_reto) | fk_reto_cta → cuenta CASCADE | puntos_recompensa > 0, progreso >= 0, completado IN (0,1) | uq_reto_sem (id_cuenta, semana) | progreso=0, completado=0 | §8 |
| `CREATE TABLE meta` | meta | pk_meta (id_meta) | fk_meta_cta → cuenta CASCADE | valor_objetivo > 0, valor_actual >= 0, cumplida IN (0,1) | uq_meta_sem (id_cuenta, semana) | valor_actual=0, cumplida=0 | §9 |
| `CREATE TABLE recordatorio` | recordatorio | pk_recordatorio (id_recordatorio) | fk_rec_tarea → tarea CASCADE · fk_rec_cuenta → cuenta CASCADE | enviado IN (0,1), activo IN (0,1) | — | enviado=0, activo=1 | §10 |
| `CREATE TABLE notificacion` | notificacion | pk_notificacion (id_notificacion) | fk_not_cuenta → cuenta CASCADE | ck_not_tipo (tipo IN 5 valores) | — | leida=0 | §14 |

---

## Índices implementados en el DDL

| Índice DDL | Tabla | Columnas | Consulta optimizada | RNF |
|---|---|---|---|---|
| `idx_tarea_cuenta_estado` | tarea | (id_cuenta, estado) | Filtrar tareas pendientes/completadas del estudiante | RNF02 |
| `idx_tarea_prioridad` | tarea | (id_cuenta, prioridad) | Filtrar tareas por urgencia | RNF02 |
| `idx_tarea_fecha` | tarea | (id_cuenta, fecha_entrega) | Ordenar tareas por fecha de vencimiento | RNF02 |
| `idx_sesion_cuenta_fecha` | sesion_estudio | (id_cuenta, fecha) | Calcular horas estudiadas por semana | RNF02 |
| `idx_punto_cuenta` | punto | (id_cuenta) | Sumar puntos totales del estudiante | RNF02 |
| `idx_reto_semana` | reto | (id_cuenta, semana) | Obtener reto activo de la semana | RNF02 |
| `idx_recordatorio_pend` | recordatorio | (activo, enviado, fecha_programada) | Chequear recordatorios pendientes de envío | RNF15 |
| `idx_not_cuenta` | notificacion | (id_cuenta, leida, fecha) | Listar notificaciones no leídas de la cuenta, ordenadas por fecha | RNF15 |

---

## Vistas implementadas en el DDL

| Vista DDL | Tablas fuente | Propósito | RF |
|---|---|---|---|
| `vista_puntos_totales` | punto | Total de puntos acumulados por cuenta | RF07 |
| `vista_tareas_proximas` | tarea | Tareas pendientes que vencen en los próximos 7 días con días restantes | RF04 |
| `vista_gamificacion` | cuenta, punto, cuenta_insignia, reto | Panel gamificado: puntos, insignias y retos completados por cuenta | RF07 · RF08 |

---

## Datos semilla implementados

| INSERT | Tabla | Registro | Condición | Ícono |
|---|---|---|---|---|
| ins-001 | insignia | Primera tarea | primera_tarea | star.svg |
| ins-002 | insignia | Semana perfecta | 7_sesiones_semana | fire.svg |
| ins-003 | insignia | Racha de 5 | 5_tareas_seguidas | lightning.svg |
| ins-004 | insignia | Madrugador | sesion_antes_8am | sunrise.svg |
| ins-005 | insignia | Pomodoro Pro | 10_pomodoros | tomato.svg |
| niv-001..niv-004 | nivel_cuenta | Principiante, Estudiante, Avanzado, Maestro | puntos_minimos: 0, 100, 500, 1000 | nivel_1..4.svg |

> **Decisión de diseño (septiembre de 2026):** se adopta como catálogo semilla aprobado la lista de 5 insignias definida en `E11-script-DDL-v2.sql`. Esta matriz reproduce los mismos identificadores, nombres, condiciones e íconos para mantener correspondencia exacta entre el Modelo Relacional y el DDL.

---

## Verificación de cobertura DDL

| Elemento | Definido en E9 | Implementado en E11 | Verificado |
|---|---|---|---|
| 13 tablas | ✅ | ✅ | ✅ |
| PKs en todas las tablas | ✅ | ✅ | ✅ |
| FKs con acciones referenciales | ✅ | ✅ | ✅ |
| UNIQUE donde corresponde | ✅ | ✅ | ✅ |
| CHECK para valores restringidos | ✅ | ✅ | ✅ |
| DEFAULT para campos automáticos | ✅ | ✅ | ✅ |
| 8 índices de rendimiento | Definidos en este artefacto | ✅ | ✅ |
| 3 vistas útiles | Definidas en este artefacto | ✅ | ✅ |
| Datos semilla (5 insignias) | RF05 | ✅ | ✅ |
| PRAGMA foreign_keys = ON | RNF (integridad) | ✅ | ✅ |
| PRAGMA journal_mode = WAL | RNF02 (rendimiento) | ✅ | ✅ |
