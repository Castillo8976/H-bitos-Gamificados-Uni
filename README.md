# StudyQuest — Plataforma Web Gamificada de Hábitos de Estudio

Proyecto de Ingeniería de Software III de Uniremington. La aplicación permite gestionar hábitos académicos mediante tareas, sesiones de estudio, metas, retos, puntos, insignias, niveles, recordatorios y notificaciones.

## Línea técnica oficial

- Node.js 20.17 o superior para las dependencias; entorno verificado: Node.js 24.14.1.
- Express 4.
- Sequelize 6.
- SQLite 3.
- JavaScript CommonJS.

La raíz de este repositorio es el único directorio ejecutable. `pjc/` contiene exclusivamente documentación académica y artefactos de análisis y diseño.

El diccionario [E7](pjc/docs/diseno/fase2-datos/E7-diccionario-datos.md) define los nombres y tipos aprobados. El script [E11](pjc/docs/diseno/fase2-datos/E11-script-DDL-v2.sql) es la fuente física del esquema SQLite. Los modelos Sequelize consumen ese esquema, pero no lo crean con `sequelize.sync()`.

## Instalación e inicio

```bash
npm install
npm start
```

La API queda disponible en `http://localhost:3000`. Para verificarla:

```bash
curl http://localhost:3000/api/health
```

Respuesta esperada:

```json
{"estado":"ok","servicio":"studyquest-api","base_datos":"sqlite"}
```

## Frontend funcional

Al iniciar el servidor, la ruta `http://localhost:3000` presenta una interfaz
responsive conectada a la API real. Permite probar:

- Registro, inicio y cierre de sesión.
- Resumen del estudiante.
- Creación, edición y eliminación de materias.
- Creación, consulta, edición, completado y eliminación de tareas.
- Cronómetro Pomodoro 25/5, modo Libre, descansos automáticos y registro de sesiones.
- Cambio de tareas a estado `En progreso`.
- Consulta de puntos, nivel, insignias, retos y metas.
- Recompensa transaccional al completar tareas o guardar sesiones.
- Tablero semanal calculado en tiempo real y exportación JSON.
- Creación y administración de recordatorios; programación automática al crear tareas.
- Lectura y eliminación de notificaciones.
- Temas de color, modo oscuro, avatar y preferencias de alertas.
- Eliminación confirmada de los datos propios, con exportación JSON previa opcional.
- Administración de usuarios, insignias, niveles, retos y correcciones.
- Indicadores institucionales agregados para el Revisor institucional.

Los datos se guardan en `database.sqlite`; el navegador solo conserva el JWT en
`sessionStorage`. La explicación del código está en
[`src/public/README.md`](src/public/README.md).
La trazabilidad de cada acción visible se registra en
[`M16_trazabilidad_frontend.md`](pjc/docs/trazabilidad/M16_trazabilidad_frontend.md).

Variables opcionales:

- `PORT`: puerto HTTP; por defecto `3000`.
- `DATABASE_STORAGE`: ruta del archivo SQLite; por defecto `database.sqlite` en la raíz.
- `JWT_SECRET`: secreto de firma de tokens; obligatorio cuando `NODE_ENV=production`.
- `JWT_EXPIRES_IN`: duración del token; por defecto `2h`.

## Autenticación y API

### Recordatorios automáticos

El servidor procesa pendientes cada 60 segundos en lotes de hasta 100. Crear
una tarea programa un aviso para el día UTC anterior a su entrega; cambiar la
fecha lo reprograma, completar cancela pendientes y eliminar aplica cascada.
E7 usa DATE: la precisión es de día, no de hora. Si el aviso ya venció, se recoge
en el siguiente ciclo. Al reiniciar se recuperan los avisos pendientes guardados.

La interfaz consulta avisos cada 15 segundos. El botón **Habilitar avisos del
navegador** solicita permiso; si se deniega, los avisos siguen disponibles dentro
de la aplicación. Las alertas nativas requieren la aplicación abierta y no se
muestran durante enfoque. No hay entrega web push con navegador cerrado.
El detalle y los límites están en CRF-004.

### Rutas de acceso

```text
POST /api/auth/registro
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/perfil
```

Las rutas protegidas reciben el encabezado `Authorization: Bearer <token>`. Los roles aprobados son `Estudiante`, `Administrador` y `Revisor institucional`. El registro público siempre asigna el rol Estudiante.

El registro recibe `nombre`, `correo`, `contrasena` y una `materia` inicial con `nombre` y `horario` opcional, cumpliendo HU01. En la misma transacción crea la cuenta, su preferencia visual y la primera materia.

La primera cuenta privilegiada se prepara localmente, sin exponer un cambio de rol en el registro público:

```bash
BOOTSTRAP_NAME="Administrador" \
BOOTSTRAP_EMAIL="admin@studyquest.local" \
BOOTSTRAP_PASSWORD="cambie-esta-clave" \
BOOTSTRAP_ROLE="Administrador" \
npm run bootstrap:account
```

Los recursos se publican bajo `/api`: `cuentas`, `materias`, `tareas`, `preferencias`, `sesiones`, `recordatorios`, `notificaciones`, `puntos`, `insignias`, `cuenta-insignias`, `niveles`, `retos` y `metas`. También están disponibles `estadisticas/semanales`, `estadisticas/institucionales` y `exportacion/datos`. La matriz completa se encuentra en [M15](pjc/docs/trazabilidad/M15_trazabilidad_construccion.md).

## Pruebas

```bash
npm test
```

Este comando ejecuta:

1. Los límites y responsabilidades de la arquitectura MVC.
2. La alineación `E7 → E11 → modelos → SQLite`.
3. La capa de datos y el flujo transaccional de gamificación, incluida la reversión ante errores.
4. Estadísticas, exportación segura y privacidad institucional.
5. La API HTTP, autenticación, roles y aislamiento por cuenta.
6. La publicación de P01–P20, estilos responsive y cliente API.

Las pruebas crean bases temporales dentro de `/tmp` y no modifican `database.sqlite`.

Comandos individuales:

```bash
npm run test:schema
npm run test:integration
npm run test:api
npm run test:frontend
npm run test:browser
npm run test:legacy
```

`test:browser` inicia una base y un servidor temporales y valida en Chrome las
vistas de Estudiante, Administrador y Revisor, incluida la adaptación a 390 px.
Requiere Google Chrome en `/usr/bin/google-chrome`, puerto 9333 libre y Node.js
con `WebSocket` global (verificado con Node.js 24.14.1). Usa un perfil temporal,
sin interactuar con tu perfil personal de Chrome.

## Estructura real

```text
.
├── src/
│   ├── app.js                 # Configuración de Express
│   ├── server.js              # Inicialización de E11 y servidor HTTP
│   ├── database.js            # Conexión única Sequelize/SQLite
│   ├── config/schema.js       # Ejecutor del DDL aprobado
│   ├── models/                # 13 modelos Sequelize
│   ├── services/              # Reglas de negocio y adaptadores CRUD
│   ├── controllers/           # Entrada y respuesta HTTP
│   ├── routes/                # Definición declarativa de endpoints
│   ├── middlewares/           # Autenticación, autorización y errores
│   ├── validators/            # Validación de solicitudes
│   ├── public/                # Recursos públicos del navegador
│   ├── views/                 # Vistas del patrón MVC
│   └── crud/                  # Implementación CRUD heredada, consumida por services
├── tests/
│   ├── schema/                # Prueba de alineación del esquema
│   ├── integration/           # Datos, transacciones y objetivos 6–10
│   ├── api/                   # Contratos HTTP y roles
│   └── frontend/              # Publicación de pantallas y cliente web
├── pjc/docs/                  # Análisis, diseño y trazabilidad
├── database.sqlite            # Base local de desarrollo
├── package.json               # Único manifiesto npm
└── README.md                  # Este documento
```

## Esquema vigente

El sistema contiene exactamente 13 tablas: `cuenta`, `materia`, `tarea`, `sesion_estudio`, `insignia`, `cuenta_insignia`, `punto`, `reto`, `meta`, `recordatorio`, `preferencia_visual`, `nivel_cuenta` y `notificacion`.

La entidad `reporte` no forma parte del esquema. Las estadísticas se calculan a partir de las tablas transaccionales.

## Estado de Construcción

La aplicación es ejecutable, pero el checklist de Construcción no está cerrado.
El [estado funcional y los pendientes, punto por punto](pjc/docs/trazabilidad/M17_estado_construccion.md)
distingue lo implementado, los flujos incompletos y la evidencia de pruebas.
Mostrar vistas asociadas a P01–P20 no acredita por sí solo la correspondencia
exacta con todos los prototipos ni un CRUD completo desde la interfaz.

La revisión corrigió una diferencia UTC/fecha local en puntos administrativos
y agregó una prueba de regresión. Consultar M17 para los resultados y pendientes.
No se ha declarado Línea Base 1.

## Registro de cambios

La adopción definitiva de SQLite y la unificación de los artefactos se documenta en [CRF-001](pjc/docs/configuracion/CRF-001-unificacion-linea-tecnica.md). Los roles se formalizan en [CRF-002](pjc/docs/configuracion/CRF-002-incorporacion-roles.md), los objetivos 6–10 en [CRF-003](pjc/docs/configuracion/CRF-003-flujo-gamificacion-estadisticas-roles.md) y el cierre de alcance de pantallas en [CRF-005](pjc/docs/configuracion/CRF-005-cierre-validacion-pantallas.md).
