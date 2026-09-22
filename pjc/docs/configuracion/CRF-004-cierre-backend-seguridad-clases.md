# CRF-004 — Validaciones, seguridad y correspondencia de clases

**Fecha:** 21 de septiembre de 2026

**Estado:** En implementación; pendiente de revisión y aprobación del equipo.

## Solicitud y alcance

Completar los puntos 5, 6 y 12 de Construcción: contratos y permisos del backend,
condiciones de retos, tratamiento de ajustes históricos, correcciones
administrativas atómicas, recordatorios automáticos, autenticación reforzada,
perfil y edición administrativa, y diagrama de clases alineado con el código.
No declaramos estos puntos cerrados hasta verificar todas las condiciones.

## Avance 1 — Entradas y propiedad de registros

- Incorporamos `EntityValidator` para validar tipos, tamaños y nulabilidad
  desde los atributos de los modelos contrastados con E7. Las rutas conservan
  las listas de campos permitidos y los controles de autorización.
- Rechazamos fechas inexistentes, tareas nuevas con entrega pasada (RN04),
  semanas ISO inválidas, enteros fuera del rango seguro y textos vacíos.
- Normalizamos correo y texto; nunca modificamos la contraseña recibida.
- Validamos contraseñas por tipo, mínimo del registro y máximo de 72 bytes
  UTF-8 para evitar el truncamiento de bcrypt. Login conserva el mínimo de
  un carácter para poder verificar las cuentas existentes.
- Rechazamos solicitudes de cambio de rol/estado por estudiantes y relaciones
  entre registros de cuentas distintas, incluso cuando actúa un administrador.
- No modificamos tablas, campos ni registros históricos en este avance.

**RF/HU:** RF01/HU01/HU20/HU27; RF02/HU02/HU19; RF04/HU25;
RF10/HU10; RF13/HU13; RF15/HU15. RN04 y RN21.

**Pruebas:** `tests/api/input-validation.test.js` (límites, tipos, fechas,
semanas y credenciales) y casos HTTP negativos en `tests/api/api.test.js`.
`npm run test:api` ejecuta ambas; `npm test` incluye este comando.

## Avance 2 — Correcciones administrativas atómicas

- `CorreccionAdministrativaService` coordina otorgar/retirar puntos y
  asignar/revocar insignias con su notificación dentro de una transacción SQLite
  `IMMEDIATE`. Si el aviso falla, revertimos la corrección completa.
- Comprobamos el rol y estado del administrador en la base dentro de la
  transacción. Un registro inexistente o una insignia duplicada no generan avisos.
- La notificación conserva el identificador del administrador y el motivo.
  Rechazamos motivos que no quepan completos junto al prefijo en los 200
  caracteres de E7; no truncamos silenciosamente la justificación.
- Conservamos los endpoints y contratos de respuesta. No agregamos tablas ni
  cambiamos los puntos o insignias ajenos a la corrección solicitada.
- La notificación sigue el ciclo de vida de E7; no constituye por sí sola un
  registro de auditoría inmutable. No presentamos esta solución como tal.

**RF/HU:** RF05/RF07/HU26, RF01/HU27. **Evidencia:**
`tests/integration/admin-corrections.test.js` fuerza un error real al insertar
la notificación y comprueba rollback en las cuatro operaciones. También prueba
rol, cuenta inactiva, motivo, duplicados y recursos inexistentes. La regresión
de API conserva el contrato HTTP.

## Avance 3 — Recordatorios automáticos

- `TareaService` crea tarea y recordatorio en una transacción. Cambiar nombre
  actualiza el aviso; cambiar entrega lo reprograma, conservando una
  desactivación explícita. Un UUID determinista identifica el aviso automático
  sin agregar columnas ni sobrescribir los manuales.
- Completar tarea cancela avisos pendientes dentro de la transacción de
  gamificación; eliminar conserva la cascada de E11.
- `PlanificadorRecordatoriosService` procesa hasta 100 avisos por ciclo de
  60 segundos, sin superposición. Confirma el marcado y la notificación juntos.
  Filtra cuentas activas y tareas pendientes de la misma cuenta.
- El frontend consulta cada 15 segundos y descarta respuestas de sesiones
  anteriores. Solicita permiso nativo mediante una acción explícita; denegarlo
  no impide leer el aviso interno. Durante enfoque evita avisos nativos.

**Precisión y límites:** E7 define DATE sin hora. Programamos el día UTC anterior
a la entrega, no una hora exacta. Para una tarea de hoy, el aviso queda vencido
y se recoge en el siguiente ciclo. El servidor debe estar encendido; recupera
pendientes al reiniciar. Con navegador cerrado permanece el aviso interno,
pero no implementamos web push ni generamos avisos retrospectivos para todas
las tareas antiguas al arrancar.

**RF/HU:** RF02/HU02/HU19; RF03/HU03; RF04/HU04/HU24/HU25.
**Pruebas:** `reminders.test.js` cubre bisiestos, reprogramación, no repetición,
rollback, cancelación, cascada y ciclo periódico. Chrome usa backend real y
simula Notification para verificar permiso denegado y supresión en enfoque;
no certifica entrega del sistema operativo.

## Trabajo restante de esta solicitud

1. Completar condiciones verificadas de retos y tratamiento coherente de
   cambios/eliminaciones históricas, sin permitir recompensas arbitrarias.
2. Incorporar el servicio de correcciones ya implementado al diagrama de clases.
3. Completar la revisión de operaciones manuales de recordatorios y sus casos
   negativos junto a las restantes reglas del backend.
4. Reforzar intentos de acceso, revocación de sesiones y protección HTTP.
5. Completar perfil y edición administrativa desde la interfaz.
6. Actualizar las clases y métodos en los archivos gráficos vigentes, M9 y
   trazabilidad; comprobar correspondencia automática cuando sea posible.
7. Ejecutar pruebas negativas, de integración y de navegador; actualizar M17
   con resultados reales y separar commits descriptivos por RF/HU.

## Referencias técnicas

- [Express: seguridad en producción](https://expressjs.com/en/advanced/best-practice-security/).
- [bcrypt.js: consideraciones de seguridad](https://github.com/dcodeIO/bcrypt.js#security-considerations).

Estas referencias orientan la implementación; no sustituyen los requisitos,
la evidencia de pruebas ni la aprobación académica del cambio.
