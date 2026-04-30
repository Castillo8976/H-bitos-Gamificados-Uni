# Decisiones

## Decisión #01
**¿Qué decidí?** Usar Express.js.
**¿Por qué?** JavaScript conocido del frontend, fácil con MySQL.
**Artefacto:** E6 - Diagrama de Despliegue.

# Decisiones Técnicas del Proyecto

## Decisión 1: SQLite como motor de base de datos
**Fecha:** Abril 2026  
**Contexto:** Se necesitaba un motor de base de datos compatible con el entorno de desarrollo local sin requerir servidor externo.  
**Decisión:** Se eligió SQLite sobre MySQL porque no requiere instalación de servidor, genera un único archivo `.sqlite` portable y es compatible con Sequelize ORM.  
**Consecuencia:** El proyecto puede ejecutarse en cualquier máquina sin configuración adicional de base de datos.

---

## Decisión 2: Sequelize como ORM
**Fecha:** Abril 2026  
**Contexto:** Se necesitaba interactuar con la base de datos desde Node.js sin escribir SQL manual.  
**Decisión:** Se eligió Sequelize sobre consultas SQL directas porque permite definir modelos como clases JavaScript, gestiona las relaciones entre tablas automáticamente y facilita la sincronización del esquema con `sync()`.  
**Consecuencia:** El código es más legible, mantenible y las relaciones entre las 12 entidades quedan definidas explícitamente en el código.

---

## Decisión 3: bcryptjs para cifrado de contraseñas
**Fecha:** Abril 2026  
**Contexto:** El requisito RNF12 exige que las contraseñas nunca se almacenen en texto plano.  
**Decisión:** Se usó `bcryptjs` con salt de 10 rondas para cifrar las contraseñas antes de guardarlas en la base de datos.  
**Consecuencia:** Cumple el requisito de seguridad RNF12 y protege los datos del usuario ante posibles filtraciones.