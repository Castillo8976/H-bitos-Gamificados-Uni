# StudyQuest — Sistema de diseño maestro

> **Lógica:** al construir una vista, revisar primero `pages/<perfil>.md`.
> Ese archivo solo contiene diferencias; todo lo demás se rige por este maestro.
> **Fuente de verdad técnica:** los tokens viven en `src/public/styles.css` (`:root`).
> Este documento usa sus mismos nombres; no crear variables paralelas en inglés.

**Proyecto:** StudyQuest · **Categoría:** EdTech SaaS — productividad académica gamificada
**Revisado:** 2026-10-26 con UI/UX Pro Max 2.15.0 (búsquedas `typography`, `style`).

---

## 1. Identidad

| Aspecto | Decisión |
|---|---|
| Estilo | **Data-Dense Dashboard** moderado sobre base **Minimal SaaS**: superficies blancas, bordes finos, sombras suaves, sin degradados decorativos. |
| Tono | Profesional, sobrio, motivador. La gamificación se expresa con datos (puntos, nivel, rachas, insignias), no con ilustraciones infantiles. |
| Color de marca | Violeta StudyQuest `#534ab7` (tema `purple`, por defecto). |
| Patrón de página | Aplicación con *shell* persistente (barra superior + navegación + contenido). **Prohibido**: Hero comercial, secciones de marketing, logos de clientes, CTA repetidos. |

### Recomendaciones automáticas descartadas

| Generador | Motivo | Sustituto |
|---|---|---|
| Flat Design puro | Elimina sombras/elevación que ordenan paneles densos | Minimal SaaS con `--sombra-1/2/3` |
| Turquesa primario | No es la identidad de StudyQuest | Violeta; teal sigue como tema opcional |
| Baloo 2 / Comic Neue | Infantil, mala lectura prolongada | Plus Jakarta Sans (§3) |
| Feature-Rich Showcase / Product Demo | Patrones de landing | Shell de aplicación (§6) |
| Admin Dark Mode OLED fijo | Rompe el selector de temas y el modo claro | Admin hereda tema y modo del usuario |

---

## 2. Colores semánticos

Los componentes **solo** consumen tokens semánticos; nunca hex directos.

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--primario` | `#534ab7` | `#c4bfff` | Acción principal, foco, nav activa |
| `--primario-fuerte` | `#4338a0` | `#ddd9ff` | Hover/pressed del primario |
| `--primario-suave` | `#eeedfe` | `#343054` | Fondos de selección, chips activos |
| `--sobre-primario` | `#ffffff` | `#171b24` | Texto sobre `--primario` |
| `--fondo` | `#f4f5f7` | `#141922` | Lienzo de página |
| `--superficie` | `#ffffff` | `#1d2531` | Tarjetas, modales, barra superior |
| `--superficie-2` | `#f8f9fb` | `#252f3e` | Ítems anidados, cabecera de tabla, deshabilitado |
| `--texto` | `#202735` | `#f1f5fb` | Texto principal |
| `--texto-suave` | `#566174` | `#bbc6d6` | Etiquetas, ayudas, metadatos (≥4.5:1 en ambos modos) |
| `--borde` | `#d8dee8` | `#3d4a5d` | Separadores, contorno de tarjeta |
| `--borde-control` | `#788497` | `#8090a5` | Contorno de inputs (≥3:1 frente a superficie) |
| `--exito` / `-suave` | `#047857` / `#e4f5ee` | `#79e2b8` / `#173e34` | Confirmaciones, tareas completas |
| `--advertencia` / `-suave` | `#92400e` / `#fff3d6` | `#fcd48b` / `#47371e` | Avisos, prioridad media |
| `--error` / `-suave` | `#b42318` / `#fff0ed` | `#ffb4ab` / `#4a292c` | Errores, acciones destructivas |
| `--info` / `-suave` | `#185fa5` / `#e6f1fb` | `#a1cdff` / `#233b56` | Información neutra |
| `--logro` / `-suave` | `#92400e` / `#fff3d6` | `#fcd48b` / `#47371e` | Insignias, recompensas |
| `--progreso` / `-suave` | `#047857` / `#e4f5ee` | `#79e2b8` / `#173e34` | Barras de avance, rachas |
| `--nivel` / `-suave` | = primario | = primario | Nivel del estudiante |
| `--velo` | `rgb(15 23 42 / .65)` | igual | Fondo de modal |

Reglas:
- El estado nunca depende solo del color: siempre texto, icono o patrón (p. ej. «Alta» + borde rojo).
- Aliases existentes (`--positivo`, `--peligro`, `--ambar`, `--informacion`) se mantienen solo por compatibilidad; el código nuevo usa los nombres de la tabla.

---

## 3. Tipografía

- **Familia:** `"Plus Jakarta Sans", Inter, system-ui, -apple-system, "Segoe UI", Arial, sans-serif`
  (UI/UX Pro Max: *Friendly SaaS* — «SaaS, dashboards, B2B, productivity tools»).
- **Carga:** Google Fonts, pesos 400/500/600/700, `display=swap`. Si no carga, la pila de respaldo mantiene métricas legibles; no bloquear el render.
- **Cifras:** `font-variant-numeric: tabular-nums` en métricas, tablas, temporizador y puntos.

| Token | Valor | Uso |
|---|---|---|
| `--fs-xs` | 12px | Eyebrow, contador, pie de tabla |
| `--fs-sm` | 14px | Etiquetas, ayudas, celdas densas (mínimo para controles) |
| `--fs-base` | 16px | Cuerpo, inputs (evita zoom en iOS) |
| `--fs-lg` | 18px | Título de bloque (h3) |
| `--fs-xl` | 20px | Subtítulos de modal |
| `--fs-2xl` | 28px | Título de vista (h2) |
| `--fs-3xl` | 36px | Valor de métrica |

Pesos: 400 cuerpo · 500 etiquetas · 600 botones/nav · 700 títulos. Interlineado 1.5 cuerpo, 1.2 títulos. Longitud de línea de texto corrido ≤ 72ch. `h1` solo existe en autenticación.

---

## 4. Espaciado, tamaños y elevación

| Token | Valor | | Token | Valor |
|---|---|---|---|---|
| `--esp-1` | 4px | | `--esp-5` | 24px |
| `--esp-2` | 8px | | `--esp-6` | 32px |
| `--esp-3` | 12px | | `--esp-7` | 48px |
| `--esp-4` | 16px | | `--esp-8` | 64px |

- Retícula de 4px. Padding de tarjeta: `--esp-5` (densa: `--esp-4`). Separación entre tarjetas: `--esp-5`.
- **Objetivo táctil mínimo:** 44×44px en todo control interactivo.
- Radios: `--radio-sm` 6px (controles), `--radio-md` 10px (ítems), `--radio-lg` 16px (tarjetas, modales), `--radio-pill` (chips).
- Elevación: `--sombra-1` reposo de tarjeta · `--sombra-2` tarjeta destacada / dropdown · `--sombra-3` modal.
- Escala z-index: 10 barra superior · 12 navegación · 20 dropdown · 30 avisos · 50 modal.
- Ancho de contenido: `min(100%, 1280px)`.

---

## 5. Componentes

### Botones (`.boton`)
| Variante | Uso | Estilo |
|---|---|---|
| `.primario` | **Una** acción principal por vista o formulario | Fondo `--primario`, texto `--sobre-primario`, hover `--primario-fuerte` |
| `.secundario` | Acciones alternativas, Cancelar, Actualizar | Borde `--borde-control`, fondo superficie, hover `--primario-suave` |
| `.peligro` | Eliminar, desactivar, revocar | Fondo `--error-suave`, texto `--error`; hover invertido. Siempre con confirmación |
| `.enlace-boton` | Acciones terciarias en línea | Texto `--primario` subrayado |
- Tamaños: normal y `.pequeno` (ambos ≥44px de alto). `.ancho` para formularios de una columna.
- Estados: `:hover`, `:focus-visible`, `:active` (translateY 1px), `:disabled`, `aria-busy="true"` (spinner). Texto del botón = verbo + objeto («Guardar tarea»).

### Formularios (`.formulario`)
- Etiqueta visible encima del control (`<label>` envolvente). Nunca solo placeholder.
- Obligatorios: marca textual «Obligatorio» automática; opcionales con `.opcional`.
- Ayuda bajo el campo (`.ayuda-campo`, enlazada con `aria-describedby`); error en `.error-campo` + `aria-invalid="true"`.
- Validación al enviar y al salir del campo; no al teclear cada carácter.
- Una columna en móvil; `.formulario-rejilla` (2 columnas) solo ≥720px y para campos cortos relacionados.

### Tablas
- Cuando haya ≥3 atributos comparables por fila (usuarios, catálogos, indicadores), usar `<table>` semántica con `<caption>` (puede ser visualmente oculta) y `<th scope>`.
- Cabecera `--superficie-2`, `position: sticky`, `--fs-sm` peso 600. Filas de 44px mínimo; hover `--superficie-2`; números alineados a la derecha con `tabular-nums`.
- Contenedor con `overflow-x: auto` propio; la página nunca desborda.
- En <720px, filas pasan a tarjetas (`.item`) o la tabla conserva scroll horizontal local con la primera columna visible.
- Acciones de fila al final, agrupadas en `.acciones`; destructivas siempre `.peligro`.

### Tarjetas y listas
- `.tarjeta.bloque` = panel con título `h3` dentro de `.titulo-bloque`. Sin hover de elevación salvo que la tarjeta completa sea clicable.
- `.metrica`: etiqueta (`span`) → valor (`strong`, `--fs-3xl`) → contexto (`small`).
- `.item`: unidad de lista; prioridad con borde izquierdo de 4px + texto.
- `.estado-vacio`: frase de qué falta + una acción para resolverlo.

### Modales (`<dialog>`)
- Usar `<dialog>` nativo con `showModal()`; foco al primer control, `Esc` cierra, foco regresa al disparador.
- Ancho `min(92vw, 520px)`, `--radio-lg`, `--sombra-3`, fondo `::backdrop` `--velo`.
- Orden de botones: secundario (Cancelar) a la izquierda, principal/peligro a la derecha. Confirmaciones destructivas nombran el objeto afectado.

### Confirmaciones (reemplazan `window.confirm/prompt`)
- **Normal** (guardar, completar): sin diálogo; `aria-busy` + botón deshabilitado durante la petición; aviso de éxito solo tras respuesta 2xx; error visible con el mensaje del backend.
- **Destructiva** (eliminar, revocar): `<dialog>` que identifica el elemento, explica la operación y sus consecuencias, con Cancelar (foco inicial) y botón `.peligro` con verbo explícito.
- **Crítica** (desactivar cuenta, eliminar datos, correcciones de alto impacto): paso 1 contextual (datos reales del afectado + consecuencias) → paso 2 reforzado (escribir el correo o nombre exacto para habilitar el botón). Es una salvaguarda contra errores, **no** autenticación; si el backend exige contraseña, se envía y valida allí.
- Ninguna confirmación cambia el estado local hasta que el backend responde con éxito.

### Búsqueda, filtros y paginación
- Barra de herramientas sobre la lista: búsqueda (`type="search"`, debounce 250ms) · filtros como `select` compactos · contador «N resultados» (`aria-live="polite"`) · acción principal a la derecha.
- Paginación: «Anterior / Siguiente», «Página X de Y» y tamaño 10/20/50. Al cambiar filtro vuelve a la página 1.
- Formularios de alta/edición se abren en panel contextual o `<dialog>` al pulsar la acción; no quedan abiertos permanentemente.

### Feedback
- **Avisos** (`#avisos`, `aria-live="polite"`): éxito/info 4s, errores persisten hasta cerrar. Errores críticos de formulario además en línea.
- **Carga:** `aria-busy` en botones; esqueleto o texto «Cargando…» en listas; nunca pantalla en blanco.
- **Recompensas** (`#modal-recompensa`): sobrias — título, puntos ganados, nivel; sin confeti ni sonido. Respetan `prefers-reduced-motion`.
- Mensajes de error dicen qué pasó y cómo seguir; nunca códigos crudos ni trazas.

### Iconos
- SVG en línea de un único set (Lucide, trazo 1.75–2px, 20px). **Sin emojis como iconos.** Icono decorativo: `aria-hidden="true"`; botón solo-icono: `aria-label`.

---

## 6. Navegación

- **Shell:** encabezado superior compacto sticky (56px: botón de menú, título de vista, notificaciones, chip de rol, usuario, Cerrar sesión) + sidebar + `<main id="contenido">`.
- **≥1024px — sidebar contraíble:** 248px expandida / 72px contraída (solo iconos, con `title` y `aria-label`). Botón de contraer con `aria-expanded` y `aria-controls`; preferencia guardada en `localStorage` (try/catch). Logotipo arriba, grupos con encabezado `--fs-xs` según rol. El contenido se adapta al ancho restante.
- **<1024px — drawer:** botón hamburguesa (`aria-expanded`, `aria-controls`, `aria-label="Abrir menú"`) abre la misma sidebar como panel lateral de 280px sobre fondo `--velo`. Al abrir: foco al primer ítem, foco atrapado dentro, `body` sin scroll. Cierra con Escape, clic en el fondo, botón cerrar y al elegir un destino; el foco regresa a la hamburguesa.
- **Prohibido:** barras de navegación flotantes o fijas inferiores que cubran contenido o formularios.
- Ítem activo: `aria-current="page"`, fondo `--primario-suave`, texto `--primario`, peso 600, barra izquierda de 3px.
- Visibilidad por `data-roles`. **Ocultar no autoriza**: el backend valida siempre.
- Cada vista inicia con `.encabezado-vista`: eyebrow (contexto) + `h2` + acción principal opcional a la derecha. Códigos internos de requisitos (P15, RF13…) no se muestran al usuario.

---

## 7. Accesibilidad (WCAG 2.2 AA)

- Contraste texto ≥4.5:1 (≥3:1 para texto ≥24px y bordes de control) en **cada** combinación tema × modo.
- Foco visible: `outline: 3px solid var(--primario); outline-offset: 3px`. Nunca `outline: none` sin sustituto.
- Orden de tabulación = orden visual. `role="tablist"` con flechas en pestañas.
- `lang="es"`, un `h1` por pantalla, jerarquía sin saltos.
- `prefers-reduced-motion: reduce` → animaciones y transiciones ≤0.01ms.
- Zoom 200% sin pérdida de contenido ni scroll horizontal.

---

## 8. Responsive

| Punto | Comportamiento |
|---|---|
| 375–719px | Una columna, drawer, métricas 2×2 (1 col <400px), formularios 1 col, tablas → tarjetas, padding lateral 16px |
| 720–1023px | Métricas 2–4 col, formularios de 2 col permitidos, drawer |
| 1024–1439px | Sidebar contraíble, rejillas de 2 columnas para paneles |
| ≥1440px | Contenido máx. 1280px centrado |

Verificar siempre `document.documentElement.scrollWidth === innerWidth` a 390px.

---

## 9. Modo oscuro y temas

- **Modo oscuro:** clase `html.modo-oscuro` + `color-scheme: dark`. Redefine solo tokens; los componentes no tienen reglas específicas de modo.
- **Temas** (`html[data-tema]`): `purple` (por defecto), `teal`, `amber`, `coral`, `blue`, `green`. Cada tema redefine **solo** `--primario`, `--primario-fuerte`, `--primario-suave`, con variante clara y oscura.
- Los colores de estado (`--exito`, `--error`…) **no** cambian con el tema.
- Todo componente nuevo se prueba en: purple claro, purple oscuro y al menos un tema alternativo en ambos modos.
- La preferencia persiste por usuario (configuración existente); los perfiles Administrador y Revisor la heredan.

---

## 10. Antipatrones

- Hero comercial, testimonios, precios, CTA repetidos.
- Emojis o ilustraciones infantiles como iconografía.
- Hex directos en componentes; variables en inglés duplicando las existentes.
- Hover que desplaza el layout (`scale`), transiciones >300ms.
- Más de una acción `.primario` por bloque.
- Datos personales en vistas institucionales.

## 11. Checklist de entrega

- [ ] Solo tokens de §2; sin hex nuevos.
- [ ] Plus Jakarta Sans con respaldo; cifras tabulares.
- [ ] Controles ≥44px, foco visible, sin emojis.
- [ ] Probado en 390px, 768px, 1024px, 1440px sin scroll horizontal.
- [ ] Probado en purple claro/oscuro + un tema alternativo.
- [ ] `prefers-reduced-motion` respetado.
- [ ] IDs, `name`, `data-vista`, `data-roles` y contratos de `app.js` intactos.
