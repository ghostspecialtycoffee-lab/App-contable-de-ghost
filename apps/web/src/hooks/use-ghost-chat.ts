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
import { useCashSession } from "@/hooks/use-cash-session";
import { useDiningTables } from "@/hooks/use-dining-tables";
import { useInventoryItems } from "@/hooks/use-inventory-items";
import { useKitchenOrders } from "@/hooks/use-kitchen-orders";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { usePurchaseInvoices } from "@/hooks/use-purchase-invoices";
import { useRecipes } from "@/hooks/use-recipes";
import { useTableSessions } from "@/hooks/use-table-sessions";
import { useWarehouses } from "@/hooks/use-warehouses";
import { useAuth, useActiveMembership } from "@/providers/auth-provider";
import {
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
  const { products } = useMenuProducts();
  const { recipes } = useRecipes();
  const { items: inventoryItems } = useInventoryItems();
  const { warehouses } = useWarehouses();
  const { invoices } = usePurchaseInvoices();
  const { session: cashSession } = useCashSession();
  const { tables } = useDiningTables();
  const { orders: kitchenOrders } = useKitchenOrders();
  const { sessions: tableSessions } = useTableSessions({ openOnly: true });

  const [messages, setMessages] = useState<GhostChatMessage[]>([]);
  const [session, setSession] = useState<GhostChatSession>(createEmptyGhostChatSession());
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const context = useMemo<GhostChatContext>(() => {
    const openTableSessions = tableSessions.map((entry) => ({
      sessionId: entry.id,
      tableId: entry.tableId,
      tableNumber: entry.tableNumber,
      guestToken: entry.guestToken,
    }));

    return {
      organizationName: organization?.name,
      inventoryItems: inventoryItems.map((item) => ({
        id: item.id,
        name: item.name,
        sku: item.sku,
        baseUnit: item.baseUnit,
      })),
      menuProducts: products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        category: product.category,
        station: product.station,
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
    };
  }, [
    organization?.name,
    inventoryItems,
    products,
    warehouses,
    tables,
    kitchenOrders,
    tableSessions,
    cashSession,
    invoices.length,
    recipes,
  ]);

  useEffect(() => {
    if (!organizationId || initialized) {
      return;
    }

    const persisted = loadPersistedChat(organizationId);
    if (persisted && persisted.messages.length > 0) {
      setMessages(persisted.messages);
      setSession(persisted.session);
      setQuickReplies([]);
      setInitialized(true);
      return;
    }

    const initial = createInitialGhostChatTurn(context);
    const initialMessages = initial.ghostMessages.map((text) =>
      createGhostChatMessage("ghost", text),
    );
    setMessages(initialMessages);
    setSession(initial.session);
    setQuickReplies(initial.quickReplies);
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
        const turn = processGhostChatTurn(trimmed, session, context);
        setSession(turn.session);
        setQuickReplies(turn.quickReplies);

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
              formatGhostActionSuccess(turn.action, detail),
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
    setQuickReplies(initial.quickReplies);
  }, [context]);

  return {
    messages,
    quickReplies,
    processing,
    sendMessage,
    resetChat,
    context,
  };
}
