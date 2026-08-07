export type RuleSeverity = "info" | "warning" | "critical";

export type RuleCategory =
  | "sales"
  | "inventory"
  | "costs"
  | "cash"
  | "operations"
  | "purchases";

export interface RuleTrigger {
  id: string;
  ruleId: string;
  severity: RuleSeverity;
  category: RuleCategory;
  message: string;
  suggestion?: string;
}

export interface OperationalRuleDefinition {
  id: string;
  title: string;
  description: string;
  category: RuleCategory;
  defaultSeverity: RuleSeverity;
  enabledByDefault: boolean;
}

export interface OrganizationRuleSettings {
  disabledRuleIds?: string[];
}

export interface RuleEvaluationResult {
  triggers: RuleTrigger[];
  evaluatedRuleCount: number;
  firedRuleCount: number;
}
