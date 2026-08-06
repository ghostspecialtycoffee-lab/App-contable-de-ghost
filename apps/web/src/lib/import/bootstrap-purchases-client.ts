import type { BaseUnit, CoTaxCategory, KitchenStation, MenuCategory } from "@ghost/domain";
import { suggestRecipeYield } from "@ghost/domain";
import { firestorePaths } from "@ghost/infrastructure";
import { collection, getDocs, limit, query, where } from "firebase/firestore";

import manifest from "@/data/purchase-invoices.manifest.json";
import { formatMoney } from "@/lib/format";
import { getFirestoreDb } from "@/lib/firebase/client";
import { createInventoryItem, createWarehouse } from "@/lib/inventory/inventory";
import { createMenuProduct } from "@/lib/pos/pos";
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
const TRACKS_INVENTORY = new Set(["alimenticio", "menaje"]);

type ManifestLine = {
  description: string;
  quantity?: number;
  unit?: string;
  unitPriceNet?: number;
  itemType?: string;
  productCategory?: string;
  taxCategory?: string;
};

type CatalogEntry = {
  name: string;
  productCategory: string;
  itemType: string;
  unit: BaseUnit;
};

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function mapTax(value?: string): CoTaxCategory {
  return TAX_MAP[value ?? "IVA_19"] ?? "IVA_19";
}

function inferItemType(name: string, productCategory: string, explicitType?: string): string {
  if (
    explicitType === "raw_material" ||
    explicitType === "finished_product" ||
    explicitType === "supply" ||
    explicitType === "packaging"
  ) {
    return explicitType;
  }
  if (productCategory === "menaje") {
    return /bolsa|sticker|domo|empaque|vaso|recicl/i.test(name) ? "packaging" : "supply";
  }
  if (/brownie|croissant|galleta|torta|tarta|pan |pan$|enrollado|chicharrón|arequipe/i.test(name)) {
    return "finished_product";
  }
  return "raw_material";
}

function slugSku(name: string, productCategory: string, index: number): string {
  const prefix = productCategory === "menaje" ? "MN" : "AL";
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 12)
    .toUpperCase();
  return `${prefix}-${base || "ITEM"}-${String(index).padStart(3, "0")}`;
}

function invoiceKey(inv: { supplierName: string; invoiceNumber: string; invoiceDate: string }) {
  return `${inv.supplierName}|${inv.invoiceNumber}|${inv.invoiceDate}`;
}

function buildCatalog(): Map<string, CatalogEntry> {
  const catalog = new Map<string, CatalogEntry>();

  const productCatalog = manifest.productCatalog as Record<
    string,
    Array<{ name: string; productCategory?: string }>
  >;

  for (const [category, entries] of Object.entries(productCatalog ?? {})) {
    if (category === "operativo" || !Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries) {
      const norm = normalizeName(entry.name);
      if (!catalog.has(norm)) {
        catalog.set(norm, {
          name: entry.name.trim(),
          productCategory: entry.productCategory ?? category,
          itemType: inferItemType(entry.name, entry.productCategory ?? category),
          unit: "unit",
        });
      }
    }
  }

  for (const inv of manifest.invoices) {
    for (const line of (inv.lines ?? []) as ManifestLine[]) {
      if (!line.description || line.productCategory === "operativo") {
        continue;
      }
      const norm = normalizeName(line.description);
      const existing = catalog.get(norm);
      const productCategory = line.productCategory ?? existing?.productCategory ?? "alimenticio";
      catalog.set(norm, {
        name: line.description.trim(),
        productCategory,
        itemType: inferItemType(line.description, productCategory, line.itemType),
        unit: VALID_UNITS.has(line.unit as BaseUnit)
          ? (line.unit as BaseUnit)
          : existing?.unit ?? "unit",
      });
    }
  }

  return catalog;
}

function inferMenuCategory(name: string): MenuCategory {
  const normalized = name.toLowerCase();
  if (/café|coffee|leche|agua|cerveza|bebida|jugo|latte|capuccino/.test(normalized)) {
    return "beverage";
  }
  if (/croissant|galleta|brownie|torta|tarta|pan |enrollado|chicharrón/.test(normalized)) {
    return "pastry";
  }
  return "food";
}

function inferMenuStation(menuCategory: MenuCategory): KitchenStation {
  if (menuCategory === "beverage") return "bar";
  if (menuCategory === "pastry") return "counter";
  return "kitchen";
}

function roundSalePrice(unitCostNet: number): number {
  const grossEstimate = unitCostNet * 2.5 * 1.19;
  return Math.max(1000, Math.round(grossEstimate / 500) * 500);
}

export interface BootstrapImportResult {
  inventoryItems: number;
  invoices: number;
  movements: number;
  menuProducts: number;
  skipped: number;
  ghostMenuProducts: number;
  ghostRecipesCreated: number;
  ghostRecipesUpdated: number;
  ghostWarnings: string[];
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

  const catalog = buildCatalog();
  const itemIdByName = new Map<string, string>();
  let skuIndex = 1;

  for (const [norm, entry] of catalog.entries()) {
    const result = await createInventoryItem({
      sku: slugSku(entry.name, entry.productCategory, skuIndex),
      name: entry.name,
      type: entry.itemType as "raw_material" | "finished_product" | "supply" | "packaging",
      category: entry.productCategory,
      baseUnit: entry.unit,
      purchaseUnit: entry.unit,
      presentationQuantity: 1,
      minStock: 0,
    });
    itemIdByName.set(norm, result.itemId);
    skuIndex += 1;
  }

  const seen = new Set<string>();
  let imported = 0;
  let skipped = 0;
  let movements = 0;
  const finishedProducts = new Map<string, { name: string; unitCostNet: number }>();

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
        return {
          inventoryItemId: isOperativo ? undefined : itemIdByName.get(norm),
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

    for (const line of lineInputs) {
      if (
        line.productCategory !== "operativo" &&
        line.itemType === "finished_product" &&
        line.productCategory === "alimenticio" &&
        TRACKS_INVENTORY.has(line.productCategory)
      ) {
        const unitCostNet =
          line.quantity > 0 ? Math.round((line.unitPriceNet * line.quantity) / line.quantity) : 0;
        finishedProducts.set(normalizeName(line.description), {
          name: line.description.trim(),
          unitCostNet: unitCostNet || line.unitPriceNet,
        });
      }
    }

    imported += 1;
  }

  let menuProducts = 0;
  let sortOrder = 0;
  for (const entry of finishedProducts.values()) {
    const menuCategory = inferMenuCategory(entry.name);
    const yieldQuantity = suggestRecipeYield(entry.name);
    const isPastry = menuCategory === "pastry";

    await createMenuProduct({
      name: entry.name,
      price: isPastry ? 0 : roundSalePrice(Math.round(entry.unitCostNet / yieldQuantity)),
      category: menuCategory,
      station: inferMenuStation(menuCategory),
      status: isPastry ? "inactive" : "active",
      description: isPastry
        ? `Repostería · factura ${formatMoney(entry.unitCostNet)} + domicilio ÷ ${yieldQuantity} porciones. Define tu precio de venta en el catálogo.`
        : `Importado desde compras · costo ref. ${entry.unitCostNet}`,
      sortOrder,
    });
    sortOrder += 1;
    menuProducts += 1;
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
    menuProducts,
    skipped,
    ghostMenuProducts,
    ghostRecipesCreated,
    ghostRecipesUpdated,
    ghostWarnings,
  };
}
