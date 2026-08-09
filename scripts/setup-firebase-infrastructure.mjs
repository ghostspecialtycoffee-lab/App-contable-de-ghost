#!/usr/bin/env node
/**
 * Prepara Firebase para Functions (Blaze) y Storage de forma automática.
 *
 * Requiere GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT (JSON).
 * Opcional: GCP_BILLING_ACCOUNT_ID para vincular facturación sin consola.
 *
 * Uso:
 *   node scripts/setup-firebase-infrastructure.mjs --project ghost-contable
 *   node scripts/setup-firebase-infrastructure.mjs --project ghost-contable --link-billing
 */

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { GoogleAuth } = require("google-auth-library");

const DEFAULT_PROJECT = "ghost-contable";
const DEFAULT_BUCKET = "ghost-contable.firebasestorage.app";
const DEFAULT_LOCATION = "us-central1";

const REQUIRED_SERVICES = [
  "cloudfunctions.googleapis.com",
  "cloudbuild.googleapis.com",
  "artifactregistry.googleapis.com",
  "run.googleapis.com",
  "eventarc.googleapis.com",
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
];

function parseArgs(argv) {
  const args = {
    project: DEFAULT_PROJECT,
    bucket: DEFAULT_BUCKET,
    location: DEFAULT_LOCATION,
    linkBilling: false,
    dryRun: false,
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project") args.project = argv[++index];
    else if (arg === "--bucket") args.bucket = argv[++index];
    else if (arg === "--location") args.location = argv[++index];
    else if (arg === "--link-billing") args.linkBilling = true;
    else if (arg === "--dry-run") args.dryRun = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
  }

  return args;
}

function loadCredentials() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (path) {
    return JSON.parse(readFileSync(path, "utf8"));
  }

  throw new Error(
    "Falta GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT con el JSON de la cuenta de servicio.",
  );
}

async function getAccessToken(credentials) {
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse.token;
  if (!token) {
    throw new Error("No se pudo obtener access token de Google Cloud.");
  }
  return token;
}

async function apiRequest(token, url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  return { ok: response.ok, status: response.status, body };
}

async function getBillingInfo(projectId, token) {
  return apiRequest(
    token,
    `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`,
  );
}

async function linkBillingAccount(projectId, billingAccountId, token) {
  const normalized = billingAccountId.startsWith("billingAccounts/")
    ? billingAccountId
    : `billingAccounts/${billingAccountId}`;

  return apiRequest(token, `https://cloudbilling.googleapis.com/v1/projects/${projectId}/billingInfo`, {
    method: "PUT",
    body: JSON.stringify({ billingAccountName: normalized }),
  });
}

async function enableService(projectId, serviceName, token, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Habilitaría ${serviceName}`);
    return true;
  }

  const { ok, status, body } = await apiRequest(
    token,
    `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${serviceName}:enable`,
    { method: "POST", body: "{}" },
  );

  if (ok || status === 409) {
    console.log(`✅ API habilitada: ${serviceName}`);
    return true;
  }

  console.warn(`⚠️  No se pudo habilitar ${serviceName} (${status})`, body);
  return false;
}

async function bucketExists(projectId, bucketName, token) {
  const { ok } = await apiRequest(
    token,
    `https://storage.googleapis.com/storage/v1/b/${bucketName}?project=${projectId}`,
  );
  return ok;
}

async function createStorageBucket(projectId, bucketName, location, token, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Crearía bucket gs://${bucketName}`);
    return true;
  }

  const { ok, status, body } = await apiRequest(
    token,
    `https://storage.googleapis.com/storage/v1/b?project=${projectId}`,
    {
      method: "POST",
      body: JSON.stringify({
        name: bucketName,
        location,
        storageClass: "STANDARD",
        iamConfiguration: {
          uniformBucketLevelAccess: { enabled: true },
        },
      }),
    },
  );

  if (ok) {
    console.log(`✅ Bucket creado: gs://${bucketName}`);
    return true;
  }

  if (status === 409) {
    console.log(`✅ Bucket ya existe: gs://${bucketName}`);
    return true;
  }

  console.warn(`⚠️  No se pudo crear bucket (${status})`, body);
  return false;
}

async function registerFirebaseDefaultBucket(projectId, bucketName, token, dryRun) {
  if (dryRun) {
    console.log(`[dry-run] Registraría bucket Firebase ${bucketName}`);
    return true;
  }

  const { ok, status, body } = await apiRequest(
    token,
    `https://firebasestorage.googleapis.com/v1beta/projects/${projectId}/buckets/${bucketName}`,
    {
      method: "POST",
      body: JSON.stringify({ location: "US-CENTRAL1" }),
    },
  );

  if (ok || status === 409 || status === 400) {
    console.log(`✅ Storage Firebase listo (${bucketName})`);
    return true;
  }

  console.warn(`⚠️  Registro Firebase Storage (${status})`, body);
  return false;
}

function printManualSteps(projectId) {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ACCIÓN MANUAL (solo una vez) — plan Blaze + Storage
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1) Vincular facturación (Blaze):
   https://console.firebase.google.com/project/${projectId}/usage/details

   O agrega el secret en GitHub:
   GCP_BILLING_ACCOUNT_ID = XXXXXX-XXXXXX-XXXXXX
   (Facturación → Cuentas de facturación → copiar ID)

2) Activar Storage (si el script no pudo crearlo):
   https://console.firebase.google.com/project/${projectId}/storage
   → Comenzar → ubicación ${DEFAULT_LOCATION}

3) Re-ejecutar workflow "Setup Firebase Infrastructure"
   o push a main (deploy automático).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.help) {
    console.log(`Uso:
  node scripts/setup-firebase-infrastructure.mjs [--project ghost-contable] [--link-billing] [--dry-run]

Variables:
  GOOGLE_APPLICATION_CREDENTIALS  ruta al JSON de cuenta de servicio
  FIREBASE_SERVICE_ACCOUNT        JSON inline (GitHub Actions)
  GCP_BILLING_ACCOUNT_ID          ID cuenta facturación (opcional)`);
    process.exit(0);
  }

  const credentials = loadCredentials();
  const token = await getAccessToken(credentials);
  const billingAccountId = process.env.GCP_BILLING_ACCOUNT_ID?.trim();

  console.log(`\n🔧 Setup infraestructura Firebase — ${args.project}\n`);

  const billing = await getBillingInfo(args.project, token);
  const billingEnabled = billing.ok && Boolean(billing.body?.billingAccountName);

  if (billingEnabled) {
    console.log(`✅ Facturación activa: ${billing.body.billingAccountName}`);
  } else {
    console.warn("⚠️  Facturación NO vinculada (plan Spark — Functions bloqueadas).");

    if (args.linkBilling && billingAccountId) {
      const linked = await linkBillingAccount(args.project, billingAccountId, token);
      if (linked.ok) {
        console.log(`✅ Facturación vinculada con ${billingAccountId}`);
      } else {
        console.warn("⚠️  No se pudo vincular facturación automáticamente.", linked.body);
        console.warn("   La cuenta de servicio necesita rol Billing Account User.");
      }
    }
  }

  let servicesOk = 0;
  for (const service of REQUIRED_SERVICES) {
    const enabled = await enableService(args.project, service, token, args.dryRun);
    if (enabled) {
      servicesOk += 1;
    }
  }

  console.log(`\nAPIs: ${servicesOk}/${REQUIRED_SERVICES.length} listas\n`);

  const exists = args.dryRun ? false : await bucketExists(args.project, args.bucket, token);
  if (!exists) {
    await createStorageBucket(args.project, args.bucket, args.location, token, args.dryRun);
  } else {
    console.log(`✅ Bucket GCS existe: gs://${args.bucket}`);
  }

  await registerFirebaseDefaultBucket(args.project, args.bucket, token, args.dryRun);

  const billingAfter = await getBillingInfo(args.project, token);
  const blazeReady = billingAfter.ok && Boolean(billingAfter.body?.billingAccountName);

  if (!blazeReady) {
    printManualSteps(args.project);
    process.exit(2);
  }

  console.log("\n✅ Infraestructura lista para deploy de Functions + Storage.\n");
  process.exit(0);
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : error);
  process.exit(1);
});
