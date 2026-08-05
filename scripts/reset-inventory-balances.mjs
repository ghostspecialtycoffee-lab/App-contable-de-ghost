#!/usr/bin/env node
/**
 * Pone en 0 todas las existencias (inventoryBalances) de una organización.
 * Opcionalmente limpia líneas de cuentas de mesa abiertas.
 *
 * GOOGLE_APPLICATION_CREDENTIALS=... node scripts/reset-inventory-balances.mjs --auto --confirm
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { initializeApp, cert, applicationDefault } = admin;

function parseArgs(argv) {
  const args = { confirm: false, clearTableSessions: true };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--confirm") args.confirm = true;
    else if (arg === "--auto") args.auto = true;
    else if (arg === "--org") args.org = argv[++i];
    else if (arg === "--keep-table-sessions") args.clearTableSessions = false;
  }
  return args;
}

async function resolveAutoOrganization(db) {
  const orgs = await db.collection("organizations").limit(20).get();
  if (orgs.empty) throw new Error("No hay organizaciones en Firestore.");
  const org = orgs.docs[0];
  return { orgId: org.id, name: org.data().name ?? org.id };
}

async function resetBalances(db, organizationId) {
  const balances = await db.collection(`organizations/${organizationId}/inventoryBalances`).get();
  if (balances.empty) {
    return 0;
  }

  let updated = 0;
  let batch = db.batch();
  let ops = 0;

  for (const balance of balances.docs) {
    const current = Number(balance.data().quantity ?? 0);
    if (current === 0) {
      continue;
    }

    batch.set(
      balance.ref,
      {
        quantity: 0,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    ops += 1;
    updated += 1;

    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  return updated;
}

async function clearOpenTableSessions(db, organizationId) {
  const sessions = await db
    .collection(`organizations/${organizationId}/tableSessions`)
    .where("status", "in", ["open", "requested_bill"])
    .get();

  if (sessions.empty) {
    return 0;
  }

  let cleared = 0;
  let batch = db.batch();
  let ops = 0;

  for (const session of sessions.docs) {
    const lines = session.data().lines ?? [];
    if (lines.length === 0) {
      continue;
    }

    batch.set(
      session.ref,
      {
        lines: [],
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    ops += 1;
    cleared += 1;

    if (ops >= 400) {
      await batch.commit();
      batch = db.batch();
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
  }

  return cleared;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.confirm) {
    console.error(`Uso:
  GOOGLE_APPLICATION_CREDENTIALS=... node scripts/reset-inventory-balances.mjs --auto --confirm`);
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

  const balancesReset = await resetBalances(db, args.org);
  console.log(`✅ ${balancesReset} saldo(s) de bodega puestos en 0`);

  if (args.clearTableSessions) {
    const sessionsCleared = await clearOpenTableSessions(db, args.org);
    console.log(`✅ ${sessionsCleared} cuenta(s) de mesa vaciadas`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
