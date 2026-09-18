# Tabla 4 — Nodos de Despliegue → Protocolos, RNF, Componentes

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.4 Artefactos de Trazabilidad

> Esta matriz verifica que cada nodo del diagrama de despliegue tenga un protocolo definido, esté justificado por requisitos no funcionales y aloje los componentes adecuados.

---

| Nodo | Tipo UML | Protocolo | RNF justificante | Componentes alojados |
|---|---|---|---|---|
| Navegador (cliente) | execution environment | HTTP/HTTPS (fetch/AJAX) | RNF01, RNF02, RNF05, RNF09, RNF14 | SPA HTML/CSS/JS, todos los módulos de UI |
| Notifications API | device service | Browser Notifications API | RNF13, RNF15 | Módulo de notificaciones (parte cliente) |
| Servidor de aplicación (Node.js / Express) | execution environment | HTTP/HTTPS (API REST, JSON) | RNF01, RNF02, RNF09, RNF11 | Módulo de autenticación, módulo de tareas, módulo de recompensas, módulo de retos, módulo de notificaciones (parte servidor), Tablero de Avance Personal |
| Motor de base de datos (SQLite) | database | Sequelize (SQL) | RNF01, RNF04 | Modelos Sequelize de las 13 entidades (`src/models`) |
| Archivo datos.json | artifact (exportación) | Descarga HTTP (`Content-Disposition`) | RF14, RNF04 | Módulo de persistencia (export) |

> **Corrección (revisión septiembre 2026):** esta matriz describía por completo la arquitectura anterior (localStorage, GitHub Pages, Web Storage API), incompatible con la decisión ya tomada de usar Node.js/Express/Sequelize/SQLite. Se reconstruyó con los 3 nodos reales: Navegador, Servidor de aplicación y Motor de base de datos, alineados con el diagrama de despliegue nuevo (`06-diagrama-despliegue-UML.md`). Nota de estado: el nodo "Servidor de aplicación" documenta la arquitectura objetivo — `/src` aún no tiene Express implementado (solo modelos Sequelize y CRUD), ver `12-especificacion-requisitos-software.md`.
