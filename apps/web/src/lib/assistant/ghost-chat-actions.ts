import {
  getBeverageAdvancedSetupProgress,
  getBeverageAdvancedSetupSpec,
  sanitizeBeverageAdvancedSetupAnswers,
  type BaseUnit,
  type InventoryItemType,
  type KitchenStation,
  type MenuCategory,
  type RecipeLineInput,
} from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

import { closeCashSession, openCashSession, registerCashMovement } from "@/lib/cash/cash";
import { seedCostMatrix } from "@/lib/costing/seed-cost-matrix";
import { seedRecipeForProduct } from "@/lib/costing/seed-recipe-for-product";
import { createFixedExpense } from "@/lib/expenses/expenses";
import { getFirestoreDb } from "@/lib/firebase/client";
import {
  createInventoryItem,
  createWarehouse,
  registerInventoryMovement,
} from "@/lib/inventory/inventory";
import { createPurchaseInvoice, confirmPurchaseInvoice } from "@/lib/purchases/purchases";
import {
  createMenuProduct,
  createSale,
  deleteMenuProduct,
  toggleMenuProductStatus,
  updateKitchenOrderStatus,
  updateMenuProduct,
} from "@/lib/pos/pos";
import { saveRecipe } from "@/lib/recipes/recipes";
import {
  addTableSessionLines,
  cancelTableSession,
  checkoutTableSession,
  openTableSession,
  sendTableSessionToKitchen,
} from "@/lib/tables/table-sessions";
import { createDiningTable } from "@/lib/tables/tables";
import { findOpenTableSessionClient } from "@/lib/tables/table-sessions-client";
import { callGhostAgent } from "@/lib/firebase/functions";
import { resolveGhostAgentQuery } from "@/lib/assistant/ghost-agent-client";
import { sendSaleDocument } from "@/lib/sales/send-sale-document";
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

    case "build-recipe-cost": {
      const result = await seedRecipeForProduct(action.payload.productName);
      const warningNote =
        result.warnings.length > 0 ? `\n\nNotas: ${result.warnings.slice(0, 2).join(" · ")}` : "";
      return {
        message:
          `Ficha de **${action.payload.productName}** ${result.created ? "creada" : "actualizada"}. ` +
          `Costo por porción: **$${Math.round(result.recipeCost).toLocaleString("es-CO")}**.` +
          ` La matriz de costos y reportes ya reflejan el cambio.` +
          warningNote,
      };
    }

    case "save-recipe-cost": {
      const lines = JSON.parse(action.payload.recipeLines ?? "[]") as RecipeLineInput[];
      const productId = action.payload.productId ?? "";
      const productName = action.payload.productName ?? "producto";
      const price = Number(action.payload.price ?? 0);
      const yieldQuantity = Number(action.payload.yieldQuantity ?? 1);
      const category = (action.payload.category ?? "beverage") as MenuCategory;

      if (price > 0) {
        await updateMenuProduct({
          productId,
          price,
        });
      }

      const result = await saveRecipe({
        menuProductId: productId,
        menuProductName: productName,
        yieldQuantity,
        category,
        lines,
      });

      return {
        message:
          `Ficha de **${productName}** guardada. Costo por porción: **$${Math.round(result.recipeCost).toLocaleString("es-CO")}**` +
          (price > 0 ? ` · Precio de venta: **$${price.toLocaleString("es-CO")}**` : "") +
          ". Matriz de costos, menú POS e informes actualizados.",
      };
    }

    case "open-cash-session": {
      await openCashSession({
        openingAmount: action.payload.openingAmount,
      });
      return undefined;
    }

    case "close-cash-session": {
      await closeCashSession({
        sessionId: action.payload.sessionId,
        countedAmount: action.payload.countedAmount,
        expectedAmount: action.payload.expectedAmount,
      });
      const difference = action.payload.countedAmount - action.payload.expectedAmount;
      const differenceNote =
        difference === 0
          ? "Arqueo cuadrado."
          : `Diferencia de **$${Math.abs(difference).toLocaleString("es-CO")}** (${difference > 0 ? "sobrante" : "faltante"}).`;
      return {
        message: `Caja cerrada. ${differenceNote}`,
      };
    }

    case "register-cash-outflow": {
      await registerCashMovement({
        sessionId: action.payload.sessionId,
        type: "outflow",
        amount: action.payload.amount,
        reason: action.payload.reason,
      });
      return {
        message: `Salida registrada: **$${action.payload.amount.toLocaleString("es-CO")}** — ${action.payload.reason}.`,
      };
    }

    case "register-cash-inflow": {
      await registerCashMovement({
        sessionId: action.payload.sessionId,
        type: "inflow",
        amount: action.payload.amount,
        reason: action.payload.reason,
      });
      return {
        message: `Entrada registrada: **$${action.payload.amount.toLocaleString("es-CO")}** — ${action.payload.reason}.`,
      };
    }

    case "create-counter-sale": {
      const paymentMethod = (payloadString(action.payload, "paymentMethod") || "cash") as
        | "cash"
        | "card"
        | "transfer"
        | "other";
      const documentType = payloadString(action.payload, "documentType");
      const customerName = payloadString(action.payload, "customerName");
      const customerEmail = payloadString(action.payload, "customerEmail");

      const result = await createSale({
        lines: [
          {
            productId: payloadString(action.payload, "productId"),
            name: payloadString(action.payload, "productName"),
            unitPrice: Number(payloadString(action.payload, "unitPrice") || "0"),
            quantity: Number(payloadString(action.payload, "quantity") || "1"),
            station: payloadString(action.payload, "station"),
          },
        ],
        paymentMethod,
        customerName: customerName || undefined,
        notes: documentType
          ? documentType === "cuenta_cobro"
            ? "Cuenta de cobro"
            : "Factura de venta"
          : undefined,
      });

      const documentLabel =
        documentType === "cuenta_cobro" ? "Cuenta de cobro" : "Factura de venta";
      let emailNote = "";

      if (documentType && customerEmail && customerEmail !== "skip") {
        const emailResult = await sendSaleDocument({
          organizationId: context.organizationId,
          saleId: result.saleId,
          email: customerEmail,
          documentType: documentType === "cuenta_cobro" ? "cuenta_cobro" : "factura",
        });
        emailNote = emailResult.sent
          ? emailResult.method === "emailjs" || emailResult.method === "cloud"
            ? `\nEnvié el comprobante a **${customerEmail}**.`
            : `\nAbrí tu correo con el comprobante para **${customerEmail}**. Revisa y envía el mensaje.`
          : `\nNo pude enviar el correo (${emailResult.message ?? "revisa configuración en Ajustes → Notificaciones"}). Puedes imprimirlo en **Registros**.`;
      } else if (documentType) {
        emailNote = "\nPuedes imprimir el comprobante en **Registros** o dime un correo para enviarlo.";
      }

      const customerNote = customerName ? ` — cliente **${customerName}**` : "";
      const docNote = documentType ? `${documentLabel} **${result.saleNumber}**` : `Venta **${result.saleNumber}**`;

      return {
        message:
          `${docNote}${customerNote} — **${payloadString(action.payload, "productName")}** × ` +
          `${payloadString(action.payload, "quantity")} — **$${result.total.toLocaleString("es-CO")}** ` +
          `(${paymentMethod}). Comanda enviada.${emailNote}`,
      };
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
      let sessionId = payloadString(action.payload, "sessionId");
      let guestToken = payloadString(action.payload, "guestToken");
      const tableId = payloadString(action.payload, "tableId");
      const tableNumber = Number(payloadString(action.payload, "tableNumber") || "0");

      if (!sessionId && tableId) {
        const opened = await openTableSession({
          organizationId: context.organizationId,
          branchId: context.branchId,
          tableId,
          tableNumber,
          guestToken: payloadString(action.payload, "qrToken"),
          actorUserId: context.userId,
        });
        sessionId = opened.sessionId;
        guestToken = payloadString(action.payload, "qrToken");
      }

      await addTableSessionLines({
        organizationId: context.organizationId,
        sessionId,
        guestToken,
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

      return {
        message:
          `**${payloadString(action.payload, "quantity")} × ${payloadString(action.payload, "productName")}** ` +
          `en mesa **${tableNumber || "?"}**. Comanda enviada a barra/cocina.`,
      };
    }

    case "checkout-table": {
      const paymentMethod = (payloadString(action.payload, "paymentMethod") || "cash") as
        | "cash"
        | "card"
        | "transfer"
        | "other";
      const documentType = payloadString(action.payload, "documentType") || "factura";
      const customerEmail = payloadString(action.payload, "customerEmail");
      const tableNumber = payloadString(action.payload, "tableNumber");

      const result = await checkoutTableSession({
        sessionId: payloadString(action.payload, "sessionId"),
        paymentMethod,
      });

      const documentLabel =
        documentType === "cuenta_cobro" ? "Cuenta de cobro" : "Factura de venta";
      let emailNote = "";

      if (customerEmail && customerEmail !== "skip") {
        const emailResult = await sendSaleDocument({
          organizationId: context.organizationId,
          saleId: result.saleId,
          email: customerEmail,
          documentType: documentType === "cuenta_cobro" ? "cuenta_cobro" : "factura",
        });
        emailNote = emailResult.sent
          ? emailResult.method === "emailjs" || emailResult.method === "cloud"
            ? `\nEnvié el comprobante a **${customerEmail}**.`
            : `\nAbrí tu correo con la cuenta para **${customerEmail}**. Revisa y envía el mensaje.`
          : `\nNo pude enviar el correo (${emailResult.message ?? "revisa configuración en Ajustes → Notificaciones"}). Puedes imprimirlo en Registros.`;
      } else {
        emailNote = "\nPuedes imprimir el comprobante en **Registros** o decirme un correo para enviarlo.";
      }

      return {
        message:
          `${documentLabel} **${result.saleNumber}** — mesa **${tableNumber || "?"}** — ` +
          `**$${result.total.toLocaleString("es-CO")}** (${paymentMethod}).${emailNote}`,
      };
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

    case "delete-menu-product": {
      await deleteMenuProduct({
        productId: payloadString(action.payload, "productId"),
      });
      return {
        message: `**${payloadString(action.payload, "productName")}** eliminado del catálogo y su ficha de costos.`,
      };
    }

    case "update-menu-product": {
      const productId = payloadString(action.payload, "productId");
      const price = Number(payloadString(action.payload, "price") || "0");
      const status = payloadString(action.payload, "status");

      if (price > 0) {
        await updateMenuProduct({ productId, price });
      }
      if (status === "active" || status === "inactive") {
        await toggleMenuProductStatus({ productId, status });
      }

      const productName = payloadString(action.payload, "productName");
      if (status === "inactive") {
        return { message: `**${productName}** desactivado en el menú.` };
      }
      if (status === "active") {
        return { message: `**${productName}** activado en el menú.` };
      }
      return {
        message: `Precio de **${productName}** actualizado a **$${price.toLocaleString("es-CO")}**.`,
      };
    }

    case "register-inventory-movement": {
      if (!context.defaultWarehouseId) {
        throw new Error("No hay bodega configurada. Di «crea bodega principal» primero.");
      }

      const movementType = payloadString(action.payload, "movementType") || "entry";
      const quantity = Number(payloadString(action.payload, "quantity") || "1");

      const result = await registerInventoryMovement({
        branchId: context.branchId,
        warehouseId: context.defaultWarehouseId,
        itemId: payloadString(action.payload, "inventoryItemId"),
        type: movementType,
        quantity,
        notes: `Ghost: ${movementType}`,
      });

      const label =
        movementType === "entry"
          ? "Entrada"
          : movementType === "exit"
            ? "Salida"
            : movementType === "waste"
              ? "Merma"
              : "Ajuste";

      return {
        message:
          `${label} de **${quantity}** de **${payloadString(action.payload, "itemName")}** registrada. ` +
          `Stock después: **${result.balanceAfter.toLocaleString("es-CO")}**.`,
      };
    }

    case "create-fixed-expense": {
      await createFixedExpense({
        name: payloadString(action.payload, "name"),
        category: (payloadString(action.payload, "category") || "other") as
          | "rent"
          | "payroll"
          | "utilities"
          | "services"
          | "insurance"
          | "marketing"
          | "other",
        amount: Number(payloadString(action.payload, "amount") || "0"),
        frequency: (payloadString(action.payload, "frequency") || "monthly") as
          | "weekly"
          | "biweekly"
          | "monthly"
          | "annual",
      });
      return undefined;
    }

    case "cancel-table-session": {
      let sessionId = payloadString(action.payload, "sessionId");
      const tableId = payloadString(action.payload, "tableId");

      if (!sessionId && tableId) {
        const open = await findOpenTableSessionClient({
          organizationId: context.organizationId,
          tableId,
        });
        sessionId = open?.sessionId ?? "";
      }

      if (!sessionId) {
        throw new Error("No encontré sesión abierta en esa mesa.");
      }

      await cancelTableSession({ sessionId });
      return {
        message: `Mesa **${payloadString(action.payload, "tableNumber") || "?"}** cancelada sin cobro.`,
      };
    }

    case "create-dining-table": {
      await createDiningTable({
        number: Number(payloadString(action.payload, "tableNumber") || "0"),
        label: payloadString(action.payload, "label") || undefined,
      });
      return {
        message: `Mesa **${payloadString(action.payload, "tableNumber")}** creada.`,
      };
    }

    case "create-warehouse": {
      const name = payloadString(action.payload, "name");
      const code = name
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8) || "BODEGA";
      await createWarehouse({
        name,
        code,
        branchId: context.branchId,
        isDefault: true,
      });
      return { message: `Bodega **${name}** creada.` };
    }

    case "ghost-agent-query": {
      const response = await resolveGhostAgentQuery({
        organizationId: context.organizationId,
        message: action.payload.message,
        sessionId: action.payload.sessionId,
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
