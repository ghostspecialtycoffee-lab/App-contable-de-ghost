import { isFunctionsUnavailable } from "@/lib/firebase/is-functions-unavailable";
import { callCreateOrganization } from "@/lib/firebase/functions";

import {
  createOrganizationClient,
  type CreateOrganizationInput,
  type CreateOrganizationResult,
} from "./create-organization-client";

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
