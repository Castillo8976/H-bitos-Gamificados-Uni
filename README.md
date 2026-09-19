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
│   ├── routes/                # Rutas HTTP
│   ├── models/                # 13 modelos Sequelize
│   └── crud/                  # Operaciones y reglas actuales de datos
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
