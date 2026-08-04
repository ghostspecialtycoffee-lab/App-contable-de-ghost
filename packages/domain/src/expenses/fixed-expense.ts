import type { AuditMetadata, EntityId } from "@ghost/shared";

export const FIXED_EXPENSE_CATEGORIES = [
  "rent",
  "payroll",
  "utilities",
  "services",
  "insurance",
  "marketing",
  "other",
] as const;

export type FixedExpenseCategory = (typeof FIXED_EXPENSE_CATEGORIES)[number];

export const FIXED_EXPENSE_CATEGORY_LABELS: Record<FixedExpenseCategory, string> = {
  rent: "Arriendo",
  payroll: "Nómina",
  utilities: "Servicios públicos",
  services: "Servicios",
  insurance: "Seguros",
  marketing: "Marketing",
  other: "Otros",
};

export const FIXED_EXPENSE_FREQUENCIES = [
  "weekly",
  "biweekly",
  "monthly",
  "annual",
] as const;

export type FixedExpenseFrequency = (typeof FIXED_EXPENSE_FREQUENCIES)[number];

export const FIXED_EXPENSE_FREQUENCY_LABELS: Record<FixedExpenseFrequency, string> = {
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  annual: "Anual",
};

export interface FixedExpense extends AuditMetadata {
  id: EntityId;
  organizationId: EntityId;
  branchId?: EntityId;
  name: string;
  category: FixedExpenseCategory;
  amount: number;
  frequency: FixedExpenseFrequency;
  monthlyEquivalent: number;
  supplierName?: string;
  dueDay?: number;
  isActive: boolean;
  notes?: string;
}

export interface FixedExpenseInput {
  name: string;
  category: FixedExpenseCategory;
  amount: number;
  frequency: FixedExpenseFrequency;
  supplierName?: string;
  dueDay?: number;
  notes?: string;
  branchId?: string;
}
