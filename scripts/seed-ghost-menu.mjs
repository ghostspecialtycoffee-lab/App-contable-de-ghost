#!/usr/bin/env node
/**
 * Carga carta Ghost (25 bebidas del menú Drive) + fichas de costo.
 *
 * GOOGLE_APPLICATION_CREDENTIALS=... node scripts/seed-ghost-menu.mjs --auto --confirm
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

import { hasGhostMenuSeeded, seedGhostMenu } from "./lib/ghost-menu-seed.mjs";

const require = createRequire(import.meta.url);
const admin = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { initializeApp, cert, applicationDefault } = admin;

function parseArgs(argv) {
  const args = { confirm: false, skipIfSeeded: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--confirm") args.confirm = true;
    else if (arg === "--skip-if-seeded") args.skipIfSeeded = true;
    else if (arg === "--org") args.org = argv[++i];
    else if (arg === "--actor") args.actor = argv[++i];
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

async function resolveOwnerUserId(db, organizationId) {
  const members = await db.collection(`organizations/${organizationId}/members`).get();
  const owner = members.docs.find((doc) => (doc.data().roles ?? []).includes("owner"));
  if (!owner) throw new Error(`Sin owner en ${organizationId}`);
  return owner.id;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.confirm) {
    console.error(`Uso:
  GOOGLE_APPLICATION_CREDENTIALS=... node scripts/seed-ghost-menu.mjs --auto --confirm [--skip-if-seeded]`);
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
  const { FieldValue } = require("firebase-admin/firestore");

  if (args.auto && !args.org) {
    const resolved = await resolveAutoOrganization(db);
    args.org = resolved.orgId;
    console.log(`Organización: ${resolved.name} (${resolved.orgId})`);
  }

  if (!args.org) {
    console.error("Falta --org o usa --auto");
    process.exit(1);
  }

  if (!args.actor) {
    args.actor = await resolveOwnerUserId(db, args.org);
    console.log(`Actor: ${args.actor}`);
  }

  if (args.skipIfSeeded) {
    const seeded = await hasGhostMenuSeeded(db, args.org);
    if (seeded) {
      console.log("Carta Ghost ya cargada (Espresso en catálogo). Omitiendo.");
      return;
    }
  }

  const result = await seedGhostMenu(db, FieldValue, {
    organizationId: args.org,
    actorUserId: args.actor,
  });

  console.log("\nResumen carta Ghost:");
  console.log(`  Productos nuevos: ${result.productsCreated}`);
  console.log(`  Fichas creadas: ${result.recipesCreated}`);
  console.log(`  Fichas actualizadas: ${result.recipesUpdated}`);
  console.log(`  Sin cambios: ${result.recipesSkipped}`);
  if (result.warnings.length > 0) {
    console.log(`  Avisos (${result.warnings.length}):`);
    for (const warning of result.warnings.slice(0, 8)) {
      console.log(`    · ${warning}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
