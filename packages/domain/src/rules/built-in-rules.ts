import type { RuleOperationalContext } from "./context.js";
import {
  averageDailyConsumption,
  countSales,
  forecastDaysUntilStockout,
  formatRuleMoney,
  sumSalesTotal,
} from "./helpers.js";
import type { OperationalRuleDefinition, RuleTrigger } from "./types.js";

export type RuleEvaluator = (context: RuleOperationalContext) => RuleTrigger | RuleTrigger[] | null;

export interface RegisteredOperationalRule extends OperationalRuleDefinition {
  evaluate: RuleEvaluator;
}

function trigger(partial: RuleTrigger): RuleTrigger {
  return partial;
}

export const OPERATIONAL_RULES: RegisteredOperationalRule[] = [
  {
    id: "sales-drop",
    title: "Caída de ventas",
    description: "Alerta cuando las ventas de hoy van más de 8% por debajo de ayer.",
    category: "sales",
    defaultSeverity: "warning",
    enabledByDefault: true,
    evaluate(context) {
      const todayTotal = sumSalesTotal(context.salesSnapshot, context.todayIso);
      const yesterdayTotal = sumSalesTotal(context.salesSnapshot, context.yesterdayIso);
      if (yesterdayTotal <= 0) {
        return null;
      }
      const changePct =
        Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 1000) / 10;
      if (changePct > -8) {
        return null;
      }
      return trigger({
        id: "sales-drop",
        ruleId: "sales-drop",
        severity: "warning",
        category: "sales",
        message: `Las ventas de hoy van **${changePct}%** por debajo de ayer (${formatRuleMoney(todayTotal)} vs ${formatRuleMoney(yesterdayTotal)}).`,
        suggestion: "Revisa productos estrella y promociones del turno.",
      });
    },
  },
  {
    id: "sales-up",
    title: "Buen ritmo de ventas",
    description: "Informa cuando las ventas superan 15% vs el día anterior.",
    category: "sales",
    defaultSeverity: "info",
    enabledByDefault: true,
    evaluate(context) {
      const todayTotal = sumSalesTotal(context.salesSnapshot, context.todayIso);
      const yesterdayTotal = sumSalesTotal(context.salesSnapshot, context.yesterdayIso);
      if (yesterdayTotal <= 0) {
        return null;
      }
      const changePct =
        Math.round(((todayTotal - yesterdayTotal) / yesterdayTotal) * 1000) / 10;
      if (changePct < 15) {
        return null;
      }
      return trigger({
        id: "sales-up",
        ruleId: "sales-up",
        severity: "info",
        category: "sales",
        message: `Buen ritmo: ventas **+${changePct}%** vs ayer (${formatRuleMoney(todayTotal)}).`,
      });
    },
  },
  {
    id: "sales-empty",
    title: "Sin ventas hoy",
    description: "Recuerda registrar el primer cobro cuando no hay ventas del día.",
    category: "sales",
    defaultSeverity: "info",
    enabledByDefault: true,
    evaluate(context) {
      const yesterdayTotal = sumSalesTotal(context.salesSnapshot, context.yesterdayIso);
      if (yesterdayTotal > 0) {
        return null;
      }
      const todayCount = countSales(context.salesSnapshot, context.todayIso);
      if (todayCount > 0) {
        return null;
      }
      return trigger({
        id: "sales-empty",
        ruleId: "sales-empty",
        severity: "info",
        category: "sales",
        message: "Aún no hay ventas registradas hoy.",
        suggestion: "Abre caja y registra el primer cobro cuando arranque el servicio.",
      });
    },
  },
  {
    id: "low-stock",
    title: "Inventario bajo mínimo",
    description: "Insumos por debajo del stock mínimo configurado.",
    category: "inventory",
    defaultSeverity: "warning",
    enabledByDefault: true,
    evaluate(context) {
      const lowStock = context.inventoryStockSnapshot.filter(
        (entry) => entry.minStock > 0 && entry.quantity < entry.minStock,
      );
      return lowStock.slice(0, 3).map((entry) =>
        trigger({
          id: `low-stock-${entry.itemId}`,
          ruleId: "low-stock",
          severity: "warning",
          category: "inventory",
          message: `**${entry.name}** bajo mínimo (${entry.quantity} ${entry.baseUnit} · mín. ${entry.minStock}).`,
          suggestion: "Registra una compra o revisa consumo en recetas.",
        }),
      );
    },
  },
  {
    id: "stockout-risk",
    title: "Riesgo de quiebre de stock",
    description: "Pronóstico de agotamiento en 3 días según consumo de los últimos 14.",
    category: "inventory",
    defaultSeverity: "warning",
    enabledByDefault: true,
    evaluate(context) {
      const movements = context.inventoryMovementsSnapshot ?? [];
      const results: RuleTrigger[] = [];

      for (const entry of context.inventoryStockSnapshot) {
        const daily = averageDailyConsumption(movements, entry.itemId);
        const daysLeft = forecastDaysUntilStockout(entry.quantity, daily);
        if (daysLeft === null || daysLeft <= 0 || daysLeft > 3) {
          continue;
        }
        results.push(
          trigger({
            id: `stockout-${entry.itemId}`,
            ruleId: "stockout-risk",
            severity: daysLeft <= 1 ? "critical" : "warning",
            category: "inventory",
            message: `Riesgo de quedarte sin **${entry.name}** en ~**${daysLeft} día(s)**.`,
            suggestion: "Pide reposición al proveedor habitual.",
          }),
        );
      }

      return results.length > 0 ? results : null;
    },
  },
  {
    id: "negative-stock",
    title: "Inventario negativo",
    description: "Hay insumos con cantidad negativa en bodega.",
    category: "inventory",
    defaultSeverity: "critical",
    enabledByDefault: true,
    evaluate(context) {
      const negativeStock = context.inventoryStockSnapshot.filter(
        (entry) => entry.quantity < 0,
      );
      if (negativeStock.length === 0) {
        return null;
      }
      return trigger({
        id: "negative-stock",
        ruleId: "negative-stock",
        severity: "critical",
        category: "inventory",
        message: `Hay **${negativeStock.length}** insumo(s) con inventario negativo.`,
        suggestion: "Ajusta stock o registra la compra faltante.",
      });
    },
  },
  {
    id: "cash-closed",
    title: "Caja cerrada",
    description: "La sesión de caja no está abierta.",
    category: "cash",
    defaultSeverity: "warning",
    enabledByDefault: true,
    evaluate(context) {
      if (context.cashSessionOpen) {
        return null;
      }
      return trigger({
        id: "cash-closed",
        ruleId: "cash-closed",
        severity: "warning",
        category: "cash",
        message: "La caja está **cerrada**.",
        suggestion: "Di «abre caja con [monto]» para iniciar el turno.",
      });
    },
  },
  {
    id: "high-food-cost",
    title: "Food cost alto",
    description: "Productos con margen por debajo de la meta de costeo.",
    category: "costs",
    defaultSeverity: "warning",
    enabledByDefault: true,
    evaluate(context) {
      const beverageTarget = context.costMatrixSettings?.targetBeverageCostPct ?? 0.3;
      const foodTarget = context.costMatrixSettings?.targetFoodCostPct ?? 0.35;

      const highCostProducts = context.menuProducts
        .filter(
          (product) =>
            product.status !== "inactive" &&
            product.price > 0 &&
            (product.recipeCost ?? 0) > 0,
        )
        .map((product) => {
          const target = product.category === "beverage" ? beverageTarget : foodTarget;
          const foodCostPct = (product.recipeCost ?? 0) / product.price;
          return { product, foodCostPct, target };
        })
        .filter((entry) => entry.foodCostPct > entry.target * 1.08)
        .sort((left, right) => right.foodCostPct - left.foodCostPct);

      return highCostProducts.slice(0, 3).map((entry) =>
        trigger({
          id: `food-cost-${entry.product.id}`,
          ruleId: "high-food-cost",
          severity: "warning",
          category: "costs",
          message:
            `**${entry.product.name}** tiene food cost **${(entry.foodCostPct * 100).toFixed(1)}%** ` +
            `(meta ${(entry.target * 100).toFixed(0)}%).`,
          suggestion: "Revisa receta, precio de venta o costo de insumos.",
        }),
      );
    },
  },
  {
    id: "purchases-today",
    title: "Compras del día",
    description: "Resumen de facturas de compra confirmadas hoy.",
    category: "purchases",
    defaultSeverity: "info",
    enabledByDefault: true,
    evaluate(context) {
      const purchasesToday = context.purchasesSnapshot.filter(
        (purchase) =>
          purchase.status === "confirmed" && purchase.invoiceDate === context.todayIso,
      );
      if (purchasesToday.length === 0) {
        return null;
      }
      const total = purchasesToday.reduce((sum, purchase) => sum + purchase.total, 0);
      return trigger({
        id: "purchases-today",
        ruleId: "purchases-today",
        severity: "info",
        category: "purchases",
        message: `Se confirmaron **${purchasesToday.length}** compra(s) hoy por **${formatRuleMoney(total)}**.`,
      });
    },
  },
  {
    id: "kitchen-pending",
    title: "Comandas pendientes",
    description: "Pedidos en cocina o barra sin atender.",
    category: "operations",
    defaultSeverity: "info",
    enabledByDefault: true,
    evaluate(context) {
      const pendingKitchen = context.kitchenOrders.filter(
        (order) => order.status === "pending",
      ).length;
      if (pendingKitchen === 0) {
        return null;
      }
      return trigger({
        id: "kitchen-pending",
        ruleId: "kitchen-pending",
        severity: pendingKitchen >= 5 ? "warning" : "info",
        category: "operations",
        message: `Hay **${pendingKitchen}** comanda(s) pendientes en cocina/barra.`,
      });
    },
  },
  {
    id: "tables-open",
    title: "Mesas abiertas",
    description: "Cuentas de mesa activas en el turno.",
    category: "operations",
    defaultSeverity: "info",
    enabledByDefault: true,
    evaluate(context) {
      if (context.openTableSessions.length === 0) {
        return null;
      }
      return trigger({
        id: "tables-open",
        ruleId: "tables-open",
        severity: "info",
        category: "operations",
        message: `**${context.openTableSessions.length}** mesa(s) con cuenta abierta.`,
      });
    },
  },
  {
    id: "missing-recipes",
    title: "Productos sin receta",
    description: "Productos activos sin ficha de costeo.",
    category: "costs",
    defaultSeverity: "info",
    enabledByDefault: true,
    evaluate(context) {
      const missingRecipes = context.menuProducts.filter(
        (product) =>
          product.status !== "inactive" &&
          !context.recipesSnapshot.some((recipe) => recipe.menuProductId === product.id),
      );
      if (missingRecipes.length === 0) {
        return null;
      }
      return trigger({
        id: "missing-recipes",
        ruleId: "missing-recipes",
        severity: "info",
        category: "costs",
        message: `**${missingRecipes.length}** producto(s) activo(s) sin receta de costeo.`,
        suggestion: "Completa fichas en Costeo para ver márgenes reales.",
      });
    },
  },
];

export function listOperationalRuleDefinitions(): OperationalRuleDefinition[] {
  return OPERATIONAL_RULES.map(({ evaluate: _evaluate, ...definition }) => definition);
}
