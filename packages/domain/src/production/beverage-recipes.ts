/** Configuración espresso bar (SCA CSP: 18 g dosis · 25–35 ml rendimiento por shot). */
export interface EspressoBaseConfig {
  coffeeGrams: number;
  waterMl: number;
}

export type BeverageIngredientKind =
  | "coffee"
  | "milk"
  | "water"
  | "ice"
  | "iceCream"
  | "lemonJuice"
  | "soda"
  | "tonic"
  | "chocolate"
  | "sugar";

export interface BeverageRecipeLineSpec {
  kind: BeverageIngredientKind;
  quantity: number;
  unit: "g" | "ml" | "unit";
}

export interface BeverageCatalogSpec {
  usesEspressoBase?: boolean;
  espressoShots?: number;
  coffeeGrams?: number;
  waterMl?: number;
  extraWaterMl?: number;
  milkMl?: number;
  iceGrams?: number;
  iceCreamUnits?: number;
  lemonJuiceMl?: number;
  sodaMl?: number;
  tonicMl?: number;
  chocolateGrams?: number;
  sugarGrams?: number;
  kind?: "espresso_bar" | "cold" | "brew_method" | "other";
}

export interface ResolvedBeverageAmounts {
  coffeeGrams: number;
  waterMl: number;
  milkMl: number;
  iceGrams: number;
  iceCreamUnits: number;
  lemonJuiceMl: number;
  sodaMl: number;
  tonicMl: number;
  chocolateGrams: number;
  sugarGrams: number;
}

/** Agua de preparación de café = red/llave; no se descuenta botella de inventario. */
export function usesTapWaterForCoffeePrep(
  spec: Pick<BeverageCatalogSpec, "usesEspressoBase" | "kind" | "coffeeGrams">,
): boolean {
  if (spec.usesEspressoBase) {
    return true;
  }
  if (spec.kind === "brew_method") {
    return true;
  }
  if ((spec.coffeeGrams ?? 0) > 0) {
    return true;
  }
  return false;
}

export function resolveBeverageAmounts(
  spec: BeverageCatalogSpec,
  base: EspressoBaseConfig,
): ResolvedBeverageAmounts {
  if (spec.usesEspressoBase) {
    const shots = spec.espressoShots ?? 1;
    return {
      coffeeGrams: base.coffeeGrams * shots,
      waterMl: base.waterMl * shots + (spec.extraWaterMl ?? 0),
      milkMl: spec.milkMl ?? 0,
      iceGrams: spec.iceGrams ?? 0,
      iceCreamUnits: spec.iceCreamUnits ?? 0,
      lemonJuiceMl: spec.lemonJuiceMl ?? 0,
      sodaMl: spec.sodaMl ?? 0,
      tonicMl: spec.tonicMl ?? 0,
      chocolateGrams: spec.chocolateGrams ?? 0,
      sugarGrams: spec.sugarGrams ?? 0,
    };
  }

  return {
    coffeeGrams: spec.coffeeGrams ?? 0,
    waterMl: spec.waterMl ?? 0,
    milkMl: spec.milkMl ?? 0,
    iceGrams: spec.iceGrams ?? 0,
    iceCreamUnits: spec.iceCreamUnits ?? 0,
    lemonJuiceMl: spec.lemonJuiceMl ?? 0,
    sodaMl: spec.sodaMl ?? 0,
    tonicMl: spec.tonicMl ?? 0,
    chocolateGrams: spec.chocolateGrams ?? 0,
    sugarGrams: spec.sugarGrams ?? 0,
  };
}

/** Líneas abstractas de receta para mapear a inventario. */
export function buildBeverageRecipeLineSpecs(
  spec: BeverageCatalogSpec,
  base: EspressoBaseConfig,
): BeverageRecipeLineSpec[] {
  const amounts = resolveBeverageAmounts(spec, base);
  const lines: BeverageRecipeLineSpec[] = [];

  if (amounts.coffeeGrams > 0) {
    lines.push({ kind: "coffee", quantity: amounts.coffeeGrams, unit: "g" });
  }

  if (amounts.waterMl > 0 && !usesTapWaterForCoffeePrep(spec)) {
    lines.push({ kind: "water", quantity: amounts.waterMl, unit: "ml" });
  }

  if (amounts.milkMl > 0) {
    lines.push({ kind: "milk", quantity: amounts.milkMl, unit: "ml" });
  }

  if (amounts.iceGrams > 0) {
    lines.push({ kind: "ice", quantity: amounts.iceGrams, unit: "g" });
  }

  if (amounts.iceCreamUnits > 0) {
    lines.push({ kind: "iceCream", quantity: amounts.iceCreamUnits, unit: "unit" });
  }

  if (amounts.lemonJuiceMl > 0) {
    lines.push({ kind: "lemonJuice", quantity: amounts.lemonJuiceMl, unit: "ml" });
  }

  if (amounts.sodaMl > 0) {
    lines.push({ kind: "soda", quantity: amounts.sodaMl, unit: "ml" });
  }

  if (amounts.tonicMl > 0) {
    lines.push({ kind: "tonic", quantity: amounts.tonicMl, unit: "ml" });
  }

  if (amounts.chocolateGrams > 0) {
    lines.push({ kind: "chocolate", quantity: amounts.chocolateGrams, unit: "g" });
  }

  if (amounts.sugarGrams > 0) {
    lines.push({ kind: "sugar", quantity: amounts.sugarGrams, unit: "g" });
  }

  return lines;
}
