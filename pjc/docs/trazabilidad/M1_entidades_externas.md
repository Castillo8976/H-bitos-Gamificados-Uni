# Tabla 1 — Entidades Externas → RF, CU, DCA

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.1 Artefactos de Trazabilidad

> Esta matriz verifica que cada entidad externa identificada en el Diagrama de Contexto Arquitectónico (DCA) esté cubierta por al menos un Requisito Funcional y un Caso de Uso.

---

| Entidad externa | Tipo | RF asociado | CU asociado | Rol en el DCA |
|---|---|---|---|---|
| Estudiante | Usuario principal | RF01–RF15 | CU01–CU12, CU15 | Actor central. La accesibilidad para personas con discapacidad física es una condición de calidad del mismo actor, no un actor diferente. |
| Administrador del sistema | Usuario autorizado | RF01, RF05, RF06, RF07 | CU13, CU14 | Mantiene cuentas y catálogos de gamificación; no modifica el historial append-only de puntos. |
| Revisor institucional | Usuario de solo lectura | RF11 | CU16 | Consulta estadísticas autorizadas calculadas en tiempo real, sin modificar información. |
| Notifications API del navegador | Sistema externo | RF04, RF12, RNF13, RNF15 | CU10, CU15 | Recibe la solicitud de permiso y muestra alertas cuando el navegador lo permite. |

> **Corrección de alcance:** `localStorage` se retiró porque la persistencia vigente se realiza en SQLite mediante Node.js/Express. El navegador, el servidor y SQLite son componentes internos de la solución y sus interfaces se especifican en la ERS; no se modelan como actores humanos. El antiguo actor “Colaborador” también se retiró porque no posee autenticación, caso de uso ni intercambio implementado que sustente su participación.
