"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildBeverageSetupPending,
  executeGhostChatAction,
} from "@/lib/assistant/ghost-chat-actions";
import {
  createGhostChatMessage,
  createInitialGhostChatTurn,
  formatGhostActionError,
  formatGhostActionSuccess,
  processGhostChatTurn,
  type GhostChatContext,
} from "@/lib/assistant/ghost-chat-engine";
import { getCallableErrorMessage } from "@/lib/auth/errors";
import { isCatalogBeverage } from "@/lib/costing/ghost-menu-catalog";
import { useCashSession, useCashSessionSales } from "@/hooks/use-cash-session";
import { useCostMatrixSettings } from "@/hooks/use-cost-matrix-settings";
import { useDiningTables } from "@/hooks/use-dining-tables";
import { useFixedExpenses } from "@/hooks/use-fixed-expenses";
import { useInventoryBalances } from "@/hooks/use-inventory-balances";
import { useInventoryMovements } from "@/hooks/use-inventory-movements";
import { useInventoryItems } from "@/hooks/use-inventory-items";
import { useKitchenOrders } from "@/hooks/use-kitchen-orders";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { usePurchaseInvoices } from "@/hooks/use-purchase-invoices";
import { usePurchasePriceHistory } from "@/hooks/use-purchase-price-history";
import { useRecipes } from "@/hooks/use-recipes";
import { useSales } from "@/hooks/use-sales";
import { useTableSessions } from "@/hooks/use-table-sessions";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useWorkShifts } from "@/hooks/use-work-shifts";
import { useAuth, useActiveMembership } from "@/providers/auth-provider";
import {
  calculateCashSessionBalance,
  createEmptyGhostChatSession,
  type GhostChatMessage,
  type GhostChatSession,
} from "@ghost/domain";

const STORAGE_PREFIX = "ghost-chat";

function storageKey(organizationId: string): string {
  return `${STORAGE_PREFIX}:${organizationId}`;
}

function loadPersistedChat(organizationId: string): {
  messages: GhostChatMessage[];
  session: GhostChatSession;
} | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(organizationId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as { messages: GhostChatMessage[]; session: GhostChatSession };
  } catch {
    return null;
  }
}

function persistChat(
  organizationId: string,
  messages: GhostChatMessage[],
  session: GhostChatSession,
): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    storageKey(organizationId),
    JSON.stringify({ messages, session }),
  );
}

export function useGhostChat() {
  const { organization, firebaseUser } = useAuth();
  const membership = useActiveMembership();
  const organizationId = organization?.id ?? "";
  const branchId = membership?.branchIds?.[0] ?? "";
  const { products } = useMenuProducts({ includeInactive: true });
  const { recipes } = useRecipes();
  const { items: inventoryItems } = useInventoryItems();
  const { balances: inventoryBalances } = useInventoryBalances();
  const { movements: inventoryMovements } = useInventoryMovements(400);
  const { entries: purchasePriceHistory } = usePurchasePriceHistory(200);
  const { expenses: fixedExpenses } = useFixedExpenses();
  const { warehouses } = useWarehouses();
  const { invoices } = usePurchaseInvoices();
  const { session: cashSession, movements: cashMovements } = useCashSession();
  const { cashSalesTotal } = useCashSessionSales(cashSession?.id ?? null);
  const { sales } = useSales();
  const { tables } = useDiningTables();
  const { orders: kitchenOrders } = useKitchenOrders();
  const { sessions: tableSessions } = useTableSessions({ openOnly: true });
  const { shifts: workShifts } = useWorkShifts();
  const costMatrixSettings = useCostMatrixSettings();

  const [messages, setMessages] = useState<GhostChatMessage[]>([]);
  const [session, setSession] = useState<GhostChatSession>(createEmptyGhostChatSession());
  const [processing, setProcessing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const context = useMemo<GhostChatContext>(() => {
    const openTableSessions = tableSessions.map((entry) => {
      const billableLines = entry.lines.filter((line) => line.status !== "cancelled");
      return {
        sessionId: entry.id,
        tableId: entry.tableId,
        tableNumber: entry.tableNumber,
        guestToken: entry.guestToken,
        lines: billableLines.map((line) => ({
          name: line.name,
          quantity: line.quantity,
          lineTotal: Math.round(line.unitPrice * line.quantity),
        })),
        total: billableLines.reduce(
          (sum, line) => sum + Math.round(line.unitPrice * line.quantity),
          0,
        ),
      };
    });

    const cashBalance = cashSession
      ? calculateCashSessionBalance({
          openingAmount: cashSession.openingAmount,
          cashSalesTotal,
          movements: cashMovements.map((movement) => ({
            type: movement.type,
            amount: movement.amount,
          })),
        })
      : null;

    const quantityByItemId = new Map<string, number>();
    for (const balance of inventoryBalances) {
      quantityByItemId.set(
        balance.itemId,
        (quantityByItemId.get(balance.itemId) ?? 0) + balance.quantity,
      );
    }

    const inventoryStockSnapshot = inventoryItems.map((item) => ({
      itemId: item.id,
      name: item.name,
      baseUnit: item.baseUnit,
      quantity: quantityByItemId.get(item.id) ?? 0,
      minStock: item.minStock ?? 0,
    }));

    return {
      organizationName: organization?.name,
      inventoryItems: inventoryItems.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        baseUnit: item.baseUnit,
        minStock: item.minStock,
      })),
      menuProducts: products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        station: product.station,
        status: product.status,
        saleTaxCategory: product.saleTaxCategory,
        recipeCost: product.recipeCost,
      })),
      warehouses: warehouses.map((warehouse) => ({
        id: warehouse.id,
        name: warehouse.name,
      })),
      tables: tables.map((table) => ({
        id: table.id,
        number: table.number,
        label: table.label ?? "",
        status: table.status,
        qrToken: table.qrToken,
      })),
      kitchenOrders: kitchenOrders.map((order) => ({
        id: order.id,
        saleNumber: order.saleNumber ?? "",
        status: order.status,
        station: order.station,
        tableNumber: order.tableNumber,
      })),
      openTableSessions,
      cashSessionOpen: Boolean(cashSession),
      invoiceCount: invoices.length,
      inventoryCount: inventoryItems.length,
      ghostBeverageCount: products.filter((product) => isCatalogBeverage(product.name)).length,
      beverageSetupPending: buildBeverageSetupPending(products, recipes),
      salesSnapshot: sales.map((sale) => ({
        soldAt: sale.soldAt ?? sale.createdAt,
        soldOn: sale.soldOn ?? (sale.soldAt ?? sale.createdAt).slice(0, 10),
        status: sale.status,
        subtotal: sale.subtotal,
        taxAmount: sale.taxAmount,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        tableNumber: sale.tableNumber,
        lines: sale.lines.map((line) => ({
          name: line.name,
          quantity: line.quantity,
          lineTotal: line.lineTotal,
        })),
      })),
      purchasesSnapshot: invoices.map((invoice) => ({
        supplierName: invoice.supplierName,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        subtotal: invoice.subtotal,
        taxAmount: invoice.taxAmount,
        total: invoice.total,
        status: invoice.status,
      })),
      cashSnapshot: cashSession && cashBalance
        ? {
            sessionId: cashSession.id,
            openingAmount: cashSession.openingAmount,
            cashSalesTotal,
            expectedAmount: cashBalance.expectedAmount,
            inflowsTotal: cashBalance.inflowsTotal,
            outflowsTotal: cashBalance.outflowsTotal,
            movements: cashMovements.map((movement) => ({
              type: movement.type,
              amount: movement.amount,
              reason: movement.reason,
              occurredAt: movement.occurredAt,
            })),
          }
        : undefined,
      inventoryStockSnapshot,
      fixedExpensesSnapshot: fixedExpenses.map((expense) => ({
        name: expense.name,
        category: expense.category,
        amount: expense.amount,
        frequency: expense.frequency,
        monthlyEquivalent: expense.monthlyEquivalent,
        dueDay: expense.dueDay,
        isActive: expense.isActive,
      })),
      workShiftsSnapshot: workShifts.map((shift) => ({
        staffName: shift.staffName,
        role: shift.role,
        shiftDate: shift.shiftDate,
        startTime: shift.startTime,
        endTime: shift.endTime,
      })),
      recipesSnapshot: recipes.map((recipe) => ({
        menuProductId: recipe.menuProductId,
        productName: recipe.menuProductName,
        yieldQuantity: recipe.yieldQuantity,
        recipeCost:
          products.find((product) => product.id === recipe.menuProductId)?.recipeCost ?? 0,
        lines: recipe.lines.map((line) => ({
          inventoryItemId: line.inventoryItemId,
          itemName: line.itemName,
          quantity: line.quantity,
          unit: line.unit,
        })),
      })),
      inventoryCostSnapshot: inventoryItems.map((item) => ({
        itemId: item.id,
        name: item.name,
        baseUnit: item.baseUnit,
        averageCost: item.averageCost || item.lastCost || 0,
        purchaseUnit: item.purchaseUnit,
        presentationQuantity: item.presentationQuantity,
      })),
      inventoryMovementsSnapshot: inventoryMovements.map((movement) => ({
        itemId: movement.itemId,
        type: movement.type,
        quantity: movement.quantity,
        occurredAt: movement.occurredAt,
      })),
      purchasePriceHistorySnapshot: purchasePriceHistory.map((entry) => ({
        inventoryItemId: entry.inventoryItemId,
        supplierName: entry.supplierName,
        unitPriceNet: entry.unitPriceNet,
        purchasedAt: entry.purchasedAt,
      })),
      costMatrixSettings,
    };
  }, [
    organization?.name,
    inventoryItems,
    inventoryBalances,
    inventoryMovements,
    purchasePriceHistory,
    fixedExpenses,
    workShifts,
    products,
    warehouses,
    tables,
    kitchenOrders,
    tableSessions,
    cashSession,
    cashMovements,
    cashSalesTotal,
    sales,
    invoices,
    recipes,
    costMatrixSettings,
    inventoryMovements,
  ]);

  useEffect(() => {
    if (!organizationId || initialized) {
      return;
    }

    const persisted = loadPersistedChat(organizationId);
    if (persisted && persisted.messages.length > 0) {
      setMessages(persisted.messages);
      setSession(persisted.session);
      setInitialized(true);
      return;
    }

    const initial = createInitialGhostChatTurn(context);
    const initialMessages = initial.ghostMessages.map((text) =>
      createGhostChatMessage("ghost", text),
    );
    setMessages(initialMessages);
    setSession(initial.session);
    setInitialized(true);
  }, [organizationId, initialized, context]);

  useEffect(() => {
    if (!organizationId || !initialized) {
      return;
    }
    persistChat(organizationId, messages, session);
  }, [organizationId, messages, session, initialized]);

  const sendMessage = useCallback(
    async (input: string) => {
      if (!organizationId || !firebaseUser || processing) {
        return;
      }

      const trimmed = input.trim();
      if (!trimmed) {
        return;
      }

      const userMessage = createGhostChatMessage("user", trimmed);
      setMessages((current) => [...current, userMessage]);
      setProcessing(true);

      try {
        const history = [...messages, userMessage]
          .slice(-10)
          .map((entry) => ({
            speaker: entry.speaker,
            text: entry.text,
          }));

        const turn = processGhostChatTurn(trimmed, session, context, history);
        setSession(turn.session);

        const ghostMessages = turn.ghostMessages.map((text) =>
          createGhostChatMessage("ghost", text),
        );
        setMessages((current) => [...current, ...ghostMessages]);

        if (turn.action) {
          try {
            const detail = await executeGhostChatAction(turn.action, {
              organizationId,
              branchId,
              userId: firebaseUser.uid,
              recipes: recipes.map((recipe) => ({
                menuProductId: recipe.menuProductId,
                lines: recipe.lines,
                yieldQuantity: recipe.yieldQuantity,
              })),
              inventoryItems: inventoryItems.map((item) => ({
                id: item.id,
                baseUnit: item.baseUnit,
              })),
              defaultWarehouseId:
                warehouses.find((warehouse) => warehouse.isDefault)?.id ?? warehouses[0]?.id,
            });

            const successMessage = createGhostChatMessage(
              "ghost",
              detail?.message ?? formatGhostActionSuccess(turn.action, detail?.message),
            );
            setMessages((current) => [...current, successMessage]);
          } catch (cause) {
            const errorMessage = createGhostChatMessage(
              "ghost",
              formatGhostActionError(turn.action, getCallableErrorMessage(cause)),
            );
            setMessages((current) => [...current, errorMessage]);
          }
        }
      } finally {
        setProcessing(false);
      }
    },
    [
      organizationId,
      firebaseUser,
      processing,
      session,
      context,
      messages,
      recipes,
      inventoryItems,
      warehouses,
      branchId,
    ],
  );

  const resetChat = useCallback(() => {
    const initial = createInitialGhostChatTurn(context);
    const initialMessages = initial.ghostMessages.map((text) =>
      createGhostChatMessage("ghost", text),
    );
    setMessages(initialMessages);
    setSession(initial.session);
  }, [context]);

  return {
    messages,
    processing,
    sendMessage,
    resetChat,
    context,
  };
}
