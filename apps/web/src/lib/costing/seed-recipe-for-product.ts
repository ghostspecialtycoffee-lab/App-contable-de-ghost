import { seedRecipeForProductClient } from "./seed-cost-matrix-client";

export async function seedRecipeForProduct(productName: string) {
  return seedRecipeForProductClient(productName);
}
