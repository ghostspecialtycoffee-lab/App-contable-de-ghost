import type { GhostConversationContext } from "./ghost-conversation.js";
import {
  evaluateOperationalRules,
  ruleTriggersToBriefingItems,
  type OrganizationRuleSettings,
  type RuleOperationalContext,
} from "../rules/index.js";

export type BriefingSeverity = "info" | "warning" | "critical";

export type BriefingCategory =
  | "sales"
  | "inventory"
  | "costs"
  | "cash"
  | "operations"
  | "purchases";

export interface BriefingItem {
  id: string;
  severity: BriefingSeverity;
  category: BriefingCategory;
  message: string;
  suggestion?: string;
}

export interface DailyBriefingMovementSnapshot {
  itemId: string;
  type: string;
  quantity: number;
  occurredAt: string;
}

export interface DailyBriefingInput {
  organizationName?: string;
  todayIso: string;
  yesterdayIso: string;
  salesSnapshot: GhostConversationContext["salesSnapshot"];
  purchasesSnapshot: GhostConversationContext["purchasesSnapshot"];
  inventoryStockSnapshot: GhostConversationContext["inventoryStockSnapshot"];
  inventoryMovementsSnapshot?: DailyBriefingMovementSnapshot[];
  cashSessionOpen: boolean;
  cashSnapshot?: GhostConversationContext["cashSnapshot"];
  menuProducts: GhostConversationContext["menuProducts"];
  recipesSnapshot: GhostConversationContext["recipesSnapshot"];
  kitchenOrders: GhostConversationContext["kitchenOrders"];
  openTableSessions: GhostConversationContext["openTableSessions"];
  costMatrixSettings?: GhostConversationContext["costMatrixSettings"];
  ruleSettings?: OrganizationRuleSettings;
}

export interface DailyOperationsBriefing {
  items: BriefingItem[];
  headlineCount: number;
  message: string;
}

function toRuleContext(input: DailyBriefingInput): RuleOperationalContext {
  return {
    organizationName: input.organizationName,
    todayIso: input.todayIso,
    yesterdayIso: input.yesterdayIso,
    salesSnapshot: input.salesSnapshot,
    purchasesSnapshot: input.purchasesSnapshot,
    inventoryStockSnapshot: input.inventoryStockSnapshot,
    inventoryMovementsSnapshot: input.inventoryMovementsSnapshot,
    cashSessionOpen: input.cashSessionOpen,
    menuProducts: input.menuProducts,
    recipesSnapshot: input.recipesSnapshot,
    kitchenOrders: input.kitchenOrders,
    openTableSessions: input.openTableSessions,
    costMatrixSettings: input.costMatrixSettings,
  };
}

export function buildDailyOperationsBriefing(input: DailyBriefingInput): DailyOperationsBriefing {
  const evaluation = evaluateOperationalRules(toRuleContext(input), input.ruleSettings);
  const items = ruleTriggersToBriefingItems(evaluation.triggers) as BriefingItem[];
  const headlineCount = items.length;

  return {
    items,
    headlineCount,
    message: formatDailyBriefingMessage({
      organizationName: input.organizationName,
      items,
      headlineCount,
    }),
  };
}

export function formatDailyBriefingMessage(input: {
  organizationName?: string;
  items: BriefingItem[];
  headlineCount: number;
}): string {
  if (input.items.length === 0) {
    const place = input.organizationName?.trim() ? ` en **${input.organizationName.trim()}**` : "";
    return (
      `**Buenos días**${place}.\n` +
      "Todo se ve estable: sin alertas de inventario, caja o márgenes por ahora.\n\n" +
      "Pregúntame lo que necesites o di «resumen del día» cuando quieras actualizar."
    );
  }

  const lines = input.items
    .slice(0, 8)
    .map((item) => {
      const prefix =
        item.severity === "critical" ? "🔴" : item.severity === "warning" ? "🟠" : "•";
      const suggestion = item.suggestion ? ` _(${item.suggestion})_` : "";
      return `${prefix} ${item.message}${suggestion}`;
    })
    .join("\n");

  const place = input.organizationName?.trim() ? ` en **${input.organizationName.trim()}**` : "";

  return (
    `**Buenos días**${place}. Encontré **${input.headlineCount}** novedad(es):\n\n` +
    `${lines}\n\n` +
    "Puedo ayudarte a actuar: compras, ajustes de precio, caja o inventario."
  );
}

export function briefingInputFromGhostContext(
  context: GhostConversationContext,
  options?: {
    todayIso?: string;
    yesterdayIso?: string;
    inventoryMovementsSnapshot?: DailyBriefingMovementSnapshot[];
    ruleSettings?: OrganizationRuleSettings;
  },
): DailyBriefingInput {
  const today = options?.todayIso ?? new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date(`${today}T12:00:00.000Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const yesterday = options?.yesterdayIso ?? yesterdayDate.toISOString().slice(0, 10);

  return {
    organizationName: context.organizationName,
    todayIso: today,
    yesterdayIso: yesterday,
    salesSnapshot: context.salesSnapshot,
    purchasesSnapshot: context.purchasesSnapshot,
    inventoryStockSnapshot: context.inventoryStockSnapshot,
    inventoryMovementsSnapshot: options?.inventoryMovementsSnapshot,
    cashSessionOpen: context.cashSessionOpen,
    cashSnapshot: context.cashSnapshot,
    menuProducts: context.menuProducts,
    recipesSnapshot: context.recipesSnapshot,
    kitchenOrders: context.kitchenOrders,
    openTableSessions: context.openTableSessions,
    costMatrixSettings: context.costMatrixSettings,
    ruleSettings: options?.ruleSettings,
  };
}
