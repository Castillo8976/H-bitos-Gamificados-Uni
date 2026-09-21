# M17 — Estado funcional y pendientes de Construcción

**Fecha de revisión:** 20 de septiembre de 2026  
**Fuente:** hoja CONSTRUCCIÓN de `Ingenieria de Software 3.xlsx`  
**Estado:** revisión de la integración local; no constituye aprobación de Línea Base 1.

## 1. Qué se puede ejecutar

Desde la raíz: `npm install`, `npm start` y abrir `http://localhost:3000`.
La interfaz consume la API de Express y conserva los registros en SQLite.
`pjc/` contiene los artefactos académicos; no es otra aplicación ejecutable.

| Área | Funcionalidad disponible | Límite actual |
|---|---|---|
| Acceso | Registro con primera materia, login, logout, consulta del perfil y permisos por rol | Falta completar edición del perfil en la interfaz y endurecer la protección de autenticación |
| Materias y tareas | Crear, consultar, editar y eliminar; completar tareas; buscar por nombre y filtrar por estado/prioridad | Faltan filtros por materia/fecha y completar validaciones de negocio |
| Sesiones | Cronómetro Pomodoro y guardado con recompensa; API para consultar, editar y eliminar sesiones | No existe todavía todo el flujo visual de historial editable, sesión libre y descansos |
| Gamificación | Transacción de tarea/sesión, puntos, evaluación de insignias, metas, retos y nivel | Falta cerrar validación de condiciones, ajustes históricos y CRUD visual de metas/retos del estudiante |
| Recordatorios | Alta manual, consulta, activación/desactivación y eliminación | No equivale a programación automática ni a entrega de avisos vencidos; falta completar ese flujo |
| Notificaciones | Consulta, marcado como leída y eliminación | No hay evidencia de entrega con navegador cerrado |
| Preferencias | Tema y modo oscuro persistentes | Faltan avatar y restablecimiento previstos en el prototipo |
| Tableros | Estadísticas personales por periodo y agregados institucionales | Revisar rangos de varias semanas, denominador y fechas; no hay fecha de creación de tarea en E7 |
| Exportación | Descarga JSON de datos propios, sin contraseña | No implementa otros formatos, conforme al alcance actual de RF14 |
| Administración | Gestión de cuentas, catálogos y correcciones de puntos/insignias con motivo | Edición visual de catálogos parcial; confirmar alcance y aprobación del CRF-003 |

## 2. Contraste punto por punto con el Excel

La presencia de archivos no prueba el cumplimiento completo. Las pruebas de
estructura tampoco sustituyen la aceptación funcional o la aprobación del equipo.

| N.º | Qué pide | Qué se tiene | Qué falta para cerrarlo |
|---|---|---|---|
| 1 | Patrón MVC | Express, rutas, controladores, servicios, modelos y frontend separado | Mantener los límites en los siguientes cambios; no mover reglas al navegador |
| 2 | Carpetas MVC | Estructura ejecutable en `src/` y prueba de arquitectura | Mantener README y E6 alineados con la implementación |
| 3 | Código idéntico al DDL aprobado | E11 inicializa las 13 tablas; prueba de esquema | Formalizar aprobación del índice incorporado por CRF-003 y comprobar la base local, no solo la base temporal |
| 4 | Nombres, tipos y tamaños de E7 | E7, E11 y modelos contrastados por prueba | Completar validación HTTP de tamaños/fechas; distinguir alineación declarativa de validación efectiva |
| 5 | Backend CRUD de entidades principales | Rutas para las 13 entidades y pruebas de operaciones | Cerrar reglas, permisos y casos negativos; puntos son movimientos, no un CRUD genérico con edición libre |
| 6 | Método CRUD en diagrama detallado | M9 y descripción E12; diagrama editable existente | Comparar y corregir métodos exactos del gráfico respecto a CRUD/servicios, sin confundir 13 entidades con todas las clases |
| 7 | RF ↔ HU ↔ método ↔ botón | M15 y M16 | Completar los flujos ausentes y enlazar cada acción con método y caso de prueba concreto |
| 8 | CRF y función dual de OCI | CRF-001, CRF-002 y CRF-003 | Registrar revisión/aprobación humana de CRF-003 y evidencia de responsabilidades OCI; no inventar aprobaciones |
| 9 | Commits descriptivos RF/HU | Integración `af5d2bf`, backend `30d4767` y frontend `a51544d`; preservados los seis commits locales previos y ambos del compañero | Verificar la publicación al entregar; los mensajes históricos del compañero se conservan sin reescribir |
| 10 | Pantallas iguales a prototipos | Frontend por roles y referencias P01–P20/W01–W06 | Comparación visual/campo/acción; completar perfil, sesiones, metas y catálogos; justificar diferencias por CRF |
| 11 | Comentarios RF/HU y README | Documentados los controladores, servicios nuevos, funciones del frontend, validadores, autenticación y soporte HTTP; README actualizado | Mantener este criterio en futuros cambios y completar la auditoría del código heredado; no confundir comentarios con cumplimiento funcional |
| 12 | Autenticación, usuarios y roles | JWT, hash de contraseña, roles y aislamiento por cuenta | Endurecer intentos de acceso, revocación y validaciones; completar interfaz de perfil y pruebas negativas |
| 13 | Declarar LB1 como ECS | Artefactos técnicos y CRF | Crear manifiesto versionado con evidencia y aprobación una vez cerrados los pendientes; no declarar LB1 todavía |
| 14 | Auditoría bidireccional completa | Matrices y pruebas parciales | Demostrar todos los RF/HU, ausencia de funciones no aprobadas y resultados medidos de RNF |

## 3. Prioridades de desarrollo

1. Corregir fallos reproducibles y cerrar validaciones, permisos y atomicidad.
2. Completar recordatorios automáticos y flujos de tareas/sesiones.
3. Completar metas/retos, perfil, preferencias y edición de catálogos.
4. Revisar cálculos del tablero y actualización de datos al cambiar de cuenta o realizar operaciones.
5. Ejecutar aceptación desde la interfaz y pruebas negativas de API; medir RNF con criterios del análisis.
6. Cerrar diagramas, trazabilidad, comentarios RF/HU, CRF y Línea Base 1 con evidencia y aprobación.

Se conservará la documentación aprobada como referencia. Una diferencia de
alcance requiere CRF; no se alterará un requisito solo para declarar completo
lo ya implementado. El Word queda fuera de esta revisión.

## 4. Verificación de esta integración

- Los cambios del compañero afectan seis Markdown de E3–E6, E12 y E13; no agregan nuevas imágenes ni cambios de código.
- La integración automática no presentó conflictos. E6 se actualizó para reconocer el servidor y el frontend ya implementados.
- Pasaron las pruebas de arquitectura, esquema y las dos suites de integración.
- Se corrigió la diferencia UTC/fecha local en `Punto.fecha`, conservando DATE de E7/E11 y sin reescribir registros históricos. La API volvió a pasar con los 25 puntos esperados en el periodo.
- `tests/schema/point-date.test.js` fija instantes alrededor de medianoche UTC; pasó con `TZ=America/Bogota`.
- Pasaron `npm test` y `npm run test:browser`: flujos de tarea/sesión, recompensas, indicadores, exportación, vistas por rol y ancho de 390 px. No acreditan todos los CRUD visuales ni todos los RNF.
- Revisión de solo lectura de `database.sqlite`: 13 tablas, integridad `ok`, cero violaciones de FK. Contiene dos cuentas locales; no se incluirá ese archivo de datos en la publicación de código.

## 5. Cómo probar manualmente

Usar una base de ensayo para no mezclar pruebas con los datos personales:

```bash
DATABASE_STORAGE=/tmp/studyquest-prueba-manual.sqlite npm start
```

Registrar un estudiante con materia inicial. Crear/editar una materia y una
tarea; completar la tarea y consultar puntos/notificaciones. Guardar una sesión
con duración positiva, consultar el tablero, exportar JSON y cambiar el tema.
Cerrar sesión y entrar con otra cuenta: no deben aparecer datos ajenos.
Para probar otros roles, ejecutar `bootstrap:account` con la misma variable
`DATABASE_STORAGE` y los datos de una cuenta de ensayo, según el README.

Resultados a registrar: acción, RF/HU, datos utilizados, resultado esperado,
resultado obtenido y evidencia. Que una pantalla abra no prueba su CRUD completo.

## 6. Resumen para el compañero

Integré tus cambios de Diseño con mi desarrollo y conservé tus diagramas.
Corregí la nota de despliegue porque ya tenemos servidor Express y frontend.
La aplicación permite registrarse, gestionar materias y tareas, guardar sesiones
y ver sus recompensas, puntos, niveles, insignias, estadísticas y exportación
JSON. También hay vistas diferentes para estudiante, administrador y revisor.
Documenté el código y dejé los cambios separados con referencias RF/HU.

Probé el backend y un recorrido real en Chrome. Corregí un error de fecha que
hacía que los puntos administrativos no aparecieran en el mismo día del tablero.
Esto no significa que Construcción esté terminada: arriba queda el checklist
con los flujos, controles y artefactos que todavía debemos completar.
