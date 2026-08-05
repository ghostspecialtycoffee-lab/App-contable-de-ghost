import type { CoTaxCategory, KitchenStation, MenuCategory } from "@ghost/domain";

/** Espresso base — Ghost bar (máquina 220 V, molino Quality, taza espresso). */
export const GHOST_ESPRESSO_BASE = {
  coffeeGrams: 18,
  waterMl: 40,
  /** Paquete Black Coffee: 5 lb ≈ 2268 g · referencia $145.000 neto/paq. */
  blackCoffeeBagGrams: 2268,
  blackCoffeeBagCostNet: 145_000,
  blackCoffeeSupplierHint: "Black Coffee",
} as const;

export type GhostBeverageKind = "espresso_bar" | "cold" | "brew_method" | "other";

export interface GhostBeverageSpec {
  name: string;
  price: number;
  category: MenuCategory;
  station: KitchenStation;
  saleTaxCategory: CoTaxCategory;
  kind: GhostBeverageKind;
  /** Si true, parte de 18 g café + 40 ml agua. */
  usesEspressoBase?: boolean;
  coffeeGrams?: number;
  waterMl?: number;
  extraWaterMl?: number;
  milkMl?: number;
  description?: string;
}

/** Carta Ghost Specialty Coffee (foto menú operativo). */
export const GHOST_BEVERAGE_CATALOG: GhostBeverageSpec[] = [
  // Columna espresso / calientes
  {
    name: "Espresso",
    price: 4500,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "espresso_bar",
    usesEspressoBase: true,
    description: "18 g café Black Coffee · 40 ml agua · taza espresso",
  },
  {
    name: "Americano",
    price: 6000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "espresso_bar",
    usesEspressoBase: true,
    extraWaterMl: 120,
    description: "Espresso + agua caliente",
  },
  {
    name: "Macciatto",
    price: 6500,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "espresso_bar",
    usesEspressoBase: true,
    milkMl: 15,
  },
  {
    name: "Cappuccino",
    price: 8000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "espresso_bar",
    usesEspressoBase: true,
    milkMl: 150,
  },
  {
    name: "Latte",
    price: 8000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "espresso_bar",
    usesEspressoBase: true,
    milkMl: 200,
  },
  {
    name: "Flatwhite",
    price: 8500,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "espresso_bar",
    usesEspressoBase: true,
    milkMl: 120,
  },
  {
    name: "Mocaccino",
    price: 9000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "espresso_bar",
    usesEspressoBase: true,
    milkMl: 150,
    description: "Espresso + leche + chocolate (cruzar insumo cuando esté en compras)",
  },
  {
    name: "Carajillo",
    price: 9000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "espresso_bar",
    usesEspressoBase: true,
    description: "Espresso + licor (cruzar insumo cuando esté en compras)",
  },
  {
    name: "Irlandes",
    price: 9500,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "espresso_bar",
    usesEspressoBase: true,
    description: "Espresso + whiskey + crema (cruzar insumos en compras)",
  },
  {
    name: "Dirty Chai",
    price: 9000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "espresso_bar",
    usesEspressoBase: true,
    description: "Espresso + chai (cruzar insumo cuando esté en compras)",
  },
  // Columna fríos / especiales
  {
    name: "Afogatto",
    price: 8500,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "cold",
    usesEspressoBase: true,
    description: "Espresso + helado (cruzar insumo cuando esté en compras)",
  },
  {
    name: "Iced Latte",
    price: 8500,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "cold",
    usesEspressoBase: true,
    milkMl: 200,
  },
  {
    name: "Espresso Tonic",
    price: 9000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "cold",
    usesEspressoBase: true,
    description: "Espresso + tónica (cruzar insumo cuando esté en compras)",
  },
  {
    name: "Colbrew",
    price: 8000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "cold",
    coffeeGrams: 20,
    waterMl: 200,
    description: "Cold brew — ajustar gramos según batch",
  },
  {
    name: "Colbrew Fusion",
    price: 9000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "cold",
    coffeeGrams: 20,
    waterMl: 200,
    milkMl: 80,
  },
  {
    name: "Granizado",
    price: 9000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "cold",
    usesEspressoBase: true,
    milkMl: 120,
  },
  {
    name: "Frappuccino",
    price: 9500,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "cold",
    usesEspressoBase: true,
    milkMl: 150,
  },
  {
    name: "Limonada",
    price: 7000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "other",
    waterMl: 250,
    description: "Limón + agua + endulzante (cruzar insumos en compras)",
  },
  {
    name: "Soda Italiana",
    price: 7500,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "other",
    waterMl: 200,
    description: "Jarabe + soda (cruzar insumos en compras)",
  },
  {
    name: "Malteada",
    price: 9000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "other",
    milkMl: 250,
    description: "Base láctea — cruzar insumos Kiuegi / compras",
  },
  // Métodos manuales
  {
    name: "Aeropress",
    price: 8000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "brew_method",
    coffeeGrams: 18,
    waterMl: 250,
  },
  {
    name: "V60",
    price: 8000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "brew_method",
    coffeeGrams: 18,
    waterMl: 300,
  },
  {
    name: "Prensa Francesa",
    price: 8500,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "brew_method",
    coffeeGrams: 18,
    waterMl: 350,
  },
  {
    name: "Chemex",
    price: 9000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "brew_method",
    coffeeGrams: 20,
    waterMl: 400,
  },
  {
    name: "Ufo",
    price: 9000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    kind: "brew_method",
    coffeeGrams: 18,
    waterMl: 300,
  },
];

export function normalizeCatalogName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function findCatalogSpec(productName: string): GhostBeverageSpec | undefined {
  const normalized = normalizeCatalogName(productName);
  return GHOST_BEVERAGE_CATALOG.find(
    (spec) => normalizeCatalogName(spec.name) === normalized,
  );
}

export function isCatalogBeverage(productName: string): boolean {
  return Boolean(findCatalogSpec(productName));
}
