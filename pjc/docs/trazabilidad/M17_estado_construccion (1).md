# M17 — Estado funcional y pendientes de Construcción

**Fecha de revisión:** 20 de septiembre de 2026  
**Fuente:** hoja CONSTRUCCIÓN de `Ingenieria de Software 3.xlsx`  
**Estado:** desarrollo funcional en avance; tenemos pendientes para cerrar el checklist y declarar Línea Base 1.

## 1. Qué tenemos desarrollado y funcionando

Tenemos una aplicación web que podemos ejecutar desde la raíz con `npm install`
y `npm start`, y utilizar en `http://localhost:3000`. Nuestro frontend está
conectado a la API de Express y guarda los registros en SQLite. En `pjc/`
tenemos organizados los artefactos de Análisis y Diseño.

Distinguimos las funciones que ya podemos utilizar de los flujos que nos falta
completar. Una operación disponible en la API no implica que ya tengamos todos
sus controles desarrollados en la interfaz.

| Área | Qué tenemos funcionando | Qué nos falta o qué límite tenemos |
|---|---|---|
| Acceso | Registro con primera materia, login, logout, consulta del perfil y permisos por rol | Falta completar edición del perfil en la interfaz y endurecer la protección de autenticación |
| Materias y tareas | Crear, consultar, editar y eliminar; completar tareas; buscar por nombre y filtrar por estado/prioridad | Faltan filtros por materia/fecha y completar validaciones de negocio |
| Sesiones | Cronómetro Pomodoro y guardado con recompensa; API para consultar, editar y eliminar sesiones | No existe todavía todo el flujo visual de historial editable, sesión libre y descansos |
| Gamificación | Transacción de tarea/sesión, puntos, evaluación de insignias, metas, retos y nivel | Falta cerrar validación de condiciones, ajustes históricos y CRUD visual de metas/retos del estudiante |
| Recordatorios | Alta manual, consulta, activación/desactivación y eliminación | No equivale a programación automática ni a entrega de avisos vencidos; falta completar ese flujo |
| Notificaciones | Consulta, marcado como leída y eliminación | No hay evidencia de entrega con navegador cerrado |
| Preferencias | Tema y modo oscuro persistentes | Faltan avatar y restablecimiento previstos en el prototipo |
| Tableros | Estadísticas personales por periodo y agregados institucionales | Revisar rangos de varias semanas, denominador y fechas; no hay fecha de creación de tarea en E7 |
| Exportación | Descarga JSON de datos propios, sin contraseña | Mantenemos JSON como formato definido en RF14; otros formatos no son un pendiente del alcance actual |
| Administración | Gestión de cuentas, catálogos y correcciones de puntos/insignias con motivo | Edición visual de catálogos parcial; confirmar alcance y aprobación del CRF-003 |

## 2. Qué nos pide el checklist de Construcción

### Estado actual de los criterios de Construcción

Usamos **Cumple** cuando tenemos evidencia del criterio, **Parcial** cuando
tenemos avances pero quedan condiciones por cerrar y **Pendiente** cuando aún
no hemos completado el entregable final. El estado corresponde a nuestro
desarrollo actual; no reemplaza la aprobación de Línea Base 1.

### ✅ 1. Patrón MVC — Cumple

Tenemos modelos, vistas, controladores, servicios y rutas separados. La prueba
de arquitectura verifica las dependencias entre las capas.

**Falta:** Nada esencial para este criterio. Debemos mantener las reglas de
negocio en el backend y conservar la separación al desarrollar nuevas funciones.

### ✅ 2. Estructura de carpetas MVC — Cumple

Tenemos `models`, `views`, `controllers`, `services`, `routes`,
`middlewares`, `validators` y `public` dentro de `src/`.
Los archivos del frontend están en `public`; `views` documenta su papel en MVC.

**Falta:** Nada esencial en la estructura actual. Debemos mantener README y E6
alineados cuando cambiemos la organización.

### ✅ 3. Código idéntico al DDL aprobado — Cumple

Inicializamos SQLite desde E11 y tenemos la prueba automática
E7 → E11 → modelos → SQLite. Verificamos las 13 tablas, la ausencia de
`reporte`, la integridad de la base y la presencia del índice parcial de
idempotencia `uq_punto_evento` en `punto`.

**Evidencia cerrada:** CRF-003 quedó formalmente aprobado el 21 de septiembre de
2026 y la validación del esquema se repite en cada ejecución del conjunto de
pruebas del módulo de esquema, incluyendo la comprobación de la restricción de
idempotencia.

### ✅ 4. Código acorde al diccionario E7 — Cumple

Tenemos pruebas de correspondencia de campos, nombres, tipos, tamaños y
nulabilidad entre E7, modelos y SQLite, junto con comprobaciones de claves y
restricciones del esquema.

**Falta:** Nada esencial en la correspondencia declarativa actual. Las
validaciones de los datos recibidos por HTTP todavía requieren trabajo y las
incluimos en el punto 5; no son equivalentes a declarar correctamente el modelo.

### 🟡 5. Backend CRUD por entidad principal — Parcial

Tenemos API y operaciones para las 13 entidades, con particularidades del
modelo: los puntos son movimientos y algunas operaciones son de lectura,
asignación, marcado o desactivación. Ya coordinamos tareas y sesiones con
recompensas mediante transacciones; esos flujos no funcionan de manera aislada.

**Falta:** Completar validaciones de fechas y tamaños, permisos y casos
negativos; cerrar condiciones de retos, ajustes históricos y atomicidad de
correcciones administrativas. También nos falta terminar la automatización
de recordatorios para completar el flujo de negocio.

### ✅ 6. CRUD acorde al diagrama de clases — Cumple

`E12-diagrama-clases.drawio` fue actualizado el 22 de septiembre de 2026: cada
clase muestra el nombre exacto de cada método (uno por fila, sin agrupar), y
se agregaron las 6 clases de servicio (`TareaService`, `GamificacionService`,
`CorreccionAdministrativaService`, `PlanificadorRecordatoriosService`,
`EstadisticasService`, `ExportadorDatos`) con sus métodos públicos y de
soporte, más las dependencias hacia las entidades que coordinan. Verificamos
manualmente que los nombres del gráfico, M9 y el código de
`src/services/*.js` coinciden exactamente (por ejemplo, `TareaService` en el
código expone `crearTarea`, `actualizarTarea`, `listarTareas`, `obtenerTarea`,
`eliminarTarea` y `completarTarea`, y esos mismos seis métodos son los que
aparecen en el diagrama y en M9).

**Falta:** Nada esencial para este criterio. Los diagramas de secuencia
(`10a`–`10e`) siguen usando nombres de método a nivel de caso de uso
(`crearTarea`, `marcarCompletada`, `otorgarPuntos`) en vez de los nombres de
las clases de servicio; eso es válido en UML porque documentan la interacción
a nivel de CU, no la implementación interna, pero conviene revisarlo si el
checklist exige literalmente esa correspondencia en un futuro punto de
auditoría.

### 🟡 7. Trazabilidad RF ↔ HU ↔ método ↔ pantalla/botón — Parcial

Cruzamos M15 (construcción) y M16 (frontend) en una sola matriz de 4 eslabones
por HU: `M18_matriz_unificada_construccion.md`. Verificamos cada fila contra
el código real (`src/services`, `src/routes`, `src/public/app.js`), no solo
contra la documentación.

**Resultado de la unificación:** de 15 RF / 28 HU, **4 cadenas quedaron
rotas de verdad** — el backend tiene el método listo pero la interfaz no
tiene botón ni pantalla para esa HU específica:

- HU20 (RF01) — el estudiante no puede editar su perfil desde la interfaz.
- HU18 (RF06) — el estudiante no puede editar/eliminar su propio reto (solo
  existe la variante administrativa en P17).
- HU21 (RF10/RF11) — no hay vista de historial de sesiones con edición o
  eliminación, solo el contador de sesiones.
- HU17 (RF15) — el estudiante no puede editar/eliminar su propia meta;
  `renderizarGamificacion()` la muestra solo de lectura.

Además detectamos **2 cadenas parciales por vacío de rotulado** en M15/M16,
no de código: RF12/HU12 (modo enfoque) y RF08 (resumen de gamificación) ya
están implementadas y probadas, pero no aparecen nombradas como fila propia
en la matriz existente.

**Falta:** Agregar los 4 botones/pantallas faltantes (edición de perfil,
reto y meta propios, historial de sesiones) — coincide con lo que ya
teníamos anotado de forma general para los puntos 5 y 12, ahora con la HU y
el método de backend exactos — y corregir el rotulado de las 2 filas
parciales en M15/M16.

### 🟡 8. Control de cambios CRF y OCI — Parcial

Tenemos CRF-001, CRF-002 y CRF-003 con decisiones e impactos documentados.

**Falta:** Formalizar la revisión y aprobación de CRF-003 y dejar completas las
evidencias de la función dual de OCI, responsables, estados y artefactos afectados.

### ✅ 9. Commits descriptivos por RF/HU — Cumple en los avances recientes

Publicamos backend, frontend y documentación en commits separados con
referencias RF/HU. El frontend ya está incluido en el historial publicado.

**Falta:** Nada pendiente de publicación para esos avances. Debemos mantener
este criterio en los siguientes commits. Conservamos algunos mensajes
históricos genéricos; este estado describe las entregas recientes, no todo el
historial. La actualización actual de M17 todavía debe guardarse y publicarse.

### 🟡 10. Pantallas acordes a los prototipos aprobados — Parcial

Tenemos un frontend funcional y adaptable, con vistas por rol y referencias
P01–P20/W01–W06. Probamos recorridos reales en Chrome y tenemos evidencia de
la mayoría de los módulos dentro de la SPA de [src/public/index.html](../../src/public/index.html).

**Falta:** Comparar cada campo y acción con su prototipo, completar la
validación de detalle para perfil, sesiones, metas y catálogos, y documentar
las diferencias de alcance mediante CRF. La evidencia formal de esta
comparación queda recogida en [M17_pantallas_prototipos_validacion.md](M17_pantallas_prototipos_validacion.md).

**Estado objetivo del punto 10:** la cobertura funcional está presente, pero no
está cerrada la equivalencia exacta de cada pantalla con su prototipo aprobado.

### 🟡 11. Documentación del código y README — Parcial

Tenemos el README actualizado y comentarios RF/HU en controladores, servicios
nuevos, funciones del frontend, validadores, autenticación y soporte HTTP.
Los CRUD existentes también cuentan con documentación.

**Falta:** Completar la revisión de clases y métodos del código existente para
asegurar referencias RF/HU consistentes en todos los casos, y mantenerlas en
cada nuevo desarrollo.

### 🟡 12. Autenticación, usuarios y roles — Parcial

Tenemos JWT, contraseñas almacenadas como hash, cierre de sesión, control de
propiedad y tres roles. Ya existen vistas de Estudiante, Administrador y
Revisor institucional, con permisos comprobados también en el backend.

**Falta:** Reforzar la protección ante intentos de acceso, la revocación de
sesiones y las validaciones; completar perfil, edición administrativa y pruebas
negativas. No nos falta crear los roles ni sus vistas desde cero.

### ❌ 13. Declarar Línea Base 1 como ECS — Pendiente

Tenemos artefactos técnicos y registros de cambios, pero aún no hemos
declarado formalmente Línea Base 1 de Construcción.

**Falta:** Cerrar los pendientes correspondientes, preparar el manifiesto ECS
con versiones y evidencias, registrar la aprobación y etiquetar la versión.

### ❌ 14. Auditoría sin RF/HU huérfanos — Pendiente

Tenemos matrices de trazabilidad y pruebas con cobertura parcial.

**Falta:** Completar las funciones aprobadas pendientes y realizar la auditoría
bidireccional: cada RF/HU debe tener implementación y prueba, y cada función
debe estar respaldada por requisitos. También debemos reunir las mediciones RNF.

### Resumen

- ✅ Cumplidos: **6** — puntos 1, 2, 3, 4, 6 y 9; el punto 9 corresponde a los avances recientes. (Corregido: el punto 3 ya figuraba como "Cumple" en su propio apartado desde el cierre de CRF-003, pero el resumen no se había actualizado; el punto 6 se cerró el 22 de septiembre de 2026 al actualizar `E12-diagrama-clases.drawio`.)
- 🟡 Parciales: **6** — puntos 5, 7, 8, 10, 11 y 12.
- ❌ Pendientes: **2** — puntos 13 y 14.

Tenemos avances técnicos comprobados, pero no damos por cerrados los criterios
que todavía requieren aprobación, cobertura funcional o evidencia adicional.

## 3. En qué orden debemos avanzar

1. Corregir fallos reproducibles y cerrar validaciones, permisos y atomicidad.
2. Completar recordatorios automáticos y flujos de tareas/sesiones.
3. Completar metas/retos, perfil, preferencias y edición de catálogos.
4. Revisar cálculos del tablero y actualización de datos al cambiar de cuenta o realizar operaciones.
5. Ejecutar aceptación desde la interfaz y pruebas negativas de API; medir RNF con criterios del análisis.
6. Cerrar diagramas, trazabilidad, comentarios RF/HU, CRF y Línea Base 1 con evidencia y aprobación.

Vamos a mantener la documentación aprobada como referencia. Si necesitamos
cambiar el alcance, lo registramos mediante CRF antes de darlo por aprobado.
La actualización del Word la tenemos pendiente para una etapa posterior.

## 4. Qué hemos probado

- Verificamos la arquitectura MVC, la correspondencia del esquema y las operaciones de datos mediante las pruebas de arquitectura, esquema e integración.
- Probamos las transacciones de gamificación, la protección ante recompensas duplicadas y la reversión de operaciones cuando ocurre un error.
- Corregimos la diferencia entre fecha UTC y local en `Punto.fecha`, conservando DATE de E7/E11 y sin modificar registros históricos. La API devuelve los 25 puntos esperados en el periodo del caso de prueba.
- Agregamos `tests/schema/point-date.test.js` con instantes fijos alrededor de medianoche UTC; pasó con `TZ=America/Bogota`.
- Ejecutamos `npm test` y `npm run test:browser` con resultado satisfactorio. En Chrome recorrimos los flujos de tarea/sesión, recompensas, indicadores, exportación y vistas por rol, incluyendo un ancho de 390 px.
- Comprobamos que nuestra base local tiene 13 tablas, integridad `ok` y cero violaciones de claves foráneas.

Estas pruebas nos permiten identificar qué flujos funcionan. Nos queda ampliar
la cobertura de los CRUD visuales, completar la aceptación de todos los RF/HU
y medir los RNF para cerrar Construcción.

## 5. Cómo podemos probar el desarrollo

Para separar las pruebas de nuestros datos de trabajo, podemos iniciar la
aplicación con una base de ensayo:

```bash
DATABASE_STORAGE=/tmp/studyquest-prueba-manual.sqlite npm start
```

Después abrimos `http://localhost:3000` y realizamos este recorrido:

1. Registramos un estudiante con una materia inicial.
2. Creamos y editamos una materia y una tarea.
3. Completamos la tarea y consultamos puntos y notificaciones.
4. Guardamos una sesión con duración positiva y revisamos su recompensa.
5. Consultamos el tablero, exportamos los datos en JSON y cambiamos el tema.
6. Cerramos sesión e ingresamos con otra cuenta para verificar que no aparezcan datos ajenos.
7. Probamos los otros roles con cuentas de ensayo creadas mediante `bootstrap:account`, utilizando la misma variable `DATABASE_STORAGE` y las instrucciones del README.

En cada prueba registramos la acción, el RF/HU, los datos utilizados, el
resultado esperado, el resultado obtenido y la evidencia. Verificamos la
operación completa, no solamente que la pantalla abra.

## 6. Nuestro estado actual y los avances que hemos realizado

Nuestro avance combina ajustes de Análisis y Diseño con el desarrollo del
backend, la interfaz y las pruebas. Este resumen reúne los **20 commits
publicados revisados, entre el 29 de agosto y el 20 de septiembre de 2026**.
Incluimos sus identificadores para localizar los cambios y distinguimos el
trabajo documental de las funciones implementadas.

### 6.1. Base del proyecto y documentación de Análisis

- **Eliminamos la tabla `reporte` de la base de datos** — `3fe7a5b`.
  Retiramos la tabla que no debía persistirse como entidad. Este cambio fue
  sobre SQLite; el cálculo funcional de estadísticas se implementó después.

- **Revisamos los artefactos de Análisis** — `5bb533d`.
  Ajustamos alcance, objetivos específicos, casos de uso y metodología.
  Incorporamos el checklist de Análisis para registrar su revisión.

- **Ampliamos requisitos, historias y trazabilidad** — `000cc79`.
  Actualizamos objetivos y casos de uso, incorporamos la especificación de
  requisitos, las historias con criterios de aceptación y la matriz de
  trazabilidad de Análisis. También ajustamos reglas de negocio y referencias
  de actores y pantallas. Fue un avance documental, no la implementación
  automática de todos esos requisitos.

- **Adaptamos los RNF al formato solicitado** — `043ec39`.
  Organizamos RNF-01 a RNF-15 con descripción, característica/subcaracterística
  ISO 25010, criterio medible y técnica de verificación. Dejamos definidos los
  criterios para probarlos; todavía debemos completar sus mediciones.

- **Actualizamos la autoría de los artefactos** — `8b9290d`.
  Unificamos los datos del equipo en documentos de Análisis, Diseño y
  trazabilidad para mantener consistencia en la identificación del proyecto.

### 6.2. Diccionario, diseño y trazabilidad

- **Formalizamos E7 y unificamos las insignias semilla** — `00e887f`.
  Registramos la aprobación del diccionario y alineamos M8 con las cinco
  insignias de E11: Primera tarea, Semana perfecta, Racha de 5, Madrugador
  y Pomodoro Pro. Resolvimos la diferencia con la lista anterior de ocho.
  Esta aprobación no reemplaza la revisión de cambios posteriores por CRF.

- **Alineamos la documentación UML con E7** — `c500230`.
  Corregimos referencias y correspondencias en M9, M10 y M14 para relacionar
  clases, métodos, secuencias y actividades con los nombres del proyecto.
  Estos ajustes se hicieron en Markdown; no equivalen a corregir todos los gráficos.

- **Ampliamos la cobertura documental por CRUD** — `25beed2`.
  Incorporamos en M10 las especificaciones textuales Seq-CRUD-01 a
  Seq-CRUD-13, con participantes, mensajes, alternativas y excepciones.
  Ajustamos M9 y M14 para reflejar esa cobertura sin modificar los Draw.io.
  Sigue pendiente completar y verificar la representación gráfica necesaria.

- **Actualizamos pantallas, roles y navegación** — `5f6835b`.
  Revisamos el mapa de navegación y M12 para relacionar pantallas con roles,
  historias y casos de uso CU01–CU16. Esto nos dio una referencia documental
  para construir la navegación del frontend.

- **Documentamos estados y transiciones** — `1b19d7a`.
  Ampliamos el documento de estados y M11 con eventos, acciones y transiciones
  de cuentas, materias, tareas, sesiones, retos, metas, recordatorios y
  notificaciones. Distinguimos estados persistidos de estados transitorios
  de la interfaz y justificamos las entidades sin ciclo de estados.

### 6.3. Arquitectura, persistencia y API

- **Unificamos la ejecución y el esquema SQLite** — `9c91279`.
  Dejamos la raíz como directorio ejecutable y `pjc/` para documentación.
  Centralizamos la inicialización en E11, alineamos modelos y operaciones con
  SQLite y agregamos servidor, verificación de salud y pruebas de esquema e
  integración. Documentamos la decisión mediante CRF-001.

- **Ampliamos la verificación de restricciones únicas** — `31c89b9`.
  Agregamos comprobaciones automáticas de unicidad al esquema para detectar
  diferencias entre las restricciones esperadas y las existentes en SQLite.

- **Incorporamos roles al modelo de cuentas** — `f794a61`.
  Alineamos el campo de rol en E7, E11, el modelo Cuenta y las pruebas.
  Registramos el cambio en CRF-002 para soportar Estudiante, Administrador
  y Revisor institucional.

- **Organizamos la arquitectura MVC** — `922590f`.
  Incorporamos la capa de servicios sobre los CRUD existentes, el manejo
  compartido de errores y las bases de la vista. Agregamos una prueba para
  comprobar las dependencias permitidas entre capas.

- **Implementamos autenticación y autorización** — `8a1a8b6`.
  Agregamos registro, inicio/cierre de sesión, consulta del perfil, JWT y
  contraseñas con hash bcrypt. El registro crea cuenta, preferencia visual
  y primera materia en una transacción. Incorporamos validadores, controles
  de rol/propiedad y un script para preparar cuentas privilegiadas localmente.

- **Publicamos la API de las 13 entidades** — `468bb06`.
  Implementamos rutas y controladores para cuentas, materias, tareas,
  preferencias, sesiones, recordatorios, notificaciones, puntos, insignias,
  asignaciones de insignias, niveles, retos y metas. Incorporamos M15 y
  pruebas HTTP de operaciones, autenticación, roles y aislamiento entre
  cuentas. Las operaciones disponibles respetan las particularidades de cada
  entidad; no todas tienen un CRUD genérico de cuatro acciones.

### 6.4. Flujos funcionales, frontend y pruebas

- **Alineamos Diseño con la implementación ejecutable** — `af5d2bf`.
  Consolidamos la documentación de arquitectura y diagramas con el desarrollo
  existente. Actualizamos E6 para reflejar el navegador, el servidor
  Node/Express y SQLite, reconociendo que ya tenemos servidor y frontend.

- **Conectamos eventos, recompensas y tableros** — `30d4767`.
  Implementamos `GamificacionService` para coordinar tareas y sesiones con
  puntos, progreso de metas/retos, insignias, niveles y notificaciones.
  Agregamos transacciones y un índice para evitar acreditar dos veces el mismo
  evento. Incorporamos estadísticas personales, indicadores institucionales
  agregados y exportación JSON de datos propios, sin contraseña.
  También agregamos motivos y avisos en correcciones administrativas,
  documentamos CRF-003 y ampliamos las pruebas. Corregimos la fecha UTC de
  puntos administrativos con una regresión específica. CRF-003 sigue pendiente
  de aprobación formal y las correcciones administrativas requieren completar
  su atomicidad.

- **Construimos el frontend conectado a la API** — `a51544d`.
  Agregamos HTML, estilos y lógica de interfaz para acceso, materias, tareas,
  Pomodoro, consulta de gamificación, estadísticas, exportación, recordatorios,
  notificaciones y preferencias. Incorporamos vistas de administración y
  consulta institucional según el rol, mensajes de resultado y presentación
  de recompensas confirmadas por el servidor. Documentamos las acciones en
  M16 y añadimos pruebas estáticas y recorridos reales en Chrome, incluyendo
  adaptación móvil a 390 px. Estos recorridos no cubren todavía todas las
  interacciones de los prototipos.

- **Documentamos el funcionamiento y los pendientes** — `4379434`.
  Actualizamos README, bitácora, decisiones y comentarios RF/HU del código.
  Incorporamos M17 para contrastar los 14 criterios de Construcción, registrar
  pruebas y orientar los siguientes desarrollos. Dejamos separados los
  resultados técnicos de las aprobaciones y del cierre de Línea Base 1.

### 6.5. Qué podemos utilizar y qué debemos completar

Tenemos una aplicación ejecutable con frontend, backend y persistencia real.
Podemos registrarnos, gestionar materias y tareas, completar tareas con
recompensa, guardar sesiones, consultar puntos, niveles e insignias, revisar
estadísticas y exportar datos propios. También tenemos operaciones de
recordatorios/notificaciones, preferencias visuales y vistas por rol.

Nuestro siguiente trabajo es completar los flujos y controles señalados en
el punto 2: validaciones y seguridad, automatización de recordatorios,
historial de sesiones, metas/retos, perfil, edición administrativa y cálculos
por periodo. Después debemos cerrar diagramas, trazabilidad, pruebas y
aprobaciones para declarar Línea Base 1. Haber publicado estos avances no
significa que todos los requisitos de Construcción estén terminados.
