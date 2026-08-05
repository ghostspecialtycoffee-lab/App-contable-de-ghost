import {
  closeCashSessionClient,
  getOpenCashSessionClient,
  openCashSessionClient,
  registerCashMovementClient,
  requireOpenCashSessionClient,
} from "./cash-client";

export async function getOpenCashSession() {
  return getOpenCashSessionClient();
}

export async function requireOpenCashSession() {
  return requireOpenCashSessionClient();
}

export async function openCashSession(input: Parameters<typeof openCashSessionClient>[0]) {
  return openCashSessionClient(input);
}

export async function closeCashSession(input: Parameters<typeof closeCashSessionClient>[0]) {
  return closeCashSessionClient(input);
}

export async function registerCashMovement(input: Parameters<typeof registerCashMovementClient>[0]) {
  return registerCashMovementClient(input);
}
