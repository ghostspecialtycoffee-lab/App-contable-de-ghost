import {
  confirmPurchaseInvoiceClient,
  createPurchaseInvoiceClient,
} from "./purchases-client";

export async function createPurchaseInvoice(
  input: Parameters<typeof createPurchaseInvoiceClient>[0],
) {
  return createPurchaseInvoiceClient(input);
}

export async function confirmPurchaseInvoice(
  input: Parameters<typeof confirmPurchaseInvoiceClient>[0],
) {
  return confirmPurchaseInvoiceClient(input);
}
