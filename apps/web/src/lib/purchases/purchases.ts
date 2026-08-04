import {
  confirmPurchaseInvoiceClient,
  createPurchaseInvoiceClient,
  updatePurchaseInvoiceClient,
} from "./purchases-client";

export async function createPurchaseInvoice(
  input: Parameters<typeof createPurchaseInvoiceClient>[0],
) {
  return createPurchaseInvoiceClient(input);
}

export async function updatePurchaseInvoice(
  input: Parameters<typeof updatePurchaseInvoiceClient>[0],
) {
  return updatePurchaseInvoiceClient(input);
}

export async function confirmPurchaseInvoice(
  input: Parameters<typeof confirmPurchaseInvoiceClient>[0],
) {
  return confirmPurchaseInvoiceClient(input);
}
