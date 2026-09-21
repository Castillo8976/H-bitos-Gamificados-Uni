# Control visual del frontend StudyQuest

> Registro histórico de comprobaciones visuales parciales. Las rutas `/tmp`
> no son evidencia versionada ni aprobación del equipo. En esta integración
> volvió a pasar `tests/frontend/browser.test.js`; los pendientes funcionales
> y de correspondencia exacta con prototipos están en M17. Las expresiones
> «aprobada» y «passed» de las iteraciones describen sus pruebas, no el cierre
> académico de Diseño, Construcción o Línea Base 1.

## Artefactos comparados

- **Fuente visual:** `pjc/docs/diseno/drawio/W01_Login.drawio`,
  `W02_Dashboard.drawio`, `W03_ListaTareas.drawio` y la especificación textual
  `pjc/docs/diseno/fase4-interfaz/entregable_16_wireframes.md`.
- **Implementación:** servidor local Express renderizado por Google Chrome 151.
- **Capturas de implementación:**
  `/tmp/studyquest-ui-ShsBv3/login-desktop.png`,
  `dashboard-desktop.png`, `tareas-desktop.png`,
  `configuracion-oscura-desktop.png` y `dashboard-mobile.png`.
- **Comparación conjunta:**
  `/tmp/studyquest-ui-ShsBv3/comparacion-dashboard-final.png`.

## Normalización

- Escritorio: viewport CSS `1440 × 1000`, captura `1440 × 1000` píxeles,
  densidad `1`.
- Móvil: viewport CSS `390 × 844`, captura `390 × 844` píxeles, densidad `1`.
- Las capturas no incluyen marco de dispositivo ni interfaz del navegador.
- Estado comparado: Estudiante autenticado, tema claro para W02/W03 y tema
  teal oscuro para la comprobación de W06.

## Evidencia de vista completa

- W01 conserva marca, correo, contraseña, acción principal, acceso al registro y
  zona de retroalimentación.
- W02 conserva bienvenida, métricas de puntos/nivel/tareas, tareas próximas,
  inicio de Pomodoro y navegación inferior.
- W03 conserva búsqueda, filtros, prioridad, estado y acciones de completar,
  editar y eliminar.
- W06 aplica el tema y modo oscuro en toda la interfaz sin perder contraste ni
  legibilidad.
- En `390 px`, `documentElement.scrollWidth` y `window.innerWidth` reportaron
  exactamente `390 px`: no existe desplazamiento horizontal de página.

No se requirió un recorte adicional: los formularios, etiquetas, controles y
textos evaluados son legibles en las capturas originales a densidad 1.

## Superficies de fidelidad

- **Tipografía:** se usa la familia aprobada `Inter / Arial`, con Arial como
  fuente disponible; títulos, datos, etiquetas y texto auxiliar conservan una
  jerarquía distinguible y tamaño mínimo de 14 px en controles.
- **Espaciado y composición:** tarjetas, bloques, márgenes y navegación siguen
  la organización de W01–W06. Las rejillas pasan a una columna en móvil.
- **Colores:** se usan los tokens aprobados violeta, teal, ámbar, coral, azul,
  gris claro y carbón. Los estados de prioridad no dependen únicamente del
  color porque también muestran texto.
- **Imágenes y recursos:** los wireframes no exigen imágenes fotográficas ni un
  logotipo gráfico aprobado. No se introdujeron imágenes de relleno, SVG
  inventados ni emojis como sustitutos.
- **Contenido:** los nombres de pantallas, campos y acciones proceden de los
  wireframes. Las recompensas se presentan únicamente después de recibir el
  resultado transaccional real de la API.
- **Accesibilidad:** controles semánticos, etiquetas, foco visible, reducción de
  movimiento, mensajes con `aria-live` y objetivos táctiles de al menos 42 px.

## Interacciones comprobadas en Chrome

1. Registro con materia inicial y acceso automático.
2. Carga del dashboard con la cuenta autenticada.
3. Creación de una materia.
4. Creación de una tarea vinculada a la materia.
5. Marcado de la tarea como completada.
6. Cambio al tema teal y activación del modo oscuro.
7. Navegación inferior en escritorio y móvil.
8. Revisión de excepciones JavaScript: `0` errores de consola.
9. P11 y P14 para estadísticas y exportación del Estudiante.
10. P15–P17 para administración de cuentas, catálogos y correcciones.
11. P18 para el Revisor institucional, sin navegación de escritura.
12. Adaptación de las nuevas vistas a `390 × 844`: sin desbordamiento horizontal.

## Historial de comparación

### Iteración 1 — bloqueada

- **[P2] Confirmaciones acumuladas:** varias acciones rápidas apilaban avisos y
  cubrían la cabecera y gran parte de la vista móvil.
  - Corrección: `avisar()` reemplaza la confirmación anterior y en móvil la
    ubica sobre la navegación inferior.
- **[P2] Navegación distinta de W02/W03:** se utilizaba una barra lateral.
  - Corrección: se convirtió en una barra inferior persistente, adaptable y con
    desplazamiento horizontal para los módulos adicionales.
- **[P3] Correo de prueba excepcionalmente largo:** se divide en varias líneas
  en el perfil. Se acepta porque no desborda la tarjeta y corresponde a datos
  dinámicos artificialmente largos de la prueba.

### Iteración 2 — aprobada

- Las confirmaciones ya no se acumulan.
- La navegación coincide con la ubicación aprobada.
- Escritorio y móvil conservan jerarquía, acciones visibles y ancho correcto.
- No quedan hallazgos P0, P1 o P2.

### Iteración 3 — objetivos 6–10 aprobados

- `tests/frontend/browser.test.js` inició Chrome con una base temporal.
- Se autenticaron consecutivamente Estudiante, Administrador y Revisor.
- Se comprobaron las vistas permitidas y ocultas para cada rol.
- P11 y P18 cargaron indicadores reales desde la API.
- Chrome reportó cero excepciones y cero mensajes `console.error`.
- En 390 px se mantuvo `scrollWidth <= innerWidth`.

## Seguimiento opcional

- P3: reemplazar el monograma textual `SQ` cuando el equipo apruebe un logotipo
  gráfico oficial.
- P3: crear un menú “Más” si el equipo prefiere evitar el desplazamiento
  horizontal de los ocho módulos en pantallas pequeñas.

final result: passed
