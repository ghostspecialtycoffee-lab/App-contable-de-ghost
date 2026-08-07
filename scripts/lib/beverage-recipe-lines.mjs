import { buildBeverageRecipeLineSpecs } from "../../packages/domain/dist/production/beverage-recipes.js";

const MILK_BOTTLE_ML = 1000;
const WATER_BOTTLE_ML = 600;
const ICE_BAG_GRAMS = 5000;
const LEMON_JUICE_BOTTLE_ML = 250;
const SODA_UNIT_ML = 350;

export function normalizeCatalogName(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
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

function findIceItem(items) {
  return pickBestItem(items, (item) => /hielo/i.test(item.name), (item) => {
    const name = normalizeCatalogName(item.name);
    return (/hielo kolbitos/.test(name) ? 12 : 8) + (item.averageCost > 0 ? 2 : 0);
  });
}

function findIceCreamItem(items) {
  return pickBestItem(
    items,
    (item) => /helado/i.test(item.name),
    (item) => (/vainilla/.test(normalizeCatalogName(item.name)) ? 10 : 5) + (item.averageCost > 0 ? 2 : 0),
  );
}

function findLemonJuiceItem(items) {
  return pickBestItem(
    items,
    (item) => /jugo de limon|limon tahiti/i.test(normalizeCatalogName(item.name)),
    (item) => (/jugo de limon/.test(normalizeCatalogName(item.name)) ? 10 : 6) + (item.averageCost > 0 ? 2 : 0),
  );
}

function findSodaItem(items) {
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

function findChocolateItem(items) {
  return pickBestItem(
    items,
    (item) => /chocolate|cacao|cacao en polvo/i.test(normalizeCatalogName(item.name)),
    (item) => (item.type === "raw_material" ? 8 : 4) + (item.averageCost > 0 ? 2 : 0),
  );
}

function findSugarItem(items) {
  return pickBestItem(
    items,
    (item) => /azucar/i.test(normalizeCatalogName(item.name)),
    (item) => (item.averageCost > 0 ? 5 : 2),
  );
}

function coffeeBagGramsForItem(item, espressoBase) {
  if (item.presentationQuantity && item.presentationQuantity > 500 && item.presentationQuantity <= 10000) {
    return item.presentationQuantity;
  }
  return espressoBase.blackCoffeeBagGrams;
}

function weightPerBagUnit(item, espressoBase) {
  if (/hielo/.test(normalizeCatalogName(item.name))) {
    return ICE_BAG_GRAMS;
  }
  return coffeeBagGramsForItem(item, espressoBase);
}

function buildGramLine(item, grams, espressoBase) {
  if (item.baseUnit === "g") {
    return { inventoryItemId: item.id, itemName: item.name, quantity: grams, unit: "g" };
  }
  if (item.baseUnit === "kg") {
    return { inventoryItemId: item.id, itemName: item.name, quantity: grams / 1000, unit: "kg" };
  }
  const bagGrams = weightPerBagUnit(item, espressoBase);
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

function buildUnitLine(item, units) {
  return {
    inventoryItemId: item.id,
    itemName: item.name,
    quantity: units,
    unit: item.baseUnit === "unit" ? "unit" : item.baseUnit,
  };
}

function mapBeverageLineToInventory(line, items, specName, espressoBase, warnings) {
  switch (line.kind) {
    case "coffee": {
      const coffee = findBlackCoffeeItem(items);
      if (!coffee) {
        warnings.push(`Sin café Black Coffee para ${specName}.`);
        return null;
      }
      return buildGramLine(coffee, line.quantity, espressoBase);
    }
    case "milk": {
      const milk = findMilkItem(items);
      if (!milk) {
        warnings.push(`Sin leche para ${specName} (${line.quantity} ml).`);
        return null;
      }
      return buildMilliliterLine(milk, line.quantity, MILK_BOTTLE_ML);
    }
    case "water": {
      const water = findWaterItem(items);
      if (!water) {
        warnings.push(`Sin agua para ${specName} (${line.quantity} ml).`);
        return null;
      }
      return buildMilliliterLine(water, line.quantity, WATER_BOTTLE_ML);
    }
    case "ice": {
      const ice = findIceItem(items);
      if (!ice) {
        warnings.push(`Sin hielo para ${specName} (${line.quantity} g).`);
        return null;
      }
      return buildGramLine(ice, line.quantity, espressoBase);
    }
    case "iceCream": {
      const iceCream = findIceCreamItem(items);
      if (!iceCream) {
        warnings.push(`Sin helado para ${specName}.`);
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
        warnings.push(`${specName}: falta chocolate en bodega (${line.quantity} g).`);
        return null;
      }
      return buildGramLine(chocolate, line.quantity, espressoBase);
    }
    case "sugar": {
      const sugar = findSugarItem(items);
      if (!sugar) {
        warnings.push(`Sin azúcar para ${specName} (${line.quantity} g).`);
        return null;
      }
      return buildGramLine(sugar, line.quantity, espressoBase);
    }
    default:
      warnings.push(`${specName}: insumo ${line.kind} no mapeado.`);
      return null;
  }
}

export function buildCatalogRecipeLines(spec, items, espressoBase, warnings) {
  const lineSpecs = buildBeverageRecipeLineSpecs(spec, {
    coffeeGrams: espressoBase.coffeeGrams,
    waterMl: espressoBase.waterMl,
  });
  const lines = [];

  for (const lineSpec of lineSpecs) {
    const mapped = mapBeverageLineToInventory(lineSpec, items, spec.name, espressoBase, warnings);
    if (mapped) {
      lines.push(mapped);
    }
  }

  if (lines.length === 0) {
    warnings.push(`${spec.name}: sin insumos mapeados (${spec.description ?? "ver catálogo"}).`);
    return null;
  }

  return lines;
}
