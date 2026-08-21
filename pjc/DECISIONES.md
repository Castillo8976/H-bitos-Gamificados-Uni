# DECISIONES TÉCNICAS

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Autor:** Juan David Castillo Mena  
**Asignatura:** Ingeniería de Software II — Uniremington 2025

---

## Decisión #01

**¿Qué decidí?**  
Usar **SQLite como motor de base de datos** en lugar de PostgreSQL o MySQL.

**¿Por qué?**  
SQLite no requiere instalar ni configurar un servidor de base de datos separado. El archivo `.sqlite` es portátil, vive en el mismo directorio del proyecto y funciona en cualquier máquina sin pasos adicionales de instalación. Para el alcance de este módulo académico (un solo estudiante como usuario por sesión, sin concurrencia real), SQLite cubre todos los requisitos funcionales. Además, es compatible con Sequelize sin cambios en el código de los modelos, lo que permitiría migrar a PostgreSQL en el futuro simplemente cambiando la configuración de conexión en `database.js`.

**¿Qué artefacto de diseño respalda esta decisión?**  
**Entregable 6 — Diagrama de Despliegue UML**: define una arquitectura de nodo único donde la aplicación web (Node.js/Express) y el almacenamiento de datos (SQLite) residen en el mismo entorno, sin servidor de BD externo. Esto está alineado con la sección de Alcance del documento de requisitos (actualizada en agosto de 2026 para reflejar el backend Node.js/Express/Sequelize/SQLite realmente implementado, en lugar de la versión estática con `localStorage` planteada al inicio del proyecto).

---

## Decisión #02

**¿Qué decidí?**  
Implementar el historial de puntos como un **ledger inmutable (append-only)** en lugar de un contador actualizable en la tabla `cuenta`.

**¿Por qué?**  
La alternativa simple sería guardar un campo `puntos_totales` en la tabla `cuenta` y actualizarlo con cada acción. Sin embargo, esto pierde el historial: no se podría saber cuántos puntos ganó el usuario en una semana específica, ni de qué acciones provinieron (tareas, retos, sesiones). El patrón ledger resuelve ambos problemas: cada evento de ganancia genera una fila nueva en la tabla `punto` con su `origen` e `id_origen`. El total se calcula con `SUM(cantidad)` y el desglose semanal con un filtro adicional por fecha. Esta decisión es clave para que `generarReporteSemanal()` pueda calcular `puntos_obtenidos` por semana de forma precisa.

**¿Qué artefacto de diseño respalda esta decisión?**  
**Entregable 7 — Diccionario de Datos**, sección entidad `punto`: define explícitamente que "el total de puntos de una cuenta es la suma de todos sus registros", no un campo precalculado. También está respaldado por **Entregable 9 — Modelo Relacional**, que incluye la vista `vista_puntos_totales` con `SELECT SUM(cantidad) ... GROUP BY id_cuenta`, confirmando que el diseño siempre consideró el cálculo agregado como mecanismo oficial de consulta del puntaje.

---

## Decisión #03

**¿Qué decidí?**  
Usar **importaciones dinámicas** (`require()` dentro del cuerpo de funciones) para resolver dependencias circulares entre módulos CRUD, en lugar de reestructurar las carpetas o usar un patrón de inyección de dependencias.

**¿Por qué?**  
`retoCrud.completarReto()` necesita llamar a `puntoCrud.otorgarPuntos()`, y `reporteCrud.generarReporteSemanal()` necesita funciones de `sesionEstudioCrud` y `puntoCrud`. Si estos `require` están en el encabezado del archivo, Node.js crea un ciclo de carga que resulta en módulos importados como `{}`. La solución más directa sin cambiar la arquitectura es mover el `require` al interior de la función que lo usa, momento en que todos los módulos ya están completamente cargados. Esta decisión mantiene el código simple y coherente con la estructura de carpetas ya definida, sin introducir patrones adicionales (como un contenedor de dependencias) que aumentarían la complejidad innecesariamente para el alcance del proyecto.

**¿Qué artefacto de diseño respalda esta decisión?**  
**Entregable 13 — Diagramas de Secuencia**: el diagrama de secuencia de CU-06 (Completar Reto) muestra la llamada de `RetoService` a `PuntoService` como una dependencia de ejecución, no de inicialización. Esto confirma que la relación entre estos componentes es una colaboración en tiempo de ejecución, lo que justifica la importación dinámica como mecanismo de implementación.
