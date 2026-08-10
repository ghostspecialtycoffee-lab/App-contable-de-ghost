#!/usr/bin/env node
/**
 * Prepara un bundle de Cloud Functions sin dependencias workspace:*.
 * Firebase CLI ejecuta npm install en el servidor; pnpm workspace: falla con EUNSUPPORTEDPROTOCOL.
 */

import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BUNDLE_DIR = join(ROOT, "apps", "functions-bundle");
const VENDOR_DOMAIN = join(BUNDLE_DIR, "vendor", "domain");
const VENDOR_SHARED = join(BUNDLE_DIR, "vendor", "shared");

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function copyPackageDist(packageName, targetDir) {
  const sourceRoot = join(ROOT, "packages", packageName);
  const pkg = readJson(join(sourceRoot, "package.json"));

  mkdirSync(targetDir, { recursive: true });
  cpSync(join(sourceRoot, "dist"), join(targetDir, "dist"), { recursive: true });

  const bundled = {
    name: pkg.name,
    version: pkg.version,
    private: true,
    type: pkg.type ?? "module",
    main: pkg.main,
    types: pkg.types,
    exports: pkg.exports,
    dependencies: {},
  };

  if (packageName === "domain") {
    bundled.dependencies["@ghost/shared"] = "file:../shared";
  }

  writeFileSync(join(targetDir, "package.json"), `${JSON.stringify(bundled, null, 2)}\n`);
}

rmSync(BUNDLE_DIR, { recursive: true, force: true });
mkdirSync(BUNDLE_DIR, { recursive: true });

copyPackageDist("shared", VENDOR_SHARED);
copyPackageDist("domain", VENDOR_DOMAIN);

cpSync(join(ROOT, "apps", "functions", "lib"), join(BUNDLE_DIR, "lib"), { recursive: true });

const bundlePackage = {
  name: "@ghost/functions",
  version: "0.1.0",
  private: true,
  main: "lib/index.js",
  engines: { node: "20" },
  dependencies: {
    "@ghost/domain": "file:vendor/domain",
    "@ghost/shared": "file:vendor/shared",
    "firebase-admin": "^13.2.0",
    "firebase-functions": "^6.3.2",
  },
};

writeFileSync(join(BUNDLE_DIR, "package.json"), `${JSON.stringify(bundlePackage, null, 2)}\n`);

const geminiKey = process.env.GEMINI_API_KEY?.trim();
if (geminiKey) {
  writeFileSync(join(BUNDLE_DIR, ".env"), `GEMINI_API_KEY=${geminiKey}\n`);
  console.log("✅ GEMINI_API_KEY incluida en bundle (.env)");
}

execSync("npm install --omit=dev --no-audit --no-fund", {
  cwd: BUNDLE_DIR,
  stdio: "inherit",
});

console.log(`✅ Functions bundle listo en ${BUNDLE_DIR}`);
