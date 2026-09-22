# Frontend funcional de StudyQuest

Esta carpeta contiene la interfaz web servida directamente por Express. No usa
un framework adicional: así se puede estudiar el flujo completo sin introducir
otra herramienta antes de terminar la lógica del proyecto.

## Archivos

- `index.html`: estructura semántica de P01–P20, agrupada por los tres roles.
- `styles.css`: paleta del Entregable 17, diseño adaptable y modo oscuro.
- `app.js`: navegación, formularios, consumo de la API y estados de pantalla.

## Recorrido de una acción

```text
Botón o formulario
       ↓
src/public/app.js
       ↓ fetch /api/...
routes → controllers → services
       ↓
database.sqlite
```

El navegador conserva el JWT en `sessionStorage`: se elimina al cerrar la
pestaña o cerrar sesión. Los datos académicos nunca se guardan en el navegador;
se consultan nuevamente desde la API y permanecen en SQLite.

## Acceso por rol

- **Estudiante:** agenda, tareas, Pomodoro, gamificación, estadísticas,
  exportación, recordatorios, notificaciones y preferencias.
- **Administrador:** cuentas, catálogos, retos, correcciones controladas e
  indicadores agregados.
- **Revisor institucional:** exclusivamente P18, en modo de solo lectura.

Completar una tarea o guardar una sesión consume el resultado transaccional del
servidor y presenta puntos, insignias, retos, metas y nivel en el modal de
recompensa. Las pantallas nunca calculan ni simulan premios por su cuenta.

El temporizador ofrece Pomodoro 25/5 y modo Libre. El modo Libre se guarda con
`modo_enfoque: false`; las sesiones Pomodoro usan `modo_enfoque: true`. El
estudiante también puede marcar tareas como `En progreso`, editar su perfil,
administrar sus metas y retos, editar o eliminar sesiones, configurar alertas
y eliminar sus datos después de una confirmación explícita.

La correspondencia entre RF, HU, pantalla, acción y endpoint está registrada en
`pjc/docs/trazabilidad/M16_trazabilidad_frontend.md`.

## Alcance comprobado y pendientes

Los comentarios de las funciones de `app.js` indican RF/HU y responsabilidad.
Los contratos de HTTP se documentan en M15; los eventos visibles, en M16.
La prueba estática comprueba publicación y controles, mientras `test:browser`
ejecuta un recorrido real de tarea, sesión, recompensa, exportación y roles.
No demuestra que todas las acciones de todos los prototipos estén construidas.

La equivalencia visual final con todos los prototipos, la aprobación OCI del
CRF-005 y el historial separado de insignias permanecen como actividades de
cierre documentadas en M17. Las restricciones de seguridad deben aplicarse en
el backend, incluso si un botón está oculto.
