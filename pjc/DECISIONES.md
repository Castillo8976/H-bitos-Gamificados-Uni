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
**Entregable 7 — Diccionario de Datos**, sección entidad `punto`: define explícitamente que "el total de puntos de una cuenta es la suma de todos sus registros", no un campo precalculado. También está respaldado por **Entregable 9 — Modelo Relacional**, que incluye la vista `vista_puntos_totales` con `SELECT SUM(cantidad) ... GROUP BY id_cuenta`, confirmando que el diseño siempre consideró el cálculo agregado como mecanismo oficial de consulta del puntaje.

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
