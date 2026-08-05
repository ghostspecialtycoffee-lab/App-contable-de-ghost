#!/usr/bin/env node
/**
 * Sincroniza tableQrLookup para que /mesa funcione sin login.
 *
 * GOOGLE_APPLICATION_CREDENTIALS=... node scripts/sync-table-qr-lookups.mjs --auto --confirm
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { initializeApp, cert, applicationDefault } = admin;

function parseArgs(argv) {
  const args = { confirm: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--confirm") args.confirm = true;
    else if (arg === "--org") args.org = argv[++i];
    else if (arg === "--auto") args.auto = true;
  }
  return args;
}

async function resolveAutoOrganization(db) {
  const orgs = await db.collection("organizations").limit(20).get();
  if (orgs.empty) throw new Error("No hay organizaciones en Firestore.");
  const org = orgs.docs[0];
  return { orgId: org.id, name: org.data().name ?? org.id };
}

async function syncOrganization(db, organizationId) {
  const tables = await db.collection(`organizations/${organizationId}/diningTables`).get();
  if (tables.empty) {
    console.log(`Sin mesas en ${organizationId}`);
    return 0;
  }

  let count = 0;
  const batch = db.batch();

  for (const table of tables.docs) {
    const data = table.data();
    const qrToken = data.qrToken;
    if (!qrToken) {
      continue;
    }

    const lookupRef = db.doc(`organizations/${organizationId}/tableQrLookup/${qrToken}`);
    batch.set(
      lookupRef,
      {
        organizationId,
        tableId: table.id,
        qrToken,
        number: data.number,
        label: data.label ?? "",
        branchId: data.branchId,
        status: data.status,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    count += 1;
  }

  await batch.commit();
  return count;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.confirm) {
    console.error(`Uso:
  GOOGLE_APPLICATION_CREDENTIALS=... node scripts/sync-table-qr-lookups.mjs --auto --confirm`);
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
    console.log(`Organización: ${resolved.name} (${resolved.orgId})`);
  }

  if (!args.org) {
    console.error("Falta --org o usa --auto");
    process.exit(1);
  }

  const synced = await syncOrganization(db, args.org);
  console.log(`✅ ${synced} lookup(s) de mesa sincronizados`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
