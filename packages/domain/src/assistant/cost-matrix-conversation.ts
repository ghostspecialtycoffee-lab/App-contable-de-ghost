import type { BaseUnit } from "../inventory/units.js";
import type { RecipeLineInput } from "../production/recipe.js";
import type { GhostConversationInventoryItem } from "./ghost-conversation.js";

const UNIT_ALIASES: Record<string, BaseUnit> = {
  g: "g",
  gr: "g",
  gramo: "g",
  gramos: "g",
  kg: "kg",
  kilo: "kg",
  kilos: "kg",
  ml: "ml",
  cc: "ml",
  mililitro: "ml",
  mililitros: "ml",
  l: "l",
  litro: "l",
  litros: "l",
  un: "unit",
  unidad: "unit",
  unidades: "unit",
  u: "unit",
};

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function findInventoryByName(
  query: string,
  items: GhostConversationInventoryItem[],
): GhostConversationInventoryItem | null {
  const normalized = normalizeText(query);
  if (!normalized) {
    return null;
  }

  let best: { item: GhostConversationInventoryItem; score: number } | null = null;

  for (const item of items) {
    const name = normalizeText(item.name);
    if (normalized.includes(name) || name.includes(normalized)) {
      return item;
    }

    const tokens = normalized.split(/\s+/).filter((token) => token.length > 2);
    const overlap = tokens.filter((token) => name.includes(token)).length;
    const score = overlap / Math.max(tokens.length, 1);
    if (!best || score > best.score) {
      best = { item, score };
    }
  }

  return best && best.score >= 0.5 ? best.item : null;
}

export function extractRecipePriceFromMessage(message: string): number | null {
  const priceMatch =
    message.match(/(?:precio|vende|venta|a)\s*(?:\$|cop)?\s*([\d][\d.,]*)/i) ??
    message.match(/(?:\$|cop)\s*([\d][\d.,]*)/i);

  if (!priceMatch?.[1]) {
    return null;
  }

  const parsed = Number(priceMatch[1].replace(/\./g, "").replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export function extractYieldQuantityFromMessage(message: string): number | null {
  const match = message.match(
    /(?:rendimiento|porciones|divide en|rinden)\s*(\d+)/i,
  );
  if (!match?.[1]) {
    return null;
  }

  const parsed = Number(match[1]);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseIngredientLinesFromMessage(
  message: string,
  inventoryItems: GhostConversationInventoryItem[],
): RecipeLineInput[] {
  const lines: RecipeLineInput[] = [];
  const pattern =
    /(\d+(?:[.,]\d+)?)\s*(g|gr|gramos?|kg|kilos?|ml|cc|mililitros?|l|litros?|un|unidades?|u)?\s+(?:de\s+)?([a-záéíóúñ0-9][a-záéíóúñ0-9\s]{1,40})/gi;

  for (const match of message.matchAll(pattern)) {
    const quantityRaw = match[1]?.replace(",", ".");
    const unitToken = match[2]?.toLowerCase() ?? "";
    const ingredientName = match[3]?.trim();
    if (!quantityRaw || !ingredientName) {
      continue;
    }

    const quantity = Number(quantityRaw);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      continue;
    }

    const item = findInventoryByName(ingredientName, inventoryItems);
    if (!item) {
      continue;
    }

    const unit = UNIT_ALIASES[unitToken] ?? (item.baseUnit as BaseUnit);
    lines.push({
      inventoryItemId: item.id,
      itemName: item.name,
      quantity,
      unit,
    });
  }

  return lines;
}

export function isCostMatrixQueryMessage(normalized: string): boolean {
  return /(matriz de costos|ficha de costos|food cost|costo de preparacion|margen del|margen de|cuanto cuesta hacer|costo del producto)/.test(
    normalized,
  );
}

export function isBuildRecipeCostMessage(normalized: string): boolean {
  if (/(genera|actualiza|crea|arma|construye|refresca).{0,24}(ficha|receta).{0,24}(costos|costeo)/.test(normalized)) {
    return true;
  }

  if (/(ficha de costos|ficha de costeo).{0,20}(para|de)/.test(normalized)) {
    return true;
  }

  return /(actualiza|refresca).{0,16}matriz de costos/.test(normalized);
}

export function isSaveRecipeCostMessage(message: string, normalized: string): boolean {
  if (!hasExplicitRecipeIngredients(message)) {
    return false;
  }

  return (
    /(ficha|receta|costos|costeo|ingredientes)/.test(normalized) ||
    /(precio|vende|venta)\s*(?:\$|cop)?\s*[\d]/i.test(message)
  );
}

export function hasExplicitRecipeIngredients(message: string): boolean {
  return /(\d+(?:[.,]\d+)?)\s*(g|gr|gramos?|kg|ml|cc|un)\b/i.test(message);
}
