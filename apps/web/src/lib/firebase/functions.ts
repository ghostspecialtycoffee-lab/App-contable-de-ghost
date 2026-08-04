import { getFirebaseApp } from "@/lib/firebase/client";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";

interface CreateOrganizationRequest {
  name: string;
  slug?: string;
  branchName?: string;
}

interface CreateOrganizationResponse {
  organizationId: string;
  branchId: string;
  slug: string;
}

let functionsConnectedToEmulator = false;

function getFirebaseFunctions() {
  const functions = getFunctions(getFirebaseApp(), "us-central1");

  if (
    process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true" &&
    !functionsConnectedToEmulator
  ) {
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    functionsConnectedToEmulator = true;
  }

  return functions;
}

export async function callCreateOrganization(
  input: CreateOrganizationRequest,
): Promise<CreateOrganizationResponse> {
  const callable = httpsCallable<
    CreateOrganizationRequest,
    CreateOrganizationResponse
  >(getFirebaseFunctions(), "createOrganization");

  const result = await callable(input);
  return result.data;
}
