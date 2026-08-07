import { describe, expect, it } from "vitest";

import {
  buildBeverageRecipeLineSpecs,
  resolveBeverageAmounts,
  usesTapWaterForCoffeePrep,
} from "./beverage-recipes.js";

const GHOST_ESPRESSO_BASE = { coffeeGrams: 18, waterMl: 30 };

describe("beverage-recipes", () => {
  it("espresso SCA: 18 g y 30 ml rendimiento por shot", () => {
    const amounts = resolveBeverageAmounts({ usesEspressoBase: true }, GHOST_ESPRESSO_BASE);
    expect(amounts.coffeeGrams).toBe(18);
    expect(amounts.waterMl).toBe(30);
  });

  it("doble espresso escala dosis y rendimiento", () => {
    const amounts = resolveBeverageAmounts(
      { usesEspressoBase: true, espressoShots: 2 },
      GHOST_ESPRESSO_BASE,
    );
    expect(amounts.coffeeGrams).toBe(36);
    expect(amounts.waterMl).toBe(60);
  });

  it("americano SCA: ~180 ml (30 ml espresso + 150 ml agua caliente)", () => {
    const amounts = resolveBeverageAmounts(
      { usesEspressoBase: true, extraWaterMl: 150 },
      GHOST_ESPRESSO_BASE,
    );
    expect(amounts.waterMl).toBe(180);
  });

  it("flat white SCA: doble shot + leche", () => {
    const lines = buildBeverageRecipeLineSpecs(
      { usesEspressoBase: true, espressoShots: 2, milkMl: 130, kind: "espresso_bar" },
      GHOST_ESPRESSO_BASE,
    );
    expect(lines).toContainEqual({ kind: "coffee", quantity: 36, unit: "g" });
    expect(lines).toContainEqual({ kind: "milk", quantity: 130, unit: "ml" });
  });

  it("no descuenta agua embotellada en métodos con agua de red", () => {
    expect(usesTapWaterForCoffeePrep({ usesEspressoBase: true })).toBe(true);
    expect(usesTapWaterForCoffeePrep({ kind: "brew_method", coffeeGrams: 18 })).toBe(true);
    expect(usesTapWaterForCoffeePrep({ kind: "other", waterMl: 200 })).toBe(false);
  });

  it("iced latte incluye hielo", () => {
    const lines = buildBeverageRecipeLineSpecs(
      {
        usesEspressoBase: true,
        milkMl: 160,
        iceGrams: 120,
        kind: "cold",
      },
      GHOST_ESPRESSO_BASE,
    );
    expect(lines).toContainEqual({ kind: "ice", quantity: 120, unit: "g" });
  });
});
