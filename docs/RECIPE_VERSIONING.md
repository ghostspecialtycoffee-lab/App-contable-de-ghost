# Recetas versionadas

> Parte de la plataforma AI-first — [PLATFORM_VISION.md](PLATFORM_VISION.md)

## Modelo

```
recipes/{recipeId}           ← cabecera (versión activa denormalizada)
  └── versions/{version}     ← histórico inmutable (v1, v2, v3…)

sales/{saleId}
  └── recipeSnapshots[]      ← receta congelada al momento de la venta
```

## Comportamiento

- Al guardar en **Costeo**, si cambian ingredientes o rendimiento → nueva versión
- Si el contenido es igual → no se crea versión duplicada
- Cada **venta** guarda `recipeSnapshots` con líneas, costo y número de versión
- El consumo de inventario usa el snapshot de la venta, no la receta actual

## Código

| Pieza | Ruta |
|-------|------|
| Dominio | `packages/domain/src/production/recipe-version.ts` |
| Guardar | `apps/web/src/lib/recipes/recipes-client.ts` |
| Snapshot venta | `apps/web/src/lib/recipes/sale-recipe-snapshots.ts` |
| POS | `apps/web/src/lib/pos/pos-client.ts` |

## Migración

Recetas existentes sin `currentVersion` se tratan como **v1** en lectura. La primera edición real crea `versions/1` (o incrementa si ya había cambios).
