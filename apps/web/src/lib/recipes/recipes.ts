import { saveRecipeClient } from "./recipes-client";

export async function saveRecipe(input: Parameters<typeof saveRecipeClient>[0]) {
  return saveRecipeClient(input);
}
