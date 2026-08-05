import type {
  BaseUnit,
  CoTaxCategory,
  InventoryItemType,
  KitchenStation,
  MenuCategory,
  RecipeLineInput,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";

import { getFirebaseAuth, getFirestoreDb } from "@/lib/firebase/client";
import { createMenuProductClient } from "@/lib/pos/pos-client";
import { saveRecipeClient } from "@/lib/recipes/recipes-client";

const COFFEE_BAG_GRAMS = 2500;
const MILK_BOTTLE_ML = 1000;

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
};

const BEVERAGE_PRODUCT_TEMPLATES: Array<{
  name: string;
  price: number;
  category: MenuCategory;
  station: KitchenStation;
  saleTaxCategory: CoTaxCategory;
  coffeeGrams: number;
  milkMl: number;
}> = [
  {
    name: "Americano",
    price: 6000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    coffeeGrams: 18,
    milkMl: 0,
  },
  {
    name: "Latte",
    price: 8000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    coffeeGrams: 18,
    milkMl: 200,
  },
  {
    name: "Cappuccino",
    price: 8000,
    category: "beverage",
    station: "bar",
    saleTaxCategory: "INC_8",
    coffeeGrams: 18,
    milkMl: 150,
  },
];

export interface SeedCostMatrixResult {
  productsCreated: number;
  recipesCreated: number;
  recipesSkipped: number;
  warnings: string[];
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function scoreCoffeeItem(item: InventoryRow): number {
  let score = 0;
  const name = normalizeName(item.name);

  if (item.type === "raw_material") {
    score += 10;
  }
  if (/2\.?5|2500/.test(name)) {
    score += 8;
  }
  if (/paq.*caf|caf.*paq/.test(name)) {
    score += 6;
  }
  if (item.averageCost > 0) {
    score += 4;
  }
  if (/marbella|competencia|regional/.test(name)) {
    score -= 2;
  }

  return score;
}

function scoreMilkItem(item: InventoryRow): number {
  let score = 0;
  const name = normalizeName(item.name);

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

function findCoffeeItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(
    items,
    (item) => /caf|cafe|coffee/i.test(item.name),
    scoreCoffeeItem,
  );
}

function findMilkItem(items: InventoryRow[]): InventoryRow | null {
  return pickBestItem(items, (item) => /leche/i.test(item.name), scoreMilkItem);
}

function bagGramsForItem(item: InventoryRow): number {
  if (
    item.presentationQuantity &&
    item.presentationQuantity > 100 &&
    item.presentationQuantity <= 10000
  ) {
    return item.presentationQuantity;
  }
  return COFFEE_BAG_GRAMS;
}

function bottleMlForItem(item: InventoryRow): number {
  if (item.presentationQuantity && item.presentationQuantity >= 200) {
    return item.presentationQuantity;
  }
  if (/1000|1l|1 l|litro/.test(normalizeName(item.name))) {
    return MILK_BOTTLE_ML;
  }
  return MILK_BOTTLE_ML;
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

  const bagGrams = bagGramsForItem(item);
  return {
    inventoryItemId: item.id,
    itemName: item.name,
    quantity: grams / bagGrams,
    unit: item.baseUnit === "bag" ? "bag" : "unit",
  };
}

function buildMilliliterLine(item: InventoryRow, milliliters: number): RecipeLineInput {
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

  const bottleMl = bottleMlForItem(item);
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
  const normalizedProduct = normalizeName(productName);

  const exactFinished = items.find(
    (item) =>
      item.type === "finished_product" && normalizeName(item.name) === normalizedProduct,
  );
  if (exactFinished) {
    return exactFinished;
  }

  const exactAny = items.find((item) => normalizeName(item.name) === normalizedProduct);
  if (exactAny) {
    return exactAny;
  }

  const fuzzyFinished = items.find((item) => {
    if (item.type !== "finished_product") {
      return false;
    }
    const normalizedItem = normalizeName(item.name);
    return (
      normalizedItem.includes(normalizedProduct) || normalizedProduct.includes(normalizedItem)
    );
  });
  if (fuzzyFinished) {
    return fuzzyFinished;
  }

  return (
    items.find((item) => {
      const normalizedItem = normalizeName(item.name);
      return (
        normalizedItem.includes(normalizedProduct) || normalizedProduct.includes(normalizedItem)
      );
    }) ?? null
  );
}

function buildBeverageRecipeLines(
  template: (typeof BEVERAGE_PRODUCT_TEMPLATES)[number],
  items: InventoryRow[],
  warnings: string[],
): RecipeLineInput[] | null {
  const lines: RecipeLineInput[] = [];
  const coffee = findCoffeeItem(items);

  if (!coffee) {
    warnings.push(`Sin insumo de café para ${template.name}.`);
    return null;
  }

  lines.push(buildGramLine(coffee, template.coffeeGrams));

  if (template.milkMl > 0) {
    const milk = findMilkItem(items);
    if (!milk) {
      warnings.push(`Sin leche en inventario para ${template.name}.`);
      return null;
    }
    lines.push(buildMilliliterLine(milk, template.milkMl));
  }

  return lines;
}

function buildRecipeLinesForProduct(
  product: MenuProductRow,
  items: InventoryRow[],
  warnings: string[],
): RecipeLineInput[] | null {
  const beverageTemplate = BEVERAGE_PRODUCT_TEMPLATES.find(
    (template) => normalizeName(template.name) === normalizeName(product.name),
  );

  if (beverageTemplate) {
    return buildBeverageRecipeLines(beverageTemplate, items, warnings);
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

  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      name: String(data.name ?? ""),
      category: (data.category ?? "food") as MenuCategory,
    };
  });
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
  const existingNames = new Set(products.map((product) => normalizeName(product.name)));

  for (const [index, template] of BEVERAGE_PRODUCT_TEMPLATES.entries()) {
    if (existingNames.has(normalizeName(template.name))) {
      continue;
    }

    await createMenuProductClient({
      name: template.name,
      price: template.price,
      category: template.category,
      station: template.station,
      saleTaxCategory: template.saleTaxCategory,
      description: "Bebida base para matriz de costos",
      sortOrder: products.length + index,
    });
    productsCreated += 1;
    existingNames.add(normalizeName(template.name));
  }

  if (productsCreated > 0) {
    products = await loadMenuProducts(organizationId);
  }

  const inventoryItems = await loadInventoryItems(organizationId);
  if (inventoryItems.length === 0) {
    throw new Error("No hay insumos en inventario. Importa compras primero.");
  }

  const recipes = await loadRecipes(organizationId);
  const recipeByProductId = new Map(
    recipes.map((recipe) => [recipe.menuProductId, recipe] as const),
  );

  let recipesCreated = 0;
  let recipesSkipped = 0;

  for (const product of products) {
    const existing = recipeByProductId.get(product.id);
    if (existing && existing.lines.length > 0) {
      recipesSkipped += 1;
      continue;
    }

    const lines = buildRecipeLinesForProduct(product, inventoryItems, warnings);
    if (!lines || lines.length === 0) {
      continue;
    }

    await saveRecipeClient({
      menuProductId: product.id,
      menuProductName: product.name,
      lines,
    });
    recipesCreated += 1;
  }

  return {
    productsCreated,
    recipesCreated,
    recipesSkipped,
    warnings,
  };
}
