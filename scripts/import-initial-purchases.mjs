#!/usr/bin/env node
/**
 * Carga inicial desde data/initial-load/purchase-invoices.manifest.json
 *
 * GOOGLE_APPLICATION_CREDENTIALS=/path/serviceAccount.json \
 * node scripts/import-initial-purchases.mjs \
 *   --org <organizationId> \
 *   --actor <userId> \
 *   [--branch <branchId>] \
 *   [--reset-first] \
 *   --confirm
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const { initializeApp, cert, applicationDefault } = admin;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(__dirname, "../data/initial-load/purchase-invoices.manifest.json");

const TAX_MAP = {
  exempt: "EXENTO",
  excluded: "EXCLUIDO",
  taxable_19: "IVA_19",
  taxable_5: "IVA_5",
  IVA_19: "IVA_19",
  IVA_5: "IVA_5",
  EXENTO: "EXENTO",
  EXCLUIDO: "EXCLUIDO",
};

const TYPE_MAP = {
  raw_material: "raw_material",
  finished_product: "finished_product",
  supply: "supply",
  packaging: "packaging",
};

const VALID_UNITS = new Set(["g", "kg", "ml", "l", "unit", "box", "bag"]);

function parseArgs(argv) {
  const args = { confirm: false, resetFirst: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--confirm") args.confirm = true;
    else if (arg === "--reset-first") args.resetFirst = true;
    else if (arg === "--org") args.org = argv[++i];
    else if (arg === "--actor") args.actor = argv[++i];
    else if (arg === "--branch") args.branch = argv[++i];
    else if (arg === "--auto") args.auto = true;
    else if (arg === "--manifest") args.manifest = argv[++i];
  }
  return args;
}

function isoDateInTimezone(timeZone = "America/Bogota", referenceDate = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(referenceDate);
}

function purchaseInvoiceAffectsInventory(invoiceDate, todayIso) {
  return invoiceDate >= todayIso;
}

function mapTax(value) {
  return TAX_MAP[value] ?? "IVA_19";
}

function calculateTaxLine(subtotal, category) {
  const rates = {
    IVA_19: 0.19,
    IVA_5: 0.05,
    IVA_0: 0,
    INC_8: 0.08,
    EXENTO: 0,
    EXCLUIDO: 0,
  };
  const rate = rates[category] ?? 0;
  if (rate === 0) {
    return { lineSubtotal: subtotal, lineTax: 0, lineTotal: subtotal };
  }
  const lineTax = Math.round(subtotal * rate);
  return { lineSubtotal: subtotal, lineTax, lineTotal: subtotal + lineTax };
}

function normalizeName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugSku(name, productCategory, index) {
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

function invoiceKey(inv) {
  return `${inv.supplierName}|${inv.invoiceNumber}|${inv.invoiceDate}`;
}

async function deleteCollection(db, path) {
  const snapshot = await db.collection(path).get();
  if (snapshot.empty) return 0;
  let deleted = 0;
  let batch = db.batch();
  let ops = 0;
  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    ops += 1;
    deleted += 1;
    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }
  if (ops > 0) await batch.commit();
  return deleted;
}

async function resolveOwnerUserId(db, organizationId) {
  const members = await db.collection(`organizations/${organizationId}/members`).get();
  const owner = members.docs.find((doc) => doc.data().role === "owner");
  if (owner) return owner.id;
  if (members.docs[0]) return members.docs[0].id;
  throw new Error(`Sin miembros en la organización ${organizationId}`);
}

async function resolveAutoOrganization(db) {
  const orgs = await db.collection("organizations").limit(20).get();
  if (orgs.empty) {
    throw new Error("No hay organizaciones en Firestore. Completa onboarding primero.");
  }
  if (orgs.size === 1) {
    const org = orgs.docs[0];
    return { orgId: org.id, name: org.data()?.name ?? org.id };
  }

  const ghost = orgs.docs.find((doc) =>
    String(doc.data()?.name ?? "").toLowerCase().includes("ghost"),
  );
  if (ghost) {
    return { orgId: ghost.id, name: ghost.data()?.name ?? ghost.id };
  }

  const first = orgs.docs[0];
  return { orgId: first.id, name: first.data()?.name ?? first.id };
}

async function resetOrganization(db, organizationId) {
  const collections = [
    "inventoryItems",
    "warehouses",
    "inventoryMovements",
    "inventoryBalances",
    "purchaseInvoices",
    "sales",
    "kitchenOrders",
    "tableSessions",
    "recipes",
    "fixedExpenses",
  ];
  for (const name of collections) {
    const count = await deleteCollection(db, `organizations/${organizationId}/${name}`);
    console.log(`  reset ${name}: ${count}`);
  }
}

async function resolveBranchId(db, organizationId, branchArg) {
  if (branchArg) return branchArg;
  const snap = await db.collection(`organizations/${organizationId}/branches`).limit(1).get();
  if (snap.empty) {
    throw new Error("No hay sucursal. Crea una en onboarding o pasa --branch.");
  }
  return snap.docs[0].id;
}

async function ensureWarehouse(db, organizationId, branchId, actorUserId) {
  const snap = await db
    .collection(`organizations/${organizationId}/warehouses`)
    .where("isDefault", "==", true)
    .limit(1)
    .get();
  if (!snap.empty) return snap.docs[0].id;

  const anySnap = await db
    .collection(`organizations/${organizationId}/warehouses`)
    .limit(1)
    .get();
  if (!anySnap.empty) return anySnap.docs[0].id;

  const ref = db.collection(`organizations/${organizationId}/warehouses`).doc();
  const now = FieldValue.serverTimestamp();
  await ref.set({
    organizationId,
    branchId,
    name: "Bodega principal",
    code: "BOD-01",
    status: "active",
    isDefault: true,
    createdAt: now,
    updatedAt: now,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });
  console.log(`Bodega creada: ${ref.id}`);
  return ref.id;
}

async function ensureInventoryItem(db, organizationId, actorUserId, catalogEntry, skuIndex) {
  const ref = db.collection(`organizations/${organizationId}/inventoryItems`).doc();
  const now = FieldValue.serverTimestamp();
  const unit = VALID_UNITS.has(catalogEntry.unit) ? catalogEntry.unit : "unit";
  await ref.set({
    organizationId,
    sku: slugSku(catalogEntry.name, catalogEntry.productCategory, skuIndex),
    name: catalogEntry.name,
    type: TYPE_MAP[catalogEntry.itemType] ?? "supply",
    baseUnit: unit,
    category: catalogEntry.productCategory,
    status: "active",
    minStock: 0,
    maxStock: null,
    averageCost: 0,
    lastCost: 0,
    trackLot: false,
    purchaseUnit: unit,
    presentationQuantity: 1,
    presentationLabel: "",
    createdAt: now,
    updatedAt: now,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });
  return ref.id;
}

async function registerEntry(db, organizationId, actorUserId, input) {
  const orgRef = db.collection("organizations").doc(organizationId);
  const itemRef = orgRef.collection("inventoryItems").doc(input.itemId);
  const balanceRef = orgRef
    .collection("inventoryBalances")
    .doc(`${input.warehouseId}_${input.itemId}`);
  const movementRef = orgRef.collection("inventoryMovements").doc();

  await db.runTransaction(async (transaction) => {
    const [itemSnap, balanceSnap] = await Promise.all([
      transaction.get(itemRef),
      transaction.get(balanceRef),
    ]);
    if (!itemSnap.exists) return;

    const currentQty = balanceSnap.exists ? Number(balanceSnap.get("quantity") ?? 0) : 0;
    const currentAvg = balanceSnap.exists
      ? Number(balanceSnap.get("averageCost") ?? 0)
      : Number(itemSnap.get("averageCost") ?? 0);
    const signedQuantity = input.quantity;
    const unitCost = input.unitCost;
    const balanceAfter = currentQty + signedQuantity;
    const incomingQty = signedQuantity > 0 ? signedQuantity : 0;
    const averageCost =
      balanceAfter > 0 && incomingQty > 0
        ? Math.round(
            (currentQty * currentAvg + incomingQty * unitCost) / (currentQty + incomingQty),
          )
        : unitCost || currentAvg;
    const now = FieldValue.serverTimestamp();

    transaction.set(movementRef, {
      organizationId,
      branchId: input.branchId,
      warehouseId: input.warehouseId,
      itemId: input.itemId,
      type: "entry",
      quantity: signedQuantity,
      unitCost,
      totalCost: Math.abs(signedQuantity) * unitCost,
      balanceAfter,
      reference: input.reference,
      notes: input.notes,
      lotCode: "",
      actorUserId,
      occurredAt: now,
    });

    transaction.set(
      balanceRef,
      {
        organizationId,
        branchId: input.branchId,
        warehouseId: input.warehouseId,
        itemId: input.itemId,
        quantity: balanceAfter,
        averageCost,
        updatedAt: now,
      },
      { merge: true },
    );

    transaction.set(
      itemRef,
      {
        averageCost,
        lastCost: unitCost,
        updatedAt: now,
        updatedBy: actorUserId,
      },
      { merge: true },
    );
  });
}

function buildLines(rawLines, itemIdByName) {
  return rawLines
    .filter((line) => line.productCategory !== "operativo")
    .map((line) => {
      const taxCategory = mapTax(line.taxCategory ?? "IVA_19");
      const subtotal = Math.round(Number(line.unitPriceNet ?? 0) * Number(line.quantity ?? 0));
      const tax = calculateTaxLine(subtotal, taxCategory);
      const norm = normalizeName(line.description);
      return {
        inventoryItemId: itemIdByName.get(norm) ?? "",
        description: line.description.trim(),
        quantity: Number(line.quantity ?? 0),
        unit: VALID_UNITS.has(line.unit) ? line.unit : "unit",
        unitPriceNet: Number(line.unitPriceNet ?? 0),
        taxCategory,
        ...tax,
      };
    })
    .filter((line) => line.description && line.quantity > 0);
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.confirm) {
    console.error(`Uso:
  GOOGLE_APPLICATION_CREDENTIALS=... node scripts/import-initial-purchases.mjs \\
    --org <organizationId> --actor <userId> [--branch <branchId>] [--reset-first] --confirm

  Auto (detecta org y owner en Firestore):
    ... --auto [--org <organizationId>] [--reset-first] --confirm`);
    process.exit(1);
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || "ghost-contable";

  initializeApp({
    projectId,
    credential: credentialsPath
      ? cert(JSON.parse(readFileSync(credentialsPath, "utf8")))
      : applicationDefault(),
  });

  const db = getFirestore();

  if (args.auto && !args.org) {
    const resolved = await resolveAutoOrganization(db);
    args.org = resolved.orgId;
    console.log(`Organización detectada: ${resolved.name} (${resolved.orgId})`);
  }

  if (!args.org) {
    console.error("Falta --org o usa --auto");
    process.exit(1);
  }

  if (!args.actor) {
    args.actor = await resolveOwnerUserId(db, args.org);
    console.log(`Actor (owner): ${args.actor}`);
  }

  const manifest = JSON.parse(readFileSync(args.manifest ?? MANIFEST_PATH, "utf8"));
  const todayIso = isoDateInTimezone();

  const orgSnap = await db.doc(`organizations/${args.org}`).get();
  if (!orgSnap.exists) {
    throw new Error(`Organización no encontrada: ${args.org}`);
  }

  if (args.resetFirst) {
    console.log("Reseteando datos operativos…");
    await resetOrganization(db, args.org);
  }

  const branchId = await resolveBranchId(db, args.org, args.branch);
  const warehouseId = await ensureWarehouse(db, args.org, branchId, args.actor);

  const catalog = new Map();
  for (const inv of manifest.invoices) {
    for (const line of inv.lines ?? []) {
      if (!line.description || line.productCategory === "operativo") continue;
      const norm = normalizeName(line.description);
      if (!catalog.has(norm)) {
        catalog.set(norm, {
          name: line.description.trim(),
          productCategory: line.productCategory ?? "alimenticio",
          itemType: line.itemType ?? "supply",
          unit: line.unit ?? "unit",
        });
      }
    }
  }

  const itemIdByName = new Map();
  let skuIndex = 1;
  for (const [norm, entry] of catalog.entries()) {
    const itemId = await ensureInventoryItem(db, args.org, args.actor, entry, skuIndex);
    itemIdByName.set(norm, itemId);
    skuIndex += 1;
  }
  console.log(`Insumos creados: ${itemIdByName.size}`);

  const seen = new Set();
  let imported = 0;
  let skipped = 0;
  let movements = 0;

  for (const inv of manifest.invoices) {
    const key = invoiceKey(inv);
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);

    let rawLines = inv.lines ?? [];
    if (rawLines.length === 0 && inv.total > 0) {
      rawLines = [
        {
          description: `Compra ticket ${inv.invoiceNumber}`,
          quantity: 1,
          unitPriceNet: inv.total,
          unit: "unit",
          itemType: "supply",
          productCategory: "alimenticio",
          taxCategory: "EXENTO",
        },
      ];
    }

    const lines = buildLines(rawLines, itemIdByName);
    if (lines.length === 0) {
      skipped += 1;
      continue;
    }

    const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
    const taxAmount = lines.reduce((sum, line) => sum + line.lineTax, 0);
    const total = subtotal + taxAmount;
    const inventoryApplied = purchaseInvoiceAffectsInventory(inv.invoiceDate, todayIso);
    const now = FieldValue.serverTimestamp();
    const invoiceRef = db.collection(`organizations/${args.org}/purchaseInvoices`).doc();

    await invoiceRef.set({
      organizationId: args.org,
      branchId,
      supplierName: inv.supplierName,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      status: "confirmed",
      inventoryApplied,
      lines,
      subtotal,
      taxAmount,
      total,
      warehouseId,
      attachmentDataUrl: "",
      attachmentName: inv.image ?? "",
      createdAt: now,
      updatedAt: now,
      createdBy: args.actor,
      updatedBy: args.actor,
    });

    if (inventoryApplied) {
      for (const line of lines) {
        if (!line.inventoryItemId || line.quantity <= 0) continue;
        const qtyInBase = line.quantity;
        const unitCostNetPerBase =
          qtyInBase > 0 ? Math.round(line.lineSubtotal / qtyInBase) : 0;
        await registerEntry(db, args.org, args.actor, {
          branchId,
          warehouseId,
          itemId: line.inventoryItemId,
          quantity: qtyInBase,
          unitCost: unitCostNetPerBase,
          reference: inv.invoiceNumber,
          notes: line.description,
        });
        movements += 1;
      }
    }

    imported += 1;
  }

  console.log(`\nResumen:`);
  console.log(`  Facturas importadas: ${imported}`);
  console.log(`  Omitidas (duplicadas/vacías): ${skipped}`);
  console.log(`  Movimientos de bodega: ${movements}`);
  console.log(`  Fecha corte bodega (Colombia): ${todayIso}`);
  console.log(`  Bodega: ${warehouseId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
