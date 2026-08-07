import type { BaseUnit, InventoryItemType, MenuCategory, RecipeLineInput } from "@ghost/domain";
import {
  buildBeverageRecipeLineSpecs,
  resolveRecipeYieldQuantity,
  suggestRecipeYieldForProduct,
  type BeverageIngredientKind,
  type BeverageRecipeLineSpec,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import {
  findCatalogSpec,
  GHOST_BEVERAGE_CATALOG,
  GHOST_ESPRESSO_BASE,
  isCatalogBeverage,
  normalizeCatalogName,
  type GhostBeverageSpec,
} from "@/lib/costing/ghost-menu-catalog";
import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";
import { createMenuProductClient } from "@/lib/pos/pos-client";
import { saveRecipeClient } from "@/lib/recipes/recipes-client";

const MILK_BOTTLE_ML = 1000;
const WATER_BOTTLE_ML = 600;
const ICE_BAG_GRAMS = 5000;
const LEMON_JUICE_BOTTLE_ML = 250;
const SODA_UNIT_ML = 350;

type InventoryRow = {
  id: string;
  name: string;
  type: InventoryItemType;
  baseUnit: BaseUnit;
  averageCost: number;
  presentationQuantity?: number;
};

type MenuProductRow = {
  id: string;
  name: string;
  category: MenuCategory;
};

type RecipeRow = {
  menuProductId: string;
  lines: RecipeLineInput[];
  yieldQuantity?: number;
};

export interface SeedCostMatrixResult {
  productsCreated: number;
  recipesCreated: number;
  recipesUpdated: number;
  recipesSkipped: number;
  warnings: string[];
}

function pickBestItem(
  items: InventoryRow[],
  matcher: (item: InventoryRow) => boolean,
  scorer: (item: InventoryRow) => number,
): InventoryRow | null {
  const candidates = items.filter(matcher);
  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => scorer(right) - scorer(left))[0] ?? null;
}

function scoreBlackCoffeeItem(item: InventoryRow): number {
  let score = 0;
  const name = normalizeCatalogName(item.name);

  if (item.type === "raw_material") {
    score += 10;
  }
  if (/paq.*caf|caf.*paq/.test(name)) {
    score += 8;
  }
  if (/marbella|competencia/.test(name)) {
    score -= 20;
  }
  if (/regional|2\.?5|2500|5 lb|5lb|libra/.test(name)) {
    score += 4;
  }
  if (item.averageCost >= 120_000 && item.averageCost <= 160_000) {
    score += 6;
  } else if (item.averageCost > 0) {
    score += 2;
  }

  return score;
}

function scoreMilkItem(item: InventoryRow): number {
  let score = 0;
  const name = normalizeCatalogName(item.name);

  if (/leche entera/.test(name)) {
    score += 12;
  } else if (/leche colanta/.test(name)) {
    score += 8;
  } else if (/leche/.test(name)) {
    score += 4;
  }
  if (/deslactosada|condensada|polvo/.test(name)) {
    score -= 10;
  }
  if (item.averageCost > 0) {
    score += 3;
  }

  return score;
}

function scoreWaterItem(item: InventoryRow): number {
  let score = 0;
  const name = normalizeCatalogName(item.name);

  if (/agua manantial|agua brisa|agua cristal/.test(name)) {
    score += 10;
  } else if (/agua/.test(name)) {
    score += 5;
  }
  if (/600|600ml/.test(name)) {
    score += 3;
  }
  if (item.averageCost > 0) {
    score += 2;
  }

  return score;
}

function findBlackCoffeeItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(
    items,
    (item) => /caf|cafe|coffee/i.test(item.name),
    scoreBlackCoffeeItem,
  );
}

function findMilkItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(items, (item) => /leche/i.test(item.name), scoreMilkItem);
}

function findWaterItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(items, (item) => /agua/i.test(item.name), scoreWaterItem);
}

function scoreIceItem(item: InventoryRow): number {
  let score = 0;
  const name = normalizeCatalogName(item.name);
  if (/hielo kolbitos/.test(name)) {
    score += 12;
  } else if (/hielo/.test(name)) {
    score += 8;
  }
  if (item.averageCost > 0) {
    score += 2;
  }
  return score;
}

function findIceItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(items, (item) => /hielo/i.test(item.name), scoreIceItem);
}

function findIceCreamItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(
    items,
    (item) => /helado/i.test(item.name),
    (item) => (/vainilla/.test(normalizeCatalogName(item.name)) ? 10 : 5) + (item.averageCost > 0 ? 2 : 0),
  );
}

function findLemonJuiceItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(
    items,
    (item) => /jugo de limon|limon tahiti/i.test(normalizeCatalogName(item.name)),
    (item) => (/jugo de limon/.test(normalizeCatalogName(item.name)) ? 10 : 6) + (item.averageCost > 0 ? 2 : 0),
  );
}

function findSodaItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(
    items,
    (item) => /soda izots|gaseosa.*soda|tonica|isotonica/i.test(normalizeCatalogName(item.name)),
    (item) => {
      const name = normalizeCatalogName(item.name);
      if (/soda izots/.test(name)) return 12;
      if (/isotonica/.test(name)) return 8;
      return 5;
    },
  );
}

function findChocolateItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(
    items,
    (item) => /chocolate|cacao|cacao en polvo/i.test(normalizeCatalogName(item.name)),
    (item) => (item.type === "raw_material" ? 8 : 4) + (item.averageCost > 0 ? 2 : 0),
  );
}

function findSugarItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(
    items,
    (item) => /azucar/i.test(normalizeCatalogName(item.name)),
    (item) => (item.averageCost > 0 ? 5 : 2),
  );
}

function coffeeBagGramsForItem(item: InventoryRow): number {
  if (
    item.presentationQuantity &&
    item.presentationQuantity > 500 &&
    item.presentationQuantity <= 10000
  ) {
    return item.presentationQuantity;
  }
  return GHOST_ESPRESSO_BASE.blackCoffeeBagGrams;
}

function bottleMlForItem(item: InventoryRow, fallback: number): number {
  if (item.presentationQuantity && item.presentationQuantity >= 200) {
    return item.presentationQuantity;
  }
  if (/600|600ml/.test(normalizeCatalogName(item.name))) {
    return WATER_BOTTLE_ML;
  }
  if (/1000|1l|1 l|litro/.test(normalizeCatalogName(item.name))) {
    return MILK_BOTTLE_ML;
  }
  return fallback;
}

function weightPerBagUnit(item: InventoryRow): number {
  const name = normalizeCatalogName(item.name);
  if (/hielo/.test(name)) {
    return ICE_BAG_GRAMS;
  }
  return coffeeBagGramsForItem(item);
}

function buildGramLine(item: InventoryRow, grams: number): RecipeLineInput {
  if (item.baseUnit === "g") {
    return {
      inventoryItemId: item.id,
      itemName: item.name,
      quantity: grams,
      unit: "g",
    };
  }

  if (item.baseUnit === "kg") {
    return {
      inventoryItemId: item.id,
      itemName: item.name,
      quantity: grams / 1000,
      unit: "kg",
    };
  }

  const bagGrams = weightPerBagUnit(item);
  return {
    inventoryItemId: item.id,
    itemName: item.name,
    quantity: grams / bagGrams,
    unit: item.baseUnit === "bag" ? "bag" : "unit",
  };
}

function buildMilliliterLine(
  item: InventoryRow,
  milliliters: number,
  fallbackBottleMl: number,
): RecipeLineInput {
  if (item.baseUnit === "ml") {
    return {
      inventoryItemId: item.id,
      itemName: item.name,
      quantity: milliliters,
      unit: "ml",
    };
  }

  if (item.baseUnit === "l") {
    return {
      inventoryItemId: item.id,
      itemName: item.name,
      quantity: milliliters / 1000,
      unit: "l",
    };
  }

  const bottleMl = bottleMlForItem(item, fallbackBottleMl);
  return {
    inventoryItemId: item.id,
    itemName: item.name,
    quantity: milliliters / bottleMl,
    unit: "unit",
  };
}

function buildFinishedProductLine(item: InventoryRow): RecipeLineInput {
  return {
    inventoryItemId: item.id,
    itemName: item.name,
    quantity: 1,
    unit: item.baseUnit === "unit" ? "unit" : item.baseUnit,
  };
}

function findFinishedInventoryMatch(
  productName: string,
  items: InventoryRow[],
): InventoryRow | null {
  const normalizedProduct = normalizeCatalogName(productName);

  const exactFinished = items.find(
    (item) =>
      item.type === "finished_product" && normalizeCatalogName(item.name) === normalizedProduct,
  );
  if (exactFinished) {
    return exactFinished;
  }

  const exactAny = items.find((item) => normalizeCatalogName(item.name) === normalizedProduct);
  if (exactAny) {
    return exactAny;
  }

  const fuzzyFinished = items.find((item) => {
    if (item.type !== "finished_product") {
      return false;
    }
    const normalizedItem = normalizeCatalogName(item.name);
    return (
      normalizedItem.includes(normalizedProduct) || normalizedProduct.includes(normalizedItem)
    );
  });
  if (fuzzyFinished) {
    return fuzzyFinished;
  }

  return (
    items.find((item) => {
      const normalizedItem = normalizeCatalogName(item.name);
      return (
        normalizedItem.includes(normalizedProduct) || normalizedProduct.includes(normalizedItem)
      );
    }) ?? null
  );
}

function buildUnitLine(item: InventoryRow, units: number): RecipeLineInput {
  return {
    inventoryItemId: item.id,
    itemName: item.name,
    quantity: units,
    unit: item.baseUnit === "unit" ? "unit" : item.baseUnit,
  };
}

function mapBeverageLineToInventory(
  line: BeverageRecipeLineSpec,
  items: InventoryRow[],
  specName: string,
  warnings: string[],
): RecipeLineInput | null {
  const label = (kind: BeverageIngredientKind) => {
    const labels: Record<BeverageIngredientKind, string> = {
      coffee: "café",
      milk: "leche",
      water: "agua",
      ice: "hielo",
      iceCream: "helado",
      lemonJuice: "jugo de limón",
      soda: "soda",
      tonic: "tónica",
      chocolate: "chocolate",
      sugar: "azúcar",
    };
    return labels[kind];
  };

  switch (line.kind) {
    case "coffee": {
      const coffee = findBlackCoffeeItem(items);
      if (!coffee) {
        warnings.push(`Sin café Black Coffee para ${specName}.`);
        return null;
      }
      return buildGramLine(coffee, line.quantity);
    }
    case "milk": {
      const milk = findMilkItem(items);
      if (!milk) {
        warnings.push(`Sin leche en inventario para ${specName} (${line.quantity} ml).`);
        return null;
      }
      return buildMilliliterLine(milk, line.quantity, MILK_BOTTLE_ML);
    }
    case "water": {
      const water = findWaterItem(items);
      if (!water) {
        warnings.push(`Sin agua en inventario para ${specName} (${line.quantity} ml).`);
        return null;
      }
      return buildMilliliterLine(water, line.quantity, WATER_BOTTLE_ML);
    }
    case "ice": {
      const ice = findIceItem(items);
      if (!ice) {
        warnings.push(`Sin hielo en inventario para ${specName} (${line.quantity} g).`);
        return null;
      }
      return buildGramLine(ice, line.quantity);
    }
    case "iceCream": {
      const iceCream = findIceCreamItem(items);
      if (!iceCream) {
        warnings.push(`Sin helado en inventario para ${specName}.`);
        return null;
      }
      return buildUnitLine(iceCream, line.quantity);
    }
    case "lemonJuice": {
      const lemon = findLemonJuiceItem(items);
      if (!lemon) {
        warnings.push(`Sin jugo de limón para ${specName} (${line.quantity} ml).`);
        return null;
      }
      return buildMilliliterLine(lemon, line.quantity, LEMON_JUICE_BOTTLE_ML);
    }
    case "soda":
    case "tonic": {
      const soda = findSodaItem(items);
      if (!soda) {
        warnings.push(`Sin soda/tónica para ${specName} (${line.quantity} ml).`);
        return null;
      }
      return buildMilliliterLine(soda, line.quantity, SODA_UNIT_ML);
    }
    case "chocolate": {
      const chocolate = findChocolateItem(items);
      if (!chocolate) {
        warnings.push(
          `${specName}: falta chocolate en bodega (${line.quantity} g) — confirma insumo.`,
        );
        return null;
      }
      return buildGramLine(chocolate, line.quantity);
    }
    case "sugar": {
      const sugar = findSugarItem(items);
      if (!sugar) {
        warnings.push(`Sin azúcar para ${specName} (${line.quantity} g).`);
        return null;
      }
      return buildGramLine(sugar, line.quantity);
    }
    default:
      warnings.push(`${specName}: insumo ${label(line.kind)} no mapeado.`);
      return null;
  }
}

function buildCatalogRecipeLines(
  spec: GhostBeverageSpec,
  items: InventoryRow[],
  warnings: string[],
): RecipeLineInput[] | null {
  const lineSpecs = buildBeverageRecipeLineSpecs(spec, GHOST_ESPRESSO_BASE);
  const lines: RecipeLineInput[] = [];

  for (const lineSpec of lineSpecs) {
    const mapped = mapBeverageLineToInventory(lineSpec, items, spec.name, warnings);
    if (mapped) {
      lines.push(mapped);
    }
  }

  if (lines.length === 0) {
    warnings.push(
      `${spec.name}: sin insumos mapeados (${spec.description ?? "ver catálogo"}).`,
    );
    return null;
  }

  return lines;
}

function buildRecipeLinesForProduct(
  product: MenuProductRow,
  items: InventoryRow[],
  warnings: string[],
): RecipeLineInput[] | null {
  const catalogSpec = findCatalogSpec(product.name);
  if (catalogSpec) {
    return buildCatalogRecipeLines(catalogSpec, items, warnings);
  }

  const finishedMatch = findFinishedInventoryMatch(product.name, items);
  if (finishedMatch) {
    return [buildFinishedProductLine(finishedMatch)];
  }

  warnings.push(`No se encontró insumo para "${product.name}".`);
  return null;
}

async function loadInventoryItems(organizationId: string): Promise<InventoryRow[]> {
  const snapshot = await getDocs(
    collection(getFirestoreDb(), firestorePaths.organizationInventoryItems(organizationId)),
  );

  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      name: String(data.name ?? ""),
      type: (data.type ?? "raw_material") as InventoryItemType,
      baseUnit: (data.baseUnit ?? "unit") as BaseUnit,
      averageCost: Number(data.averageCost ?? data.lastCost ?? 0),
      presentationQuantity: data.presentationQuantity,
    };
  });
}

async function loadMenuProducts(organizationId: string): Promise<MenuProductRow[]> {
  const snapshot = await getDocs(
    query(
      collection(getFirestoreDb(), firestorePaths.organizationMenuProducts(organizationId)),
      where("status", "==", "active"),
    ),
  );

  return snapshot.docs.map((document) => ({
    id: document.id,
    name: String(document.data().name ?? ""),
    category: (document.data().category ?? "other") as MenuCategory,
  }));
}

async function loadRecipes(organizationId: string): Promise<RecipeRow[]> {
  const snapshot = await getDocs(
    collection(getFirestoreDb(), firestorePaths.organizationRecipes(organizationId)),
  );

  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      menuProductId: String(data.menuProductId ?? ""),
      lines: (data.lines ?? []) as RecipeLineInput[],
      yieldQuantity: Number(data.yieldQuantity ?? 1),
    };
  });
}

async function getOrganizationId(): Promise<string> {
  const uid = getFirebaseAuth().currentUser?.uid;
  if (!uid) {
    throw new Error("Debes iniciar sesión.");
  }

  const userSnap = await getDoc(doc(getFirestoreDb(), firestorePaths.user(uid)));
  if (!userSnap.exists()) {
    throw new Error("Perfil no encontrado. Completa el onboarding.");
  }

  const membership = (userSnap.data().memberships ?? []).find(
    (entry: { isActive?: boolean }) => entry.isActive,
  );
  if (!membership?.organizationId) {
    throw new Error("No hay organización activa.");
  }

  return membership.organizationId as string;
}

export async function seedCostMatrixClient(): Promise<SeedCostMatrixResult> {
  const organizationId = await getOrganizationId();

  const warnings: string[] = [];
  let productsCreated = 0;

  let products = await loadMenuProducts(organizationId);
  const existingNames = new Set(products.map((product) => normalizeCatalogName(product.name)));

  for (const [index, spec] of GHOST_BEVERAGE_CATALOG.entries()) {
    if (existingNames.has(normalizeCatalogName(spec.name))) {
      continue;
    }

    await createMenuProductClient({
      name: spec.name,
      price: spec.price,
      category: spec.category,
      station: spec.station,
      saleTaxCategory: spec.saleTaxCategory,
      description: spec.description ?? "Carta Ghost Specialty Coffee",
      sortOrder: index,
    });
    productsCreated += 1;
    existingNames.add(normalizeCatalogName(spec.name));
  }

  if (productsCreated > 0) {
    products = await loadMenuProducts(organizationId);
  }

  const inventoryItems = await loadInventoryItems(organizationId);
  if (inventoryItems.length === 0) {
    throw new Error("No hay insumos en inventario. Importa compras primero.");
  }

  const coffee = findBlackCoffeeItem(inventoryItems);
  if (!coffee) {
    warnings.push(
      "No se encontró Paq café Black Coffee en inventario. Confirma compras de Black Coffee (Ximena Polo).",
    );
  } else if (coffee.averageCost <= 0) {
    warnings.push(
      `El insumo "${coffee.name}" no tiene costo promedio. Confirma facturas Black Coffee ($145.000/paq 5 lb).`,
    );
  }

  const recipes = await loadRecipes(organizationId);
  const recipeByProductId = new Map(
    recipes.map((recipe) => [recipe.menuProductId, recipe] as const),
  );

  let recipesCreated = 0;
  let recipesUpdated = 0;
  let recipesSkipped = 0;

  for (const product of products) {
    const existing = recipeByProductId.get(product.id);
    const catalogBeverage = isCatalogBeverage(product.name);
    const shouldRefreshRecipe = catalogBeverage || product.category === "pastry";

    if (existing && existing.lines.length > 0 && !shouldRefreshRecipe) {
      recipesSkipped += 1;
      continue;
    }

    const lines = buildRecipeLinesForProduct(product, inventoryItems, warnings);
    if (!lines || lines.length === 0) {
      if (existing && existing.lines.length > 0) {
        recipesSkipped += 1;
      }
      continue;
    }

    const yieldQuantity = resolveRecipeYieldQuantity({
      productName: product.name,
      category: product.category,
      savedYield: existing?.yieldQuantity,
    });

    await saveRecipeClient({
      menuProductId: product.id,
      menuProductName: product.name,
      lines,
      yieldQuantity,
      category: product.category,
    });

    if (existing && existing.lines.length > 0) {
      recipesUpdated += 1;
    } else {
      recipesCreated += 1;
    }
  }

  return {
    productsCreated,
    recipesCreated,
    recipesUpdated,
    recipesSkipped,
    warnings,
  };
}

export async function seedRecipeForProductClient(productName: string): Promise<{
  created: boolean;
  updated: boolean;
  recipeCost: number;
  warnings: string[];
}> {
  const organizationId = await getOrganizationId();
  const warnings: string[] = [];

  const products = await loadMenuProducts(organizationId);
  const normalizedTarget = normalizeCatalogName(productName);
  const product =
    products.find((entry) => normalizeCatalogName(entry.name) === normalizedTarget) ??
    products.find((entry) => {
      const normalizedName = normalizeCatalogName(entry.name);
      return (
        normalizedName.includes(normalizedTarget) || normalizedTarget.includes(normalizedName)
      );
    });

  if (!product) {
    throw new Error(`No encontré "${productName}" en la carta.`);
  }

  const inventoryItems = await loadInventoryItems(organizationId);
  if (inventoryItems.length === 0) {
    throw new Error("No hay insumos en inventario. Importa compras primero.");
  }

  const recipes = await loadRecipes(organizationId);
  const existing = recipes.find((recipe) => recipe.menuProductId === product.id);
  const lines = buildRecipeLinesForProduct(product, inventoryItems, warnings);

  if (!lines || lines.length === 0) {
    throw new Error(
      warnings[warnings.length - 1] ??
        `No pude armar la ficha de "${product.name}" con el inventario actual.`,
    );
  }

  const yieldQuantity =
    product.category === "pastry"
      ? suggestRecipeYieldForProduct(product.name, product.category)
      : 1;

  const result = await saveRecipeClient({
    menuProductId: product.id,
    menuProductName: product.name,
    lines,
    yieldQuantity,
    category: product.category,
  });

  return {
    created: !existing || existing.lines.length === 0,
    updated: Boolean(existing && existing.lines.length > 0),
    recipeCost: result.recipeCost,
    warnings,
  };
}
