import type { BaseUnit, CoTaxCategory } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

import manifest from "@/data/purchase-invoices.manifest.json";
import { getFirestoreDb } from "@/lib/firebase/client";
import { createWarehouse } from "@/lib/inventory/inventory";
import { confirmPurchaseInvoice, createPurchaseInvoice } from "@/lib/purchases/purchases";
import { seedCostMatrix } from "@/lib/costing/seed-cost-matrix";

const TAX_MAP: Record<string, CoTaxCategory> = {
  exempt: "EXENTO",
  excluded: "EXCLUIDO",
  taxable_19: "IVA_19",
  taxable_5: "IVA_5",
  IVA_19: "IVA_19",
  IVA_5: "IVA_5",
  EXENTO: "EXENTO",
  EXCLUIDO: "EXCLUIDO",
};

const VALID_UNITS = new Set<BaseUnit>(["g", "kg", "ml", "l", "unit", "box", "bag"]);

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function mapTax(value?: string): CoTaxCategory {
  return TAX_MAP[value ?? "IVA_19"] ?? "IVA_19";
}

type ManifestLine = {
  description: string;
  quantity?: number;
  unit?: string;
  unitPriceNet?: number;
  itemType?: string;
  productCategory?: string;
  taxCategory?: string;
};

function invoiceKey(inv: { supplierName: string; invoiceNumber: string; invoiceDate: string }) {
  return `${inv.supplierName}|${inv.invoiceNumber}|${inv.invoiceDate}`;
}

export interface BootstrapImportResult {
  inventoryItems: number;
  invoices: number;
  movements: number;
  menuProducts: number;
  skipped: number;
  unlinkedLines: number;
  ghostMenuProducts: number;
  ghostRecipesCreated: number;
  ghostRecipesUpdated: number;
  ghostWarnings: string[];
}

async function loadExistingInventoryItemIds(organizationId: string): Promise<Map<string, string>> {
  const snapshot = await getDocs(
    collection(getFirestoreDb(), firestorePaths.organizationInventoryItems(organizationId)),
  );
  const itemIdByName = new Map<string, string>();

  for (const document of snapshot.docs) {
    const name = String(document.data().name ?? "");
    const norm = normalizeName(name);
    if (name && !itemIdByName.has(norm)) {
      itemIdByName.set(norm, document.id);
    }
  }

  return itemIdByName;
}

async function ensureDefaultWarehouse(input: {
  organizationId: string;
  branchId: string;
}): Promise<string> {
  const db = getFirestoreDb();
  const defaultQuery = query(
    collection(db, firestorePaths.organizationWarehouses(input.organizationId)),
    where("isDefault", "==", true),
    limit(1),
  );
  const defaultSnap = await getDocs(defaultQuery);
  if (!defaultSnap.empty) {
    return defaultSnap.docs[0]!.id;
  }

  const anySnap = await getDocs(
    query(collection(db, firestorePaths.organizationWarehouses(input.organizationId)), limit(1)),
  );
  if (!anySnap.empty) {
    return anySnap.docs[0]!.id;
  }

  const created = await createWarehouse({
    branchId: input.branchId,
    name: "Bodega principal",
    code: "BOD-01",
    isDefault: true,
  });
  return created.warehouseId;
}

export async function runBootstrapPurchaseImport(input: {
  organizationId: string;
  branchId: string;
  warehouseId?: string;
}): Promise<BootstrapImportResult> {
  const warehouseId =
    input.warehouseId ??
    (await ensureDefaultWarehouse({
      organizationId: input.organizationId,
      branchId: input.branchId,
    }));

  const itemIdByName = await loadExistingInventoryItemIds(input.organizationId);
  const seen = new Set<string>();
  let imported = 0;
  let skipped = 0;
  let movements = 0;
  let unlinkedLines = 0;

  for (const inv of manifest.invoices) {
    const key = invoiceKey(inv);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);

    let rawLines = (inv.lines ?? []) as ManifestLine[];
    if (rawLines.length === 0 && inv.total > 0) {
      rawLines = [
        {
          description: `Compra ticket ${inv.invoiceNumber}`,
          quantity: 1,
          unitPriceNet: inv.total,
          unit: "unit",
          itemType: "supply",
          productCategory: inv.productCategory ?? "alimenticio",
          taxCategory: "EXENTO",
        },
      ];
    }

    const lineInputs = rawLines
      .filter((line) => line.description && (line.quantity ?? 0) > 0)
      .map((line) => {
        const isOperativo = line.productCategory === "operativo";
        const norm = normalizeName(line.description);
        const inventoryItemId = isOperativo ? undefined : itemIdByName.get(norm);
        if (!isOperativo && line.productCategory !== "operativo" && !inventoryItemId) {
          unlinkedLines += 1;
        }
        return {
          inventoryItemId,
          description: line.description.trim(),
          quantity: Number(line.quantity ?? 0),
          unit: VALID_UNITS.has(line.unit as BaseUnit) ? (line.unit as BaseUnit) : "unit",
          unitPriceNet: Number(line.unitPriceNet ?? 0),
          taxCategory: mapTax(line.taxCategory),
          productCategory: line.productCategory ?? "alimenticio",
          itemType: line.itemType ?? "supply",
        };
      })
      .filter((line) => line.description && line.quantity > 0);

    if (lineInputs.length === 0) {
      skipped += 1;
      continue;
    }

    const { invoiceId } = await createPurchaseInvoice({
      supplierName: inv.supplierName,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      warehouseId: warehouseId,
      attachmentName: inv.image ?? "",
      lines: lineInputs.map(({ productCategory, itemType, ...line }) => line),
    });

    const confirmResult = await confirmPurchaseInvoice({
      invoiceId,
      bootstrapInventory: true,
    });
    movements += confirmResult.movements;
    imported += 1;
  }

  let ghostMenuProducts = 0;
  let ghostRecipesCreated = 0;
  let ghostRecipesUpdated = 0;
  let ghostWarnings: string[] = [];

  try {
    const menuSeed = await seedCostMatrix();
    ghostMenuProducts = menuSeed.productsCreated;
    ghostRecipesCreated = menuSeed.recipesCreated;
    ghostRecipesUpdated = menuSeed.recipesUpdated;
    ghostWarnings = menuSeed.warnings;
  } catch (cause) {
    ghostWarnings = [
      cause instanceof Error ? cause.message : "No se pudo cargar la carta Ghost automáticamente.",
    ];
  }

  return {
    inventoryItems: itemIdByName.size,
    invoices: imported,
    movements,
    menuProducts: 0,
    skipped,
    unlinkedLines,
    ghostMenuProducts,
    ghostRecipesCreated,
    ghostRecipesUpdated,
    ghostWarnings,
  };
}
