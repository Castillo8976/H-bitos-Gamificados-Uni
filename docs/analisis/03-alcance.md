# Alcance del Proyecto

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software II — Uniremington  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  

---

## Descripción General

La plataforma web gamificada contempla el desarrollo de cinco módulos funcionales orientados a mejorar la organización académica y la motivación de los estudiantes universitarios de instituciones privadas en Medellín durante el año 2025.

---

## Módulos Funcionales

### 1. Tu Agenda Inteligente
Módulo de registro de asignaturas, fechas de parciales, entregas de proyectos y tareas. Centraliza la vida académica del estudiante en un solo lugar para evitar el olvido de plazos importantes.

### 2. Concentración Total — Método Pomodoro
Módulo de gestión del tiempo mediante bloques de concentración intensos seguidos de pausas cortas. Combate la procrastinación y favorece el avance sin agobio.

### 3. Juega y Aprende — Sistema de Gamificación
Módulo de puntos, insignias y niveles que recompensa el cumplimiento de metas de estudio. Convierte cada tarea en un desafío motivador.

### 4. Tu Tablero de Avance Personal
Módulo de estadísticas y gráficos en tiempo real sobre horas estudiadas, materias completadas y logros alcanzados. Genera sensación de control y reconocimiento del progreso.

### 5. Recordatorios a tu Medida
Sistema de notificaciones personalizadas sobre entregas, sesiones programadas y objetivos pendientes. Diseñado para motivar sin agobiar.

---

## Delimitaciones Técnicas

| Aspecto | Descripción |
|---|---|
| **Tipo de aplicación** | Aplicación web estática (HTML, CSS, JavaScript) |
| **Almacenamiento** | `localStorage` del navegador — sin base de datos externa |
| **Servidor** | Sin servidor propio — desplegada en GitHub Pages |
| **Conectividad** | Funciona 100 % offline tras la primera carga |
| **Exportación** | Datos exportables en formato JSON mediante Blob/Download API |
| **Notificaciones** | API nativa del navegador (Notifications API) |

---

## Delimitaciones de Contexto

- **Usuarios objetivo:** Estudiantes universitarios de instituciones privadas en Medellín, de primer a quinto semestre.
- **Periodo de desarrollo:** Asignatura Ingeniería de Software II, año 2025.
- **Equipo de desarrollo:** Dos estudiantes de quinto semestre del programa Desarrollo de Software.
- **Idioma:** Español, adaptado al contexto universitario colombiano.

---

## Lo que el proyecto NO incluye

- No requiere registro en servidor externo ni autenticación con terceros (Google, Facebook, etc.).
- No incluye funciones de colaboración en tiempo real entre estudiantes.
- No tiene panel de administración con acceso desde internet público.
- No genera reportes para docentes de forma automática (solo consulta de solo lectura por URL directa).

---

## Cobertura de Requisitos

El alcance cubre los siguientes requisitos funcionales y no funcionales:

| Módulo | Requisitos Funcionales | Requisitos No Funcionales |
|---|---|---|
| Autenticación y cuenta | RF01 | RNF12 |
| Gestión de tareas y agenda | RF02, RF03, RF09 | RNF01, RNF04 |
| Recordatorios | RF04 | RNF15 |
| Gamificación (puntos, insignias, retos) | RF05, RF06, RF07, RF08 | — |
| Pomodoro y modo enfoque | RF10, RF12 | RNF02, RNF13 |
| Reportes semanales | RF11 | RNF02 |
| Personalización visual | RF13 | RNF04, RNF06, RNF07 |
| Exportación de datos | RF14 | RNF04 |
| Metas semanales sugeridas | RF15 | — |
