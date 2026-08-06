import { getFirebaseApp } from "@/lib/firebase/client";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import type { BaseUnit, InventoryItemType } from "@ghost/domain";

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

interface CreateInventoryItemRequest {
  sku: string;
  name: string;
  type: InventoryItemType;
  baseUnit: BaseUnit;
  category?: string;
  minStock?: number;
  maxStock?: number;
  trackLot?: boolean;
}

export async function callCreateInventoryItem(
  input: CreateInventoryItemRequest,
): Promise<{ itemId: string }> {
  const callable = httpsCallable<
    CreateInventoryItemRequest,
    { itemId: string }
  >(getFirebaseFunctions(), "createInventoryItem");

  const result = await callable(input);
  return result.data;
}

interface RegisterMovementRequest {
  branchId: string;
  warehouseId: string;
  itemId: string;
  type: string;
  quantity: number;
  unitCost?: number;
  reference?: string;
  notes?: string;
}

export async function callRegisterInventoryMovement(
  input: RegisterMovementRequest,
): Promise<{ movementId: string; balanceAfter: number }> {
  const callable = httpsCallable<
    RegisterMovementRequest,
    { movementId: string; balanceAfter: number }
  >(getFirebaseFunctions(), "registerInventoryMovement");

  const result = await callable(input);
  return result.data;
}

interface CreateWarehouseRequest {
  branchId: string;
  name: string;
  code: string;
  isDefault?: boolean;
}

export async function callCreateWarehouse(
  input: CreateWarehouseRequest,
): Promise<{ warehouseId: string }> {
  const callable = httpsCallable<
    CreateWarehouseRequest,
    { warehouseId: string }
  >(getFirebaseFunctions(), "createWarehouse");

  const result = await callable(input);
  return result.data;
}

export async function callGhostAgent(input: {
  message: string;
  sessionId?: string;
  allowWebSearch?: boolean;
}): Promise<{
  answer: string;
  usedWebSearch: boolean;
  sources: Array<{ title: string; url: string; snippet?: string }>;
  knowledgeEntryId?: string;
  suggestedFollowUp?: string;
}> {
  const callable = httpsCallable<
    {
      message: string;
      sessionId?: string;
      allowWebSearch?: boolean;
    },
    {
      answer: string;
      usedWebSearch: boolean;
      sources: Array<{ title: string; url: string; snippet?: string }>;
      knowledgeEntryId?: string;
      suggestedFollowUp?: string;
    }
  >(getFirebaseFunctions(), "ghostAgent");

  const result = await callable(input);
  return result.data;
}
