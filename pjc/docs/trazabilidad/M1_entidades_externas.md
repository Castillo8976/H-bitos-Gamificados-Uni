# Tabla 1 — Entidades Externas → RF, CU, DCA

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.1 Artefactos de Trazabilidad

> Esta matriz verifica que cada entidad externa identificada en el Diagrama de Contexto Arquitectónico (DCA) esté cubierta por al menos un Requisito Funcional y un Caso de Uso.

---

| Entidad externa | Tipo | RF asociado | CU asociado | Rol en el DCA |
|---|---|---|---|---|
| Estudiante / Persona con disc. física | Usuario principal | RF01–RF15 | CU01–CU10 | Actor central que interactúa con todos los módulos del sistema |
| Usuario registrado | Usuario secundario | RF02, RF09, RF11, RF13, RF14 | CU02, CU05, CU07, CU08, CU09 | Actor con acceso a funciones de gestión y configuración |
| Colaborador | Entidad par | RF06, RF08, RF15 | CU06 | Proveedor de retos, frases y contenido motivacional |
| Revisor institucional | Sistema superior | RF11 | CU05 | Acceso de solo lectura a reportes de progreso grupales |
| Administrador del sistema | Sistema superior | RF01, RF05, RF06, RNF12 | — | Control total: cuentas, gamificación, seguridad |
| Notifications API del navegador | Sistema subordinado | RF04, RNF15 | CU10 | Dispara alertas locales sin servidor. Entrada: permiso. Salida: alerta |
| localStorage del navegador | Sistema subordinado | RF14, RNF01, RNF04 | CU09 | Persiste todos los datos del sistema. Sin red requerida |
