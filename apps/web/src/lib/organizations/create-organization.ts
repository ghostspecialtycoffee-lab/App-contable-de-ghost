import { callCreateOrganization } from "@/lib/firebase/functions";

import {
  createOrganizationClient,
  type CreateOrganizationInput,
  type CreateOrganizationResult,
} from "./create-organization-client";

function isFunctionsUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  const code =
    typeof error.code === "string"
      ? error.code.replace("functions/", "")
      : "";

  return code === "internal" || code === "not-found" || code === "unavailable";
}

/**
 * Crea organización: intenta Cloud Function; si no hay Blaze/backend, usa Firestore directo (Spark).
 */
export async function createOrganization(
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  if (process.env.NEXT_PUBLIC_ONBOARDING_MODE === "client") {
    return createOrganizationClient(input);
  }

  try {
    return await callCreateOrganization(input);
  } catch (error) {
    if (
      process.env.NEXT_PUBLIC_ONBOARDING_MODE === "callable" ||
      !isFunctionsUnavailable(error)
    ) {
      throw error;
    }

    return createOrganizationClient(input);
  }
}
