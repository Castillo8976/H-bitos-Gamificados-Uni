# DECISIONES TÉCNICAS

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Autor:** Juan David Castillo Mena  
**Asignatura:** Ingeniería de Software III — Uniremington 2026

---

## Decisión #01

**¿Qué decidí?**
Usar **SQLite como motor de base de datos** en lugar de PostgreSQL o MySQL.

**¿Por qué?**
SQLite no requiere instalar ni configurar un servidor de base de datos separado. El archivo `.sqlite` es portátil, vive en el mismo directorio del proyecto y funciona en cualquier máquina sin pasos adicionales de instalación. Para el alcance de este módulo académico (un solo estudiante como usuario por sesión, sin concurrencia real), SQLite cubre todos los requisitos funcionales. Además, es compatible con Sequelize sin cambios en el código de los modelos, lo que permitiría migrar a PostgreSQL en el futuro simplemente cambiando la configuración de conexión en `database.js`.

**¿Qué artefacto de diseño respalda esta decisión?**  
**Entregable 6 — Diagrama de Despliegue UML**: define una arquitectura de nodo único donde la aplicación web (Node.js/Express) y el almacenamiento de datos (SQLite) residen en el mismo entorno, sin servidor de BD externo. Esto está alineado con la sección de Alcance del documento de requisitos (actualizada en agosto de 2026 para reflejar el backend Node.js/Express/Sequelize/SQLite realmente implementado, en lugar de la versión estática con `localStorage` planteada al inicio del proyecto).

**Formalización en construcción:** `CRF-001-unificacion-linea-tecnica.md`. Desde septiembre de 2026, E11 es un DDL SQLite y la raíz del repositorio contiene el único manifiesto ejecutable.

---

## Decisión #02

**¿Qué decidí?**
Implementar el historial de puntos como un **ledger inmutable (append-only)** en lugar de un contador actualizable en la tabla `cuenta`.

**¿Por qué?**
La alternativa simple sería guardar un campo `puntos_totales` en la tabla `cuenta` y actualizarlo con cada acción. Sin embargo, esto pierde el historial: no se podría saber cuántos puntos ganó el usuario en una semana específica, ni de qué acciones provinieron (tareas, retos, sesiones). El patrón ledger resuelve ambos problemas: cada evento de ganancia genera una fila nueva en la tabla `punto` con su `origen` e `id_origen`. El total se calcula con `SUM(cantidad)` y el desglose semanal con un filtro adicional por fecha. Esta decisión es clave para que el cálculo en tiempo real del Tablero de Avance Personal (antes `generarReporteSemanal()`, eliminado en agosto 2026) pueda obtener `puntos_obtenidos` por semana de forma precisa mediante una simple consulta `SUM` filtrada por fecha.

**¿Qué artefacto de diseño respalda esta decisión?**  
**Entregable 7 — Diccionario de Datos**, sección entidad `punto`: define explícitamente que "el total de puntos de una cuenta es la suma de todos sus registros", no un campo precalculado. El Modelo Relacional describe el cálculo agregado como mecanismo de consulta del puntaje; no se presupone una vista SQL `vista_puntos_totales`.

---

## Decisión #03

**¿Qué decidí?**  
Usar **importaciones dinámicas** (`require()` dentro del cuerpo de funciones) para resolver dependencias circulares entre módulos CRUD, en lugar de reestructurar las carpetas o usar un patrón de inyección de dependencias.

**¿Por qué?**  
`retoCrud.completarReto()` necesita llamar a `puntoCrud.otorgarPuntos()`, y (antes de agosto 2026) `reporteCrud.generarReporteSemanal()` necesitaba funciones de `sesionEstudioCrud` y `puntoCrud` — este último CRUD fue eliminado, pero el problema de dependencia circular sigue siendo relevante para cualquier CRUD que combine datos de varias tablas. Si estos `require` están en el encabezado del archivo, Node.js crea un ciclo de carga que resulta en módulos importados como `{}`. La solución más directa sin cambiar la arquitectura es mover el `require` al interior de la función que lo usa, momento en que todos los módulos ya están completamente cargados. Esta decisión mantiene el código simple y coherente con la estructura de carpetas ya definida, sin introducir patrones adicionales (como un contenedor de dependencias) que aumentarían la complejidad innecesariamente para el alcance del proyecto.

**¿Qué artefacto de diseño respalda esta decisión?**  
**Entregable 13 — Diagramas de Secuencia**: el diagrama de secuencia de CU-06 (Completar Reto) muestra la llamada de `RetoService` a `PuntoService` como una dependencia de ejecución, no de inicialización. Esto confirma que la relación entre estos componentes es una colaboración en tiempo de ejecución, lo que justifica la importación dinámica como mecanismo de implementación.

---

## Decisión #04

**¿Qué decidí?**
Coordinar las operaciones de gamificación desde `GamificacionService`, con una
transacción única y protección de idempotencia, en lugar de encadenar CRUD desde
el controlador.

**¿Por qué?**
Completar una tarea afecta tarea, puntos, reto, meta, insignias, nivel y
notificaciones. La transacción evita estados parciales y el índice
`uq_punto_evento` impide recompensas duplicadas. El controlador queda limitado
al contrato HTTP y el servicio puede probarse sin navegador.

**¿Qué artefacto respalda esta decisión?**
CRF-003, RN22–RN24, M9 y M15. La verificación se encuentra en
`tests/integration/objectives-6-10.test.js`.

---

## Decisión #05

**¿Qué decidí?**
Entregar al Revisor institucional únicamente indicadores globales agregados de
estudiantes activos.

**¿Por qué?**
El modelo no contiene grupos ni una relación Revisor–Estudiante. Mostrar cuentas
individuales inventaría un alcance y expondría información personal. Los
agregados permiten cumplir HU28/CU16 sin nombres, correos ni identificadores.

**¿Qué artefacto respalda esta decisión?**
RN21, RN25, CRF-002 y CRF-003.

---

## Decisión #06

**¿Qué decidí?**
Conservar «rendimiento académico» en el objetivo general, agregar un objetivo
específico de cuentas y administración, documentar la creación manual de retos
y permitir al Estudiante propietario y al Administrador cambiar su estado.
El Estudiante puede editar y completar manualmente sus retos, y puede
desactivar su propia cuenta; el Administrador puede reactivar cuentas.

**¿Por qué?**
Estas decisiones responden a la revisión documental y distinguen los permisos
del Estudiante de las facultades administrativas. Los retos no se generan
automáticamente. Sus recompensas se conservan como movimientos únicos aunque
el reto se desactive y reactive.

**Estado**
Línea base documental aprobada el 19 de octubre de 2026. Las modificaciones de
modelo, interfaz, validaciones y migraciones que todavía no existen en el
código se mantienen identificadas como pendientes de implementación. Los
límites aprobados para los campos se registran en E7. Quedan sin resolver la
decisión sobre materia inicial (pregunta 5), los aspectos adicionales de
contraseña (pregunta 8) y el bloqueo al desactivar la última cuenta
Administradora activa (pregunta 7).

---

## Decisión #07

**¿Qué decidí?**
Mantener cuatro objetivos específicos (OE01–OE04): OE04 integra el antiguo
OE05 de configuración y personalización, y el objetivo general no declara
mejoras de rendimiento académico ni de bienestar emocional. Esta decisión
sustituye únicamente la parte de la Decisión #06 referida a los objetivos; el
resto de la Decisión #06 se mantiene.

**¿Por qué?**
La docente pidió el 26 de septiembre de 2026 corregir los verbos del objetivo
general, formular los objetivos específicos como diseño de módulos y unir los
objetivos 4 y 5. El sistema no mide el rendimiento académico ni el bienestar
emocional, por lo que no se presentan como resultados. Las funciones de cuentas
y administración se conservan como requisitos del sistema (RF01, RF05, RF06 y
RF07) trazados a OE01 y OE03, sin crear un objetivo específico adicional.

**¿Qué artefacto respalda esta decisión?**
`04-objetivo-general.md`, `05-objetivos-especificos.md`, la ERS y las matrices
`11` y `14`.

**Estado**
Adoptada por el equipo el 24 de octubre de 2026 para la corrección documental;
pendiente de revisión docente.

---

## Decisión #08

**¿Qué decidí?**
Invalidar de forma persistente todos los JWT emitidos antes de desactivar una
cuenta mediante el atributo `cuenta.version_sesion` (INTEGER, DEFAULT 0). La
versión se incrementa de forma atómica solo cuando la cuenta pasa de activa a
inactiva, tanto si la desactiva su propietario como un Administrador. Cada JWT
incluye la versión (`ver`) y se rechaza si no la trae o si no coincide con la
almacenada. La reactivación no reduce ni reinicia la versión.

**¿Por qué?**
RN27 exige que una cuenta desactivada no pueda iniciar sesión. Se comprobó que,
al reactivarla, los tokens anteriores aún vigentes volvían a ser aceptados y que
la revocación en memoria se perdía al reiniciar el servidor. Esta decisión amplía
RN27 y HU30: los tokens anteriores a la desactivación permanecen inválidos aunque
la cuenta se reactive o el servidor se reinicie. Los tokens emitidos antes del
cambio de esquema, que no contienen `ver`, se rechazan; los usuarios deben
iniciar sesión una vez.

**¿Qué artefacto respalda esta decisión?**
E7 (`cuenta.version_sesion`), E11, `src/models/Cuenta.js`, la migración aditiva de
`src/config/schema.js`, M7, M8, M17 y las pruebas
`tests/integration/session-version.test.js` y
`tests/schema/session-version-migration.test.js`.

**Estado**
Adoptada por el equipo el 24 de octubre de 2026; no constituye una aprobación
docente. Pendientes deliberados: E8, E9 y E12 (diagramas excluidos de esta
corrección) y M9 no muestran `version_sesion` ni `desactivarCuenta`; RN27, HU27 y
HU30 se sincronizarán en la Fase 7. El logout individual mantiene la revocación
en memoria. La protección de la última cuenta Administradora activa sigue sin
decisión. La migración de la base principal requiere una autorización aparte.

---

## Decisión #09

**¿Qué decidí?**
Completar el estado de los retos y proteger la consistencia de sus recompensas,
conservando los permisos de la Decisión #06:

- `reto.activo` (DEFAULT TRUE) se cambia solo mediante `PATCH /api/retos/:id/estado`,
  por el Estudiante propietario o el Administrador; el `PUT` general no acepta
  `activo`. Desactivar o reactivar no borra progreso, puntos ni historial.
- Un reto inactivo no recibe progreso automático ni nuevas recompensas; su
  completado manual se rechaza con 409.
- El completado manual se conserva para el propietario y el Administrador; se
  ejecuta en una transacción con un UPDATE condicionado y acredita una sola vez
  (índice `uq_punto_evento`).
- `puntos_recompensa` (1–10.000) y `progreso` siguen siendo editables mientras el
  reto no esté completado; después se rechazan con 409. Por la misma razón, la
  `semana` de un reto completado tampoco cambia, porque liberarla permitiría crear
  otro reto en ella y acreditar de nuevo. `descripcion` y `condicion` siguen
  editables, ya que no generan recompensas nuevas.
- Solo se eliminan retos no completados; uno completado conserva la trazabilidad
  de su recompensa y mantiene reservada su semana.
- Se aplican en la API los límites de RNF-16 (`puntos_recompensa` 1–10.000,
  `valor_objetivo` 1–10.080, `duracion_minutos` 1–1.440) y el formato RN24
  `metrica:objetivo` cuando se crea o cambia una condición; los registros
  antiguos no se invalidan.

**¿Por qué?**
El diagnóstico mostró que, mediante la API, un reto podía recibir recompensas sin
límite y acreditarse repetidamente al eliminarlo y crearlo de nuevo en la misma
semana, y que el estado `activo` documentado en E7, E9, E12 y RN28 no existía en
el código. Se cierran las acreditaciones repetidas sin retirar recompensas
históricas ni reiniciar progreso.

**Limitación explícita**
Estas reglas protegen la consistencia de la acreditación, pero no garantizan que
un reto completado manualmente o con progreso editado represente actividad
académica real. El completado manual y la edición del progreso se conservan por
la Decisión #06; la autenticidad de esos logros queda como pendiente de seguridad
funcional y no se declara resuelta. En particular, el límite es de una recompensa
por reto y por semana: un Estudiante puede crear retos en otras semanas válidas y
completarlos manualmente, de modo que el total acumulable no está acotado por estas
reglas.

**¿Qué artefacto respalda esta decisión?**
E7, E11 (`reto.activo`), `src/models/Reto.js`, la migración aditiva de
`src/config/schema.js`, M7, M8, M17 y las pruebas
`tests/integration/reto-estado.test.js`, `tests/schema/reto-activo-migration.test.js`
y `tests/api/api.test.js`.

**Estado**
Adoptada por el equipo el 24 de octubre de 2026; no constituye una aprobación
docente y no modifica retrospectivamente la Decisión #06. Pendientes: los límites
de RNF-16 se validan en la API y no como CHECK de SQLite (E9 dibuja el CHECK de
`puntos_recompensa`); E8, E9 y E12 conservan la marca «pendiente» de `activo` y de
`activarReto`/`desactivarReto`; RN28, HU06, HU18, HU31, CU06 y la matriz `14` se
sincronizarán en la Fase 7. La migración de la base principal (`version_sesion` y
`reto.activo`) requiere una autorización aparte.
