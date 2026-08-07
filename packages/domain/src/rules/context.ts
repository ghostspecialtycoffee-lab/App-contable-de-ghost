import type { GhostConversationContext } from "../assistant/ghost-conversation.js";

export interface RuleMovementSnapshot {
  itemId: string;
  type: string;
  quantity: number;
  occurredAt: string;
}

export interface RuleOperationalContext {
  organizationName?: string;
  todayIso: string;
  yesterdayIso: string;
  salesSnapshot: GhostConversationContext["salesSnapshot"];
  purchasesSnapshot: GhostConversationContext["purchasesSnapshot"];
  inventoryStockSnapshot: GhostConversationContext["inventoryStockSnapshot"];
  inventoryMovementsSnapshot?: RuleMovementSnapshot[];
  cashSessionOpen: boolean;
  menuProducts: GhostConversationContext["menuProducts"];
  recipesSnapshot: GhostConversationContext["recipesSnapshot"];
  kitchenOrders: GhostConversationContext["kitchenOrders"];
  openTableSessions: GhostConversationContext["openTableSessions"];
  costMatrixSettings?: GhostConversationContext["costMatrixSettings"];
}
