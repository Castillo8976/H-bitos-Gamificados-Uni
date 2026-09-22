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

## Trabajo restante de esta solicitud

1. Completar condiciones verificadas de retos y tratamiento coherente de
   cambios/eliminaciones históricas, sin permitir recompensas arbitrarias.
2. Agrupar correcciones administrativas y su notificación en transacciones.
3. Crear/reprogramar recordatorios con tareas y procesar vencidos una sola vez;
   verificar permisos del navegador y persistencia del aviso interno.
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
