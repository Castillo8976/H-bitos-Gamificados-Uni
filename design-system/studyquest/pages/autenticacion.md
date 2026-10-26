# Autenticación — diferencias respecto al maestro

> Pantallas: `#acceso` (login, registro, reenvío de verificación) y `#modal-codigo-correo` (verificación / MFA). Solo diferencias; el resto, `MASTER.md`.

## Carácter
Acceso de aplicación, no landing: formulario protagonista, marca discreta.

## Layout
- ≥1024px: dos columnas — panel de marca (izq., máx. 520px) y tarjeta de acceso (der., máx. 440px), centradas verticalmente.
- <1024px: solo la tarjeta; la marca se reduce a logotipo «SQ» + nombre sobre la tarjeta.
- Panel de marca: eyebrow, `h1` «StudyQuest», una frase y hasta 3 chips descriptivos. **Sin** botones, CTA, capturas ni testimonios.
- Sin barra superior ni navegación.

## Tipografía
- Único lugar con `h1`: `clamp(2rem, 4vw, 3rem)`.

## Formularios
- Pestañas Ingresar / Crear cuenta (`role="tablist"`, flechas izquierda/derecha).
- Botón de envío `.primario .ancho`; un solo primario por panel.
- Errores de credenciales genéricos («Correo o contraseña incorrectos»), sin revelar si la cuenta existe.
- Reenvío de verificación como `.enlace-boton` bajo el formulario, no como segundo bloque destacado.

## Código de verificación
- Input único de 6 dígitos, `--fs-xl`, `letter-spacing: .3em`, `tabular-nums`, `autocomplete="one-time-code"`.
- Botones: «Confirmar código» `.primario`; «Reenviar código» `.enlace-boton`; «Cancelar» `.secundario`.
