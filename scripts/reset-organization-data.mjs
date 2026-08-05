#!/usr/bin/env node
/**
 * Borra datos operativos de una organización (conserva org y miembros).
 *
 * GOOGLE_APPLICATION_CREDENTIALS=/path/serviceAccount.json \
 * node scripts/reset-organization-data.mjs <organizationId> --confirm
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const { initializeApp, cert, applicationDefault } = admin;

const SUBCOLLECTIONS = [
  "auditLogs",
  "inventoryItems",
  "warehouses",
  "inventoryMovements",
  "inventoryBalances",
  "menuProducts",
  "sales",
  "kitchenOrders",
  "brandAssets",
  "recipes",
  "purchaseInvoices",
  "fixedExpenses",
  "diningTables",
  "tableSessions",
];

const organizationId = process.argv[2];
const confirmed = process.argv.includes("--confirm");

if (!organizationId || organizationId.startsWith("-")) {
  console.error("Uso: node scripts/reset-organization-data.mjs <organizationId> --confirm");
  process.exit(1);
}

if (!confirmed) {
  console.error("Agrega --confirm para ejecutar.");
  process.exit(1);
}

const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
initializeApp({
  credential: credentialsPath
    ? cert(JSON.parse(readFileSync(credentialsPath, "utf8")))
    : applicationDefault(),
});

const db = getFirestore();

async function deleteCollection(path) {
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

async function main() {
  const orgRef = db.doc(`organizations/${organizationId}`);
  const orgSnap = await orgRef.get();
  if (!orgSnap.exists) {
    console.error(`Organización no encontrada: ${organizationId}`);
    process.exit(1);
  }

  console.log(`Reseteando: ${orgSnap.data()?.name ?? organizationId}`);
  let total = 0;
  for (const name of SUBCOLLECTIONS) {
    const count = await deleteCollection(`organizations/${organizationId}/${name}`);
    console.log(`  ${name}: ${count}`);
    total += count;
  }
  console.log(`Listo. ${total} documentos eliminados.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
