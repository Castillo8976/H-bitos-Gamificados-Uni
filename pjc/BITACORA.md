# BITÁCORA DE DESARROLLO

**Proyecto:** Plataforma Web Gamificada de Hábitos de Estudio  
**Autor:** Juan David Castillo Mena  
**Asignatura:** Ingeniería de Software II — Uniremington 2025

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
