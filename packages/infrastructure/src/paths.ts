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
} as const;
