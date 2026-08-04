import { updateOrganizationCostMatrixSettingsClient } from "./organization-cost-matrix-client";

export async function updateOrganizationCostMatrixSettings(
  input: Parameters<typeof updateOrganizationCostMatrixSettingsClient>[0],
) {
  return updateOrganizationCostMatrixSettingsClient(input);
}
