import type { Result } from "@ghost/shared";
import { err, ok } from "@ghost/shared";

import { BUILT_IN_WORKFLOW_IDS } from "./workflows/built-in-workflows.js";
import type {
  OrganizationWorkflowSettings,
  OrganizationWorkflowSettingsInput,
} from "./workflows/types.js";

export type { OrganizationWorkflowSettings, OrganizationWorkflowSettingsInput };

export const DEFAULT_ORGANIZATION_WORKFLOW_SETTINGS: OrganizationWorkflowSettings = {
  enabledWorkflowIds: BUILT_IN_WORKFLOW_IDS.filter(
    (id) => id === "sale-receipt-whatsapp" || id === "sale-high-value-whatsapp",
  ),
  highValueSaleThresholdCop: 200_000,
};

export function resolveWorkflowSettings(
  input?: OrganizationWorkflowSettingsInput | null,
): OrganizationWorkflowSettings {
  const enabledWorkflowIds =
    input?.enabledWorkflowIds?.length
      ? [...input.enabledWorkflowIds]
      : [...DEFAULT_ORGANIZATION_WORKFLOW_SETTINGS.enabledWorkflowIds];

  const threshold = Number(
    input?.highValueSaleThresholdCop ??
      DEFAULT_ORGANIZATION_WORKFLOW_SETTINGS.highValueSaleThresholdCop,
  );

  return {
    enabledWorkflowIds,
    staffWhatsAppPhone: input?.staffWhatsAppPhone?.trim() || undefined,
    highValueSaleThresholdCop:
      Number.isFinite(threshold) && threshold > 0
        ? Math.round(threshold)
        : DEFAULT_ORGANIZATION_WORKFLOW_SETTINGS.highValueSaleThresholdCop,
  };
}

export function validateWorkflowSettings(
  input: OrganizationWorkflowSettingsInput,
): Result<OrganizationWorkflowSettings> {
  const resolved = resolveWorkflowSettings(input);

  for (const workflowId of resolved.enabledWorkflowIds) {
    if (!BUILT_IN_WORKFLOW_IDS.includes(workflowId)) {
      return err(`Workflow desconocido: ${workflowId}`);
    }
  }

  if (resolved.staffWhatsAppPhone) {
    const digits = resolved.staffWhatsAppPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      return err("El teléfono WhatsApp operativo debe tener al menos 10 dígitos.");
    }
  }

  return ok(resolved);
}
