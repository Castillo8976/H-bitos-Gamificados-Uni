# CRF-005 — Cierre de validación de pantallas y funciones de interfaz

**Fecha:** 22 de septiembre de 2026  
**Solicitante:** Equipo de construcción  
**Estado:** Implementado; pendiente de aprobación formal de OCI  
**Artefactos afectados:** E7, E11, modelos Sequelize, rutas y controladores de recursos, `src/public/index.html`, `src/public/app.js`, `src/public/styles.css`, M16, M17-A y pruebas de esquema/frontend.

## 1. Motivo

La comparación del punto 10 contra los wireframes W01-W06 encontró controles construidos que aún no estaban conectados al alcance documentado: modo Pomodoro libre y descanso, preferencias de notificaciones, eliminación de datos propios y estado de tarea `En progreso`.

## 2. Decisiones aprobadas para construcción

- El modo Pomodoro conserva ciclos de 25 minutos de enfoque y agrega descanso automático de 5 minutos.
- El modo Libre cuenta tiempo ascendente y registra la sesión con `modo_enfoque = false`.
- Las alertas de recordatorios y retos se pueden activar o desactivar y se persisten en `preferencia_visual`.
- El estudiante puede eliminar sus datos mediante una acción confirmada; la eliminación usa las relaciones `ON DELETE CASCADE` y no afecta cuentas ajenas.
- Las tareas admiten los estados `Pendiente`, `En progreso` y `Completada`.
- La exportación JSON debe realizarse antes de eliminar datos si el estudiante desea conservar una copia.

## 3. Implementación y trazabilidad

- E7 y E11 documentan los nuevos campos de notificaciones y el dominio de estados.
- La inicialización aplica una migración no destructiva para bases existentes.
- La API restringe la eliminación de datos al estudiante propietario y valida el nuevo estado.
- Las pantallas P04, P06 y P13 muestran los controles correspondientes.
- M17-A registra las diferencias que permanecen fuera de este alcance y requieren implementación adicional o un CRF posterior.

## 4. Evidencia

- `npm run test:schema`
- `npm run test:frontend`
- `node --check src/public/app.js`

La aprobación final de OCI y la revisión visual en Chrome quedan como actividad de cierre del punto 10.

## 5. Corrección de regresiones de la implementación

Revisamos los cambios de interfaz y corregimos los siguientes fallos en local:

- **RF01/HU20 y RF13/HU13:** eliminamos el bloque duplicado de perfil y
  preferencias. La selección del primer formulario, sin los controles nuevos,
  interrumpía la carga después del login. También cargamos nombre y correo
  usando los campos reales del formulario.
- **RF02/HU19 y RF03/HU03:** conectamos el estado `En progreso` con
  `TareaService`. Completar conserva su operación transaccional de recompensas;
  no permitimos completarlo por edición genérica ni reabrir una tarea completada.
- **RF04/HU25:** el planificador también procesa tareas en progreso y conserva
  la reprogramación de sus recordatorios al editar la fecha de entrega.
- **CRF-005:** las bases anteriores actualizan el CHECK de estados mediante una
  reconstrucción transaccional. Conservamos filas, referencias, índices y
  triggers; verificamos claves foráneas antes de confirmar la migración.
- **RF13/HU13:** las preferencias de alertas silencian las notificaciones
  nativas de retos y recordatorios, sin eliminar la bandeja interna ni volver
  a mostrar avisos antiguos al reactivarlas. E7 conserva `Sistema` para los
  recordatorios: la interfaz reconoce el prefijo automático y los mensajes
  de recordatorios que permanecen registrados. No añadimos un tipo persistido.

### Evidencia de la corrección

- `npm test`: satisfactorio, incluyendo la regresión de identificadores HTML
  únicos y `tests/schema/task-migration.test.js`.
- `npm run test:browser`: satisfactorio para los tres roles, presentación móvil,
  transición a `En progreso`, completado y preferencias de alertas. La entrega
  nativa se simula para controlar permisos; no acredita entrega con navegador cerrado.
- Copia temporal consistente de la base local: inicialización repetida,
  publicación HTTP, integridad `ok` y cero violaciones de claves foráneas.
  Comprobamos que el archivo original conservó su hash durante la prueba.

Estas evidencias corrigen las regresiones detectadas; no equivalen a aprobar
OCI ni a cerrar todo el checklist de Construcción. Los cambios permanecen
locales hasta su revisión y publicación autorizada.
