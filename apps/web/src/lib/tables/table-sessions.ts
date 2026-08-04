import {
  addTableSessionLinesClient,
  checkoutTableSessionClient,
  findOpenTableSessionClient,
  openTableSessionClient,
  requestTableBillClient,
  sendTableSessionToKitchenClient,
} from "./table-sessions-client";

export async function openTableSession(input: Parameters<typeof openTableSessionClient>[0]) {
  return openTableSessionClient(input);
}

export async function addTableSessionLines(input: Parameters<typeof addTableSessionLinesClient>[0]) {
  return addTableSessionLinesClient(input);
}

export async function sendTableSessionToKitchen(
  input: Parameters<typeof sendTableSessionToKitchenClient>[0],
) {
  return sendTableSessionToKitchenClient(input);
}

export async function checkoutTableSession(input: Parameters<typeof checkoutTableSessionClient>[0]) {
  return checkoutTableSessionClient(input);
}

export async function requestTableBill(input: Parameters<typeof requestTableBillClient>[0]) {
  return requestTableBillClient(input);
}

export { findOpenTableSessionClient };
