# Matriz de Trazabilidad — Fase de Análisis

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software III — Uniremington  
**Cobertura:** OE ↔ RF ↔ HU ↔ CU ↔ RN ↔ datos ↔ pantalla/acción  

---

## 1. Matriz consolidada RF ↔ HU ↔ CU

| OE | RF | HU de origen | CU | RN aplicables | Entidades y atributos principales | Pantallas / acciones |
|---|---|---|---|---|---|---|
| OE01 | RF01 | HU01, HU16, HU20, HU27 | CU01, CU11, CU13 | RN01–RN03 | `cuenta(nombre, correo, contrasena_hash, activa)`; `materia(nombre, horario, activa)` | Registro: Crear cuenta; Agenda: Crear, Ver, Editar, Eliminar materia; Perfil: Ver, Guardar; Admin: Desactivar cuenta |
| OE01 | RF02 | HU02, HU19 | CU02 | RN04–RN06 | `tarea(nombre, fecha_entrega, prioridad, estado, id_materia)` | Tareas: Nueva, Ver, Editar, Eliminar |
| OE01, OE03 | RF03 | HU03 | CU03 | RN07–RN09 | `tarea(estado, fecha_completada)`; `punto(cantidad, origen, id_origen)` | Tareas: Completar |
| OE01 | RF04 | HU04, HU24, HU25 | CU10, CU15 | RN05, RN06, RN16–RN19 | `recordatorio(fecha_programada, enviado, activo)`; `notificacion(tipo, mensaje, leida)` | Recordatorios: Activar/desactivar, Eliminar; Notificaciones: Ver, Marcar leída, Marcar todas, Eliminar |
| OE03 | RF05 | HU05, HU22, HU26 | CU06, CU13, CU14 | RN11 | `insignia(nombre, descripcion, condicion, icono)`; `cuenta_insignia` | Gamificación: Ver insignias; Admin: Crear, Editar, Eliminar insignia, Revocar asignación |
| OE03 | RF06 | HU06, HU18 | CU06 | RN10 | `reto(descripcion, condicion, puntos_recompensa, semana, progreso, completado)` | Gamificación: Ver, Editar, Eliminar y Completar reto |
| OE03 | RF07 | HU03, HU06, HU07, HU23, HU26 | CU03, CU06, CU13, CU14 | RN07–RN10, RN15 | `punto`; `nivel_cuenta(nombre, puntos_minimos, orden)` | Gamificación: Ver puntos/nivel; Admin: Gestionar niveles, Consultar/corregir movimientos |
| OE03, OE04 | RF08 | HU07, HU08 | CU05, CU06 | RN09, RN11, RN15 | `punto`, `cuenta_insignia`, `reto`, `meta`, `nivel_cuenta` | Dashboard/Gamificación: Consultar resumen |
| OE01 | RF09 | HU02, HU09 | CU02, CU07 | RN04 | `tarea(id_materia, prioridad, estado, fecha_entrega, nombre)` | Tareas: Filtrar, Buscar, Limpiar filtros |
| OE02 | RF10 | HU10, HU21 | CU04, CU12 | Integridad de sesión | `sesion_estudio(fecha, duracion_minutos, modo_enfoque, id_tarea)` | Pomodoro: Iniciar, Pausar, Reanudar, Guardar; Historial: Ver, Editar, Eliminar |
| OE02, OE04 | RF11 | HU08, HU11, HU21, HU28 | CU05, CU12, CU16 | RN14, RN21 | `tarea`, `sesion_estudio`, `punto` | Tablero: Ver, Cambiar semana; Institucional: Consultar periodo |
| OE02 | RF12 | HU10, HU12 | CU04 | RN19 | `sesion_estudio(modo_enfoque)` | Pomodoro: Activar/desactivar Modo enfoque |
| OE05 | RF13 | HU13 | CU08 | Relación 1:1 | `preferencia_visual(tema, modo_oscuro, avatar)` | Configuración: Previsualizar, Guardar, Restablecer |
| OE05 | RF14 | HU14 | CU09 | Privacidad por propietario | Datos de la cuenta excepto `contrasena_hash` | Configuración: Exportar JSON |
| OE03, OE04 | RF15 | HU15, HU17 | CU05 | RN12, RN13 | `meta(semana, descripcion, valor_objetivo, valor_actual, cumplida)` | Tablero/Metas: Ver, Crear, Editar, Eliminar |

## 2. Inventario de acciones de interfaz

Cada acción visible debe conservar esta cadena. Las acciones automáticas se identifican como Sistema y no requieren un botón ficticio.

| Pantalla o módulo | Acción / botón | Tipo | RF | HU | CU |
|---|---|---|---|---|---|
| Registro | Crear cuenta | Usuario | RF01 | HU01 | CU01 |
| Registro | Agregar materia inicial | Usuario | RF01 | HU01 | CU01 |
| Perfil | Consultar perfil | Usuario | RF01 | HU20 | CU11 |
| Perfil | Guardar cambios | Usuario | RF01 | HU20 | CU11 |
| Agenda | Crear materia | Usuario | RF01 | HU01 | CU01 |
| Agenda | Consultar materias | Usuario | RF01 | HU01, HU16 | CU01 |
| Agenda | Editar materia | Usuario | RF01 | HU16 | CU01 |
| Agenda | Eliminar materia | Usuario | RF01 | HU16 | CU01 |
| Tareas | Nueva tarea | Usuario | RF02 | HU02 | CU02 |
| Tareas | Ver tarea | Usuario | RF02 | HU02 | CU02 |
| Tareas | Editar tarea | Usuario | RF02 | HU02 | CU02 |
| Tareas | Eliminar tarea | Usuario | RF02 | HU19 | CU02 |
| Tareas | Completar tarea | Usuario | RF03 | HU03 | CU03 |
| Tareas | Filtrar / Buscar / Limpiar | Usuario | RF09 | HU09 | CU07 |
| Pomodoro | Iniciar | Usuario | RF10 | HU10 | CU04 |
| Pomodoro | Pausar / Reanudar | Usuario | RF10 | HU10 | CU04 |
| Pomodoro | Detener y guardar | Usuario | RF10 | HU10 | CU04 |
| Pomodoro | Activar modo enfoque | Usuario | RF12 | HU12 | CU04 |
| Historial de sesiones | Ver / Editar / Eliminar | Usuario | RF10, RF11 | HU21 | CU12 |
| Gamificación | Ver puntos y nivel | Usuario | RF07, RF08 | HU07 | CU06 |
| Gamificación | Ver insignias | Usuario | RF05, RF08 | HU05 | CU06 |
| Gamificación | Ver / Editar / Eliminar reto | Usuario | RF06 | HU06, HU18 | CU06 |
| Tablero | Consultar semana actual | Usuario | RF08, RF11 | HU08 | CU05 |
| Tablero | Cambiar semana | Usuario | RF11 | HU11 | CU05 |
| Metas | Crear / Ver / Editar / Eliminar | Usuario | RF15 | HU15, HU17 | CU05 |
| Recordatorios | Ver | Usuario | RF04 | HU04, HU25 | CU10 |
| Recordatorios | Activar / Desactivar | Usuario | RF04 | HU25 | CU10 |
| Recordatorios | Eliminar | Usuario | RF04 | HU25 | CU10 |
| Notificaciones | Ver pendientes | Usuario | RF04 | HU24 | CU15 |
| Notificaciones | Marcar leída / Marcar todas | Usuario | RF04 | HU24 | CU15 |
| Notificaciones | Eliminar / Limpiar leídas | Usuario | RF04 | HU24 | CU15 |
| Configuración | Previsualizar tema | Usuario | RF13 | HU13 | CU08 |
| Configuración | Guardar preferencias | Usuario | RF13 | HU13 | CU08 |
| Configuración | Restablecer preferencias | Usuario | RF13 | HU13 | CU08 |
| Configuración | Exportar JSON | Usuario | RF14 | HU14 | CU09 |
| Administración | Gestionar cuentas | Usuario autorizado | RF01 | HU27 | CU13 |
| Administración | Gestionar insignias | Usuario autorizado | RF05 | HU22 | CU13 |
| Administración | Gestionar niveles | Usuario autorizado | RF07 | HU23 | CU13 |
| Administración | Revocar insignia | Usuario autorizado | RF05 | HU26 | CU14 |
| Administración | Corregir movimiento de puntos | Usuario autorizado | RF07 | HU26 | CU14 |
| Consulta institucional | Consultar periodo | Solo lectura | RF11 | HU28 | CU16 |
| Sistema | Crear preferencia inicial | Automática | RF13 | HU01, HU13 | CU01 |
| Sistema | Programar recordatorio | Automática | RF04 | HU04 | CU02, CU10 |
| Sistema | Otorgar puntos | Automática | RF03, RF07 | HU03 | CU03 |
| Sistema | Evaluar insignia | Automática | RF05 | HU05 | CU03, CU06 |
| Sistema | Evaluar nivel | Automática | RF07 | HU07 | CU06 |
| Sistema | Crear notificación | Automática | RF04 | HU24 | CU15 |

## 3. Cobertura bidireccional

| Control | Resultado | Evidencia |
|---|---|---|
| Todo OE tiene uno o más RF | Cumple | OE01–OE05 aparecen en la matriz consolidada. |
| Todo RF tiene al menos una HU | Cumple | RF01–RF15 tienen HU en la sección 1. |
| Toda HU tiene RF y CU | Cumple | HU01–HU28 están catalogadas y relacionadas. |
| Todo CU específico tiene RF | Cumple | CU01–CU16 tienen RF en `07-casos-de-uso.md`. |
| Toda RN tiene RF o CU | Cumple documentalmente | RN01–RN19 están relacionadas en `10-reglas-de-negocio.md`; deben conservarse en futuras modificaciones. |
| Toda entidad tiene HU de creación/consulta/actualización/eliminación o excepción justificada | Cumple | Tabla de cobertura CRUD en `13-historias-usuario-criterios-aceptacion.md`. |
| Toda acción inventariada tiene RF y HU | Cumple | Sección 2 de esta matriz. |
| Los criterios usan nombres del modelo aprobado | Cumple documentalmente | HU y ERS referencian atributos del diccionario; debe validarse de nuevo ante cambios del MER. |

## 4. Control de cambios

Una modificación futura se considera trazable únicamente si actualiza, en este orden:

1. Objetivo o fuente que origina el cambio.
2. RF/RNF y RN afectados.
3. HU y criterios de aceptación.
4. CU y sus flujos.
5. Entidades/atributos del diccionario, cuando corresponda.
6. Pantalla y acción afectadas.
7. Matriz de trazabilidad y commit con identificador RF/HU.
