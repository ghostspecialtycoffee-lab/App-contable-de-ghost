import {
  findBestNameMatch,
  findTableByReference,
  type GhostAgentPlannedAction,
} from "@ghost/domain";

import type { GhostChatAction, GhostChatContext } from "@/lib/assistant/ghost-chat-engine";

export interface PlannedActionSkip {
  tool: string;
  detail: string;
  suggestions: string[];
}

export interface PlannedActionsResolution {
  actions: GhostChatAction[];
  skipped: PlannedActionSkip[];
}

function findProductByName(name: string, context: GhostChatContext) {
  return findBestNameMatch(name, context.menuProducts);
}

function findInventoryByName(name: string, context: GhostChatContext) {
  return findBestNameMatch(name, context.inventoryItems);
}

function resolveTableNumber(
  reference: string | undefined,
  context: GhostChatContext,
): number | null {
  if (reference) {
    const table = findTableByReference(reference, context.tables);
    if (table) {
      return table.number;
    }
    const numeric = Number(reference.replace(/[^0-9]/g, ""));
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  if (context.openTableSessions.length === 1) {
    return context.openTableSessions[0]!.tableNumber;
  }

  return null;
}

function findTableByNumber(tableNumber: number, context: GhostChatContext) {
  return context.tables.find((table) => table.number === tableNumber) ?? null;
}

function findOpenSessionByTableNumber(tableNumber: number, context: GhostChatContext) {
  return context.openTableSessions.find((session) => session.tableNumber === tableNumber) ?? null;
}

function slugSku(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);
  return (base || "insumo").toUpperCase();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function pushSkip(
  skipped: PlannedActionSkip[],
  tool: string,
  detail: string,
  suggestions: string[],
): void {
  skipped.push({ tool, detail, suggestions });
}

export function resolvePlannedActionsToChatActions(
  plannedActions: GhostAgentPlannedAction[],
  context: GhostChatContext,
): GhostChatAction[] {
  return resolvePlannedActions(plannedActions, context).actions;
}

export function resolvePlannedActions(
  plannedActions: GhostAgentPlannedAction[],
  context: GhostChatContext,
): PlannedActionsResolution {
  const actions: GhostChatAction[] = [];
  const skipped: PlannedActionSkip[] = [];

  for (const planned of plannedActions) {
    switch (planned.tool) {
      case "update_product_price": {
        const product = findProductByName(String(planned.args.productName ?? ""), context);
        if (!product) {
          pushSkip(
            skipped,
            planned.tool,
            `No encontré el producto «${planned.args.productName}»`,
            context.menuProducts.slice(0, 6).map((entry) => entry.name),
          );
          continue;
        }
        actions.push({
          type: "update-menu-product",
          payload: {
            productId: product.id,
            productName: product.name,
            price: String(planned.args.price ?? ""),
          },
        });
        break;
      }
      case "update_product_status": {
        const product = findProductByName(String(planned.args.productName ?? ""), context);
        if (!product) {
          pushSkip(
            skipped,
            planned.tool,
            `No encontré el producto «${planned.args.productName}»`,
            context.menuProducts.slice(0, 6).map((entry) => entry.name),
          );
          continue;
        }
        actions.push({
          type: "update-menu-product",
          payload: {
            productId: product.id,
            productName: product.name,
            status: String(planned.args.status ?? "active"),
          },
        });
        break;
      }
      case "delete_menu_product": {
        const product = findProductByName(String(planned.args.productName ?? ""), context);
        if (!product) {
          pushSkip(
            skipped,
            planned.tool,
            `No encontré el producto «${planned.args.productName}»`,
            context.menuProducts.slice(0, 6).map((entry) => entry.name),
          );
          continue;
        }
        actions.push({
          type: "delete-menu-product",
          payload: { productId: product.id, productName: product.name },
        });
        break;
      }
      case "create_menu_product": {
        actions.push({
          type: "create-menu-product",
          payload: {
            name: String(planned.args.name ?? ""),
            price: String(planned.args.price ?? "0"),
            category: String(planned.args.category ?? "beverage"),
            station: String(planned.args.station ?? "bar"),
          },
        });
        break;
      }
      case "register_sale": {
        const product = findProductByName(String(planned.args.productName ?? ""), context);
        if (!product) {
          pushSkip(
            skipped,
            planned.tool,
            `No encontré el producto «${planned.args.productName}»`,
            context.menuProducts.slice(0, 6).map((entry) => entry.name),
          );
          continue;
        }
        actions.push({
          type: "create-counter-sale",
          payload: {
            productId: product.id,
            productName: product.name,
            unitPrice: String(product.price),
            quantity: String(planned.args.quantity ?? "1"),
            paymentMethod: String(planned.args.paymentMethod ?? "cash"),
            documentType: "factura",
            customerEmail: "skip",
            station: product.station ?? "bar",
          },
        });
        break;
      }
      case "checkout_table": {
        const tableNumber = resolveTableNumber(String(planned.args.tableNumber ?? ""), context);
        if (!tableNumber) {
          pushSkip(
            skipped,
            planned.tool,
            "No pude identificar la mesa a cobrar",
            context.openTableSessions.map((session) => `Mesa ${session.tableNumber}`),
          );
          continue;
        }
        const session = findOpenSessionByTableNumber(tableNumber, context);
        if (!session) {
          pushSkip(
            skipped,
            planned.tool,
            `La mesa ${tableNumber} no tiene cuenta abierta`,
            context.openTableSessions.map((entry) => `Mesa ${entry.tableNumber}`),
          );
          continue;
        }
        actions.push({
          type: "checkout-table",
          payload: {
            sessionId: session.sessionId,
            tableNumber: String(session.tableNumber),
            paymentMethod: String(planned.args.paymentMethod ?? "cash"),
            documentType: String(planned.args.documentType ?? "cuenta_cobro"),
            customerEmail: String(planned.args.customerEmail ?? "skip"),
          },
        });
        break;
      }
      case "open_cash_register": {
        actions.push({
          type: "open-cash-session",
          payload: { openingAmount: Number(planned.args.openingAmount ?? 0) },
        });
        break;
      }
      case "close_cash_register": {
        if (!context.cashSnapshot?.sessionId) {
          pushSkip(skipped, planned.tool, "No hay caja abierta para cerrar", []);
          continue;
        }
        actions.push({
          type: "close-cash-session",
          payload: {
            sessionId: context.cashSnapshot.sessionId,
            countedAmount: Number(planned.args.countedAmount ?? 0),
            expectedAmount: context.cashSnapshot.expectedAmount,
          },
        });
        break;
      }
      case "cash_movement": {
        if (!context.cashSnapshot?.sessionId) {
          pushSkip(skipped, planned.tool, "No hay caja abierta para el movimiento", []);
          continue;
        }
        const direction = String(planned.args.direction ?? "inflow");
        actions.push({
          type: direction === "outflow" ? "register-cash-outflow" : "register-cash-inflow",
          payload: {
            sessionId: context.cashSnapshot.sessionId,
            amount: Number(planned.args.amount ?? 0),
            reason: String(planned.args.reason ?? "Ajuste operativo"),
            movementType: direction,
          },
        });
        break;
      }
      case "add_table_order": {
        const product = findProductByName(String(planned.args.productName ?? ""), context);
        const tableNumber = resolveTableNumber(String(planned.args.tableNumber ?? ""), context);
        if (!product) {
          pushSkip(
            skipped,
            planned.tool,
            `No encontré el producto «${planned.args.productName}»`,
            context.menuProducts.slice(0, 6).map((entry) => entry.name),
          );
          continue;
        }
        if (!tableNumber) {
          pushSkip(
            skipped,
            planned.tool,
            "No pude identificar la mesa del pedido",
            context.openTableSessions.map((session) => `Mesa ${session.tableNumber}`),
          );
          continue;
        }
        const table = findTableByNumber(tableNumber, context);
        const session = findOpenSessionByTableNumber(tableNumber, context);
        if (!table) {
          pushSkip(skipped, planned.tool, `No existe la mesa ${tableNumber}`, []);
          continue;
        }
        actions.push({
          type: "add-table-order",
          payload: {
            productId: product.id,
            productName: product.name,
            unitPrice: String(product.price),
            quantity: String(planned.args.quantity ?? "1"),
            station: product.station ?? "bar",
            tableId: table.id,
            tableNumber: String(table.number),
            qrToken: table.qrToken ?? "",
            sessionId: session?.sessionId ?? "",
            guestToken: session?.guestToken ?? "",
          },
        });
        break;
      }
      case "open_table": {
        const tableNumber = resolveTableNumber(String(planned.args.tableNumber ?? ""), context);
        if (!tableNumber) {
          pushSkip(
            skipped,
            planned.tool,
            "No pude identificar qué mesa abrir",
            context.tables.map((table) => `Mesa ${table.number}${table.label ? ` (${table.label})` : ""}`),
          );
          continue;
        }
        const table = findTableByNumber(tableNumber, context);
        if (!table) {
          pushSkip(skipped, planned.tool, `No existe la mesa ${tableNumber}`, []);
          continue;
        }
        actions.push({
          type: "open-table",
          payload: {
            tableId: table.id,
            tableNumber: String(table.number),
            qrToken: table.qrToken ?? "",
          },
        });
        break;
      }
      case "cancel_table": {
        const tableNumber = resolveTableNumber(String(planned.args.tableNumber ?? ""), context);
        const session = tableNumber ? findOpenSessionByTableNumber(tableNumber, context) : null;
        const table = tableNumber ? findTableByNumber(tableNumber, context) : null;
        if (!table && !session) {
          pushSkip(
            skipped,
            planned.tool,
            "No pude identificar la mesa a cancelar",
            context.openTableSessions.map((entry) => `Mesa ${entry.tableNumber}`),
          );
          continue;
        }
        actions.push({
          type: "cancel-table-session",
          payload: {
            sessionId: session?.sessionId ?? "",
            tableId: table?.id ?? session?.tableId ?? "",
            tableNumber: String(tableNumber ?? table?.number ?? session?.tableNumber ?? ""),
          },
        });
        break;
      }
      case "send_kitchen_order": {
        const tableNumber = resolveTableNumber(String(planned.args.tableNumber ?? ""), context);
        const session = tableNumber ? findOpenSessionByTableNumber(tableNumber, context) : null;
        if (!session) {
          pushSkip(
            skipped,
            planned.tool,
            "No hay mesa abierta con comanda pendiente",
            context.openTableSessions.map((entry) => `Mesa ${entry.tableNumber}`),
          );
          continue;
        }
        actions.push({
          type: "send-kitchen",
          payload: { sessionId: session.sessionId },
        });
        break;
      }
      case "update_kitchen_status": {
        const tableNumber = planned.args.tableNumber
          ? resolveTableNumber(String(planned.args.tableNumber), context)
          : context.kitchenOrders[0]?.tableNumber ?? null;
        const order =
          (tableNumber
            ? context.kitchenOrders.find((entry) => entry.tableNumber === tableNumber)
            : null) ?? context.kitchenOrders[0];
        if (!order) {
          pushSkip(skipped, planned.tool, "No hay comandas activas para actualizar", []);
          continue;
        }
        actions.push({
          type: "update-kitchen-order",
          payload: {
            orderId: order.id,
            status: String(planned.args.status ?? "preparing"),
          },
        });
        break;
      }
      case "inventory_movement": {
        const item = findInventoryByName(String(planned.args.itemName ?? ""), context);
        if (!item) {
          pushSkip(
            skipped,
            planned.tool,
            `No encontré el insumo «${planned.args.itemName}»`,
            context.inventoryItems.slice(0, 6).map((entry) => entry.name),
          );
          continue;
        }
        actions.push({
          type: "register-inventory-movement",
          payload: {
            inventoryItemId: item.id,
            itemName: item.name,
            quantity: String(planned.args.quantity ?? "1"),
            movementType: String(planned.args.movementType ?? "entry"),
          },
        });
        break;
      }
      case "create_inventory_item": {
        const name = String(planned.args.name ?? "");
        if (!name) {
          pushSkip(skipped, planned.tool, "Falta el nombre del insumo", []);
          continue;
        }
        actions.push({
          type: "create-inventory-item",
          payload: {
            name,
            sku: slugSku(name),
            baseUnit: String(planned.args.baseUnit ?? "unit"),
            type: "raw_material",
          },
        });
        break;
      }
      case "register_purchase": {
        const item = findInventoryByName(String(planned.args.itemName ?? ""), context);
        if (!item) {
          pushSkip(
            skipped,
            planned.tool,
            `No encontré el insumo «${planned.args.itemName}»`,
            context.inventoryItems.slice(0, 6).map((entry) => entry.name),
          );
          continue;
        }
        actions.push({
          type: "create-purchase-invoice",
          payload: {
            supplierName: String(planned.args.supplierName ?? ""),
            invoiceNumber: `LLM-${Date.now()}`,
            invoiceDate: todayIso(),
            inventoryItemId: item.id,
            itemName: item.name,
            quantity: String(planned.args.quantity ?? "1"),
            unitCost: String(planned.args.unitCost ?? "0"),
          },
        });
        break;
      }
      case "create_fixed_expense": {
        actions.push({
          type: "create-fixed-expense",
          payload: {
            name: String(planned.args.name ?? ""),
            amount: String(planned.args.amount ?? "0"),
            category: String(planned.args.category ?? "other"),
            frequency: "monthly",
          },
        });
        break;
      }
      case "load_ghost_menu": {
        actions.push({ type: "seed-ghost-menu" });
        break;
      }
      case "build_recipe_cost": {
        const product = findProductByName(String(planned.args.productName ?? ""), context);
        if (!product) {
          pushSkip(
            skipped,
            planned.tool,
            `No encontré el producto «${planned.args.productName}»`,
            context.menuProducts.slice(0, 6).map((entry) => entry.name),
          );
          continue;
        }
        actions.push({
          type: "build-recipe-cost",
          payload: { productId: product.id, productName: product.name },
        });
        break;
      }
      default:
        break;
    }
  }

  return { actions, skipped };
}

export function formatPlannedActionSkips(skipped: PlannedActionSkip[]): string {
  if (skipped.length === 0) {
    return "";
  }

  return skipped
    .map((entry) => {
      const suggestions =
        entry.suggestions.length > 0
          ? `\nOpciones: ${entry.suggestions.join(", ")}`
          : "";
      return `· ${entry.detail}${suggestions}`;
    })
    .join("\n");
}
