import { OPERATIONAL_RULES } from "./built-in-rules.js";
import type { RuleOperationalContext } from "./context.js";
import type {
  OrganizationRuleSettings,
  RuleEvaluationResult,
  RuleSeverity,
  RuleTrigger,
} from "./types.js";

function isRuleEnabled(ruleId: string, settings?: OrganizationRuleSettings): boolean {
  const disabled = new Set(settings?.disabledRuleIds ?? []);
  return !disabled.has(ruleId);
}

function normalizeTriggers(
  value: RuleTrigger | RuleTrigger[] | null,
): RuleTrigger[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function dedupeAndSortTriggers(triggers: RuleTrigger[]): RuleTrigger[] {
  const seen = new Set<string>();
  const result: RuleTrigger[] = [];

  for (const trigger of triggers) {
    if (seen.has(trigger.id)) {
      continue;
    }
    seen.add(trigger.id);
    result.push(trigger);
  }

  const severityRank: Record<RuleSeverity, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };

  return result.sort(
    (left, right) => severityRank[left.severity] - severityRank[right.severity],
  );
}

export function evaluateOperationalRules(
  context: RuleOperationalContext,
  settings?: OrganizationRuleSettings,
): RuleEvaluationResult {
  const triggers: RuleTrigger[] = [];
  let evaluatedRuleCount = 0;

  for (const rule of OPERATIONAL_RULES) {
    if (!isRuleEnabled(rule.id, settings)) {
      continue;
    }

    evaluatedRuleCount += 1;
    triggers.push(...normalizeTriggers(rule.evaluate(context)));
  }

  const deduped = dedupeAndSortTriggers(triggers);

  return {
    triggers: deduped,
    evaluatedRuleCount,
    firedRuleCount: deduped.length,
  };
}

export function ruleTriggersToBriefingItems(
  triggers: RuleTrigger[],
): Array<{
  id: string;
  severity: RuleSeverity;
  category: RuleTrigger["category"];
  message: string;
  suggestion?: string;
}> {
  return triggers.map((trigger) => ({
    id: trigger.id,
    severity: trigger.severity,
    category: trigger.category,
    message: trigger.message,
    suggestion: trigger.suggestion,
  }));
}
