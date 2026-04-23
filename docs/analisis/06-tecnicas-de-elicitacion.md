# Técnicas de Elicitación de Requisitos

**Proyecto:** Plataforma Web Gamificada para Hábitos de Estudio  
**Asignatura:** Ingeniería de Software II — Uniremington  
**Autores:** Juan David Castillo Mena · Juan José Pulgarín Avendaño  
**Docente:** Gloria Amparo Lora Patiño  

---


Para identificar los requisitos funcionales y no funcionales de la plataforma gamificada, se aplicaron cuatro técnicas de elicitación de requisitos orientadas tanto a la recolección de datos con usuarios reales como al análisis de contexto y sistemas similares.

---

## 6.1 Encuesta

Se aplicó una encuesta digital a **30 participantes** (estudiantes de instituciones privadas de Medellín, de primer a quinto semestre) mediante Google Forms, con el objetivo de identificar dificultades en la organización académica y las funcionalidades deseadas para la plataforma.

### Resultados principales

- El **87 %** de los encuestados afirmó procrastinar con frecuencia y reconoce no tener un método estructurado de organización académica.
- El **93 %** declaró interés en usar una plataforma con sistema de recompensas (puntos e insignias) si les ayuda a mejorar su rendimiento.
- Las principales dificultades reportadas son: gestión del tiempo (41 %), recordar fechas de entrega (29 %), mantener concentración (20 %) y falta de motivación (10 %).
- El **76 %** usa el celular o computador más de 4 horas diarias con fines no académicos durante semanas de estudio.
- El **81 %** nunca ha utilizado el método Pomodoro y estaría dispuesto a probarlo si la plataforma lo integra de forma visual e intuitiva.
- Las funcionalidades más solicitadas: recordatorios automáticos (88 %), historial de tareas completadas (72 %), estadísticas de progreso (68 %) y metas semanales (61 %).

---

## 6.2 Entrevista

Se realizaron entrevistas semiestructuradas a **4 participantes** (2 estudiantes universitarios de instituciones privadas de Medellín — tercer y quinto semestre — y 2 docentes de asignaturas con alta carga académica). El objetivo fue profundizar en patrones de comportamiento, frustraciones y expectativas respecto a herramientas de organización del estudio.

### Hallazgos más relevantes

- Los estudiantes coincidieron en que el principal obstáculo no es la falta de tiempo, sino la dificultad para iniciar las tareas y mantener la concentración una vez comenzadas.
- Los docentes señalaron que los estudiantes que llevan un registro activo de sus compromisos obtienen en promedio un 20–30 % más de tareas entregadas a tiempo.
- Los estudiantes expresaron que aplicaciones genéricas (Notion, Google Calendar) les resultan complejas y poco motivadoras; prefieren soluciones simples con retroalimentación inmediata.
- Los docentes sugirieron incluir un panel de estadísticas semanales visible que motive al estudiante al ver su avance de forma gráfica.

---

## 6.3 Observación Directa

Se realizaron dos sesiones de observación directa en espacios de estudio universitario: una en la sala de sistemas de Uniremington y otra en la biblioteca de la misma institución. Se observaron grupos de estudiantes durante sus sesiones de estudio libre en la semana previa a parciales.

### Patrones observados con mayor frecuencia

- El **70 %** de los estudiantes alternaba entre actividades académicas y redes sociales en intervalos de menos de 5 minutos, evidenciando dificultad para mantener el foco sostenido.
- Ningún estudiante observado utilizaba algún método formal de gestión del tiempo (Pomodoro, bloques horarios u otro).
- La mayoría consultaba fechas de entrega en mensajes de WhatsApp en lugar de una agenda centralizada, lo que generó confusión en varios casos.
- Los estudiantes que trabajaban con listas escritas (físicas o digitales) completaban más tareas durante el tiempo de observación que quienes no las usaban.

---

## 6.4 Análisis de Sistemas Similares (Benchmarking)

Se estudió el estado del arte de plataformas similares: **Duolingo, Khan Academy, Forest App, Todoist y MetaTutor**. Para cada referente se identificaron funcionalidades clave, fortalezas y brechas que el proyecto busca atender.

### Conclusión del benchmarking

Este análisis confirmó que ninguna solución existente combina gamificación, Pomodoro y gestión de tareas académicas en un entorno *offline* accesible en español para el contexto universitario colombiano — brecha que justifica el desarrollo de esta plataforma.

| Plataforma | Gamificación | Pomodoro | Gestión de tareas | Offline | Español |
|---|:---:|:---:|:---:|:---:|:---:|
| Duolingo | ✅ | ❌ | ❌ | ❌ | ✅ |
| Khan Academy | Parcial | ❌ | ❌ | ❌ | ✅ |
| Forest App | ❌ | ✅ | ❌ | Parcial | ✅ |
| Todoist | ❌ | ❌ | ✅ | Parcial | ✅ |
| MetaTutor | ❌ | ❌ | Parcial | ❌ | ❌ |
| **Esta plataforma** | **✅** | **✅** | **✅** | **✅** | **✅** |
