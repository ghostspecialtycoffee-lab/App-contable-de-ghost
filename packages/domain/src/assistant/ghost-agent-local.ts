import { findBestPlatformKnowledge } from "../ai/platform-knowledge.js";
import {
  buildCashSummaryReply,
  buildCostMatrixOverviewReply,
  buildFinancialOverviewReply,
  buildFixedExpensesReply,
  buildInventoryCatalogReply,
  buildInventoryLowStockReply,
  buildKitchenStatusReply,
  buildMenuCatalogReply,
  buildPlatformGuideReply,
  buildPurchaseSuggestionsReply,
  buildPurchasesReportReply,
  buildPurchasesReviewReply,
  buildSalesReportReply,
  buildSingleProductCostReply,
  buildTablesStatusReply,
  buildWorkShiftsReply,
} from "./brain-responses.js";
import type { GhostConversationContext } from "./ghost-conversation.js";

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findProductByName(query: string, context: GhostConversationContext) {
  const normalized = normalizeText(query);
  for (const product of context.menuProducts) {
    const name = normalizeText(product.name);
    if (normalized.includes(name) || name.includes(normalized)) {
      return product;
    }
  }
  return null;
}

const ANALYSIS_PATTERN =
  /(analiza|analizar|revisa|revisar|muestrame|mostrar|dime|cuanto|cuantos|informe|reporte|estadistica|resumen de|como van|como va|que tal|evalua|panorama|detalle de|status de)/;

/**
 * Resuelve mensajes libres con datos operativos locales antes de llamar al agente en la nube.
 * Evita respuestas genéricas cuando el usuario pide análisis o consultas de la operación.
 */
export function resolveLocalAgentMessage(
  message: string,
  context: GhostConversationContext,
): string | null {
  const normalized = normalizeText(message);

  if (ANALYSIS_PATTERN.test(normalized)) {
    if (/(venta|vendimos|ticket|facturacion|mostrador)/.test(normalized)) {
      return buildSalesReportReply(context);
    }

    if (/(compra|proveedor|gasto en)/.test(normalized) && /(mes|informe|total|reporte)/.test(normalized)) {
      return buildPurchasesReportReply(context);
    }

    if (/(compra|proveedor|factura)/.test(normalized)) {
      return buildPurchasesReviewReply(context);
    }

    if (/(sugerencia|que comprar|debo comprar|reposicion)/.test(normalized)) {
      return buildPurchaseSuggestionsReply(context);
    }

    if (/(inventario|insumo|stock|bajo|reposicion)/.test(normalized)) {
      return buildInventoryLowStockReply(context);
    }

    if (/(caja|efectivo|arqueo|fondo)/.test(normalized)) {
      return buildCashSummaryReply(context);
    }

    if (/(mesa|ocupad)/.test(normalized)) {
      return buildTablesStatusReply(context);
    }

    if (/(cocina|comanda|barra|pedido)/.test(normalized)) {
      return buildKitchenStatusReply(context);
    }

    if (/(costo|margen|food|ficha|receta)/.test(normalized)) {
      const product = findProductByName(message, context);
      return product
        ? buildSingleProductCostReply(context, product.id)
        : buildCostMatrixOverviewReply(context);
    }

    if (/(financ|utilidad|balance)/.test(normalized)) {
      return buildFinancialOverviewReply(context);
    }

    if (/(turno|personal|quien trabaja)/.test(normalized)) {
      return buildWorkShiftsReply(context);
    }

    if (/(gasto fijo|arriendo|nomina)/.test(normalized)) {
      return buildFixedExpensesReply(context);
    }

    if (/(carta|menu|producto)/.test(normalized)) {
      return buildMenuCatalogReply(context);
    }

    if (/(insumo|catalogo inventario)/.test(normalized)) {
      return buildInventoryCatalogReply(context);
    }
  }

  const platform = findBestPlatformKnowledge(message, 0.42);
  if (platform) {
    return platform.entry.answer;
  }

  if (/(como|cómo|donde|dónde|para que|explica|que es|qué es|ayudame a|ayúdame a)/.test(normalized)) {
    const guide = findBestPlatformKnowledge(message, 0.32);
    if (guide) {
      return guide.entry.answer;
    }
    return buildPlatformGuideReply(message);
  }

  return null;
}
