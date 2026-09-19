# CRF-002 — Incorporación de roles y autorización

**Proyecto:** StudyQuest — Plataforma Web Gamificada de Hábitos de Estudio  
**Fecha:** 19 de septiembre de 2026  
**Estado:** Aprobado por el equipo para implementación  
**Responsables:** Juan David Castillo Mena y Alejandro Cardona Jaramillo

## Solicitud

Incorporar el atributo `rol` en `cuenta` para implementar los actores ya aprobados en análisis: **Estudiante**, **Administrador** y **Revisor institucional**.

## Justificación

E7 y E11 no incluían un dato persistente para distinguir los tres actores, aunque RF01, RF11, HU22–HU28, CU13–CU16 y RN21 exigen permisos diferentes. Sin este cambio no era posible aplicar autorización verificable.

## Cambio aprobado

```text
cuenta.rol VARCHAR(30) NOT NULL DEFAULT 'Estudiante'
CHECK rol IN ('Estudiante','Administrador','Revisor institucional')
```

- El registro público siempre crea cuentas con rol `Estudiante`.
- Solo un Administrador puede cambiar roles o administrar cuentas ajenas.
- El Revisor institucional tiene acceso de solo lectura a las rutas que se autoricen expresamente.
- Las credenciales se validan con bcrypt y la sesión HTTP se representa mediante JWT.
- El cierre de sesión revoca el identificador del token mientras el proceso esté activo.

## Impacto

| Artefacto | Ajuste |
|---|---|
| E7 | Se documenta `cuenta.rol`. |
| E11 | Se agrega columna, valor predeterminado y CHECK. |
| Modelo Cuenta | Se agrega el atributo y su validación. |
| M9 | Se documentan los métodos de autenticación. |
| API | Se agregan registro, login, logout y perfil. |
| Pruebas | Se cubren autenticación, cuenta inactiva, permisos y aislamiento. |

## Criterios de aceptación

1. Una cuenta pública se registra como Estudiante.
2. La contraseña nunca aparece en las respuestas.
3. Una cuenta inactiva no puede iniciar sesión.
4. Una ruta protegida rechaza solicitudes sin token.
5. Un Estudiante no puede usar operaciones administrativas ni datos ajenos.
6. Un Revisor institucional no puede modificar recursos.
