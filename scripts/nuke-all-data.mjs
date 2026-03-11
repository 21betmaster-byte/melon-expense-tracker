#!/usr/bin/env node

/**
 * nuke-all-data.mjs
 *
 * Deletes ALL user, household (+ subcollections), and invite_code data
 * from the production Firestore database using the Admin SDK.
 *
 * Usage: node scripts/nuke-all-data.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─── Env Loading ──────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(resolve(ROOT, ".env.local"));

// ─── Firebase Admin Init ──────────────────────────────────────────────────────

const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;
if (!serviceAccountBase64) {
  console.error("ERROR: FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY not set in .env.local");
  process.exit(1);
}

const serviceAccount = JSON.parse(
  Buffer.from(serviceAccountBase64, "base64").toString("utf-8")
);

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 400;

const HOUSEHOLD_SUBCOLLECTIONS = [
  "expenses",
  "categories",
  "groups",
  "goals",
  "settlements",
  "category_memory",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function deleteCollection(collectionRef, label) {
  let total = 0;
  let snapshot;

  do {
    snapshot = await collectionRef.limit(BATCH_SIZE).get();
    if (snapshot.empty) break;

    const batch = db.batch();
    for (const doc of snapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    total += snapshot.size;
    process.stdout.write(`  ${label}: deleted ${total} docs so far...\r`);
  } while (snapshot.size >= BATCH_SIZE);

  if (total > 0) {
    console.log(`  ${label}: deleted ${total} docs total`);
  } else {
    console.log(`  ${label}: (empty)`);
  }
  return total;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  NUKE ALL DATA — Full Firestore Wipe                ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  console.log(`Project: ${serviceAccount.project_id}\n`);

  let grandTotal = 0;

  // ── Step 1: Delete household subcollections ──
  console.log("Step 1: Fetching all households...");
  const householdsSnap = await db.collection("households").get();
  console.log(`  Found ${householdsSnap.size} household(s)\n`);

  for (const householdDoc of householdsSnap.docs) {
    const hid = householdDoc.id;
    console.log(`Step 2: Deleting subcollections for household: ${hid}`);

    for (const sub of HOUSEHOLD_SUBCOLLECTIONS) {
      const subRef = db.collection(`households/${hid}/${sub}`);
      const count = await deleteCollection(subRef, `  ${sub}`);
      grandTotal += count;
    }
    console.log();
  }

  // ── Step 3: Delete top-level collections ──
  console.log("Step 3: Deleting top-level collections...");

  const householdCount = await deleteCollection(db.collection("households"), "households");
  grandTotal += householdCount;

  const usersCount = await deleteCollection(db.collection("users"), "users");
  grandTotal += usersCount;

  const inviteCount = await deleteCollection(db.collection("invite_codes"), "invite_codes");
  grandTotal += inviteCount;

  // ── Done ──
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log(`║  Done! Deleted ${grandTotal} documents total.`);
  console.log("╚══════════════════════════════════════════════════════╝\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message || err);
  process.exit(1);
});
