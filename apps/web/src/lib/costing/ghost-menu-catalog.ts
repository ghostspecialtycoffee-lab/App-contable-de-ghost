import type { CoTaxCategory, KitchenStation, MenuCategory } from "@ghost/domain";
import { needsBeverageAdvancedSetup } from "@ghost/domain";

import catalogData from "@/data/ghost-menu-catalog.json";

/** Espresso base — Ghost bar (máquina 220 V, molino Quality, taza espresso). */
export const GHOST_ESPRESSO_BASE = catalogData.espressoBase;

export type GhostBeverageKind = "espresso_bar" | "cold" | "brew_method" | "other";

export interface GhostBeverageSpec {
  name: string;
  price: number;
  category: MenuCategory;
  station: KitchenStation;
  saleTaxCategory: CoTaxCategory;
  kind: GhostBeverageKind;
  usesEspressoBase?: boolean;
  espressoShots?: number;
  coffeeGrams?: number;
  waterMl?: number;
  extraWaterMl?: number;
  milkMl?: number;
  description?: string;
  /** Bebida fuera del estándar SCA: requiere cuestionario en ficha de costos. */
  needsAdvancedSetup?: boolean;
}

/** Carta Ghost Specialty Coffee (foto menú operativo — Drive). */
export const GHOST_BEVERAGE_CATALOG = catalogData.beverages as GhostBeverageSpec[];

export const GHOST_MENU_SOURCE = catalogData.source;

export function normalizeCatalogName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

const PRODUCT_CATALOG_ALIASES: Record<string, string> = {
  espresso: "Espresso sencillo",
  macciatto: "Macchiato",
};

export function findCatalogSpec(productName: string): GhostBeverageSpec | undefined {
  const normalized = normalizeCatalogName(productName);
  const resolvedName = PRODUCT_CATALOG_ALIASES[normalized] ?? productName;
  return GHOST_BEVERAGE_CATALOG.find(
    (spec) => normalizeCatalogName(spec.name) === normalizeCatalogName(resolvedName),
  );
}

export function isCatalogBeverage(productName: string): boolean {
  return Boolean(findCatalogSpec(productName));
}

export function catalogNeedsAdvancedSetup(productName: string): boolean {
  const spec = findCatalogSpec(productName);
  if (spec?.needsAdvancedSetup) {
    return true;
  }
  return needsBeverageAdvancedSetup(productName);
}

/** Agua de preparación de café = red/llave; no se descuenta botella de inventario. */
export function usesTapWaterForCoffeePrep(
  spec: Pick<GhostBeverageSpec, "usesEspressoBase" | "kind" | "coffeeGrams">,
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
