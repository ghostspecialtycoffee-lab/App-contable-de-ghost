import { updateOrganizationFiscalProfileClient } from "./organization-fiscal-client";

export async function updateOrganizationFiscalProfile(
  input: Parameters<typeof updateOrganizationFiscalProfileClient>[0],
) {
  return updateOrganizationFiscalProfileClient(input);
}
