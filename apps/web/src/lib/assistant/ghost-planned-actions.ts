import type { GhostAgentPlannedAction } from "@ghost/domain";

import type { GhostChatAction, GhostChatContext } from "@/lib/assistant/ghost-chat-engine";

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findByName<T extends { name: string }>(name: string, items: T[]): T | null {
  const normalized = normalizeText(name);
  for (const item of items) {
    const itemName = normalizeText(item.name);
    if (itemName === normalized || itemName.includes(normalized) || normalized.includes(itemName)) {
      return item;
    }
  }
  return null;
}

function findProductByName(name: string, context: GhostChatContext) {
  return findByName(name, context.menuProducts);
}

function findInventoryByName(name: string, context: GhostChatContext) {
  return findByName(name, context.inventoryItems);
}

function findTableByNumber(tableNumber: string, context: GhostChatContext) {
  const number = Number(tableNumber);
  if (!Number.isFinite(number)) {
    return null;
  }
  return context.tables.find((table) => table.number === number) ?? null;
}

function findOpenSessionByTableNumber(tableNumber: string, context: GhostChatContext) {
  const number = Number(tableNumber);
  if (!Number.isFinite(number)) {
    return null;
  }
  return context.openTableSessions.find((session) => session.tableNumber === number) ?? null;
}

function slugSku(name: string): string {
  const base = normalizeText(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12);
  return (base || "insumo").toUpperCase();
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function resolvePlannedActionsToChatActions(
  plannedActions: GhostAgentPlannedAction[],
  context: GhostChatContext,
): GhostChatAction[] {
  const actions: GhostChatAction[] = [];

  for (const planned of plannedActions) {
    switch (planned.tool) {
      case "update_product_price": {
        const product = findProductByName(String(planned.args.productName ?? ""), context);
        if (!product) {
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
        const session = findOpenSessionByTableNumber(String(planned.args.tableNumber ?? ""), context);
        if (!session) {
          continue;
        }
        actions.push({
          type: "checkout-table",
          payload: {
            sessionId: session.sessionId,
            tableNumber: String(session.tableNumber),
            paymentMethod: String(planned.args.paymentMethod ?? "cash"),
            documentType: String(planned.args.documentType ?? "factura"),
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
          continue;
        }
        const direction = String(planned.args.direction ?? "inflow");
        actions.push({
          type: direction === "outflow" ? "register-cash-outflow" : "register-cash-inflow",
          payload: {
            sessionId: context.cashSnapshot.sessionId,
            amount: Number(planned.args.amount ?? 0),
            reason: String(planned.args.reason ?? ""),
            movementType: direction,
          },
        });
        break;
      }
      case "add_table_order": {
        const product = findProductByName(String(planned.args.productName ?? ""), context);
        const table = findTableByNumber(String(planned.args.tableNumber ?? ""), context);
        const session = findOpenSessionByTableNumber(String(planned.args.tableNumber ?? ""), context);
        if (!product || !table) {
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
        const table = findTableByNumber(String(planned.args.tableNumber ?? ""), context);
        if (!table) {
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
        const table = findTableByNumber(String(planned.args.tableNumber ?? ""), context);
        const session = findOpenSessionByTableNumber(String(planned.args.tableNumber ?? ""), context);
        if (!table && !session) {
          continue;
        }
        actions.push({
          type: "cancel-table-session",
          payload: {
            sessionId: session?.sessionId ?? "",
            tableId: table?.id ?? session?.tableId ?? "",
            tableNumber: String(planned.args.tableNumber ?? table?.number ?? session?.tableNumber ?? ""),
          },
        });
        break;
      }
      case "send_kitchen_order": {
        const session = findOpenSessionByTableNumber(String(planned.args.tableNumber ?? ""), context);
        if (!session) {
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
          ? Number(planned.args.tableNumber)
          : undefined;
        const order =
          (tableNumber
            ? context.kitchenOrders.find((entry) => entry.tableNumber === tableNumber)
            : null) ?? context.kitchenOrders[0];
        if (!order) {
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

  return actions;
}
