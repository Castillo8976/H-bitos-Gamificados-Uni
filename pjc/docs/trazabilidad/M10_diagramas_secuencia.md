# Tabla 10 — Diagramas de Secuencia → CU, Clases, Flujos Alternativos

**Proyecto:** Plataforma Web Gamificada  
**Sección:** 9.10 Artefactos de Trazabilidad

> Esta matriz verifica que cada diagrama de secuencia cubra el flujo normal del caso de uso asociado, identifique sus participantes UML y documente al menos un flujo alternativo.

---

| Diagrama | CU modelado | Participantes UML | Flujo normal cubierto | Flujo alternativo cubierto |
|---|---|---|---|---|
| **Seq-01** Crear tarea y recordatorio | CU02 | `InterfazTareas`, `ModuloTareas`, `ModuloNotificaciones`, `Almacenamiento` | Ingresa datos → valida → guarda → programa recordatorio → confirma | A1: datos inválidos → error de validación sin guardar |
| **Seq-02** Completar tarea | CU03 | `InterfazTareas`, `ModuloTareas`, `ModuloRecompensas`, `Almacenamiento` | Marca tarea → actualiza estado → suma puntos → verifica insignia → muestra logro | A1: insignia ya obtenida → solo suma puntos sin animación |
| **Seq-03** Sesión Pomodoro | CU04 | `InterfazPomodoro`, `ModuloPomodoro`, `ModuloTareas`, `Almacenamiento` | Inicia cronómetro → ciclo focus/descanso → guarda sesión → actualiza estadísticas | A1: pausa manual → guarda tiempo parcial |
| **Seq-04** Consulta del Tablero de Avance Personal | CU05 | `InterfazTablero`, `ServicioEstadisticas`, `Almacenamiento` | Solicita tablero → calcula estadísticas en tiempo real (SUM/COUNT) → muestra dashboard, sin generar snapshot | A1: sin datos suficientes → muestra estado vacío informativo |
| **Seq-05** Desbloqueo de insignia | CU06 | `ModuloRecompensas`, `Almacenamiento`, `InterfazGamificación` | Verifica condición → desbloquea insignia → registra fecha → muestra modal de celebración | A1: condición no cumplida → actualiza contador de progreso |

---

## Notas de cobertura

- Los diagramas Seq-01 a Seq-03 cubren los flujos más críticos del sistema (gestión de tareas, recompensas y tiempo).
- Cada diagrama documenta mínimo 1 flujo alternativo verificando robustez ante errores o condiciones especiales.
- Los participantes de tipo `<<entity>>` corresponden a las clases del Diagrama de Clases y a las entidades de E7. Los participantes de tipo `<<boundary>>`, `<<control>>` y `<<database>>` representan responsabilidades arquitectónicas y no nuevas entidades persistentes.

## Clasificación de participantes y correspondencia

| Participante de secuencia | Tipo UML | Correspondencia documental |
|---|---|---|
| `InterfazTareas` | `<<boundary>>` | Pantallas P04 Lista de tareas y P05 Detalle/edición de tarea. |
| `ModuloTareas` | `<<control>>` | Coordina operaciones de `Tarea` y la programación de `Recordatorio`. |
| `ModuloNotificaciones` | `<<control>>` | Coordina `Recordatorio` y `Notificacion`; no es una tabla. |
| `InterfazPomodoro` | `<<boundary>>` | Pantalla P06 Pomodoro. |
| `ModuloPomodoro` | `<<control>>` | Coordina las operaciones de `SesionEstudio`. |
| `ModuloRecompensas` | `<<control>>` | Coordina `Punto`, `Insignia`, `CuentaInsignia`, `Reto` y `NivelCuenta`. |
| `InterfazTablero` | `<<boundary>>` | Pantallas P03 Dashboard y P11 Tablero. |
| `ServicioEstadisticas` | `<<control>>` | Calcula en tiempo real datos de `Tarea`, `SesionEstudio`, `Punto` y `Meta`, sin tabla `reporte`. |
| `InterfazGamificación` | `<<boundary>>` | Pantallas P08 Gamificación y P09 Insignias. |
| `Almacenamiento` | `<<database>>` | Persistencia de las 13 entidades definidas en E7; no es una clase de entidad adicional. |

Esta clasificación permite conservar los nombres conceptuales de los diagramas de secuencia sin confundirlos con clases persistentes. Cuando un mensaje consulta o modifica información, la entidad afectada debe corresponder a una de las 13 equivalencias documentadas en M9.

---

## Especificaciones textuales de secuencia por CRUD

Para completar la cobertura exigida por el checklist sin duplicar diagramas gráficos, las siguientes secuencias textuales documentan las operaciones de las 13 entidades de E7. Cada bloque conserva la estructura UML **actor → boundary → control → entity/database**, usa los métodos vigentes de `/src/crud` y registra sus alternativas. Los cinco Draw.io existentes (Seq-01 a Seq-05) continúan como representación visual de los flujos críticos; esta sección completa la trazabilidad CRUD que no aparece en esos cinco archivos.

### Seq-CRUD-01 — `Cuenta`

**Trazabilidad:** CU01, CU11, CU13 · RF01 · HU01, HU20, HU27 · RN01, RN02, RN21.

```text
Actor → InterfazCuenta <<boundary>>: selecciona crear / consultar / actualizar / desactivar
InterfazCuenta → ControlCuenta <<control>>: envía solicitud y datos
ControlCuenta → Cuenta <<entity>>: crearCuenta() / listarCuentas() / obtenerCuenta() / actualizarCuenta() / eliminarCuenta()
Cuenta → Almacenamiento <<database>>: INSERT / SELECT / UPDATE / desactivación controlada
Almacenamiento → InterfazCuenta: resultado de la operación
alt correo duplicado, contraseña inválida o cuenta ajena
  InterfazCuenta ← ControlCuenta: rechaza y muestra causa verificable
end
```

### Seq-CRUD-02 — `Materia`

**Trazabilidad:** CU01, CU13 · RF01, RF09 · HU01, HU16 · RN03, RN21.

```text
Actor → InterfazMaterias <<boundary>>: solicita crear / listar / consultar / editar / eliminar
InterfazMaterias → ControlMateria <<control>>: datos de materia e id_cuenta
ControlMateria → Materia <<entity>>: crearMateria() / listarMaterias() / obtenerMateria() / actualizarMateria() / eliminarMateria()
Materia → Almacenamiento <<database>>: persiste o consulta la materia
alt la materia no pertenece a la cuenta o no existe
  InterfazMaterias ← ControlMateria: acceso rechazado o registro no encontrado
end
```

### Seq-CRUD-03 — `Tarea`

**Trazabilidad:** CU02, CU03, CU07 · RF02, RF03, RF04, RF09 · HU02, HU03, HU09, HU19 · RN04–RN06, RN21.

```text
Actor → InterfazTareas <<boundary>>: solicita crear / listar / consultar / editar / completar / eliminar
InterfazTareas → ModuloTareas <<control>>: datos, filtros e identificadores
ModuloTareas → Tarea <<entity>>: crearTarea() / listarTareas() / obtenerTarea() / actualizarTarea() / completarTarea() / eliminarTarea()
Tarea → Almacenamiento <<database>>: INSERT / SELECT / UPDATE / DELETE
opt tarea creada con fecha de entrega
  ModuloTareas → Recordatorio <<entity>>: generarRecordatorioAutomatico()
end
alt fecha pasada, prioridad inválida, materia ajena o tarea inexistente
  InterfazTareas ← ModuloTareas: rechaza sin modificar datos
end
```

### Seq-CRUD-04 — `SesionEstudio`

**Trazabilidad:** CU04, CU12 · RF10, RF11, RF12 · HU10, HU21 · RN20, RN21.

```text
Actor → InterfazPomodoro <<boundary>>: solicita crear / listar / consultar / editar / eliminar sesión
InterfazPomodoro → ModuloPomodoro <<control>>: duración, modo_enfoque e id_tarea opcional
ModuloPomodoro → SesionEstudio <<entity>>: crearSesionEstudio() / listarSesionesEstudio() / obtenerSesionEstudio() / actualizarSesionEstudio() / eliminarSesionEstudio()
SesionEstudio → Almacenamiento <<database>>: persiste o consulta la sesión
opt consulta del tablero
  ModuloPomodoro → SesionEstudio: calcularHorasSemana()
end
alt duración <= 0 o tarea perteneciente a otra cuenta
  InterfazPomodoro ← ModuloPomodoro: rechaza la operación
end
```

### Seq-CRUD-05 — `Insignia`

**Trazabilidad:** CU06, CU13 · RF05 · HU05, HU22 · RN11, RN21.

```text
Administrador → InterfazGamificación <<boundary>>: mantiene catálogo de insignias
InterfazGamificación → ModuloRecompensas <<control>>: datos o identificador
ModuloRecompensas → Insignia <<entity>>: crearInsignia() / listarInsignias() / obtenerInsignia() / actualizarInsignia() / eliminarInsignia()
Insignia → Almacenamiento <<database>>: INSERT / SELECT / UPDATE / DELETE
opt inicialización del catálogo vacío
  ModuloRecompensas → Insignia: sembrarInsignias()
end
alt nombre o condición duplicados, o asignaciones existentes
  InterfazGamificación ← ModuloRecompensas: rechaza y conserva integridad
end
```

### Seq-CRUD-06 — `CuentaInsignia`

**Trazabilidad:** CU03, CU06, CU14 · RF05 · HU05, HU26 · RN11, RN21.

```text
Actor → ModuloRecompensas <<control>>: completa acción evaluable o solicita consulta/revocación
ModuloRecompensas → CuentaInsignia <<entity>>: evaluarInsignias() / desbloquearInsignia() / listarInsigniasDesbloqueadas() / tieneInsignia() / revocarInsignia()
CuentaInsignia → Almacenamiento <<database>>: INSERT / SELECT / DELETE sobre la asociación
alt la insignia ya está desbloqueada
  ModuloRecompensas ← CuentaInsignia: no duplica la PK compuesta
else revocación administrativa autorizada
  CuentaInsignia → Almacenamiento: DELETE de la asociación
end
```

`CuentaInsignia` no tiene actualización: crear equivale a desbloquear y eliminar equivale a revocar.

### Seq-CRUD-07 — `Punto`

**Trazabilidad:** CU03, CU05, CU06, CU14 · RF03, RF07, RF08 · HU03, HU07, HU26 · RN07–RN09, RN14, RN21.

```text
Actor/Sistema → ModuloRecompensas <<control>>: otorga, consulta o corrige puntos
ModuloRecompensas → Punto <<entity>>: otorgarPuntos() / listarPuntos() / obtenerPunto() / calcularTotalPuntos() / calcularPuntosSemana()
Punto → Almacenamiento <<database>>: INSERT o SELECT/SUM
alt cantidad <= 0
  ModuloRecompensas ← Punto: rechaza el movimiento
else corrección administrativa autorizada
  ModuloRecompensas → Punto: eliminarPunto()
  Punto → Almacenamiento: DELETE trazable
end
```

`Punto` es un ledger: no tiene actualización directa; una corrección autorizada elimina el movimiento incorrecto.

### Seq-CRUD-08 — `Reto`

**Trazabilidad:** CU06, CU13 · RF06 · HU06, HU18 · RN10, RN21.

```text
Actor → InterfazGamificación <<boundary>>: solicita crear / listar / consultar / actualizar / completar / eliminar reto
InterfazGamificación → ControlReto <<control>>: datos o identificador
ControlReto → Reto <<entity>>: crearReto() / listarRetos() / obtenerReto() / actualizarProgresoReto() / completarReto() / actualizarReto() / eliminarReto()
Reto → Almacenamiento <<database>>: persiste o consulta el reto
alt ya completado o existe otro reto para la misma cuenta y semana
  InterfazGamificación ← ControlReto: no duplica reto ni recompensa
end
```

### Seq-CRUD-09 — `Meta`

**Trazabilidad:** CU05 · RF15 · HU15, HU17 · RN12, RN13, RN21.

```text
Actor → InterfazTablero <<boundary>>: solicita crear / listar / consultar / actualizar / eliminar meta
InterfazTablero → ControlMeta <<control>>: datos o identificador
ControlMeta → Meta <<entity>>: crearMeta() / listarMetas() / obtenerMeta() / actualizarMeta() / eliminarMeta()
Meta → Almacenamiento <<database>>: persiste o consulta la meta
opt cambia el avance
  ControlMeta → Meta: actualizarProgresoMeta()
  Meta → Meta: si valor_actual >= valor_objetivo, cumplida = true
end
alt objetivo inválido o meta semanal duplicada
  InterfazTablero ← ControlMeta: rechaza sin alterar el historial
end
```

### Seq-CRUD-10 — `Recordatorio`

**Trazabilidad:** CU02, CU10 · RF04 · HU04, HU25 · RN05, RN06, RN18, RN19, RN21.

```text
Actor/Sistema → InterfazRecordatorios <<boundary>>: crea / lista / consulta / activa-desactiva / elimina
InterfazRecordatorios → ModuloNotificaciones <<control>>: datos o identificador
ModuloNotificaciones → Recordatorio <<entity>>: crearRecordatorio() / generarRecordatorioAutomatico() / listarRecordatorios() / obtenerRecordatorio() / toggleRecordatorio() / eliminarRecordatorio()
Recordatorio → Almacenamiento <<database>>: INSERT / SELECT / UPDATE / DELETE
opt llega fecha programada y aún no fue enviado
  ModuloNotificaciones → Recordatorio: marcarRecordatorioEnviado()
end
alt permiso del navegador denegado
  ModuloNotificaciones → Almacenamiento: conserva el recordatorio sin alerta nativa
end
```

### Seq-CRUD-11 — `PreferenciaVisual`

**Trazabilidad:** CU08 · RF13, RNF04 · HU01, HU13 · RN21.

```text
Actor → InterfazConfiguración <<boundary>>: consulta, guarda o restablece preferencias
InterfazConfiguración → ControlPreferencia <<control>>: tema, modo_oscuro y avatar
ControlPreferencia → PreferenciaVisual <<entity>>: crearPreferenciaVisual() / obtenerOCrearPreferenciaVisual() / obtenerPreferenciaVisual() / actualizarPreferenciaVisual()
PreferenciaVisual → Almacenamiento <<database>>: SELECT / INSERT automático / UPDATE
alt cuenta inexistente o acceso a preferencia ajena
  InterfazConfiguración ← ControlPreferencia: rechaza la operación
end
opt eliminación de la cuenta
  PreferenciaVisual → Almacenamiento: eliminarPreferenciaVisual() por cascada
end
```

No existe un botón de eliminación de preferencias: la eliminación ocurre en cascada con la cuenta.

### Seq-CRUD-12 — `NivelCuenta`

**Trazabilidad:** CU03, CU06, CU13 · RF07 · HU07, HU23 · RN09, RN15, RN21.

```text
Administrador → InterfazGamificación <<boundary>>: mantiene catálogo de niveles
InterfazGamificación → ModuloRecompensas <<control>>: datos o identificador
ModuloRecompensas → NivelCuenta <<entity>>: crearNivel() / listarNiveles() / obtenerNivel() / actualizarNivel() / eliminarNivel()
NivelCuenta → Almacenamiento <<database>>: INSERT / SELECT / UPDATE / DELETE
opt inicialización del catálogo vacío
  ModuloRecompensas → NivelCuenta: sembrarNiveles()
end
opt consulta del nivel de una cuenta
  ModuloRecompensas → Punto: calcularTotalPuntos()
  ModuloRecompensas → NivelCuenta: evaluarNivelCuenta(totalPuntos)
end
alt umbral negativo, orden inválido o nombre duplicado
  InterfazGamificación ← ModuloRecompensas: rechaza la modificación
end
```

### Seq-CRUD-13 — `Notificacion`

**Trazabilidad:** CU15 · RF04, RNF15 · HU24 · RN16, RN17, RN21.

```text
Actor/Sistema → InterfazNotificaciones <<boundary>>: genera / lista / cuenta / marca leída / elimina
InterfazNotificaciones → ModuloNotificaciones <<control>>: solicitud o evento del sistema
ModuloNotificaciones → Notificacion <<entity>>: crearNotificacion() / listarNotificaciones() / contarNotificacionesNoLeidas() / marcarNotificacionLeida() / marcarTodasLeidas() / eliminarNotificacion() / limpiarNotificacionesLeidas()
Notificacion → Almacenamiento <<database>>: INSERT / SELECT / UPDATE / DELETE
alt la notificación no pertenece a la cuenta o no existe
  InterfazNotificaciones ← ModuloNotificaciones: rechaza sin modificar datos
end
```

`Notificacion` es un mensaje interno generado por eventos; `Recordatorio` es una programación asociada con una tarea. Esta separación evita tratarlos como la misma entidad.

---

## Matriz de cobertura de secuencias CRUD

| Entidad | Crear | Consultar | Actualizar / acción equivalente | Eliminar / acción equivalente | Especificación |
|---|---|---|---|---|---|
| `cuenta` | Sí | Sí | Sí | Desactivar | Seq-CRUD-01 |
| `materia` | Sí | Sí | Sí | Sí | Seq-CRUD-02 |
| `tarea` | Sí | Sí | Editar / completar | Sí | Seq-CRUD-03 |
| `sesion_estudio` | Sí | Sí | Sí | Sí | Seq-CRUD-04 |
| `insignia` | Sí | Sí | Sí | Sí | Seq-CRUD-05 |
| `cuenta_insignia` | Desbloquear | Sí | No aplica | Revocar | Seq-CRUD-06 |
| `punto` | Otorgar | Sí | No aplica | Corrección autorizada | Seq-CRUD-07 |
| `reto` | Sí | Sí | Progreso / completar / editar | Sí | Seq-CRUD-08 |
| `meta` | Sí | Sí | Progreso / editar | Sí | Seq-CRUD-09 |
| `recordatorio` | Sí | Sí | Activar / desactivar / marcar enviado | Sí | Seq-CRUD-10 |
| `preferencia_visual` | Automática | Sí | Guardar / restablecer | En cascada | Seq-CRUD-11 |
| `nivel_cuenta` | Sí | Sí | Sí / evaluar nivel | Sí | Seq-CRUD-12 |
| `notificacion` | Automática | Sí | Marcar leída | Sí / limpiar leídas | Seq-CRUD-13 |

La cobertura contempla las excepciones de negocio aprobadas: no se inventan operaciones de actualización para `cuenta_insignia` o `punto`, ni botones de creación manual para `preferencia_visual` y `notificacion`.
