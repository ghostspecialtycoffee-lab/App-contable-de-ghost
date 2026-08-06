import {
  createMenuProductClient,
  createSaleClient,
  seedColombianSodasClient,
  seedDefaultMenuClient,
  toggleMenuProductStatusClient,
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

export async function seedColombianSodas() {
  return seedColombianSodasClient();
}

export async function toggleMenuProductStatus(
  input: Parameters<typeof toggleMenuProductStatusClient>[0],
) {
  return toggleMenuProductStatusClient(input);
}

export async function createSale(input: Parameters<typeof createSaleClient>[0]) {
  return createSaleClient(input);
}

export async function updateKitchenOrderStatus(
  input: Parameters<typeof updateKitchenOrderStatusClient>[0],
) {
  return updateKitchenOrderStatusClient(input);
}
