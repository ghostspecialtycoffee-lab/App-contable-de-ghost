import { updateOrganizationWorkflowSettingsClient } from "./organization-workflow-settings-client";

export async function updateOrganizationWorkflowSettings(
  input: Parameters<typeof updateOrganizationWorkflowSettingsClient>[0],
) {
  return updateOrganizationWorkflowSettingsClient(input);
}
