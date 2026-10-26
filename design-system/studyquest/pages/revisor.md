# Revisor institucional — diferencias respecto al maestro

> Perfil: **Revisor institucional** (y Administrador en «Indicadores») · Vista: `#vista-institucional` · Solo diferencias; el resto, `MASTER.md`.

## Carácter
Informe institucional **de solo lectura**: sobrio, verificable, sin acciones de edición.

## Reglas de solo lectura
- Ningún botón `.primario` de creación/edición; la única acción principal es «Consultar» del filtro de periodo.
- Banda informativa fija bajo el encabezado (`--info-suave`, texto `--info`): «Vista de solo lectura · Datos agregados y anónimos».
- Nunca mostrar nombres, correos ni identificadores individuales.

## Layout
- Filtro de periodo (`.filtros-periodo`) en tarjeta superior; muestra el rango aplicado en texto bajo el filtro.
- Métricas en rejilla de 4 (2 en tablet, 1 en <400px); cada `.metrica` incluye unidad y periodo en `small`.
- Desgloses en tabla (maestro §5) con totales en `tfoot`.

## Navegación
- Grupo «Consulta» del sidebar: Resumen institucional · Indicadores. Mismo drawer que el maestro en <1024px.
- Chip de rol «Revisor institucional · Solo lectura» en el encabezado.

## Estados
- Sin datos en el periodo: `.estado-vacio` «No hay actividad registrada entre <desde> y <hasta>».
- Rango inválido: error en línea en el campo «Hasta».
