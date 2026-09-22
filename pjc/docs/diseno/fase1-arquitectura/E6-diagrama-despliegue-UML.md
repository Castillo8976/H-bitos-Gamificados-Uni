## Diagrama de Despliegue (UML)

Nodos físicos/lógicos donde se ejecuta el sistema: Navegador (cliente), Servidor de aplicación (Node.js/Express) y Motor de base de datos (SQLite), con los protocolos de comunicación entre ellos.

**Archivo editable (Draw.io):** `E6-diagrama-despliegue-UML.drawio` (misma carpeta).

> **Hallazgo de auditoría (checklist DISEÑO, ítem 4 — resuelto):** la imagen `Despliegue.png` mostraba bloques «component» de software, no nodos de despliegue — ese era el contenido real de un diagrama de **componentes** (ver `E5`). No existía ningún diagrama de despliegue real en el proyecto. Se construyó uno nuevo con los 3 nodos reales (Navegador, Servidor Node.js/Express, SQLite) y el protocolo HTTP/REST entre ellos.
>
> **Nota de estado del código — actualización del 20 de septiembre de 2026:** la integración conserva el diagrama y las aclaraciones de Diseño. La implementación ya incluye `src/app.js` (Express y rutas), `src/server.js` (inicialización del DDL y `app.listen()`), controladores, servicios y una interfaz en `src/public/`. El navegador se comunica con Express mediante HTTP/REST; el servidor accede al archivo SQLite mediante Sequelize, no mediante HTTP. Esta arquitectura ya puede ejecutarse localmente con `npm start` desde la raíz. No implica que todos los RF/HU de Construcción estén terminados ni que exista un despliegue de producción.

![Diagrama de despliegue (imagen previa a la corrección — contenido no correspondía, se conserva como referencia histórica)](../imagenes/Despliegue.png)
