/**
 * Re-exporta lógica de porciones desde @ghost/domain (requiere `pnpm --filter @ghost/domain build`).
 */
export {
  calculatePastryPortionCost,
  DEFAULT_PASTRY_YIELD,
  normalizeYieldQuantity,
  PASTRY_DOMICILIO_ALLOCATION_COP,
  resolveRecipeYieldQuantity,
  suggestRecipeYield,
  suggestRecipeYieldForProduct,
} from "../../packages/domain/dist/index.js";
