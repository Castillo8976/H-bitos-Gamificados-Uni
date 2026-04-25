# Bitácora

## Entrada #01 — 17/04/2026
**¿Qué hice?** Inicialicé Express, creé estructura de carpetas (E5), subí a GitHub, completé README.
**¿Qué problema encontré?** Pendiente.
**¿Cómo lo resolví?** Pendiente.
**¿Usé IA?** Sí — Perplexity para estructura base. Revisé y ajusté con mis artefactos de diseño.


## Semana 2 — 25 de Abril 2026

### ✅ Base de datos
- Motor: SQLite
- Archivo generado: `database.sqlite`
- Conexión establecida con Sequelize

### ✅ Modelos creados (12 entidades)
| Modelo | Archivo | Relaciones |
|---|---|---|
| Cuenta | `src/models/Cuenta.js` | Entidad raíz |
| Materia | `src/models/Materia.js` | N:1 con Cuenta |
| Tarea | `src/models/Tarea.js` | N:1 con Cuenta, N:1 con Materia |
| PreferenciaVisual | `src/models/PreferenciaVisual.js` | 1:1 con Cuenta |
| SesionEstudio | `src/models/SesionEstudio.js` | N:1 con Cuenta, N:1 con Tarea |
| Insignia | `src/models/Insignia.js` | N:M con Cuenta |
| CuentaInsignia | `src/models/CuentaInsignia.js` | Tabla intermedia N:M |
| Punto | `src/models/Punto.js` | N:1 con Cuenta |
| Reto | `src/models/Reto.js` | N:1 con Cuenta |
| Meta | `src/models/Meta.js` | N:1 con Cuenta |
| Recordatorio | `src/models/Recordatorio.js` | N:1 con Tarea, N:1 con Cuenta |
| Reporte | `src/models/Reporte.js` | N:1 con Cuenta |

### ✅ Relaciones definidas
- `hasMany` / `belongsTo` para relaciones 1:N
- `hasOne` / `belongsTo` para relación 1:1 (PreferenciaVisual)
- `belongsToMany` para relación N:M (Cuenta ↔ Insignia)

### Tecnologías usadas
- Node.js v22.19.0
- Sequelize ORM
- SQLite3