export const firestorePaths = {
  users: () => "users",
  user: (userId: string) => `users/${userId}`,
  organizations: () => "organizations",
  organization: (organizationId: string) => `organizations/${organizationId}`,
  organizationMembers: (organizationId: string) =>
    `organizations/${organizationId}/members`,
  organizationMember: (organizationId: string, userId: string) =>
    `organizations/${organizationId}/members/${userId}`,
  organizationBranches: (organizationId: string) =>
    `organizations/${organizationId}/branches`,
  organizationBranch: (organizationId: string, branchId: string) =>
    `organizations/${organizationId}/branches/${branchId}`,
  organizationAuditLogs: (organizationId: string) =>
    `organizations/${organizationId}/auditLogs`,
  organizationInventoryItems: (organizationId: string) =>
    `organizations/${organizationId}/inventoryItems`,
  organizationInventoryItem: (organizationId: string, itemId: string) =>
    `organizations/${organizationId}/inventoryItems/${itemId}`,
  organizationWarehouses: (organizationId: string) =>
    `organizations/${organizationId}/warehouses`,
  organizationWarehouse: (organizationId: string, warehouseId: string) =>
    `organizations/${organizationId}/warehouses/${warehouseId}`,
  organizationInventoryMovements: (organizationId: string) =>
    `organizations/${organizationId}/inventoryMovements`,
  organizationInventoryBalances: (organizationId: string) =>
    `organizations/${organizationId}/inventoryBalances`,
  organizationInventoryBalance: (
    organizationId: string,
    warehouseId: string,
    itemId: string,
  ) =>
    `organizations/${organizationId}/inventoryBalances/${warehouseId}_${itemId}`,
  organizationMenuProducts: (organizationId: string) =>
    `organizations/${organizationId}/menuProducts`,
  organizationMenuProduct: (organizationId: string, productId: string) =>
    `organizations/${organizationId}/menuProducts/${productId}`,
  organizationSales: (organizationId: string) =>
    `organizations/${organizationId}/sales`,
  organizationSale: (organizationId: string, saleId: string) =>
    `organizations/${organizationId}/sales/${saleId}`,
  organizationKitchenOrders: (organizationId: string) =>
    `organizations/${organizationId}/kitchenOrders`,
  organizationKitchenOrder: (organizationId: string, orderId: string) =>
    `organizations/${organizationId}/kitchenOrders/${orderId}`,
  organizationBrandAssets: (organizationId: string) =>
    `organizations/${organizationId}/brandAssets`,
  organizationBrandAsset: (organizationId: string, assetId: string) =>
    `organizations/${organizationId}/brandAssets/${assetId}`,
  organizationRecipes: (organizationId: string) =>
    `organizations/${organizationId}/recipes`,
  organizationRecipe: (organizationId: string, recipeId: string) =>
    `organizations/${organizationId}/recipes/${recipeId}`,
  organizationRecipeVersions: (organizationId: string, recipeId: string) =>
    `organizations/${organizationId}/recipes/${recipeId}/versions`,
  organizationRecipeVersion: (organizationId: string, recipeId: string, version: number | string) =>
    `organizations/${organizationId}/recipes/${recipeId}/versions/${version}`,
  organizationPurchaseInvoices: (organizationId: string) =>
    `organizations/${organizationId}/purchaseInvoices`,
  organizationPurchaseInvoice: (organizationId: string, invoiceId: string) =>
    `organizations/${organizationId}/purchaseInvoices/${invoiceId}`,
  organizationSuppliers: (organizationId: string) =>
    `organizations/${organizationId}/suppliers`,
  organizationSupplier: (organizationId: string, supplierId: string) =>
    `organizations/${organizationId}/suppliers/${supplierId}`,
  organizationPurchasePriceHistory: (organizationId: string) =>
    `organizations/${organizationId}/purchasePriceHistory`,
  organizationPurchasePriceHistoryEntry: (organizationId: string, entryId: string) =>
    `organizations/${organizationId}/purchasePriceHistory/${entryId}`,
  organizationFixedExpenses: (organizationId: string) =>
    `organizations/${organizationId}/fixedExpenses`,
  organizationFixedExpense: (organizationId: string, expenseId: string) =>
    `organizations/${organizationId}/fixedExpenses/${expenseId}`,
  organizationDiningTables: (organizationId: string) =>
    `organizations/${organizationId}/diningTables`,
  organizationDiningTable: (organizationId: string, tableId: string) =>
    `organizations/${organizationId}/diningTables/${tableId}`,
  organizationTableQrLookup: (organizationId: string, qrToken: string) =>
    `organizations/${organizationId}/tableQrLookup/${qrToken}`,
  organizationTableSessions: (organizationId: string) =>
    `organizations/${organizationId}/tableSessions`,
  organizationTableSession: (organizationId: string, sessionId: string) =>
    `organizations/${organizationId}/tableSessions/${sessionId}`,
  organizationCashSessions: (organizationId: string) =>
    `organizations/${organizationId}/cashSessions`,
  organizationCashSession: (organizationId: string, sessionId: string) =>
    `organizations/${organizationId}/cashSessions/${sessionId}`,
  organizationCashMovements: (organizationId: string) =>
    `organizations/${organizationId}/cashMovements`,
  organizationCashMovement: (organizationId: string, movementId: string) =>
    `organizations/${organizationId}/cashMovements/${movementId}`,
  organizationNotificationOutbox: (organizationId: string) =>
    `organizations/${organizationId}/notificationOutbox`,
  organizationNotificationOutboxEntry: (organizationId: string, entryId: string) =>
    `organizations/${organizationId}/notificationOutbox/${entryId}`,
  organizationDomainEventOutbox: (organizationId: string) =>
    `organizations/${organizationId}/domainEventOutbox`,
  organizationDomainEventOutboxEntry: (organizationId: string, entryId: string) =>
    `organizations/${organizationId}/domainEventOutbox/${entryId}`,
  organizationAnalyticsDaily: (organizationId: string) =>
    `organizations/${organizationId}/analyticsDaily`,
  organizationAnalyticsDailyEntry: (organizationId: string, date: string) =>
    `organizations/${organizationId}/analyticsDaily/${date}`,
  organizationNotificationPreferences: (organizationId: string) =>
    `organizations/${organizationId}/notificationPreferences`,
  organizationNotificationPreference: (organizationId: string, userId: string) =>
    `organizations/${organizationId}/notificationPreferences/${userId}`,
  organizationWorkShifts: (organizationId: string) =>
    `organizations/${organizationId}/workShifts`,
  organizationWorkShift: (organizationId: string, shiftId: string) =>
    `organizations/${organizationId}/workShifts/${shiftId}`,
  organizationAgentKnowledge: (organizationId: string) =>
    `organizations/${organizationId}/agentKnowledge`,
  organizationAgentKnowledgeEntry: (organizationId: string, entryId: string) =>
    `organizations/${organizationId}/agentKnowledge/${entryId}`,
  organizationAgentSessions: (organizationId: string) =>
    `organizations/${organizationId}/agentSessions`,
  organizationAgentSession: (organizationId: string, sessionId: string) =>
    `organizations/${organizationId}/agentSessions/${sessionId}`,
} as const;
