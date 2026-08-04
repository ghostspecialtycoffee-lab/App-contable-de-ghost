import {
  createMenuProductClient,
  createSaleClient,
  seedDefaultMenuClient,
  updateKitchenOrderStatusClient,
  updateMenuProductClient,
  updateMenuProductImageClient,
} from "./pos-client";

export type { PaymentMethod } from "@ghost/domain";

export async function createMenuProduct(
  input: Parameters<typeof createMenuProductClient>[0],
) {
  return createMenuProductClient(input);
}

export async function updateMenuProductImage(
  input: Parameters<typeof updateMenuProductImageClient>[0],
) {
  return updateMenuProductImageClient(input);
}

export async function updateMenuProduct(
  input: Parameters<typeof updateMenuProductClient>[0],
) {
  return updateMenuProductClient(input);
}

export async function seedDefaultMenu() {
  return seedDefaultMenuClient();
}

export async function createSale(input: Parameters<typeof createSaleClient>[0]) {
  return createSaleClient(input);
}

export async function updateKitchenOrderStatus(
  input: Parameters<typeof updateKitchenOrderStatusClient>[0],
) {
  return updateKitchenOrderStatusClient(input);
}
