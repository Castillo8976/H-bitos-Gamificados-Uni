# Especificación de Requisitos de Software (ERS)

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software III — Uniremington  
**Versión:** 1.0  
**Fecha:** 12 de septiembre de 2026  

---

## 1. Propósito y alcance

Esta ERS consolida los requisitos que hasta ahora estaban distribuidos entre el alcance, los casos de uso y las matrices de trazabilidad. Conserva los identificadores RF01–RF15 y RNF01–RNF15 ya utilizados para no romper la trazabilidad histórica del proyecto.

La solución permite al estudiante gestionar su información académica, realizar sesiones de estudio, recibir recordatorios y notificaciones, obtener recompensas gamificadas, consultar su progreso, personalizar la interfaz y exportar sus datos. La persistencia se realiza en SQLite a través de una aplicación Node.js/Express; `localStorage` no forma parte de la arquitectura vigente.

## 2. Actores

| Actor | Descripción | Permisos generales |
|---|---|---|
| **Estudiante** | Usuario principal registrado. La accesibilidad es una condición de la interfaz para este actor y no un actor independiente. | Gestiona exclusivamente su cuenta, materias, tareas, sesiones, metas, recordatorios, notificaciones y preferencias; consulta su progreso y gamificación. |
| **Administrador** | Usuario autorizado para mantener información global o corregir datos controlados. | Gestiona cuentas y catálogos de insignias y niveles; consulta asignaciones y movimientos, respetando las reglas de integridad. |
| **Revisor institucional** | Usuario con acceso autorizado de solo lectura. | Consulta indicadores agregados calculados en tiempo real; no crea, modifica ni elimina información. |
| **Notifications API** | Servicio externo proporcionado por el navegador. | Recibe solicitudes de permiso y muestra alertas locales cuando el permiso está concedido. |

## 3. Convenciones

- **Prioridad Alta:** indispensable para el flujo principal o para conservar integridad y seguridad.
- **Prioridad Media:** necesaria para completar el alcance, pero no bloquea el registro y la gestión básica.
- **Origen:** objetivo específico, técnica de elicitación o necesidad de trazabilidad que justifica el requisito.
- Las entradas usan los nombres aprobados del diccionario de datos cuando corresponden a atributos persistidos.

---

## 4. Requisitos funcionales

| ID | Nombre y descripción verificable | Actor | Entradas principales | Resultado esperado | Origen | Prioridad | HU / CU | RN |
|---|---|---|---|---|---|---|---|---|
| **RF01** | Registrar, consultar, actualizar y desactivar cuentas; registrar, consultar, actualizar y eliminar materias pertenecientes a la cuenta. | Estudiante / Administrador | `nombre`, `correo`, contraseña; `nombre` y `horario` de materia | Cuenta persistida con correo único y contraseña cifrada; materias asociadas mediante `id_cuenta`. | OE01; encuesta de organización | Alta | HU01, HU16, HU20, HU27 / CU01, CU11, CU13 | RN01–RN03 |
| **RF02** | Crear, consultar, actualizar y eliminar tareas académicas de la cuenta. | Estudiante | `nombre`, `fecha_entrega`, `prioridad`, `id_materia` opcional | Tarea persistida con estado inicial `Pendiente`; solo se gestionan tareas de la cuenta autenticada. | OE01; recordación de entregas | Alta | HU02, HU19 / CU02 | RN04–RN06 |
| **RF03** | Completar una tarea y registrar una recompensa positiva en el historial de puntos. | Estudiante / Sistema | `id_tarea` | Tarea `Completada`, fecha de finalización y registro append-only en `punto`. | OE01, OE03 | Alta | HU03 / CU03 | RN07–RN09 |
| **RF04** | Generar y gestionar recordatorios y notificaciones asociados con entregas y eventos del sistema. | Estudiante / Sistema | tarea, fecha programada, mensaje, permiso del navegador | Recordatorio persistido; notificación mostrada o conservada como pendiente según el permiso. | OE01; encuesta 88 % | Alta | HU04, HU24, HU25 / CU10, CU15 | RN05, RN06, RN16–RN19 |
| **RF05** | Consultar, desbloquear y administrar el catálogo de insignias sin duplicar una asignación. | Estudiante / Administrador / Sistema | condición, `id_cuenta`, `id_insignia` | Insignia creada o actualizada por el Administrador; asignación única cuando se cumple la condición. | OE03; encuesta 93 % | Media | HU05, HU22, HU26 / CU06, CU13, CU14 | RN11 |
| **RF06** | Crear, consultar, actualizar, completar y eliminar retos semanales de una cuenta. | Estudiante / Administrador / Sistema | descripción, condición, recompensa, semana | Un reto por cuenta y semana; recompensa otorgada una sola vez al completarlo. | OE03 | Media | HU06, HU18 / CU06 | RN10 |
| **RF07** | Consultar el historial y total de puntos y determinar el nivel de la cuenta con base en el catálogo de niveles. | Estudiante / Administrador / Sistema | `id_cuenta`, movimientos de puntos | Total calculado con `SUM(cantidad)` y nivel correspondiente al umbral alcanzado. | OE03 | Alta | HU07, HU23, HU26 / CU06, CU13, CU14 | RN07–RN09, RN15 |
| **RF08** | Mostrar el resumen de gamificación: puntos, nivel, insignias, retos y metas. | Estudiante | `id_cuenta` | Panel actualizado con información derivada de los registros vigentes. | OE03, OE04 | Media | HU07, HU08 / CU05, CU06 | RN09, RN11, RN15 |
| **RF09** | Filtrar y buscar tareas por materia, prioridad, estado, fechas o coincidencia de nombre. | Estudiante | filtros seleccionados y texto de búsqueda | Lista limitada a las tareas de la cuenta que cumplen los criterios. | OE01 | Media | HU02, HU09 / CU02, CU07 | RN04 |
| **RF10** | Iniciar, detener, guardar, consultar, actualizar y eliminar sesiones de estudio, vinculadas opcionalmente con una tarea. | Estudiante | duración, modo enfoque, `id_tarea` opcional | Sesión persistida con duración positiva y asociación opcional válida. | OE02; observación directa | Alta | HU10, HU21 / CU04, CU12 | RN20, RN21 |
| **RF11** | Calcular y consultar en tiempo real las tareas completadas, horas estudiadas y puntos obtenidos para una semana. | Estudiante / Revisor institucional | cuenta o conjunto autorizado; rango semanal | Indicadores calculados mediante `COUNT`/`SUM`, sin tabla `reporte`. | OE02, OE04; entrevistas | Alta | HU08, HU11, HU28 / CU05, CU16 | RN14, RN21 |
| **RF12** | Activar el modo enfoque durante una sesión y suspender notificaciones no esenciales mientras permanezca activo. | Estudiante | activación del modo enfoque | Cronómetro visible y notificaciones no esenciales bloqueadas durante el ciclo. | OE02; observación directa | Media | HU10, HU12 / CU04 | RN19 |
| **RF13** | Crear, consultar, actualizar y restablecer la preferencia visual de una cuenta. | Estudiante | tema, modo oscuro, avatar | Única preferencia por cuenta, persistida en SQLite y aplicada a la interfaz. | OE05 | Media | HU13 / CU08 | Relación 1:1 de preferencia |
| **RF14** | Exportar en JSON la información perteneciente a la cuenta autenticada. | Estudiante | solicitud de exportación | Archivo `datos.json` descargable con información consultada desde SQLite. | OE05 | Media | HU14 / CU09 | Privacidad por propietario |
| **RF15** | Crear, consultar, actualizar, eliminar y evaluar metas semanales de una cuenta. | Estudiante / Sistema | semana, descripción, `valor_objetivo`, progreso | Una meta por cuenta y semana; `cumplida` cambia cuando el progreso alcanza el objetivo. | OE03, OE04 | Media | HU15, HU17 / CU05 | RN12, RN13 |

### 4.1 Acciones funcionales controladas

Las operaciones CRUD se consideran acciones verificables del RF que gobierna la entidad. La matriz `14-matriz-trazabilidad-analisis.md` relaciona cada acción o botón con su RF, HU y CU. Cuando una operación no aplica por una regla de integridad, la excepción queda documentada en lugar de inventar una acción:

- `punto` no se actualiza: el historial es append-only según RN07.
- `cuenta_insignia` no se actualiza: se crea al desbloquear y se elimina únicamente mediante revocación autorizada.
- Los indicadores del tablero no tienen CRUD propio: se calculan en tiempo real según RN14.

---

## 5. Requisitos no funcionales — ISO/IEC 25010

La presentación usa el formato `RNF-XX` solicitado en el modelo de la docente. Las referencias históricas `RNFXX` del proyecto identifican el mismo requisito y se conservan únicamente donde sean necesarias para no perder trazabilidad con artefactos anteriores.

| RNF | Descripción del requisito | Característica / Subcaracterística ISO 25010 | Criterio medible | Técnica de verificación |
|---|---|---|---|---|
| **RNF-01** | La aplicación debe conservar la integridad de la información ante operaciones válidas y rechazar referencias inexistentes. | Fiabilidad → Tolerancia a fallos | 0 violaciones en `PRAGMA foreign_key_check` | Prueba de integridad referencial en SQLite. |
| **RNF-02** | Las consultas habituales y la carga del tablero deben responder en máximo 2 segundos bajo la carga académica de prueba. | Eficiencia de desempeño → Comportamiento temporal | Percentil 95 ≤ 2 segundos con 10 usuarios concurrentes y 1.000 registros por tabla transaccional | Prueba de carga sobre endpoints y tablero. |
| **RNF-03** | Una operación fallida no debe dejar registros parciales relacionados. | Fiabilidad → Recuperabilidad | 100 % de transacciones fallidas conservan el estado anterior | Prueba de recuperación forzando errores en operaciones compuestas. |
| **RNF-04** | Los datos confirmados deben persistir en SQLite después de reiniciar el servidor. | Fiabilidad → Madurez | 100 % de registros de prueba recuperables después del reinicio | Prueba de persistencia con reinicio controlado. |
| **RNF-05** | La interfaz debe funcionar en las dos versiones estables más recientes de Chrome, Firefox y Edge. | Compatibilidad → Coexistencia | 100 % de flujos críticos ejecutables en los navegadores definidos | Matriz de pruebas cruzadas por navegador. |
| **RNF-06** | La interfaz debe mantener contraste mínimo 4.5:1 y texto visible de al menos 14 px en formularios y controles. | Usabilidad → Accesibilidad | Contraste ≥ 4.5:1 y fuente ≥ 14 px | Auditoría automática y comprobación manual de pantallas. |
| **RNF-07** | Toda función principal del estudiante debe alcanzarse desde el Dashboard en máximo 3 clics. | Usabilidad → Operabilidad | ≤ 3 clics desde el Dashboard | Recorrido manual de navegación por función. |
| **RNF-08** | Los mensajes de validación deben indicar el campo y la corrección requerida sin exponer información técnica. | Usabilidad → Protección contra errores | 100 % de validaciones críticas muestran un mensaje comprensible | Pruebas funcionales con datos vacíos, inválidos y duplicados. |
| **RNF-09** | La comunicación en un despliegue remoto debe usar HTTPS; en desarrollo se permite `localhost`. | Seguridad → Confidencialidad | 100 % de solicitudes remotas utilizan HTTPS | Inspección de red y configuración de despliegue. |
| **RNF-10** | Cada cuenta solo debe consultar o modificar registros que le pertenecen, salvo permisos administrativos explícitos. | Seguridad → Autenticidad y autorización | 0 accesos cruzados entre cuentas | Prueba de autorización intentando acceder a IDs de otra cuenta. |
| **RNF-11** | La aplicación debe poder desplegarse en un entorno Node.js compatible sin cambios al modelo de datos aprobado. | Portabilidad → Instalabilidad | Instalación reproducible siguiendo el README en un entorno limpio | Prueba de instalación, creación de BD y ejecución. |
| **RNF-12** | Las contraseñas deben almacenarse exclusivamente como hash y nunca devolverse en respuestas o exportaciones. | Seguridad → Confidencialidad | 0 contraseñas en texto plano y 0 campos `contrasena_hash` en respuestas/exportaciones | Inspección de BD, respuestas y archivo JSON exportado. |
| **RNF-13** | El modo enfoque debe suprimir notificaciones no esenciales mientras esté activo y restaurarlas al finalizar. | Usabilidad → Protección contra interrupciones | 0 notificaciones no esenciales durante una sesión en modo enfoque | Prueba funcional con notificaciones programadas durante el ciclo. |
| **RNF-14** | Las pantallas deben adaptarse a anchos de 320 px a 1920 px sin desplazamiento horizontal en los flujos principales. | Usabilidad → Accesibilidad | 0 pérdidas de contenido y 0 desplazamientos horizontales en el rango | Prueba responsive en anchos límite e intermedios. |
| **RNF-15** | Con permiso concedido, una alerta programada debe mostrarse una sola vez; con permiso denegado, debe conservarse en la aplicación sin error. | Compatibilidad → Interoperabilidad | 1 alerta por recordatorio y 0 bloqueos con permiso denegado | Prueba con estados concedido, denegado y no disponible. |

---

## 6. Requisitos de interfaz

| ID | Interfaz | Entradas | Salidas | RF/RNF | Criterio de aceptación |
|---|---|---|---|---|---|
| **RIE01** | Interfaz web Estudiante–Sistema | Formularios, filtros, botones y navegación | Listados, confirmaciones, errores, indicadores y archivos | RF01–RF15; RNF06–RNF08, RNF14 | Cada acción visible aparece en la matriz y produce una respuesta comprensible. |
| **RIE02** | Navegador–Servidor HTTP | Solicitudes con datos y cuenta autenticada | Respuestas JSON y códigos HTTP | RF01–RF15; RNF02, RNF08–RNF10 | Las entradas válidas obtienen éxito y las inválidas un error controlado sin filtrar datos sensibles. |
| **RIE03** | Servidor–SQLite | Consultas parametrizadas y transacciones | Registros o confirmación de operación | RF01–RF15; RNF01–RNF04 | La operación respeta PK, FK, UNIQUE y CHECK; no quedan registros parciales. |
| **RIE04** | Sistema–Notifications API | Solicitud de permiso y contenido de alerta | Estado del permiso y alerta local | RF04, RF12; RNF13, RNF15 | El flujo funciona con permiso concedido y se degrada sin error cuando se deniega. |
| **RIE05** | Sistema–archivo JSON | Solicitud del estudiante | Archivo descargable | RF14; RNF10, RNF12 | El archivo contiene solo datos de la cuenta y excluye `contrasena_hash`. |

---

## 7. Criterios de aceptación globales

1. Todo registro dependiente debe conservar una referencia válida a su entidad padre, según las reglas del DDL.
2. Ningún estudiante puede leer o modificar información de otra cuenta.
3. Todo error de validación debe informar el motivo sin exponer consultas, rutas internas ni credenciales.
4. Los nombres de entidades y atributos usados en HU, CU y pruebas deben coincidir con el diccionario de datos aprobado.
5. Toda acción de una pantalla debe tener RF, HU y CU relacionados en la matriz de trazabilidad.
