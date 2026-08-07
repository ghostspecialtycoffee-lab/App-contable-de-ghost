"use client";

import { useMemo } from "react";

import { useCostMatrixSettings } from "@/hooks/use-cost-matrix-settings";
import { useCashSession } from "@/hooks/use-cash-session";
import { useInventoryBalances } from "@/hooks/use-inventory-balances";
import { useInventoryItems } from "@/hooks/use-inventory-items";
import { useInventoryMovements } from "@/hooks/use-inventory-movements";
import { useKitchenOrders } from "@/hooks/use-kitchen-orders";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { usePurchaseInvoices } from "@/hooks/use-purchase-invoices";
import { useRecipes } from "@/hooks/use-recipes";
import { useSales } from "@/hooks/use-sales";
import { useTableSessions } from "@/hooks/use-table-sessions";
import { useAuth } from "@/providers/auth-provider";
import {
  briefingInputFromGhostContext,
  buildDailyOperationsBriefing,
  type DailyOperationsBriefing,
} from "@ghost/domain";

export function useDailyBriefing(): {
  briefing: DailyOperationsBriefing | null;
  loading: boolean;
} {
  const { organization } = useAuth();
  const { products, loading: productsLoading } = useMenuProducts({ includeInactive: true });
  const { recipes, loading: recipesLoading } = useRecipes();
  const { items: inventoryItems, loading: itemsLoading } = useInventoryItems();
  const { balances: inventoryBalances, loading: balancesLoading } = useInventoryBalances();
  const { movements, loading: movementsLoading } = useInventoryMovements();
  const { invoices, loading: purchasesLoading } = usePurchaseInvoices();
  const { session: cashSession, loading: cashLoading } = useCashSession();
  const { sales, loading: salesLoading } = useSales();
  const { orders: kitchenOrders, loading: kitchenLoading } = useKitchenOrders();
  const { sessions: tableSessions, loading: tablesLoading } = useTableSessions({
    openOnly: true,
  });
  const costMatrixSettings = useCostMatrixSettings();

  const loading =
    productsLoading ||
    recipesLoading ||
    itemsLoading ||
    balancesLoading ||
    movementsLoading ||
    purchasesLoading ||
    cashLoading ||
    salesLoading ||
    kitchenLoading ||
    tablesLoading;

  const briefing = useMemo(() => {
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

    return buildDailyOperationsBriefing(
      briefingInputFromGhostContext(
        {
          organizationName: organization?.name,
          inventoryItems: [],
          menuProducts: products.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            category: product.category,
            station: product.station,
            status: product.status,
            recipeCost: product.recipeCost,
          })),
          tables: [],
          kitchenOrders: kitchenOrders.map((order) => ({
            id: order.id,
            saleNumber: order.saleNumber ?? "",
            status: order.status,
            station: order.station,
            tableNumber: order.tableNumber,
          })),
          openTableSessions: tableSessions.map((entry) => ({
            sessionId: entry.id,
            tableId: entry.tableId,
            tableNumber: entry.tableNumber,
            guestToken: entry.guestToken,
          })),
          cashSessionOpen: Boolean(cashSession),
          invoiceCount: invoices.length,
          inventoryCount: inventoryItems.length,
          ghostBeverageCount: 0,
          salesSnapshot: sales.map((sale) => ({
            soldAt: sale.soldAt ?? sale.createdAt,
            soldOn: sale.soldOn ?? (sale.soldAt ?? sale.createdAt).slice(0, 10),
            status: sale.status,
            subtotal: sale.subtotal,
            taxAmount: sale.taxAmount,
            total: sale.total,
            paymentMethod: sale.paymentMethod,
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
          inventoryStockSnapshot,
          fixedExpensesSnapshot: [],
          workShiftsSnapshot: [],
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
          inventoryCostSnapshot: [],
          costMatrixSettings,
          inventoryMovementsSnapshot: movements.map((movement) => ({
            itemId: movement.itemId,
            type: movement.type,
            quantity: movement.quantity,
            occurredAt: movement.occurredAt,
          })),
        },
        {
          inventoryMovementsSnapshot: movements.map((movement) => ({
            itemId: movement.itemId,
            type: movement.type,
            quantity: movement.quantity,
            occurredAt: movement.occurredAt,
          })),
        },
      ),
    );
  }, [
    organization?.name,
    products,
    recipes,
    inventoryItems,
    inventoryBalances,
    movements,
    invoices,
    cashSession,
    sales,
    kitchenOrders,
    tableSessions,
    costMatrixSettings,
  ]);

  return { briefing, loading };
}
