import {
  addTableSessionLinesClient,
  cancelTableSessionClient,
  checkoutTableSessionClient,
  findOpenTableSessionClient,
  openTableSessionClient,
  clearWaiterAlertClient,
  requestTableBillClient,
  requestTableBillGuestClient,
  requestWaiterGuestClient,
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

export async function cancelTableSession(input: Parameters<typeof cancelTableSessionClient>[0]) {
  return cancelTableSessionClient(input);
}

export async function requestTableBill(input: Parameters<typeof requestTableBillClient>[0]) {
  return requestTableBillClient(input);
}

export async function requestTableBillGuest(
  input: Parameters<typeof requestTableBillGuestClient>[0],
) {
  return requestTableBillGuestClient(input);
}

export async function requestWaiterGuest(
  input: Parameters<typeof requestWaiterGuestClient>[0],
) {
  return requestWaiterGuestClient(input);
}

export async function clearWaiterAlert(input: Parameters<typeof clearWaiterAlertClient>[0]) {
  return clearWaiterAlertClient(input);
}

export { findOpenTableSessionClient };
