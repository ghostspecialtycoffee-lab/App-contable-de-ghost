import {
  createDiningTableClient,
  findDiningTableByTokenClient,
  updateDiningTableStatusClient,
  buildGuestMenuUrl,
  buildTableQrUrl,
} from "./tables-client";

export async function createDiningTable(input: Parameters<typeof createDiningTableClient>[0]) {
  return createDiningTableClient(input);
}

export async function updateDiningTableStatus(
  input: Parameters<typeof updateDiningTableStatusClient>[0],
) {
  return updateDiningTableStatusClient(input);
}

export { findDiningTableByTokenClient, buildGuestMenuUrl, buildTableQrUrl };
