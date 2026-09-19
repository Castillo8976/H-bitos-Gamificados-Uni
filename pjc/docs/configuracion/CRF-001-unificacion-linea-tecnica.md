# CRF-001 — Unificación de la línea técnica y del esquema de datos

**Proyecto:** StudyQuest — Plataforma Web Gamificada de Hábitos de Estudio  
**Fecha:** 19 de septiembre de 2026  
**Estado:** Aprobado por el equipo para implementación  
**Responsables:** Juan David Castillo Mena y Alejandro Cardona Jaramillo

## Solicitud de cambio

Unificar la solución en una sola línea técnica: **Node.js + Express + Sequelize ORM + SQLite**. El repositorio conservaba un manifiesto secundario con MySQL y un E11 rotulado para MySQL, aunque la implementación, las decisiones técnicas y la base entregada utilizan SQLite.

## Motivo

La contradicción impedía demostrar la cadena exigida en construcción:

```text
E7 → E11 → modelos Sequelize → database.sqlite
```

También existían dos comandos de inicio y dos manifiestos npm, uno de los cuales apuntaba a archivos inexistentes.

## Cambios aprobados

1. La raíz del repositorio se declara como único directorio ejecutable.
2. `pjc/` queda reservado para documentación académica.
3. Se conserva un único `package.json` y un único `package-lock.json` en la raíz.
4. E11 se convierte a sintaxis SQLite y adopta exactamente los nombres `snake_case` aprobados en E7.
5. E11 pasa a ser la única fuente física para crear las 13 tablas.
6. Se elimina `sequelize.sync()` del arranque; Sequelize continúa como ORM.
7. Se añade una prueba automática para comparar E7, E11, los modelos y SQLite.
8. Se incorpora Express y una ruta de salud para comprobar el inicio de la aplicación.

## Impacto

| Área | Impacto |
|---|---|
| Análisis | No modifica RF, RNF, HU ni CU. |
| Diseño | E11 se alinea con E7 y con el motor ya aprobado en la decisión técnica 01. |
| Construcción | Unifica instalación, inicio, dependencias y creación del esquema. |
| Datos existentes | No se eliminan automáticamente; el DDL usa creación idempotente. |
| Pruebas | Se incorporan pruebas sobre bases SQLite temporales. |

## Verificación y aceptación

- `npm install` instala el único manifiesto.
- `npm start` inicia Express y ejecuta E11.
- `GET /api/health` responde HTTP 200.
- `npm test` verifica 13 tablas, ausencia de `reporte`, integridad y claves foráneas.
- No existen manifiestos activos ni instrucciones de ejecución para MySQL.

## Reversión

La reversión se realiza recuperando el commit anterior a CRF-001. No se debe editar manualmente una base con información real; antes de cualquier migración se debe conservar una copia del archivo SQLite.
