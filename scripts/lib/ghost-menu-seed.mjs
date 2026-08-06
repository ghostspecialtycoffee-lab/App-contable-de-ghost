import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, "../../data/initial-load/ghost-menu-catalog.json");

const MILK_BOTTLE_ML = 1000;
const WATER_BOTTLE_ML = 600;

export function loadGhostMenuCatalog(manifestPath = CATALOG_PATH) {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

export function normalizeCatalogName(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

/** Tortas → 12 porciones; brownies/galletas → 8; etc. */
export function suggestRecipeYield(name) {
  const normalized = normalizeCatalogName(name);
  if (/torta|tarta|cheesecake|pastel/.test(normalized)) {
    return 12;
  }
  if (/brownie|galleta/.test(normalized)) {
    return 8;
  }
  if (/pan\b|enrollado/.test(normalized)) {
    return 10;
  }
  return 1;
}

function normalizeYieldQuantity(value) {
  const next = Number(value ?? 1);
  if (!Number.isFinite(next) || next <= 0) {
    return 1;
  }
  return Math.round(next * 1000) / 1000;
}

const PRODUCT_CATALOG_ALIASES = {
  espresso: "Espresso sencillo",
  macciatto: "Macchiato",
};

function findCatalogSpecByProductName(name, catalog) {
  const normalized = normalizeCatalogName(name);
  const resolved = PRODUCT_CATALOG_ALIASES[normalized] ?? name;
  return catalog.beverages.find(
    (spec) => normalizeCatalogName(spec.name) === normalizeCatalogName(resolved),
  );
}

function pickBestItem(items, matcher, scorer) {
  const candidates = items.filter(matcher);
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => scorer(b) - scorer(a))[0] ?? null;
}

function scoreBlackCoffeeItem(item) {
  let score = 0;
  const name = normalizeCatalogName(item.name);
  if (item.type === "raw_material") score += 10;
  if (/paq.*caf|caf.*paq/.test(name)) score += 8;
  if (/marbella|competencia/.test(name)) score -= 20;
  if (item.averageCost >= 120_000 && item.averageCost <= 160_000) score += 6;
  else if (item.averageCost > 0) score += 2;
  return score;
}

function scoreMilkItem(item) {
  let score = 0;
  const name = normalizeCatalogName(item.name);
  if (/leche entera/.test(name)) score += 12;
  else if (/leche colanta/.test(name)) score += 8;
  else if (/leche/.test(name)) score += 4;
  if (/deslactosada|condensada|polvo/.test(name)) score -= 10;
  if (item.averageCost > 0) score += 3;
  return score;
}

function scoreWaterItem(item) {
  let score = 0;
  const name = normalizeCatalogName(item.name);
  if (/agua manantial|agua brisa|agua cristal/.test(name)) score += 10;
  else if (/agua/.test(name)) score += 5;
  if (item.averageCost > 0) score += 2;
  return score;
}

function findBlackCoffeeItem(items) {
  return pickBestItem(items, (item) => /caf|cafe|coffee/i.test(item.name), scoreBlackCoffeeItem);
}

function findMilkItem(items) {
  return pickBestItem(items, (item) => /leche/i.test(item.name), scoreMilkItem);
}

function findWaterItem(items) {
  return pickBestItem(items, (item) => /agua/i.test(item.name), scoreWaterItem);
}

function bagGramsForItem(item, espressoBase) {
  if (item.presentationQuantity && item.presentationQuantity > 500 && item.presentationQuantity <= 10000) {
    return item.presentationQuantity;
  }
  return espressoBase.blackCoffeeBagGrams;
}

function buildGramLine(item, grams, espressoBase) {
  if (item.baseUnit === "g") {
    return { inventoryItemId: item.id, itemName: item.name, quantity: grams, unit: "g" };
  }
  if (item.baseUnit === "kg") {
    return { inventoryItemId: item.id, itemName: item.name, quantity: grams / 1000, unit: "kg" };
  }
  const bagGrams = bagGramsForItem(item, espressoBase);
  return {
    inventoryItemId: item.id,
    itemName: item.name,
    quantity: grams / bagGrams,
    unit: item.baseUnit === "bag" ? "bag" : "unit",
  };
}

function buildMilliliterLine(item, milliliters, fallbackBottleMl) {
  if (item.baseUnit === "ml") {
    return { inventoryItemId: item.id, itemName: item.name, quantity: milliliters, unit: "ml" };
  }
  if (item.baseUnit === "l") {
    return { inventoryItemId: item.id, itemName: item.name, quantity: milliliters / 1000, unit: "l" };
  }
  const bottleMl =
    item.presentationQuantity && item.presentationQuantity >= 200
      ? item.presentationQuantity
      : fallbackBottleMl;
  return {
    inventoryItemId: item.id,
    itemName: item.name,
    quantity: milliliters / bottleMl,
    unit: "unit",
  };
}

function resolveSpecAmounts(spec, espressoBase) {
  if (spec.usesEspressoBase) {
    const shots = spec.espressoShots ?? 1;
    return {
      coffeeGrams: espressoBase.coffeeGrams * shots,
      waterMl: espressoBase.waterMl + (spec.extraWaterMl ?? 0),
      milkMl: spec.milkMl ?? 0,
    };
  }
  return {
    coffeeGrams: spec.coffeeGrams ?? 0,
    waterMl: spec.waterMl ?? 0,
    milkMl: spec.milkMl ?? 0,
  };
}

function usesTapWaterForCoffeePrep(spec) {
  if (spec.usesEspressoBase) return true;
  if (spec.kind === "brew_method") return true;
  if ((spec.coffeeGrams ?? 0) > 0) return true;
  return false;
}

function buildCatalogRecipeLines(spec, items, espressoBase, warnings) {
  const lines = [];
  const { coffeeGrams, waterMl, milkMl } = resolveSpecAmounts(spec, espressoBase);

  if (coffeeGrams > 0) {
    const coffee = findBlackCoffeeItem(items);
    if (!coffee) {
      warnings.push(`Sin café Black Coffee para ${spec.name}.`);
      return null;
    }
    lines.push(buildGramLine(coffee, coffeeGrams, espressoBase));
  }

  if (waterMl > 0 && !usesTapWaterForCoffeePrep(spec)) {
    const water = findWaterItem(items);
    if (!water) {
      warnings.push(`Sin agua en inventario para ${spec.name}.`);
    } else {
      lines.push(buildMilliliterLine(water, waterMl, WATER_BOTTLE_ML));
    }
  }

  if (milkMl > 0) {
    const milk = findMilkItem(items);
    if (!milk) {
      warnings.push(`Sin leche para ${spec.name}.`);
    } else {
      lines.push(buildMilliliterLine(milk, milkMl, MILK_BOTTLE_ML));
    }
  }

  return lines.length > 0 ? lines : null;
}

function findFinishedInventoryMatch(productName, items) {
  const normalizedProduct = normalizeCatalogName(productName);
  const exactFinished = items.find(
    (item) => item.type === "finished_product" && normalizeCatalogName(item.name) === normalizedProduct,
  );
  if (exactFinished) return exactFinished;
  const exactAny = items.find((item) => normalizeCatalogName(item.name) === normalizedProduct);
  if (exactAny) return exactAny;
  return (
    items.find((item) => {
      const normalizedItem = normalizeCatalogName(item.name);
      return normalizedItem.includes(normalizedProduct) || normalizedProduct.includes(normalizedItem);
    }) ?? null
  );
}

function buildRecipeLinesForProduct(product, items, catalog, espressoBase, warnings) {
  const catalogSpec = findCatalogSpecByProductName(product.name, catalog);
  if (catalogSpec) {
    return buildCatalogRecipeLines(catalogSpec, items, espressoBase, warnings);
  }
  const finishedMatch = findFinishedInventoryMatch(product.name, items);
  if (finishedMatch) {
    return [
      {
        inventoryItemId: finishedMatch.id,
        itemName: finishedMatch.name,
        quantity: 1,
        unit: finishedMatch.baseUnit === "unit" ? "unit" : finishedMatch.baseUnit,
      },
    ];
  }
  warnings.push(`No se encontró insumo para "${product.name}".`);
  return null;
}

function convertToBaseUnit(quantity, fromUnit, baseUnit, presentationQuantity = 1) {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (fromUnit === baseUnit) return quantity;
  const grams = { g: 1, kg: 1000 };
  const ml = { ml: 1, l: 1000 };
  if (grams[fromUnit] && grams[baseUnit]) {
    return (quantity * grams[fromUnit]) / grams[baseUnit];
  }
  if (ml[fromUnit] && ml[baseUnit]) {
    return (quantity * ml[fromUnit]) / ml[baseUnit];
  }
  if (fromUnit === "unit" || fromUnit === "bag" || fromUnit === "box") {
    return quantity * presentationQuantity;
  }
  return quantity;
}

function calculateRecipeCost(lines, itemById) {
  return lines.reduce((total, line) => {
    const item = itemById.get(line.inventoryItemId);
    if (!item) return total;
    const qtyInBase = convertToBaseUnit(
      line.quantity,
      line.unit,
      item.baseUnit,
      item.presentationQuantity ?? 1,
    );
    return total + Math.round(qtyInBase * (item.averageCost || 0));
  }, 0);
}

async function saveRecipe(db, FieldValue, organizationId, actorUserId, input) {
  const lines = input.lines.filter((line) => line.quantity > 0);
  if (lines.length === 0) return null;

  const itemSnaps = await Promise.all(
    lines.map((line) =>
      db.doc(`organizations/${organizationId}/inventoryItems/${line.inventoryItemId}`).get(),
    ),
  );
  const itemById = new Map();
  for (const snap of itemSnaps) {
    if (!snap.exists) continue;
    itemById.set(snap.id, {
      id: snap.id,
      baseUnit: snap.data().baseUnit ?? "unit",
      averageCost: Number(snap.data().averageCost ?? snap.data().lastCost ?? 0),
      presentationQuantity: snap.data().presentationQuantity ?? 1,
    });
  }

  const batchCost = calculateRecipeCost(lines, itemById);
  const yieldQty = normalizeYieldQuantity(
    input.yieldQuantity ?? suggestRecipeYield(input.menuProductName),
  );
  const recipeCost = Math.round(batchCost / yieldQty);
  const existing = await db
    .collection(`organizations/${organizationId}/recipes`)
    .where("menuProductId", "==", input.menuProductId)
    .limit(1)
    .get();

  const recipeRef = existing.empty
    ? db.collection(`organizations/${organizationId}/recipes`).doc()
    : existing.docs[0].ref;
  const now = FieldValue.serverTimestamp();

  await recipeRef.set({
    organizationId,
    menuProductId: input.menuProductId,
    menuProductName: input.menuProductName.trim(),
    yieldQuantity: yieldQty,
    lines,
    recipeCost,
    createdAt: now,
    updatedAt: now,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });

  await db.doc(`organizations/${organizationId}/menuProducts/${input.menuProductId}`).set(
    { recipeCost, updatedAt: now, updatedBy: actorUserId },
    { merge: true },
  );

  return recipeRef.id;
}

/**
 * Carga carta Ghost (25 bebidas del menú) + fichas de costo en Firestore Admin.
 */
export async function seedGhostMenu(db, FieldValue, input) {
  const catalog = loadGhostMenuCatalog(input.catalogPath);
  const { organizationId, actorUserId } = input;
  const warnings = [];
  let productsCreated = 0;
  let recipesCreated = 0;
  let recipesUpdated = 0;
  let recipesSkipped = 0;

  const productSnaps = await db
    .collection(`organizations/${organizationId}/menuProducts`)
    .where("status", "==", "active")
    .get();

  const existingNames = new Set(
    productSnaps.docs.map((doc) => normalizeCatalogName(String(doc.data().name ?? ""))),
  );

  for (const [index, spec] of catalog.beverages.entries()) {
    if (existingNames.has(normalizeCatalogName(spec.name))) continue;

    const ref = db.collection(`organizations/${organizationId}/menuProducts`).doc();
    const now = FieldValue.serverTimestamp();
    await ref.set({
      organizationId,
      name: spec.name,
      price: Math.round(spec.price),
      category: spec.category,
      station: spec.station,
      description: spec.description ?? "Carta Ghost Specialty Coffee",
      status: "active",
      sortOrder: index,
      saleTaxCategory: spec.saleTaxCategory,
      recipeCost: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
    productsCreated += 1;
    existingNames.add(normalizeCatalogName(spec.name));
  }

  const allProductsSnap = await db
    .collection(`organizations/${organizationId}/menuProducts`)
    .where("status", "==", "active")
    .get();
  const products = allProductsSnap.docs.map((doc) => ({
    id: doc.id,
    name: String(doc.data().name ?? ""),
    category: doc.data().category ?? "other",
  }));

  const inventorySnap = await db
    .collection(`organizations/${organizationId}/inventoryItems`)
    .get();
  const items = inventorySnap.docs.map((doc) => ({
    id: doc.id,
    name: String(doc.data().name ?? ""),
    type: doc.data().type ?? "raw_material",
    baseUnit: doc.data().baseUnit ?? "unit",
    averageCost: Number(doc.data().averageCost ?? doc.data().lastCost ?? 0),
    presentationQuantity: doc.data().presentationQuantity,
  }));

  if (items.length === 0) {
    throw new Error("No hay insumos en inventario. Importa compras primero.");
  }

  const recipeSnaps = await db.collection(`organizations/${organizationId}/recipes`).get();
  const recipeByProductId = new Map(
    recipeSnaps.docs.map((doc) => [String(doc.data().menuProductId), doc.data()]),
  );

  const isCatalogBeverage = (name) => Boolean(findCatalogSpecByProductName(name, catalog));

  for (const product of products) {
    const existing = recipeByProductId.get(product.id);
    const shouldRefreshRecipe =
      isCatalogBeverage(product.name) || product.category === "pastry";
    if (existing?.lines?.length > 0 && !shouldRefreshRecipe) {
      recipesSkipped += 1;
      continue;
    }

    const lines = buildRecipeLinesForProduct(
      product,
      items,
      catalog,
      catalog.espressoBase,
      warnings,
    );
    if (!lines || lines.length === 0) {
      if (existing?.lines?.length > 0) recipesSkipped += 1;
      continue;
    }

    await saveRecipe(db, FieldValue, organizationId, actorUserId, {
      menuProductId: product.id,
      menuProductName: product.name,
      lines,
    });

    if (existing?.lines?.length > 0) recipesUpdated += 1;
    else recipesCreated += 1;
  }

  return { productsCreated, recipesCreated, recipesUpdated, recipesSkipped, warnings };
}

export async function hasGhostMenuSeeded(db, organizationId) {
  const snap = await db
    .collection(`organizations/${organizationId}/menuProducts`)
    .where("status", "==", "active")
    .get();
  return snap.docs.some((doc) => {
    const normalized = normalizeCatalogName(doc.data().name);
    return normalized === "espresso" || normalized === "espresso sencillo";
  });
}

/**
 * Aplica precios del catálogo Ghost, crea productos faltantes y regenera fichas de costo.
 */
export async function applyMenuPricesAndCostMatrix(db, FieldValue, input) {
  const catalog = loadGhostMenuCatalog(input.catalogPath);
  const { organizationId, actorUserId } = input;
  const warnings = [];
  let pricesUpdated = 0;
  let productsCreated = 0;
  let recipesCreated = 0;
  let recipesUpdated = 0;
  let recipesSkipped = 0;

  const allProductSnaps = await db
    .collection(`organizations/${organizationId}/menuProducts`)
    .get();

  const productsByNormalizedName = new Map();
  for (const doc of allProductSnaps.docs) {
    productsByNormalizedName.set(normalizeCatalogName(String(doc.data().name ?? "")), {
      id: doc.id,
      ref: doc.ref,
      data: doc.data(),
    });
  }

  const now = FieldValue.serverTimestamp();

  function findProductForSpec(spec) {
    const specNormalized = normalizeCatalogName(spec.name);
    if (productsByNormalizedName.has(specNormalized)) {
      return productsByNormalizedName.get(specNormalized);
    }
    if (specNormalized === "espresso sencillo" && productsByNormalizedName.has("espresso")) {
      return productsByNormalizedName.get("espresso");
    }
    for (const [alias, target] of Object.entries(PRODUCT_CATALOG_ALIASES)) {
      if (
        normalizeCatalogName(target) === specNormalized &&
        productsByNormalizedName.has(alias)
      ) {
        return productsByNormalizedName.get(alias);
      }
    }
    return null;
  }

  for (const spec of catalog.beverages) {
    const specNormalized = normalizeCatalogName(spec.name);
    const match = findProductForSpec(spec);

    if (match) {
      await match.ref.set(
        {
          name: spec.name,
          price: Math.round(spec.price),
          description: spec.description ?? match.data.description ?? "",
          saleTaxCategory: spec.saleTaxCategory,
          updatedAt: now,
          updatedBy: actorUserId,
        },
        { merge: true },
      );
      pricesUpdated += 1;
      productsByNormalizedName.delete(normalizeCatalogName(String(match.data.name ?? "")));
      productsByNormalizedName.set(specNormalized, {
        id: match.id,
        ref: match.ref,
        data: { ...match.data, name: spec.name },
      });
      continue;
    }

    const ref = db.collection(`organizations/${organizationId}/menuProducts`).doc();
    await ref.set({
      organizationId,
      name: spec.name,
      price: Math.round(spec.price),
      category: spec.category,
      station: spec.station,
      description: spec.description ?? "Carta Ghost Specialty Coffee",
      status: "active",
      sortOrder: catalog.beverages.indexOf(spec),
      saleTaxCategory: spec.saleTaxCategory,
      recipeCost: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: actorUserId,
      updatedBy: actorUserId,
    });
    productsCreated += 1;
    productsByNormalizedName.set(specNormalized, {
      id: ref.id,
      ref,
      data: { name: spec.name },
    });
  }

  const products = [...productsByNormalizedName.values()].map((entry) => ({
    id: entry.id,
    name: String(entry.data.name ?? ""),
  }));

  const inventorySnap = await db
    .collection(`organizations/${organizationId}/inventoryItems`)
    .get();
  const items = inventorySnap.docs.map((doc) => ({
    id: doc.id,
    name: String(doc.data().name ?? ""),
    type: doc.data().type ?? "raw_material",
    baseUnit: doc.data().baseUnit ?? "unit",
    averageCost: Number(doc.data().averageCost ?? doc.data().lastCost ?? 0),
    presentationQuantity: doc.data().presentationQuantity,
  }));

  if (items.length === 0) {
    throw new Error("No hay insumos en inventario. Importa compras primero.");
  }

  const recipeSnaps = await db.collection(`organizations/${organizationId}/recipes`).get();
  const recipeByProductId = new Map(
    recipeSnaps.docs.map((doc) => [String(doc.data().menuProductId), doc.data()]),
  );

  for (const product of products) {
    const catalogSpec = findCatalogSpecByProductName(product.name, catalog);
    if (!catalogSpec) {
      continue;
    }

    const existing = recipeByProductId.get(product.id);
    const lines = buildRecipeLinesForProduct(
      product,
      items,
      catalog,
      catalog.espressoBase,
      warnings,
    );

    if (!lines || lines.length === 0) {
      if (existing?.lines?.length > 0) {
        recipesSkipped += 1;
      }
      continue;
    }

    await saveRecipe(db, FieldValue, organizationId, actorUserId, {
      menuProductId: product.id,
      menuProductName: catalogSpec.name,
      lines,
    });

    if (existing?.lines?.length > 0) {
      recipesUpdated += 1;
    } else {
      recipesCreated += 1;
    }
  }

  return {
    pricesUpdated,
    productsCreated,
    recipesCreated,
    recipesUpdated,
    recipesSkipped,
    warnings,
  };
}

/**
 * Regenera fichas de repostería: torta completa ÷ porciones (12 para tortas).
 */
export async function applyPastryCostMatrix(db, FieldValue, input) {
  const { organizationId, actorUserId } = input;
  const warnings = [];
  let recipesCreated = 0;
  let recipesUpdated = 0;
  let recipesSkipped = 0;

  const productSnaps = await db
    .collection(`organizations/${organizationId}/menuProducts`)
    .where("category", "==", "pastry")
    .get();

  if (productSnaps.empty) {
    return { recipesCreated, recipesUpdated, recipesSkipped, warnings };
  }

  const inventorySnap = await db
    .collection(`organizations/${organizationId}/inventoryItems`)
    .get();
  const items = inventorySnap.docs.map((doc) => ({
    id: doc.id,
    name: String(doc.data().name ?? ""),
    type: doc.data().type ?? "raw_material",
    baseUnit: doc.data().baseUnit ?? "unit",
    averageCost: Number(doc.data().averageCost ?? doc.data().lastCost ?? 0),
    presentationQuantity: doc.data().presentationQuantity,
  }));

  const recipeSnaps = await db.collection(`organizations/${organizationId}/recipes`).get();
  const recipeByProductId = new Map(
    recipeSnaps.docs.map((doc) => [String(doc.data().menuProductId), doc.data()]),
  );

  const catalog = loadGhostMenuCatalog();

  for (const doc of productSnaps.docs) {
    const product = {
      id: doc.id,
      name: String(doc.data().name ?? ""),
    };
    const existing = recipeByProductId.get(product.id);
    const lines = buildRecipeLinesForProduct(
      product,
      items,
      catalog,
      catalog.espressoBase,
      warnings,
    );

    if (!lines || lines.length === 0) {
      if (existing?.lines?.length > 0) {
        recipesSkipped += 1;
      }
      continue;
    }

    await saveRecipe(db, FieldValue, organizationId, actorUserId, {
      menuProductId: product.id,
      menuProductName: product.name,
      lines,
      yieldQuantity: suggestRecipeYield(product.name),
    });

    if (existing?.lines?.length > 0) {
      recipesUpdated += 1;
    } else {
      recipesCreated += 1;
    }
  }

  return { recipesCreated, recipesUpdated, recipesSkipped, warnings };
}
