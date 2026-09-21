# BITÁCORA DE DESARROLLO

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Autor:** Juan David Castillo Mena  
**Asignatura:** Ingeniería de Software III — Uniremington 2026

---

## Entrada #01 — Semana 3 (Abril 2025)

**¿Qué hice?**
Configuré el entorno del proyecto con Node.js, Sequelize y SQLite. Definí los modelos Sequelize para las cinco tablas maestras del sistema: `cuenta`, `materia`, `insignia`, `nivel_cuenta` y `preferencia_visual`. Implementé el CRUD completo para cada una con sus funciones de crear, listar, obtener, actualizar y eliminar. Creé el archivo `test.js` para probar el flujo completo del CRUD de Insignia en consola.

**¿Qué problema encontré?**
Sequelize pluraliza automáticamente el nombre de las tablas (por ejemplo, busca `cuentas` en lugar de `cuenta`). Esto generaba errores al hacer consultas porque los nombres en la BD no coincidían con lo que Sequelize esperaba.

**¿Cómo lo resolví?**
Agregué `tableName: 'cuenta'` (y el nombre exacto correspondiente) en las opciones de cada modelo para forzar el nombre correcto de la tabla. También desactivé `timestamps: false` para evitar que Sequelize intentara agregar columnas `createdAt` y `updatedAt` que no existen en el esquema diseñado.

**¿Usé IA?** Sí — Usé IA para generar la estructura base de los modelos Sequelize. Ajusté los tipos de datos (cambié `DataTypes.UUID` por `DataTypes.STRING(36)` ya que SQLite maneja UUIDs como texto) y añadí los `defaultValue` con `crypto.randomUUID()` que no estaban en la versión inicial generada.

---

## Entrada #02 — Semana 4 (Abril / Mayo 2025)

**¿Qué hice?**
Implementé los modelos y CRUDs de las tablas transaccionales: `tarea`, `sesion_estudio`, `punto`, `reto`, `meta`, `cuenta_insignia`, `recordatorio`, `reporte` y `notificacion`. Definí todas las asociaciones entre modelos (`hasMany`, `belongsTo`, `belongsToMany`) con sus respectivos `onDelete` (CASCADE o SET NULL según el caso). Implementé las primeras reglas de negocio: `completarReto()` acredita puntos automáticamente y `evaluarInsignias()` evalúa condiciones y desbloquea logros.

**¿Qué problema encontré?**
Al implementar `reporteCrud.generarReporteSemanal()` y `retoCrud.completarReto()`, que necesitan importar funciones de otros CRUDs (`puntoCrud`, `sesionEstudioCrud`), me encontré con dependencias circulares. Node.js resolvía el `require` con un objeto vacío `{}` en tiempo de carga, lo que causaba que las funciones importadas fueran `undefined` al ejecutarse.

**¿Cómo lo resolví?**
Moví los `require` de las dependencias problemáticas al interior de las funciones que las usan (importaciones dinámicas en tiempo de ejecución). Esto rompe el ciclo porque el módulo ya está completamente cargado cuando la función se ejecuta. Por ejemplo, en `completarReto()`: `const { otorgarPuntos } = require('../crud/puntoCrud')` dentro del cuerpo de la función en lugar de en el encabezado del archivo.

**¿Usé IA?** Sí — Usé IA para entender el patrón de dependencias circulares en Node.js y para validar que la solución de importación dinámica era la correcta para este caso. El código final lo escribí y adapté yo verificando que las rutas de los `require` fueran correctas para la estructura de carpetas del proyecto.

---

## Entrada #03 — Semana 5 / 6 (Mayo 2025)

**¿Qué hice?**  
Completé la implementación de todas las reglas de negocio del módulo: `actualizarProgresoMeta()` marca la meta como cumplida automáticamente cuando `valor_actual >= valor_objetivo`; `generarReporteSemanal()` consolida datos reales de tres tablas (Tarea, SesionEstudio, Punto) en un snapshot semanal; `evaluarNivelCuenta()` determina el nivel del usuario según sus puntos acumulados. Agregué los comentarios de trazabilidad en todos los métodos con el formato `// CU-XX | RF-XX | E12`. Corregí errores de rutas de importación en `NivelCuenta.js` y `Notificacion.js` que usaban `../../database` en lugar de `../database`.

**¿Qué problema encontré?**  
Los modelos `NivelCuenta.js` y `Notificacion.js` tenían rutas de importación incorrectas (`../../database` y `'../models/Cuenta'`) que causaban `MODULE_NOT_FOUND` al ejecutar el servidor. El error no era obvio porque solo aparecía cuando esos modelos específicos se cargaban, no al iniciar la aplicación.

**¿Cómo lo resolví?**  
Corregí las rutas en ambos archivos: `require('../../database')` → `require('../database')` en `NivelCuenta.js`, y en `Notificacion.js` la misma corrección más `require('../models/Cuenta')` → `require('./Cuenta')`. También aproveché para agregar los índices compuestos `UNIQUE(id_cuenta, semana)` faltantes en los modelos `Reto`, `Meta` y `Reporte`, que sí estaban definidos en el DDL del diseño pero no habían sido trasladados a los modelos Sequelize.

**¿Usé IA?** Sí — Usé IA para hacer una revisión cruzada entre los modelos, los CRUDs y el DDL del documento de diseño, identificando las inconsistencias de rutas y los índices faltantes. Los ajustes los apliqué directamente en los archivos después de entender el problema.

---

## Entrada #04 — Agosto 2026 (revisión final)

**¿Qué hice?**  
Eliminé por completo la entidad `reporte` (modelo, CRUD, tabla del DDL, y todas sus referencias en la documentación de diseño y trazabilidad). Me informaron que un reporte semanal como tabla independiente era innecesario: es información que el sistema puede calcular internamente en el momento, sin necesidad de guardarla ni mostrarla como una sección aparte para el usuario. Las estadísticas que antes vivían en `reporte` (tareas completadas, horas estudiadas, puntos obtenidos) ahora se calculan en tiempo real con `COUNT`/`SUM` sobre `tarea`, `sesion_estudio` y `punto`, directamente en el Tablero de Avance Personal.

**¿Qué problema encontré?**  
`reporte` estaba mencionado en más de 25 archivos distintos (código, diccionario de datos, MER, DDL, casos de uso, reglas de negocio, matrices de trazabilidad, diagramas). No era un cambio aislado — tocaba prácticamente toda la fase de diseño de datos.

**¿Cómo lo resolví?**  
Fui archivo por archivo: primero el código (`Reporte.js`, `reporteCrud.js`, referencias en `app.js` y otros CRUDs), después los documentos de diseño de datos (E7 a E11), luego los casos de uso y reglas de negocio, y finalmente las matrices de trazabilidad y diagramas. Dejé nota explícita en cada archivo donde el cambio no era obvio, para que quede constancia de por qué `reporte` ya no aparece.

**¿Usé IA?** Sí — usé IA para hacer el barrido completo del repositorio en busca de todas las menciones a `reporte` y aplicar la eliminación de forma consistente en cada archivo.

---

## Entrada #05 — Septiembre 2026 (Construcción, objetivos 6–10)

**¿Qué hice?**
Integré `GamificacionService` para completar tareas y guardar sesiones mediante
transacciones; agregué estadísticas semanales, exportación JSON, indicadores
institucionales agregados y las pantallas P11/P14–P18. El frontend ahora cambia
sus acciones según Estudiante, Administrador o Revisor institucional.

**¿Qué problema encontré?**
Los métodos de tareas, puntos, retos, metas, insignias y notificaciones existían,
pero se ejecutaban de forma aislada. Una falla podía dejar una recompensa a
medias y el mismo evento podía procesarse más de una vez.

**¿Cómo lo resolví?**
Moví la coordinación a una clase de servicio, usé una transacción SQLite
`IMMEDIATE` y agregué el índice parcial `uq_punto_evento`. Las estadísticas se
calculan con las tablas vigentes y el Revisor recibe solo cifras globales. Se
agregaron pruebas de éxito, duplicidad, rollback, privacidad, roles y Chrome.

**¿Usé IA?** Sí — se utilizó como apoyo para revisar trazabilidad, diseñar las
pruebas y detectar inconsistencias. Las decisiones quedan registradas en
CRF-003 y deben ser aprobadas por el equipo antes de Línea Base 1.

---

## Entrada #06 — Integración del equipo y verificación de Construcción

**¿Qué hice?**
Resguardé los archivos locales y el historial, integré los commits `ef140f5`
y `aceede6` del compañero sin reescribirlos y conservé sus seis documentos.
E6 ahora reconoce el servidor Express y la interfaz existentes. Separé la
integración (`af5d2bf`), el backend (`30d4767`) y el frontend (`a51544d`) en
commits con referencias RF/HU. Actualicé comentarios, README y M17.

**¿Qué problema encontré y cómo lo resolví?**
Al probar de noche en Bogotá, Sequelize asignaba el día local a los ajustes de
puntos y la gamificación usaba UTC. Unificamos el valor predeterminado de
`Punto.fecha` con UTC, conservando DATE y sin cambiar datos históricos.
Agregué una regresión con reloj fijo y repetí las pruebas de API y Chrome.

**¿Qué evidencia quedó?**
`npm test`, `npm run test:browser` y la regresión con zona `America/Bogota`
pasaron. La base local tiene 13 tablas, integridad `ok` y cero violaciones de FK.
La copia actual contiene cuentas personales/de ensayo y queda fuera del commit;
las versiones de BD de los commits previos pendientes de subir no tienen cuentas.
M17 distingue estos resultados de los pendientes de Construcción y aprobación.

**¿Usé IA?** Sí, para apoyar la integración, revisión, documentación y pruebas.
No se registraron aprobaciones humanas ni se declaró Línea Base 1.
