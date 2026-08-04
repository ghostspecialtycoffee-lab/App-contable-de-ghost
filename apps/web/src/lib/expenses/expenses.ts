import {
  createFixedExpenseClient,
  updateFixedExpenseClient,
} from "./expenses-client";

export async function createFixedExpense(
  input: Parameters<typeof createFixedExpenseClient>[0],
) {
  return createFixedExpenseClient(input);
}

export async function updateFixedExpense(
  input: Parameters<typeof updateFixedExpenseClient>[0],
) {
  return updateFixedExpenseClient(input);
}
