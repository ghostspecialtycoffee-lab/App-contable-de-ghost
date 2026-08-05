import { seedCostMatrixClient } from "./seed-cost-matrix-client";

export async function seedCostMatrix() {
  return seedCostMatrixClient();
}

export type { SeedCostMatrixResult } from "./seed-cost-matrix-client";
