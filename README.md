# StudyQuest — Plataforma Web Gamificada de Hábitos de Estudio

Proyecto de Ingeniería de Software III de Uniremington. La aplicación permite gestionar hábitos académicos mediante tareas, sesiones de estudio, metas, retos, puntos, insignias, niveles, recordatorios y notificaciones.

## Línea técnica oficial

- Node.js 18 o superior.
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

Variables opcionales:

- `PORT`: puerto HTTP; por defecto `3000`.
- `DATABASE_STORAGE`: ruta del archivo SQLite; por defecto `database.sqlite` en la raíz.
- `JWT_SECRET`: secreto de firma de tokens; obligatorio cuando `NODE_ENV=production`.
- `JWT_EXPIRES_IN`: duración del token; por defecto `2h`.

## Autenticación y API

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

Los recursos se publican bajo `/api`: `cuentas`, `materias`, `tareas`, `preferencias`, `sesiones`, `recordatorios`, `notificaciones`, `puntos`, `insignias`, `cuenta-insignias`, `niveles`, `retos` y `metas`. La matriz completa se encuentra en [M15](pjc/docs/trazabilidad/M15_trazabilidad_construccion.md).

## Pruebas

```bash
npm test
```

Este comando ejecuta:

1. La alineación `E7 → E11 → modelos → SQLite`.
2. La prueba integral de la capa de datos y gamificación.

Las pruebas crean bases temporales dentro de `/tmp` y no modifican `database.sqlite`.

Comandos individuales:

```bash
npm run test:schema
npm run test:integration
npm run test:legacy
```

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
│   └── integration/           # Prueba funcional de datos
├── pjc/docs/                  # Análisis, diseño y trazabilidad
├── database.sqlite            # Base local de desarrollo
├── package.json               # Único manifiesto npm
└── README.md                  # Este documento
```

## Esquema vigente

El sistema contiene exactamente 13 tablas: `cuenta`, `materia`, `tarea`, `sesion_estudio`, `insignia`, `cuenta_insignia`, `punto`, `reto`, `meta`, `recordatorio`, `preferencia_visual`, `nivel_cuenta` y `notificacion`.

La entidad `reporte` no forma parte del esquema. Las estadísticas se calculan a partir de las tablas transaccionales.

## Control de cambios

La adopción definitiva de SQLite y la unificación de los artefactos se documenta en [CRF-001](pjc/docs/configuracion/CRF-001-unificacion-linea-tecnica.md).
