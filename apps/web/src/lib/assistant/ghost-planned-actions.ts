import type { GhostAgentPlannedAction } from "@ghost/domain";

import type { GhostChatAction, GhostChatContext } from "@/lib/assistant/ghost-chat-engine";

function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findProductByName(name: string, context: GhostChatContext) {
  const normalized = normalizeText(name);
  for (const product of context.menuProducts) {
    const productName = normalizeText(product.name);
    if (productName === normalized || productName.includes(normalized) || normalized.includes(productName)) {
      return product;
    }
  }
  return null;
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
          payload: {
            openingAmount: Number(planned.args.openingAmount ?? 0),
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
      default:
        break;
    }
  }

  return actions;
}
