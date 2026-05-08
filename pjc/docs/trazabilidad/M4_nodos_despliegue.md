# Tabla 4 — Nodos de Despliegue → Protocolos, RNF, Componentes

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.4 Artefactos de Trazabilidad

> Esta matriz verifica que cada nodo del diagrama de despliegue tenga un protocolo definido, esté justificado por requisitos no funcionales y aloje los componentes adecuados.

---

| Nodo | Tipo UML | Protocolo | RNF justificante | Componentes alojados |
|---|---|---|---|---|
| Navegador web | execution environment | — | RNF01, RNF02, RNF05, RNF09, RNF14 | Todos los módulos de lógica y UI |
| localStorage | artifact (JSON) | Web Storage API | RNF01, RNF04 | Módulo de almacenamiento |
| Notifications API | device service | Browser Notifications API | RNF13, RNF15 | Módulo de notificaciones |
| Archivo datos.json | artifact (exportación) | Blob/Download API | RF14, RNF04 | Módulo de almacenamiento (export) |
| GitHub Pages | server (hosting estático) | HTTPS | RNF09, RNF11 | `index.html`, `styles.css`, módulos `.js` |
