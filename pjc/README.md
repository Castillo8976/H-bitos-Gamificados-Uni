# Plataforma Web Gamificada de Hábitos de Estudio

**Ingeniería de Software II — Uniremington 2025**  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño

---

## ¿Qué módulo implementas?

Módulo de **Gamificación y Gestión Académica**: permite a estudiantes universitarios registrar tareas, sesiones de estudio y metas semanales, obteniendo puntos, insignias y niveles como recompensa por sus hábitos académicos. Incluye recordatorios automáticos, reportes semanales y configuración visual personalizada.

---

## ¿Qué tablas cubre tu módulo?

El módulo gestiona **14 entidades** distribuidas en dos categorías:

**Tablas Maestras (catálogo / configuración):**

| Tabla | Descripción |
|---|---|
| `cuenta` | Identidad digital del estudiante (raíz del esquema) |
| `materia` | Asignaturas académicas del estudiante |
| `insignia` | Catálogo global de logros desbloqueables |
| `nivel_cuenta` | Catálogo de niveles de progreso gamificado |
| `preferencia_visual` | Configuración de apariencia 1:1 con cuenta |

**Tablas Transaccionales:**

| Tabla | Descripción |
|---|---|
| `tarea` | Actividades académicas con prioridad y fecha límite |
| `sesion_estudio` | Bloques de tiempo Pomodoro o cronómetro libre |
| `punto` | Ledger inmutable de puntos acumulados |
| `reto` | Desafíos semanales gamificados con recompensa |
| `meta` | Objetivos semanales de rendimiento |
| `cuenta_insignia` | Resolución N:M de insignias desbloqueadas |
| `recordatorio` | Alertas automáticas vinculadas a tareas |
| `reporte` | Resumen semanal consolidado de rendimiento |
| `notificacion` | Historial de notificaciones in-app |

---

## ¿Qué framework elegiste y por qué?

**Node.js + Express + Sequelize ORM + SQLite**

| Tecnología | Justificación |
|---|---|
| **Node.js + Express** | Permite construir una API REST liviana sin configuración compleja. El equipo ya tiene experiencia con JavaScript, lo que reduce la curva de aprendizaje y acelera el desarrollo. |
| **Sequelize ORM** | Abstrae las consultas SQL, permite definir modelos con validaciones integradas (`isIn`, `unique`) y gestiona las asociaciones (hasMany, belongsTo, belongsToMany) directamente en código. |
| **SQLite** | Motor de base de datos sin servidor, ideal para desarrollo y demostración. El archivo `.sqlite` es portátil y no requiere instalación adicional. Compatible con `sql.js` para uso en navegador si se requiere. |

Esta decisión está respaldada por el **Entregable 6 (Diagrama de Despliegue)** del proyecto, que define una arquitectura de un solo nodo sin servidor de BD externo.

---

## ¿Cómo ejecutar el proyecto?

### Requisitos previos

- Node.js v18 o superior
- npm v9 o superior

### Instalación

```bash
# 1. Clonar el repositorio
git clone <URL_DEL_REPOSITORIO>
cd plataforma-gamificada

# 2. Instalar dependencias
npm install

# 3. Ejecutar el script de prueba para verificar que el CRUD funciona
node test.js
```

### Estructura del proyecto

```
plataforma-gamificada/
├── database.js              # Configuración de conexión SQLite + Sequelize
├── test.js                  # Script de pruebas funcionales del CRUD
├── models/                  # Modelos Sequelize (14 entidades)
│   ├── Cuenta.js
│   ├── Materia.js
│   ├── Tarea.js
│   ├── SesionEstudio.js
│   ├── Insignia.js
│   ├── CuentaInsignia.js
│   ├── Punto.js
│   ├── Reto.js
│   ├── Meta.js
│   ├── Recordatorio.js
│   ├── Reporte.js
│   ├── NivelCuenta.js
│   ├── Notificacion.js
│   └── PreferenciaVisual.js
├── crud/                    # Controladores CRUD (14 archivos)
│   ├── cuentaCrud.js
│   ├── materiaCrud.js
│   ├── tareaCrud.js
│   └── ...
├── README.md
├── BITACORA.md
└── DECISIONES.md
```

### Dependencias principales

```json
{
  "sequelize": "^6.x",
  "sqlite3": "^5.x",
  "bcryptjs": "^2.x",
  "express": "^4.x"
}
```

---

## ¿Cuál es el repositorio de tu compañero?

> **Repositorio de Juan José Pulgarín Avendaño:**  
> `https://github.com/<usuario-compañero>/<repositorio-compañero>`  
> *(Reemplazar con la URL real del repositorio)*
