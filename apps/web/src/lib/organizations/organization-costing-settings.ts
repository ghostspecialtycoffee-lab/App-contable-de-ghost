import { updateOrganizationCostingSettingsClient } from "./organization-costing-settings-client";

export async function updateOrganizationCostingSettings(
  input: Parameters<typeof updateOrganizationCostingSettingsClient>[0],
) {
  return updateOrganizationCostingSettingsClient(input);
}
