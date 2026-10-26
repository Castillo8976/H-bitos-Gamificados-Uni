# Casos de Uso

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software III — Uniremington
**Autores:** Juan David Castillo Mena · Alejandro Cardona Jaramillo  
**Docente:** Gloria Amparo Lora Patiño  

---


Se identificaron **16 casos de uso específicos** derivados de las historias de usuario y los requisitos funcionales. Cada caso de uso representa un objetivo completo del actor, con flujo normal, flujos alternativos y postcondiciones verificables.

## Caso de Uso General del Sistema

| Campo | Descripción |
|---|---|
| **Identificador** | CUG01 |
| **Nombre** | Gestionar hábitos de estudio mediante una plataforma web gamificada |
| **Actores** | Estudiante (principal), Administrador (secundario autorizado), Revisor institucional (secundario de solo lectura), Notifications API (sistema externo de apoyo) |
| **Límite del sistema** | El rectángulo "Plataforma Web Gamificada de Hábitos de Estudio" en `02_Diagrama_de_Casos_de_Uso_General.drawio` es la **única** herramienta que representa el límite; ningún otro artefacto vuelve a dibujar ese contorno. |
| **Alcance** | Comprende CU00 (Iniciar sesión, compartido) y CU01–CU16. El Estudiante se registra, inicia sesión y utiliza los módulos de agenda, tareas, Pomodoro, gamificación, tablero, recordatorios, notificaciones, configuración y exportación. El Administrador mantiene cuentas y catálogos globales autorizados, y puede cambiar el estado de los retos. El Revisor institucional únicamente consulta indicadores agregados. |
| **Precondición general** | El sistema está desplegado y accesible por URL; existe al menos una cuenta con rol Administrador para operar los catálogos. |
| **Postcondición general** | Cada sesión de uso deja persistidos en SQLite únicamente los cambios que el rol del actor autoriza; no existen escrituras fuera del alcance de su rol. |
| **Relaciones internas** | CU02–CU16 **incluyen** (`<<include>>`) a CU00 por su subflujo S1 «Validar sesión activa», que todos ejecutan obligatoriamente; el ingreso de credenciales de CU00 ocurre una sola vez y su resultado (el JWT) es precondición, no comportamiento incluido. CU06 **extiende** (`<<extend>>`) a CU03 y CU04: desbloquear insignias o acreditar retos se inserta solo si el evento cumple una condición. Programar el recordatorio al crear una tarea es un paso obligatorio de CU02 (RN05); CU10 **extiende** a CU02 solo cuando, al editar una tarea no completada, cambian su nombre o fecha de entrega. Notifications API se relaciona con CU10 y CU15 mediante **asociación**, no mediante `<<include>>`. Ver detalle en la tabla siguiente. |

### Relaciones `<<include>>` / `<<extend>>` del sistema

**Convención UML aplicada.** En `<<include>>` la flecha va del caso base al caso incluido: el comportamiento incluido se ejecuta **siempre** que se ejecuta el caso base, y este no está completo sin él. En `<<extend>>` la flecha va del caso extensor al caso base: el comportamiento extensor se inserta en un **punto de extensión** del caso base **solo si** se cumple su condición, y el caso base está completo sin la extensión. Ambas relaciones unen exclusivamente casos de uso; la relación entre un actor —humano o sistema externo— y un caso de uso es una **asociación**.

| # | Origen → Destino | Tipo | Punto de extensión / momento | Condición | Justificación verificada en el código |
|---|---|---|---|---|---|
| 1 | CU02–CU16 → **CU00**, subflujo S1 «Validar sesión activa» | `<<include>>` | Inicio de cada operación protegida | Siempre | Cada petición protegida pasa por `authenticateRequest` (`src/middlewares/authentication.js`), que valida el JWT y vuelve a consultar que la cuenta exista y esté activa. Lo incluido es esa validación, no el ingreso de correo y contraseña. CU01 no incluye CU00 porque el registro es público. |
| 2 | CU06 → CU03 | `<<extend>>` | «Evaluación de gamificación» (CU03, paso 7) | [el evento cumple la condición de una insignia no obtenida o alcanza el objetivo de un reto de la semana] | `GamificacionService.completarTareaConGamificacion` siempre evalúa metas, retos, insignias y nivel dentro de la transacción; lo que se inserta de forma condicional es el comportamiento de CU06: desbloquear la insignia o acreditar la recompensa del reto. CU03 termina correctamente aunque no se desbloquee nada. |
| 3 | CU06 → CU04 | `<<extend>>` | «Evaluación de gamificación», después de guardar la sesión | [la sesión cumple la condición de una insignia o alcanza el objetivo de un reto por `sesiones`, `pomodoros` o `minutos` (RN24)] | `GamificacionService.registrarSesionConGamificacion` aplica la misma evaluación condicional. |
| 4 | CU10 → CU02 | `<<extend>>` | «Reprogramación de recordatorio», al guardar la edición de una tarea (CU02, A3) | [la tarea no está completada y cambian su nombre o su fecha de entrega] | Al crear, `TareaService.crearTarea` invoca siempre `PlanificadorRecordatoriosService.sincronizarAutomatico`: es el paso 5 obligatorio de CU02 (RN05), no una extensión. Al editar, `TareaService.actualizarTarea` solo lo invoca bajo la condición indicada; editar únicamente la prioridad no reprograma el recordatorio. |
| 5 | Notifications API — CU10, CU15 | Asociación (no `<<include>>`) | — | Permiso del navegador concedido | La Notifications API es un sistema externo que participa como actor secundario. Si el permiso está denegado, el aviso se conserva dentro de la aplicación (CU10 A1, CU15 A2). |

> **Pendientes deliberados (diagramas fuera del alcance de esta corrección).** P1: `02_Diagrama_de_Casos_de_Uso_General.drawio` dibuja como `<<include>>` las líneas entre Notifications API y CU10/CU15; en este documento se describen como asociación. P2: el diagrama muestra una única relación `<<extend>>` CU10 → CU02; en este documento se precisa que la programación al crear es obligatoria y que solo la reprogramación al editar es extensión. Ambos puntos quedan para revisión del diagrama; no se modificó ningún diagrama.

## CU00 — Iniciar sesión

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante, Administrador, Revisor institucional |
| **Precondición** | El actor ya tiene una cuenta activa, creada mediante CU01; los roles Administrador y Revisor institucional se asignan sobre una cuenta existente mediante CU13. |
| **Flujo normal** | 1. El actor ingresa correo y contraseña. 2. El sistema valida las credenciales contra `contrasena_hash` (bcrypt). 3. El sistema emite un token JWT con el rol de la cuenta. 4. El sistema redirige al Dashboard correspondiente al rol. |
| **Flujos alternativos** | A1: Credenciales inválidas → 401 «Credenciales inválidas», sin indicar si el correo existe. A2: Cuenta desactivada (`activa = false`) → 403 «La cuenta está inactiva». |
| **Subflujo S1 — Validar sesión activa** | Lo incluyen CU02–CU16 y se ejecuta en cada petición protegida (`authenticateRequest`): 1. Lee el token enviado por el cliente. 2. Verifica su firma, su vigencia y que la sesión no se haya cerrado. 3. Consulta la cuenta, comprueba que exista y esté activa y toma su rol vigente. 4. Si alguna comprobación falla, responde 401 y el caso base no continúa. |
| **Postcondición** | El actor cuenta con una sesión activa (token JWT vigente) y puede ejecutar los casos de uso incluidos según su rol. |
| **Trazabilidad** | HU01 · RF01 · RN01, RN02 |

## Modelo de Actores

| Actor | Clasificación | Participación |
|---|---|---|
| **Estudiante** | Principal | Ejecuta CU01–CU12 y CU15. “Usuario registrado” se considera un estado del Estudiante, no un actor diferente. |
| **Administrador** | Secundario autorizado | Ejecuta CU13 y CU14 para mantener cuentas, catálogos y correcciones controladas; también puede activar, desactivar o reactivar retos mediante CU06 y CU13. |
| **Revisor institucional** | Secundario de solo lectura | Ejecuta CU16 sin modificar información. |
| **Notifications API** | Sistema externo | Apoya CU10 y CU15; no es un actor humano. |

La accesibilidad para personas con discapacidad física es una condición de calidad aplicable al actor Estudiante mediante RNF06 y RNF14; no constituye un actor con objetivos funcionales diferentes.

---

## Resumen de Casos de Uso

| ID | Nombre | RF Asociado |
|---|---|---|
| CU00 | Iniciar sesión | RF01 |
| CU01 | Registrar cuenta y materias | RF01 |
| CU02 | Gestionar tareas académicas | RF02, RF04, RF09 |
| CU03 | Completar tarea y recibir recompensa | RF03, RF05, RF06, RF07, RF15 |
| CU04 | Realizar sesión de estudio Pomodoro | RF10, RF12 |
| CU05 | Ver Tablero de Avance Personal | RF08, RF11, RF15 |
| CU06 | Gestionar insignias y retos | RF05, RF06 |
| CU07 | Filtrar y buscar tareas | RF09 |
| CU08 | Personalizar configuración visual | RF13, RNF04 |
| CU09 | Exportar datos personales | RF14, RNF04 |
| CU10 | Gestionar recordatorios | RF04, RNF15 |
| CU11 | Gestionar perfil de cuenta | RF01, RNF12 |
| CU12 | Gestionar historial de sesiones | RF10, RF11 |
| CU13 | Administrar cuentas, catálogos y estado de retos | RF01, RF05, RF06, RF07 |
| CU14 | Corregir movimientos y asignaciones | RF05, RF07 |
| CU15 | Gestionar notificaciones internas | RF04, RNF15 |
| CU16 | Consultar indicadores institucionales | RF11 |

---

## CU01 — Registrar cuenta y materias

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante (todavía sin cuenta). |
| **Permisos** | Operación pública: no requiere sesión ni incluye CU00. El servidor asigna siempre `rol = Estudiante`; el cliente no puede enviar `rol` ni otros campos no autorizados (RN21). La gestión posterior de materias exige sesión y propiedad de la cuenta. |
| **Disparador** | El estudiante selecciona «Crear cuenta» en la pantalla de acceso (`#form-registro`). |
| **Precondición** | El correo no está registrado y el servidor con SQLite está disponible. |
| **Flujo normal** | 1. El estudiante ingresa nombre, correo y contraseña, y selecciona la materia inicial en un desplegable cargado desde `GET /api/catalogo-materias` (solo entradas activas), con horario opcional. 2. El cliente envía `POST /api/auth/registro`. 3. El servidor rechaza campos no permitidos y valida tipos, obligatoriedad y longitudes. 4. Normaliza el correo (minúsculas y sin espacios externos) y comprueba que no exista. 5. Cifra la contraseña con bcrypt. 6. En una sola transacción comprueba que la entrada del catálogo existe y está activa, y crea la `cuenta` con rol Estudiante, su `preferencia_visual` predeterminada y la `materia` inicial, con `id_catalogo_materia` y el nombre copiado del catálogo. 7. Responde 201 con la cuenta sin `contrasena_hash`. 8. El cliente inicia sesión con las mismas credenciales (CU00), muestra «Cuenta creada correctamente.» y abre el Dashboard. |
| **Flujos alternativos** | A1: Después del registro, el estudiante agrega materias desde Agenda o las edita y elimina (HU16). A2: si el catálogo no tiene entradas activas, el formulario muestra un aviso y deshabilita el envío. |
| **Excepciones** | E1: Correo ya registrado → 409 «El correo ya está registrado». E2: Falta nombre, correo, contraseña o materia → 400 «Nombre, correo, contraseña y materia inicial son obligatorios» y no se crea ningún registro (RN03). E3: Contraseña que no es texto, con menos de 8 caracteres o con más de 72 bytes UTF-8 → 400 con el límite. E4: Campo no autorizado, por ejemplo `rol` → 400 «La solicitud contiene campos no permitidos»; en la materia, un nombre libre o un campo extra → 400 (RN26). E5: Texto que excede la longitud del modelo (nombre 60, correo 100 y horario 100 caracteres) → 400. E6: Falla durante la transacción → se revierte completa; no quedan cuentas sin materia ni sin preferencia. E7: Catálogo sin entradas activas → 409 «No hay asignaturas disponibles en el catálogo; contacta al Administrador». E8: Entrada del catálogo inexistente → 400; inactiva → 409. En E7 y E8 no se crea ningún registro. |
| **Postcondición** | Existe una cuenta activa con rol Estudiante, una preferencia visual y al menos una materia asociadas por `id_cuenta`, y el estudiante queda autenticado. Si falla cualquier validación, no se persiste nada. |
| **Reglas de negocio** | RN01 (correo único), RN02 (contraseña cifrada y nunca expuesta), RN03 (al menos una materia), RN21 (rol fijado por el servidor y propiedad de las materias), RN26 (selección desde el catálogo activo; Decisión #10, pendiente de revisión docente). |
| **Trazabilidad** | RF01, RNF12, RNF-16 · HU01, HU16, HU29 · implementado en `cd8d9f7` (validaciones), `f62c5e5` y `3eb2b71` (catálogo) |

> **Antecedente — nota de diseño del 22 de septiembre de 2026 (implementada el 24 de octubre de 2026 en `f62c5e5` y `3eb2b71`, Decisión #10, pendiente de revisión docente; el texto siguiente se conserva como registro histórico):** por observación de la docente, el paso 3 debe cambiar de "escribir el nombre de la materia" a **"seleccionar la materia de un catálogo institucional"** (`CatalogoMateria`, ver `E7-diccionario-datos.md` y `E12-diagrama-clases.drawio`). El flujo normal pasado a `<select>` quedaría: *"3. Selecciona su materia de la lista del catálogo institucional vigente (y opcionalmente ingresa el horario)."* Este cambio **todavía no está implementado en el código** (el formulario de registro sigue siendo un campo de texto libre); se documenta aquí como diseño aprobado en espera de desarrollo.

---

## CU02 — Gestionar tareas académicas

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa en el sistema. |
| **Flujo normal** | 1. El usuario pulsa "Nueva tarea". 2. Ingresa nombre, fecha de entrega, prioridad y materia (opcional). 3. El sistema valida que la fecha sea futura y el nombre no esté vacío. 4. Guarda la tarea en SQLite mediante el servidor con estado "Pendiente". 5. Programa un recordatorio automático para 24 horas antes de la fecha de entrega. 6. La tarea aparece en la lista con su chip de prioridad. |
| **Flujos alternativos** | A1: Fecha en el pasado → "La fecha debe ser futura". A2: Nombre vacío → "El nombre es obligatorio". A3: El usuario edita una tarea existente → los cambios se persisten; si la tarea no está completada y cambian su nombre o su fecha de entrega, el recordatorio se reprograma (`<<extend>>` CU10). |
| **Postcondición** | La tarea queda guardada con estado "Pendiente" y el recordatorio programado. |

---

## CU03 — Completar tarea y recibir recompensa

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante. El Sistema ejecuta la evaluación de gamificación. |
| **Permisos** | Requiere sesión activa (CU00) y rol Estudiante (`authorize('Estudiante')`); solo se completan tareas de la propia cuenta. El Administrador y el Revisor institucional no completan tareas. |
| **Disparador** | El estudiante pulsa «Completar» en una tarea (`data-accion="completar-tarea"`). |
| **Precondición** | La tarea pertenece a la cuenta autenticada y no está en estado «Completada». |
| **Flujo normal** | 1. El cliente envía `PATCH /api/tareas/:id/completar`. 2. El servidor abre una transacción `IMMEDIATE`. 3. Busca la tarea por `id_tarea` e `id_cuenta`. 4. Cambia el estado a «Completada» y registra `fecha_completada`. 5. Cancela los recordatorios pendientes de la tarea. 6. Acredita 10 puntos una sola vez con origen `Tarea` e `id_origen` de la tarea (RN22, RN23). 7. Punto de extensión «Evaluación de gamificación»: actualiza las metas y los retos no completados de la semana con la métrica `tareas`, evalúa las insignias y calcula el nivel. 8. Registra la notificación «Tarea completada». 9. Confirma la transacción y responde con la tarea y el resumen de puntos, insignias, retos, metas, total y nivel. 10. La interfaz actualiza la lista y la gamificación; el Tablero recalcula en su siguiente consulta. |
| **Flujos alternativos** | A1: La tarea cumple la condición de una insignia no obtenida → la desbloquea y la notifica (CU06). A2: La insignia ya estaba obtenida → no se duplica. A3: Un reto de la semana alcanza su objetivo → se marca completado, sus puntos se acreditan una vez y se notifica. A4: Una meta de la semana alcanza su objetivo → queda `cumplida`. A5: El total alcanza otro umbral → la respuesta informa el nuevo nivel. |
| **Excepciones** | E1: Tarea inexistente o de otra cuenta → 404 «Tarea no encontrada», sin revelar si existe. E2: Tarea ya completada → 409 «La tarea ya fue completada y recompensada»; no se acreditan puntos de nuevo. E3: Rol distinto de Estudiante → 403. E4: Sin sesión, sesión cerrada o cuenta inactiva → 401. E5: Error dentro de la transacción → se revierten tarea, puntos, progreso, insignias y notificaciones. |
| **Postcondición** | La tarea queda «Completada» y existe exactamente un movimiento de 10 puntos por ella; las recompensas derivadas se registran como máximo una vez. Si ocurre un error, se conserva el estado anterior. |
| **Reglas de negocio** | RN07–RN09 (ledger de puntos), RN10, RN11, RN21, RN22, RN23, RN24; RN28 (un reto inactivo no acumula progreso ni recompensa; implementado en `b113445`). |
| **Trazabilidad** | RF03, RF05, RF06, RF07, RF15 · HU03, HU05, HU06, HU07 · CU06 (`<<extend>>`) |

---

## CU04 — Realizar sesión de estudio Pomodoro

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El estudiante tiene una sesión activa en el sistema. |
| **Flujo normal** | 1. El estudiante pulsa "Iniciar sesión de estudio". 2. Opcionalmente vincula la sesión a una tarea. 3. El cronómetro inicia en modo Pomodoro (25 min enfoque). 4. El sistema muestra el banner "Modo enfoque activo — notificaciones bloqueadas". 5. Al terminar el ciclo, muestra notificación de descanso. 6. El estudiante pulsa "Detener y guardar". 7. El sistema guarda la sesión con su duración; sus horas quedan disponibles para el cálculo en tiempo real del Tablero de Avance Personal. |
| **Flujos alternativos** | A1: El estudiante cancela sin guardar → la sesión se descarta. A2: El estudiante pausa → el cronómetro se detiene y puede reanudarse. A3: Modo cronómetro libre → el estudiante define su propio tiempo. |
| **Postcondición** | La sesión queda guardada y las horas aparecen en el Tablero de Avance Personal. |

---

## CU05 — Ver Tablero de Avance Personal

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene al menos una tarea o sesión registrada. |
| **Flujo normal** | 1. El usuario accede al Tablero de Avance Personal. 2. El sistema calcula en tiempo real (COUNT/SUM sobre `tarea`, `sesion_estudio` y `punto`) las tareas completadas, horas estudiadas y puntos obtenidos de la semana actual. 3. Muestra estas estadísticas junto con la barra de progreso de la meta activa. 4. El usuario puede filtrar por semanas anteriores usando los mismos datos históricos ya almacenados en `tarea`/`sesion_estudio`/`punto`. 5. El sistema muestra un mensaje motivacional si el progreso es inferior al 50 %. |
| **Flujos alternativos** | A1: Sin actividad en la semana → muestra "0 tareas, 0h, 0 pts" con mensaje motivador. A2: Meta cumplida → el sistema muestra mensaje de felicitación. |
| **Postcondición** | El estudiante visualiza su progreso semanal actualizado. |

> **Nota de corrección (agosto 2026):** este caso de uso se llamaba "Ver reportes y progreso semanal" y dependía de una tabla `reporte` que guardaba un snapshot. El equipo decidió eliminar esa tabla por ser redundante — los mismos datos ya existen en `tarea`, `sesion_estudio` y `punto` — así que ahora el tablero calcula todo en el momento de la consulta, sin persistir nada adicional.

---

## CU06 — Gestionar insignias y retos

| Campo | Descripción |
|---|---|
| **Actores** | Estudiante (retos propios y consulta de insignias), Administrador (catálogo de insignias, asignación de retos, corrección de asignaciones y estado de los retos), Sistema (evaluación automática desde CU03 y CU04). |
| **Permisos** | Requiere sesión activa (CU00). El Estudiante crea, consulta, edita, completa y elimina solo retos propios (RN21). El Administrador puede operar retos de cualquier cuenta (asignar, corregir, eliminar uno no completado y cambiar su estado) y crear un reto para un estudiante indicando `id_cuenta`; completar y acreditar la recompensa corresponde solo al Estudiante propietario (A2). El catálogo de insignias y la asignación o revocación manual son exclusivos del Administrador. |
| **Disparador** | El actor abre Gamificación (P08) o el panel administrativo (P17), o el Sistema recibe un evento de CU03 o CU04. |
| **Precondición** | Para operar un reto, este pertenece a la cuenta autenticada o el actor es Administrador. |
| **Flujo normal** | 1. El Estudiante crea un reto para una semana con `descripcion`, `condicion` (`metrica:objetivo`, RN24), `puntos_recompensa` y `semana`; no existe generación semanal automática. 2. El sistema lo guarda sin progreso y sin completar. 3. Cuando CU03 o CU04 generan un evento, el Sistema suma progreso a los retos no completados de esa semana según su métrica y, al alcanzar el objetivo, completa el reto y acredita la recompensa una sola vez (RN23). 4. El Sistema evalúa las insignias y desbloquea las que cumplan su condición, sin duplicarlas (RN11). 5. El Estudiante consulta sus retos, insignias, puntos y nivel en P08. |
| **Flujos alternativos** | A1 *(limitado por la Decisión #09; ver riesgo registrado)*: El Estudiante edita `descripcion`, `condicion`, `puntos_recompensa`, `semana` o `progreso` de su reto. A2 *(ver riesgo registrado)*: El Estudiante completa manualmente su reto: se marca completado y se acreditan sus `puntos_recompensa` una sola vez, en una transacción. A3: El Estudiante elimina su reto si no está completado. A4: El Administrador asigna un reto semanal a un estudiante desde P17. A5: El Administrador crea, edita o elimina insignias del catálogo. A6: El Administrador asigna o revoca una insignia con motivo (CU14). A7 (RN28/HU31, `PATCH /api/retos/:id/estado`): el propietario o el Administrador desactiva o reactiva el reto; mientras está inactivo no acumula progreso automático, no se revocan sus puntos y la reactivación no repite la recompensa. |
| **Excepciones** | E1: Reto de otra cuenta → 403; reto inexistente → 404. E2: Segundo reto de la misma cuenta y semana → 409 «El registro ya existe» (UNIQUE `id_cuenta`, `semana`). E3: Reto ya completado → no vuelve a acreditar puntos (RN10); la ruta responde 200 con el reto sin cambios. E4: `puntos_recompensa` no positivo o `progreso` negativo → 400. E5: Un Estudiante intenta administrar insignias → 403. E6: Insignia ya obtenida → la asignación no se duplica. |
| **Postcondición** | Cada reto conserva su estado y progreso; sus puntos se acreditan como máximo una vez y las insignias quedan registradas sin duplicados. |
| **Reglas de negocio** | RN07–RN11, RN15, RN21, RN23, RN24, RN28 (Decisión #09, pendiente de revisión docente). |
| **Trazabilidad** | RF05, RF06, RF07, RF08 · HU05, HU06, HU07, HU18, HU22, HU26, HU31 · extiende CU03 y CU04; se relaciona con CU13 y CU14 |

> **Riesgo registrado (actualizado tras la Decisión #09, `b113445`).** La Decisión #06 conserva que el Estudiante edite `puntos_recompensa` (1–10.000, validado en la API) y `progreso`, y que complete manualmente su reto. La Decisión #09 hace transaccional el completado con un único crédito por reto, bloquea (409) la edición de recompensa, progreso y semana y la eliminación de retos completados, y rechaza completar retos inactivos. **Limitación vigente:** el completado manual no verifica el objetivo ni garantiza actividad académica real, y un Estudiante puede crear retos en otras semanas y completarlos manualmente, por lo que el total acumulable no está acotado por estas reglas.

---

## CU07 — Filtrar y buscar tareas

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa y al menos una tarea registrada. |
| **Flujo normal** | 1. El usuario accede al módulo de lista de tareas. 2. El sistema muestra todas las tareas con estado, prioridad y fecha de entrega. 3. El usuario selecciona filtros: materia, prioridad (Alta/Media/Baja), estado (Pendiente/Completada/Vencida) o rango de fechas. 4. El sistema filtra la lista en tiempo real. 5. El usuario puede limpiar los filtros para volver a la lista completa. |
| **Flujos alternativos** | A1: Ninguna tarea cumple los criterios → "No se encontraron tareas con estos filtros". A2: El usuario escribe en el campo de búsqueda → el sistema filtra por coincidencia parcial del nombre. |
| **Postcondición** | El usuario visualiza únicamente las tareas que corresponden a los filtros aplicados. |

---

## CU08 — Personalizar configuración visual

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa en el sistema. |
| **Flujo normal** | 1. El usuario accede a "Configuración / Preferencias". 2. El sistema consulta las preferencias actuales en SQLite mediante el servidor. 3. El usuario selecciona un tema de color (purple, teal, amber, coral, blue, green). 4. El sistema aplica el nuevo tema inmediatamente (preview en tiempo real). 5. El usuario puede activar o desactivar el modo oscuro con un toggle. 6. El usuario selecciona un avatar de la galería. 7. El usuario pulsa "Guardar cambios" y el sistema persiste las preferencias. |
| **Flujos alternativos** | A1: El usuario cierra sin guardar → el sistema restaura las preferencias anteriores. A2: El usuario activa modo oscuro → toda la interfaz cambia a la paleta oscura sin recargar la página. |
| **Postcondición** | Las preferencias quedan guardadas en SQLite y la interfaz refleja el tema y modo elegidos. |

---

## CU09 — Exportar datos personales

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa y al menos un registro almacenado en la base de datos. |
| **Flujo normal** | 1. El usuario accede a "Exportar datos" desde Configuración. 2. El sistema muestra un resumen de los datos disponibles. 3. El usuario pulsa "Exportar como JSON". 4. El servidor consulta en SQLite los datos asociados a la cuenta. 5. El sistema genera un archivo `datos.json` y lo entrega al navegador. 6. El navegador inicia la descarga. 7. El sistema muestra la confirmación "Tus datos han sido exportados exitosamente". |
| **Flujos alternativos** | A1: No hay datos guardados → "No tienes datos registrados para exportar" y deshabilita el botón. A2: El navegador bloquea la descarga automática → el sistema muestra un enlace directo. |
| **Postcondición** | El usuario dispone de un archivo JSON con toda su información académica. |

---

## CU10 — Gestionar recordatorios

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Precondición** | El usuario tiene una sesión activa y el navegador ha concedido permiso para notificaciones. |
| **Flujo normal** | 1. Al crear una tarea con fecha de entrega, el sistema programa automáticamente un recordatorio 24 horas antes. 2. El sistema muestra una lista de recordatorios activos. 3. El usuario puede desactivar un recordatorio con el toggle Activo/Inactivo. 4. El sistema actualiza el registro en SQLite mediante el servidor. 5. Cuando llega la fecha programada, el sistema dispara la notificación. 6. Una vez enviada, el sistema marca `enviado = true` para no reenviar. |
| **Flujos alternativos** | A1: Navegador sin permiso de notificaciones → el sistema solicita el permiso; si se rechaza, el recordatorio se guarda pero no dispara notificación nativa. A2: El usuario reactiva un recordatorio → el sistema lo reprograma si la fecha aún no ha pasado. A3: La tarea es eliminada → el sistema elimina el recordatorio en cascada. |
| **Postcondición** | Los recordatorios activos se ejecutan automáticamente y quedan marcados como enviados. |

---

## Trazabilidad Detallada de CU01–CU10

Esta tabla complementa las fichas existentes sin repetir sus flujos.

| CU | Objetivo | Disparador | HU | RF | RN aplicables |
|---|---|---|---|---|---|
| CU01 | Registrar cuenta y materias | Seleccionar “Crear cuenta” | HU01, HU16, HU29 | RF01 | RN01–RN03, RN21, RN26 |
| CU02 | Gestionar tareas | Seleccionar “Nueva tarea”, Editar o Eliminar | HU02, HU19 | RF02, RF04, RF09 | RN04–RN06, RN21 |
| CU03 | Completar tarea y recompensar | Seleccionar Completar | HU03, HU05, HU06, HU07 | RF03, RF05, RF06, RF07, RF15 | RN07–RN11, RN21–RN24 |
| CU04 | Realizar sesión Pomodoro | Seleccionar Iniciar | HU10, HU12 | RF10, RF12 | RN19–RN21 |
| CU05 | Consultar tablero y metas | Abrir Tablero o cambiar semana | HU08, HU11, HU15, HU17 | RF08, RF11, RF15 | RN12–RN14, RN21 |
| CU06 | Gestionar gamificación | Abrir Gamificación o actuar sobre un reto | HU05–HU07, HU18, HU31 | RF05–RF08 | RN07–RN11, RN15, RN21, RN28 |
| CU07 | Filtrar y buscar tareas | Aplicar un filtro o texto | HU09 | RF09 | RN21 |
| CU08 | Personalizar configuración | Abrir Configuración y guardar/restablecer | HU13 | RF13 | RN21 |
| CU09 | Exportar datos | Seleccionar “Exportar como JSON” | HU14 | RF14 | RN02, RN21 |
| CU10 | Gestionar recordatorios | Abrir Recordatorios o cambiar su estado | HU04, HU25 | RF04 | RN05, RN06, RN18, RN19, RN21 |

---

## Trazabilidad CRUD Completa — 3 Casos de Uso Críticos

Por instrucción de la docente se documentan con el máximo nivel de detalle tres casos de uso críticos: **CU01** (punto de entrada y creación transaccional de la cuenta), **CU03** (transacción de recompensa) y **CU06** (reglas de gamificación y retos). La tabla de CU02 se conserva como trazabilidad complementaria. Cada fila muestra la cadena **operación ↔ HU/RN ↔ entidad ↔ endpoint ↔ controlador → servicio ↔ pantalla ↔ prueba**, verificada contra el código del repositorio el 24 de octubre de 2026. La columna *Estado* distingue lo implementado de lo planeado; «Sin prueba automática» indica que no se identificó una prueba que ejercite esa operación.

Controladores: `src/controllers/authController.js` y `src/controllers/resourceControllers.js` (objetos `subjects`, `tasks`, `challenges`, `badges` y `accountBadges`). Rutas: `src/routes/authRoutes.js` y `src/routes/resourceRoutes.js`.

### CU01 — Registrar cuenta y materias (creación transaccional)

| Operación | HU · RN | Entidad | Endpoint | Controlador → servicio | Pantalla / acción | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| Crear cuenta, preferencia y materia inicial | HU01 · RN01–RN03, RN21 | `cuenta`, `preferencia_visual`, `materia` | `POST /api/auth/registro` | `register` → `authService.register` (transacción) | Acceso · `#form-registro` | `tests/api/api.test.js` (201 sin hash, 409 duplicado, 400 sin materia, 400 con `rol`, 400 contraseña); `tests/api/input-validation.test.js` (`validateRegistration`) | Implementado |
| Iniciar sesión tras el registro | HU01 · RN02 | `cuenta` | `POST /api/auth/login` | `login` → `authService.authenticate` | `iniciarSesion()` después del registro | `tests/api/api.test.js` (401 credenciales, 403 cuenta inactiva) | Implementado |
| Consultar materias | HU01, HU16 · RN21 | `materia` | `GET /api/materias`, `GET /api/materias/:id` | `subjects.list` / `subjects.get` → `materiaService` | Vista Materias | `tests/api/api.test.js` (200 propia, 403 ajena, 401 sin sesión) | Implementado |
| Crear materia adicional | HU01, HU16 · RN21, RN26 | `materia` | `POST /api/materias` (`id_catalogo_materia`) | `subjects.create` → `materiaService.crearDesdeCatalogo` (transacción IMMEDIATE) | `#form-materia` con desplegable del catálogo | `tests/api/api.test.js`; `tests/integration/materia-catalogo-concurrencia.test.js` | Implementado (`3eb2b71`) |
| Actualizar materia | HU16 · RN21, RN26 | `materia` | `PUT /api/materias/:id` | `subjects.update` → `materiaService.actualizarDesdeCatalogo` | `data-accion="editar-materia"` | `tests/api/api.test.js`; `tests/integration/materia-catalogo-concurrencia.test.js` | Implementado (`3eb2b71`) |
| Eliminar materia | HU16 · integridad FK | `materia` | `DELETE /api/materias/:id` | `subjects.remove` → `materiaService` | `data-accion="eliminar-materia"` con confirmación | `tests/api/api.test.js` (204) | Implementado |
| Seleccionar la materia del catálogo | HU01, HU29 · RN26 | `catalogo_materia`, `materia` | `GET /api/catalogo-materias` (pública); `POST /api/auth/registro` | `catalogoMateriaService.obtenerActiva` dentro de `authService.register` | `#form-registro` con desplegable | `tests/api/api.test.js`; `tests/frontend/browser.test.js` | Implementado (`f62c5e5`, `3eb2b71`) |

**Pruebas faltantes:** ninguna identificada para CU01 en el código local. La reversión del registro, los límites del nombre y los casos del catálogo (vacío, inactivo, inexistente y concurrencia) están cubiertos en `api.test.js`, `input-validation.test.js`, `browser.test.js` y `materia-catalogo-concurrencia.test.js`. Pendiente operativo: migrar la base principal y cargar el catálogo antes de abrir el registro.

### CU02 — Gestionar tareas académicas (CRUD completo)

| Operación | HU | Clase.método | Endpoint | Pantalla / botón | Prueba |
|---|---|---|---|---|---|
| Crear | HU02 | `TareaService.crearTarea` | `POST /api/tareas` | P04/P05 Tareas · `#mostrar-form-tarea` → `abrirTarea()`; `#form-tarea` (submit) | `tests/api/api.test.js` |
| Consultar (listar/filtrar) | HU09 | `TareaService.listarTareas` | `GET /api/tareas` | P04/P12 · `#buscar-tarea`, `#filtro-prioridad`, `#filtro-estado` → `renderizarTareas()` | Frontend estático |
| Actualizar | HU19 | `TareaService.actualizarTarea` | `PUT /api/tareas/:id` | P04/P05 · `data-accion="editar-tarea"` | `tests/api/api.test.js` |
| Eliminar | HU19 | `TareaService.eliminarTarea` | `DELETE /api/tareas/:id` | P04/P05 · `data-accion="eliminar-tarea"` | `tests/api/api.test.js` |
| Programar recordatorio (obligatorio al crear, RN05; `<<extend>>` CU10 solo al editar nombre o fecha) | HU04 | `PlanificadorRecordatoriosService.sincronizarAutomatico` | *(interno, disparado por crear/actualizar tarea)* | — | `tests/integration/reminders.test.js` |

**Reglas de negocio aplicables:** RN04–RN06, RN21. **Clase en el diagrama:** `Tarea` (E12), con las 6 operaciones de M9 (`crearTarea`…`eliminarTarea`) mapeadas 1 a 1 contra esta tabla.

### CU03 — Completar tarea y recibir recompensa (transacción de gamificación)

Las funciones internas citadas pertenecen a `src/services/gamificacionService.js` y se ejecutan dentro de la misma transacción.

| Operación | HU · RN | Entidad | Endpoint | Controlador → servicio | Pantalla / acción | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| Completar la tarea | HU03 · RN21, RN22 | `tarea` | `PATCH /api/tareas/:id/completar` | `tasks.complete` → `GamificacionService.completarTareaConGamificacion` | Tareas · `data-accion="completar-tarea"` | `tests/integration/objectives-6-10.test.js` (TC-O6-TAREA); `tests/api/api.test.js` (200 propia, 404 ajena) | Implementado |
| Acreditar 10 puntos una vez | HU03, HU07 · RN07, RN08, RN22, RN23 | `punto` | interno | `otorgarUnaVez` (índice `uq_punto_evento`) | reflejo en P08 | TC-O6-TAREA | Implementado |
| Impedir doble completado | HU03 · RN10, RN23 | `tarea`, `punto` | mismo endpoint | verificación de estado → 409 | — | TC-O6-DUPLICADO; `tests/api/api.test.js` (409) | Implementado |
| Cancelar recordatorios de la tarea | HU04 · complementa RN05 | `recordatorio` | interno | `PlanificadorRecordatoriosService.cancelarDeTarea` | — | `tests/integration/reminders.test.js` | Implementado |
| Progreso de metas y retos (retos: `<<extend>>` → CU06) | HU06, HU15 · RN12, RN13, RN24 | `meta`, `reto`, `punto` | interno | `actualizarMetas`, `actualizarRetos` | P08 | TC-O6-TAREA (reto y meta cumplidos, un crédito de reto) | Implementado |
| Evaluar insignias (`<<extend>>` → CU06) | HU05 · RN11 | `cuenta_insignia` | interno | `evaluarInsignias` | celebración en P04/P08 | TC-O6-TAREA («Primera tarea» sin duplicar) | Implementado |
| Evaluar nivel | HU07 · RN15 | `nivel_cuenta`, `punto` | interno | `evaluarCambioNivel` | P08 | TC-O6-TAREA (nivel y total) | Implementado |
| Notificar | HU24 · RN16, RN17 | `notificacion` | interno | `notificar` | Centro de notificaciones | TC-O6-TAREA | Implementado |
| Revertir ante fallo | HU03 · RN23 | todas las anteriores | mismo endpoint | transacción `IMMEDIATE` | — | TC-O6-ROLLBACK | Implementado |
| Excluir retos inactivos del progreso | HU06 · RN28 | `reto` | interno | filtro `activo: true` en `actualizarRetos` | — | `tests/integration/reto-estado.test.js` | Implementado (`b113445`) |

**Pruebas:** completar con rol Administrador o Revisor responde 403 sin acreditar puntos (`tests/api/api.test.js`). El progreso de retos inactivos está cubierto en `reto-estado.test.js`.

**Diferencia con E12/M9 (pendiente deliberado):** la versión anterior de esta tabla citaba `Punto.otorgarPuntos`, `CuentaInsignia.evaluarInsignias` y `NivelCuenta.evaluarNivelCuenta`. Esas funciones existen en `src/crud/`, pero CU03 no las invoca; usa las funciones internas de `gamificacionService.js` indicadas arriba. Si E12 o M9 conservan los nombres anteriores, la diferencia queda registrada para su revisión; no se modificaron.

### CU06 — Gestionar insignias y retos (relaciones N:M y reglas append-only)

| Operación | HU · RN | Entidad | Endpoint | Controlador → servicio / CRUD | Pantalla / acción | Prueba | Estado |
|---|---|---|---|---|---|---|---|
| Crear reto | HU06 · RN10, RN21 | `reto` | `POST /api/retos` | `challenges.create` → `retoService` (`retoCrud.crearReto`) | P08; P17 «Asignar reto semanal» | `tests/api/api.test.js` (201) | Implementado |
| Consultar retos | HU06 · RN21 | `reto` | `GET /api/retos`, `GET /api/retos/:id` | `challenges.list` / `challenges.get` → `listarRetos`, `obtenerReto` | P08 | Sin prueba automática | Implementado |
| Editar reto | HU18 · RN21 | `reto` | `PUT /api/retos/:id` | `challenges.update` → `actualizarReto` | P08 · `data-accion="editar-reto"` | `tests/api/api.test.js` (200) | Implementado |
| Completar reto manualmente | HU18 · RN10 | `reto`, `punto` | `PATCH /api/retos/:id/completar` | `challenges.complete` → `completarReto` | P08 | `tests/api/api.test.js`; `tests/integration/reto-estado.test.js` (concurrencia y rollback) | Implementado (`b113445`); limitación de autenticidad registrada |
| Eliminar reto | HU18 · RN21 | `reto` | `DELETE /api/retos/:id` | `challenges.remove` → `eliminarReto` | P08 · `data-accion="eliminar-reto"` con confirmación | `tests/api/api.test.js` (204) | Implementado |
| Progreso automático del reto (extensión de CU03/CU04) | HU06 · RN23, RN24 | `reto`, `punto` | interno (CU03/CU04) | `actualizarRetos` en `gamificacionService.js` | reflejo en P08 | TC-O6-TAREA | Implementado |
| Activar, desactivar o reactivar reto | HU06, HU18, HU31 · RN28 | `reto.activo` | `PATCH /api/retos/:id/estado` | `challenges.setState` → `retoCrud.activarReto` / `desactivarReto` | P08 y P17 · `data-accion="estado-reto"` | `tests/api/api.test.js`; `tests/integration/reto-estado.test.js` | Implementado (`b113445`) |
| Consultar insignias desbloqueadas | HU05, HU07 · RN21 | `cuenta_insignia` | `GET /api/cuenta-insignias` | `accountBadges.list` | P08 · `renderizarGamificacion()` | `tests/api/api.test.js` (200) | Implementado |
| Desbloquear insignia automáticamente (extensión de CU03/CU04) | HU05 · RN11 | `cuenta_insignia` | interno (CU03/CU04) | `evaluarInsignias` en `gamificacionService.js` | celebración | TC-O6-TAREA | Implementado |
| Administrar catálogo de insignias | HU22 · RN11 | `insignia` | `POST /api/insignias`, `PUT`/`DELETE /api/insignias/:id` | `badges.*` → `insigniaService` | P17 · `#form-admin-insignia` | `tests/api/api.test.js` (201/200, 403 Estudiante) | Implementado |
| Asignar o revocar insignia con motivo | HU26 · RN07, RN11 | `cuenta_insignia` | `POST /api/cuenta-insignias`, `DELETE /api/cuenta-insignias/:id_cuenta/:id_insignia` | `accountBadges.*` → `CorreccionAdministrativaService` | P17 · `data-accion="revocar-insignia-admin"` | `tests/api/api.test.js`; `tests/integration/admin-corrections.test.js` | Implementado |

**Pruebas faltantes:** consulta de retos mediante la API (`GET /api/retos`). Los casos de reto ajeno (403), inexistente (404), semana duplicada (409), crédito único, estado y bloqueo de retos completados están cubiertos en `api.test.js` y `reto-estado.test.js` (`b113445`).

---



| ID | Historia | RF |
|---|---|---|
| HU01 | Como Estudiante, quiero registrar mi cuenta e ingresar al menos una materia, para acceder a la plataforma con mi información personalizada. | RF01, RNF12 |
| HU02 | Como Estudiante, quiero crear tareas con nombre, fecha de entrega y prioridad, para no olvidar mis compromisos académicos. | RF02, RF09 |
| HU03 | Como Estudiante, quiero marcar una tarea como completada, para ganar puntos automáticamente y ver mi avance en el panel. | RF03, RF07 |
| HU04 | Como Estudiante, quiero recibir un recordatorio automático 24 horas antes de la fecha de entrega, para no olvidar entregas importantes. | RF04, RNF15 |
| HU05 | Como Estudiante, quiero desbloquear insignias al cumplir metas específicas, para sentir reconocimiento por mi esfuerzo. | RF05 |
| HU06 | Como Estudiante, quiero crear y participar en retos semanales, para tener un desafío adicional que me motive. | RF06, RF07 |
| HU07 | Como Estudiante, quiero ver mi total de puntos acumulados e historial de recompensas, para conocer mi progreso gamificado. | RF07, RF08 |
| HU08 | Como Estudiante, quiero ver en mi Tablero de Avance Personal las tareas completadas, horas estudiadas y puntos obtenidos de la semana. | RF08, RF11 |
| HU09 | Como Estudiante, quiero filtrar mis tareas por materia, prioridad o estado, para encontrar rápidamente lo que necesito gestionar. | RF09 |
| HU10 | Como Estudiante, quiero usar un cronómetro Pomodoro vinculado a una tarea, para concentrarme en bloques de tiempo definidos. | RF10, RF12 |
| HU11 | Como Estudiante, quiero consultar mi progreso de semanas anteriores en el Tablero de Avance Personal, para revisar mi evolución histórica. | RF11 |
| HU12 | Como Estudiante, quiero activar el modo enfoque durante una sesión Pomodoro, para bloquear notificaciones no esenciales. | RF12, RNF13 |
| HU13 | Como Estudiante, quiero personalizar el tema de color y activar el modo oscuro de la plataforma. | RF13, RNF04 |
| HU14 | Como Estudiante, quiero exportar todos mis datos en formato JSON, para hacer un respaldo de mi información académica. | RF14 |
| HU15 | Como Estudiante, quiero recibir una meta semanal sugerida con base en mi historial, para tener un objetivo alcanzable. | RF15 |
| HU16 | Como Estudiante, quiero editar o eliminar una materia registrada, para corregir datos o dar de baja asignaturas que ya no curso. | RF01 |
| HU17 | Como Estudiante, quiero editar o eliminar una meta semanal, para ajustar el objetivo si cambian mis prioridades. | RF15 |
| HU18 | Como Estudiante, quiero editar, completar manualmente, activar, desactivar, reactivar o eliminar mis retos, para ajustar su estado y avance. | RF06 |
| HU19 | Como Estudiante, quiero eliminar una tarea que ya no es relevante, para mantener mi lista de pendientes organizada. | RF02 |
| HU20 | Como Estudiante, quiero consultar y actualizar los datos permitidos de mi cuenta, para mantener mi perfil vigente. | RF01, RNF12 |
| HU21 | Como Estudiante, quiero consultar, corregir o eliminar sesiones registradas, para mantener un historial de estudio confiable. | RF10, RF11 |
| HU22 | Como Administrador, quiero gestionar el catálogo de insignias, para mantener actualizados los reconocimientos. | RF05 |
| HU23 | Como Administrador, quiero gestionar el catálogo de niveles, para mantener actualizados los umbrales de progreso. | RF07 |
| HU24 | Como Estudiante, quiero consultar, marcar y eliminar notificaciones internas, para controlar mis avisos pendientes. | RF04, RNF15 |
| HU25 | Como Estudiante, quiero consultar, activar, desactivar o eliminar recordatorios, para controlar cuándo recibir alertas. | RF04, RNF15 |
| HU26 | Como Administrador, quiero consultar movimientos de puntos y asignaciones de insignias y revocar registros incorrectos, para corregir inconsistencias justificadas. | RF05, RF07 |
| HU27 | Como Administrador, quiero consultar, actualizar, desactivar o reactivar cuentas, para atender correcciones y necesidades de seguridad. | RF01, RNF12 |
| HU28 | Como Revisor institucional, quiero consultar indicadores agregados de un periodo, para revisar el avance sin modificar datos del estudiante. | RF11 |
| HU29 | Como Administrador, quiero gestionar el catálogo de materias, para que los estudiantes seleccionen su materia en lugar de escribirla. | RF01 |
| HU30 | Como Estudiante, quiero desactivar mi propia cuenta desde Mi perfil, para suspender mi acceso sin perder mis datos. | RF01 |
| HU31 | Como Administrador, quiero activar, desactivar o reactivar retos de las cuentas, para controlar su disponibilidad sin alterar los puntos ya otorgados. | RF06 |

> **Nota de corrección (agosto 2026):** HU16–HU19 se agregaron porque el CRUD de `materiaCrud.js`, `metaCrud.js`, `retoCrud.js` y `tareaCrud.js` ya implementa `actualizar*` y `eliminar*` para estas entidades, pero no existían historias de usuario explícitas que los sustentaran — solo aparecían como flujos alternativos dentro de otros casos de uso. La edición ampliada de retos, sus estados y la desactivación propia de cuenta se incorporan a la línea documental de octubre de 2026.

Los criterios de aceptación completos y la cobertura CRUD de HU01–HU31 se encuentran en `13-historias-usuario-criterios-aceptacion.md`.

---

## CU11 — Gestionar perfil de cuenta

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Disparador** | El estudiante selecciona “Mi perfil”. |
| **Precondición** | Cuenta autenticada y activa. |
| **Flujo normal** | 1. El sistema consulta la cuenta sin exponer `contrasena_hash`. 2. El estudiante modifica nombre o correo, o selecciona «Desactivar mi cuenta». 3. El sistema valida los datos o confirma la identidad propietaria de la cuenta. 4. Guarda los cambios; si se desactiva, conserva los datos y bloquea el acceso. |
| **Flujos alternativos** | A1: correo duplicado → rechaza el cambio. A2: datos inválidos → informa el campo. A3: el Estudiante desactiva su cuenta → `activa = false`; solo el Administrador puede reactivarla. |
| **Postcondición** | Los datos permitidos quedan actualizados o la cuenta queda desactivada sin borrar sus datos. |
| **Trazabilidad** | HU20, HU30 · RF01 · RN01, RN02, RN27 |

## CU12 — Gestionar historial de sesiones

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Disparador** | El estudiante abre su historial de estudio. |
| **Precondición** | Cuenta autenticada. |
| **Flujo normal** | 1. Lista sesiones propias. 2. El estudiante consulta una sesión. 3. Puede corregir duración/modo o eliminarla. 4. El sistema valida y persiste. 5. El tablero refleja el cambio al recalcular. |
| **Flujos alternativos** | A1: duración no positiva → rechaza. A2: sesión ajena o inexistente → no autoriza. |
| **Postcondición** | El historial conserva únicamente sesiones válidas. |
| **Trazabilidad** | HU21 · RF10, RF11 · RN14 |

## CU13 — Administrar cuentas, catálogos y estado de retos

| Campo | Descripción |
|---|---|
| **Actor principal** | Administrador |
| **Disparador** | El Administrador abre el panel autorizado. |
| **Precondición** | Permisos administrativos vigentes. |
| **Flujo normal** | 1. Selecciona cuentas, insignias, niveles o el catálogo de materias (P17, `f62c5e5`). 2. Consulta el registro. 3. Crea o modifica catálogos, actualiza/desactiva/reactiva una cuenta o activa/desactiva/reactiva un reto. 4. El sistema valida permisos, unicidad e integridad. 5. Persiste y confirma. |
| **Flujos alternativos** | A1: registro relacionado impide eliminar → informa la restricción. A2: valor duplicado → rechaza. |
| **Postcondición** | La cuenta o catálogo queda actualizado sin romper referencias. |
| **Trazabilidad** | HU22, HU23, HU27, HU29, HU31 · RF01, RF05, RF06, RF07 · RN01, RN02, RN11, RN15, RN26, RN27, RN28 |

## CU14 — Corregir movimientos y asignaciones

| Campo | Descripción |
|---|---|
| **Actor principal** | Administrador |
| **Disparador** | Se reporta un movimiento o asignación incorrecta. |
| **Precondición** | Permisos administrativos y justificación de la corrección. |
| **Flujo normal** | 1. Consulta puntos o insignias asignadas. 2. Selecciona el registro incorrecto. 3. Confirma la revocación/eliminación. 4. El sistema conserva la regla append-only y recalcula el resultado derivado. |
| **Flujos alternativos** | A1: registro inexistente → no modifica. A2: intento de editar puntos → se rechaza; solo se permite corrección autorizada. |
| **Postcondición** | La inconsistencia queda corregida sin editar movimientos históricos. |
| **Trazabilidad** | HU26 · RF05, RF07 · RN07, RN11 |

## CU15 — Gestionar notificaciones internas

| Campo | Descripción |
|---|---|
| **Actor principal** | Estudiante |
| **Sistema externo** | Notifications API, cuando corresponda. |
| **Disparador** | El estudiante abre el centro de notificaciones. |
| **Precondición** | Cuenta autenticada. |
| **Flujo normal** | 1. Lista notificaciones propias. 2. Filtra pendientes. 3. Marca una o todas como leídas, o elimina una notificación. 4. El sistema persiste el cambio. |
| **Flujos alternativos** | A1: notificación ajena o inexistente → no autoriza. A2: permiso nativo denegado → mantiene el aviso in-app. |
| **Postcondición** | El estado leído/no leído y la lista quedan actualizados. |
| **Trazabilidad** | HU24 · RF04 · RN16, RN17, RN19 |

## CU16 — Consultar indicadores institucionales

| Campo | Descripción |
|---|---|
| **Actor principal** | Revisor institucional |
| **Disparador** | El revisor accede a la consulta autorizada. |
| **Precondición** | Acceso de solo lectura autorizado. |
| **Flujo normal** | 1. Selecciona el periodo disponible. 2. El sistema calcula indicadores agregados. 3. Muestra resultados sin permitir edición ni exponer credenciales. |
| **Flujos alternativos** | A1: sin información → muestra estado vacío. A2: acceso no autorizado → deniega la consulta. |
| **Postcondición** | Se muestran indicadores sin modificar ni persistir una tabla `reporte`. |
| **Trazabilidad** | HU28 · RF11 · RN14, RN21 |
