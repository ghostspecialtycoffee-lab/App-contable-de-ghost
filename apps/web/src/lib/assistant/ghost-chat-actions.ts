import {
  getBeverageAdvancedSetupProgress,
  getBeverageAdvancedSetupSpec,
  sanitizeBeverageAdvancedSetupAnswers,
  type BaseUnit,
  type InventoryItemType,
  type KitchenStation,
  type MenuCategory,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

import { openCashSession } from "@/lib/cash/cash";
import { seedCostMatrix } from "@/lib/costing/seed-cost-matrix";
import { getFirestoreDb } from "@/lib/firebase/client";
import { createInventoryItem } from "@/lib/inventory/inventory";
import { createPurchaseInvoice, confirmPurchaseInvoice } from "@/lib/purchases/purchases";
import {
  createMenuProduct,
  createSale,
  updateKitchenOrderStatus,
} from "@/lib/pos/pos";
import { saveRecipe } from "@/lib/recipes/recipes";
import {
  addTableSessionLines,
  openTableSession,
  sendTableSessionToKitchen,
} from "@/lib/tables/table-sessions";
import { callGhostAgent } from "@/lib/firebase/functions";
import type { GhostChatAction } from "@/lib/assistant/ghost-chat-engine";

type RecipeSnapshot = {
  menuProductId: string;
  lines: Array<{
    inventoryItemId: string;
    itemName: string;
    quantity: number;
    unit: string;
  }>;
  yieldQuantity: number;
};

function payloadString(payload: Record<string, string>, key: string): string {
  return payload[key] ?? "";
}

async function loadRecipeForProduct(
  organizationId: string,
  menuProductId: string,
): Promise<RecipeSnapshot | null> {
  const snapshot = await getDocs(
    query(
      collection(getFirestoreDb(), firestorePaths.organizationRecipes(organizationId)),
      where("menuProductId", "==", menuProductId),
      limit(1),
    ),
  );

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0]!.data();
  return {
    menuProductId,
    lines: (data.lines ?? []) as RecipeSnapshot["lines"],
    yieldQuantity: data.yieldQuantity ?? 1,
  };
}

export interface GhostChatActionResult {
  message?: string;
  suggestions?: string[];
}

export async function executeGhostChatAction(
  action: GhostChatAction,
  context: {
    organizationId: string;
    branchId: string;
    userId: string;
    recipes: RecipeSnapshot[];
    inventoryItems: Array<{ id: string; baseUnit: string }>;
    defaultWarehouseId?: string;
  },
): Promise<GhostChatActionResult | undefined> {
  switch (action.type) {
    case "create-inventory-item": {
      await createInventoryItem({
        sku: payloadString(action.payload, "sku"),
        name: payloadString(action.payload, "name"),
        type: payloadString(action.payload, "type") as InventoryItemType,
        baseUnit: payloadString(action.payload, "baseUnit") as BaseUnit,
      });
      return undefined;
    }

    case "create-purchase-invoice": {
      if (!context.defaultWarehouseId) {
        throw new Error("No hay bodega configurada. Crea una bodega en Inventario.");
      }

      const item = context.inventoryItems.find(
        (entry) => entry.id === payloadString(action.payload, "inventoryItemId"),
      );

      const { invoiceId } = await createPurchaseInvoice({
        supplierName: payloadString(action.payload, "supplierName"),
        invoiceNumber: payloadString(action.payload, "invoiceNumber"),
        invoiceDate: payloadString(action.payload, "invoiceDate"),
        warehouseId: context.defaultWarehouseId,
        lines: [
          {
            inventoryItemId: payloadString(action.payload, "inventoryItemId"),
            description: payloadString(action.payload, "itemName"),
            quantity: Number(payloadString(action.payload, "quantity") || "1"),
            unit: (item?.baseUnit ?? "unit") as BaseUnit,
            unitPriceNet: Number(payloadString(action.payload, "unitCost") || "0"),
            taxCategory: "IVA_19",
          },
        ],
      });

      await confirmPurchaseInvoice({ invoiceId, bootstrapInventory: true });
      return undefined;
    }

    case "create-menu-product": {
      await createMenuProduct({
        name: payloadString(action.payload, "name"),
        price: Number(payloadString(action.payload, "price") || "0"),
        category: payloadString(action.payload, "category") as MenuCategory,
        station: payloadString(action.payload, "station") as KitchenStation,
      });
      return undefined;
    }

    case "save-beverage-setup": {
      const { productId, productName } = action.payload;
      let recipe =
        context.recipes.find((entry) => entry.menuProductId === productId) ??
        (await loadRecipeForProduct(context.organizationId, productId));

      if (!recipe?.lines.length) {
        await seedCostMatrix();
        recipe = await loadRecipeForProduct(context.organizationId, productId);
      }

      if (!recipe?.lines.length) {
        throw new Error("No hay ficha base. Ejecuta «Cargar carta Ghost + fichas SCA».");
      }

      const answers = sanitizeBeverageAdvancedSetupAnswers(
        productName,
        action.payload.answers,
      );

      await saveRecipe({
        menuProductId: productId,
        menuProductName: productName,
        lines: recipe.lines.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          itemName: line.itemName,
          quantity: line.quantity,
          unit: line.unit as BaseUnit,
        })),
        yieldQuantity: recipe.yieldQuantity,
        category: "beverage",
        advancedSetupAnswers: answers,
      });

      const progress = getBeverageAdvancedSetupProgress(productName, answers);
      return {
        message: progress.isComplete
          ? "Confirmación completa guardada en la ficha de costos."
          : `Guardado parcial (${progress.answered}/${progress.total}).`,
      };
    }

    case "seed-ghost-menu": {
      const result = await seedCostMatrix();
      const parts = [
        result.productsCreated > 0 ? `${result.productsCreated} productos` : null,
        result.recipesCreated > 0 ? `${result.recipesCreated} fichas nuevas` : null,
        result.recipesUpdated > 0 ? `${result.recipesUpdated} fichas actualizadas` : null,
      ].filter(Boolean);
      return {
        message: parts.length > 0 ? parts.join(" · ") : "Sin cambios (revisa inventario).",
      };
    }

    case "open-cash-session": {
      await openCashSession({
        openingAmount: action.payload.openingAmount,
      });
      return undefined;
    }

    case "create-counter-sale": {
      await createSale({
        lines: [
          {
            productId: payloadString(action.payload, "productId"),
            name: payloadString(action.payload, "productName"),
            unitPrice: Number(payloadString(action.payload, "unitPrice") || "0"),
            quantity: Number(payloadString(action.payload, "quantity") || "1"),
            station: payloadString(action.payload, "station"),
          },
        ],
        paymentMethod: action.payload.paymentMethod as "cash" | "card" | "transfer" | "other",
      });
      return undefined;
    }

    case "open-table": {
      await openTableSession({
        organizationId: context.organizationId,
        branchId: context.branchId,
        tableId: payloadString(action.payload, "tableId"),
        tableNumber: Number(payloadString(action.payload, "tableNumber") || "0"),
        guestToken: payloadString(action.payload, "qrToken"),
        actorUserId: context.userId,
      });
      return undefined;
    }

    case "add-table-order": {
      await addTableSessionLines({
        organizationId: context.organizationId,
        sessionId: payloadString(action.payload, "sessionId"),
        guestToken: payloadString(action.payload, "guestToken"),
        lines: [
          {
            productId: payloadString(action.payload, "productId"),
            name: payloadString(action.payload, "productName"),
            unitPrice: Number(payloadString(action.payload, "unitPrice") || "0"),
            quantity: Number(payloadString(action.payload, "quantity") || "1"),
            station: payloadString(action.payload, "station") as KitchenStation,
            source: "staff",
          },
        ],
        actorUserId: context.userId,
      });
      return undefined;
    }

    case "send-kitchen": {
      await sendTableSessionToKitchen({ sessionId: action.payload.sessionId });
      return undefined;
    }

    case "update-kitchen-order": {
      await updateKitchenOrderStatus({
        orderId: payloadString(action.payload, "orderId"),
        status: (payloadString(action.payload, "status") || "preparing") as
          | "preparing"
          | "ready"
          | "delivered",
      });
      return undefined;
    }

    case "ghost-agent-query": {
      const response = await callGhostAgent({
        message: action.payload.message,
        sessionId: action.payload.sessionId,
        allowWebSearch: true,
        contextSummary: action.payload.contextSummary,
        history: action.payload.history?.map((entry) => ({
          role: entry.speaker === "user" ? "user" : "ghost",
          text: entry.text,
        })),
      });
      const sources =
        response.sources.length > 0
          ? `\n\nFuentes:\n${response.sources.map((source) => `· ${source.title}: ${source.url}`).join("\n")}`
          : "";
      return {
        message: `${response.answer}${sources}`,
      };
    }

    default:
      return undefined;
  }
}

export function buildBeverageSetupPending(
  products: Array<{ id: string; name: string }>,
  recipes: Array<{ menuProductId: string; advancedSetupAnswers?: Record<string, string> }>,
): Array<{ productId: string; name: string; progress: string }> {
  const pending: Array<{ productId: string; name: string; progress: string }> = [];

  for (const product of products) {
    const spec = getBeverageAdvancedSetupSpec(product.name);
    if (!spec) {
      continue;
    }

    const recipe = recipes.find((entry) => entry.menuProductId === product.id);
    const progress = getBeverageAdvancedSetupProgress(
      product.name,
      recipe?.advancedSetupAnswers,
    );

    if (!progress.isComplete) {
      pending.push({
        productId: product.id,
        name: product.name,
        progress: `${progress.answered}/${progress.total} respuestas`,
      });
    }
  }

  return pending;
}
