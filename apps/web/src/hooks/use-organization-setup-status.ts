"use client";

import { useMemo } from "react";

import { useInventoryItems } from "@/hooks/use-inventory-items";
import { useMenuProducts } from "@/hooks/use-menu-products";
import { usePurchaseInvoices } from "@/hooks/use-purchase-invoices";
import { isCatalogBeverage, normalizeCatalogName } from "@/lib/costing/ghost-menu-catalog";

export function useOrganizationSetupStatus() {
  const { invoices, loading: invoicesLoading } = usePurchaseInvoices();
  const { items, loading: itemsLoading } = useInventoryItems();
  const { products, loading: productsLoading } = useMenuProducts();

  const loading = invoicesLoading || itemsLoading || productsLoading;

  const status = useMemo(() => {
    const hasPurchases = invoices.length > 0;
    const hasInventory = items.length > 0;
    const hasGhostMenu = products.some(
      (product) => normalizeCatalogName(product.name) === "espresso",
    );
    const ghostBeverageCount = products.filter((product) =>
      isCatalogBeverage(product.name),
    ).length;

    return {
      hasPurchases,
      hasInventory,
      hasGhostMenu,
      isSetupComplete: hasPurchases && hasInventory && hasGhostMenu,
      invoiceCount: invoices.length,
      itemCount: items.length,
      productCount: products.length,
      ghostBeverageCount,
      setupCompletedSteps: [
        hasPurchases ? 1 : null,
        hasGhostMenu ? 2 : null,
        products.length > 0 ? 3 : null,
      ].filter((step): step is number => step !== null),
    };
  }, [invoices.length, items.length, products]);

  return { ...status, loading };
}
