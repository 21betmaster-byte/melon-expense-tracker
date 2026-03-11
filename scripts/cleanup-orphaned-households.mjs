#!/usr/bin/env node
/**
 * One-time cleanup script: finds and deletes orphaned solo households.
 *
 * An "orphaned" household is one where:
 *   - It has exactly 1 member
 *   - That member's active household_id points to a DIFFERENT household
 *     (meaning they joined another household via invite but the old one
 *      was never cleaned up)
 *
 * Usage:
 *   node scripts/cleanup-orphaned-households.mjs            # dry-run (default)
 *   node scripts/cleanup-orphaned-households.mjs --execute   # actually delete
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Config ──────────────────────────────────────────────────────────────────

const DRY_RUN = !process.argv.includes("--execute");

// Look for service account key in common locations
const SA_PATHS = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  resolve("service-account-key.json"),
  resolve("serviceAccountKey.json"),
].filter(Boolean);

let saPath = null;
for (const p of SA_PATHS) {
  try {
    readFileSync(p);
    saPath = p;
    break;
  } catch {
    // try next
  }
}

if (!saPath) {
  console.error(
    "❌ No service account key found.\n" +
    "   Download one from Firebase Console → Project Settings → Service Accounts → Generate New Private Key\n" +
    "   Then either:\n" +
    "     - Place it at ./service-account-key.json\n" +
    "     - Or set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json"
  );
  process.exit(1);
}

const sa = JSON.parse(readFileSync(saPath, "utf-8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();

// ─── Subcollections to delete ────────────────────────────────────────────────

const SUBCOLLECTIONS = [
  "groups",
  "categories",
  "expenses",
  "goals",
  "category_memory",
  "settlements",
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? "🔍 DRY RUN — no data will be deleted\n" : "🚨 EXECUTE MODE — orphaned data will be deleted\n");

  const householdsSnap = await db.collection("households").get();
  console.log(`Found ${householdsSnap.size} total households\n`);

  let orphanCount = 0;
  let deletedDocs = 0;

  for (const householdDoc of householdsSnap.docs) {
    const data = householdDoc.data();
    const members = data.members || [];

    // Only consider solo households
    if (members.length !== 1) continue;

    const memberUid = members[0];

    // Check if this member's active household points elsewhere
    const userDoc = await db.collection("users").doc(memberUid).get();
    if (!userDoc.exists) {
      console.log(`⚠️  Household ${householdDoc.id}: sole member ${memberUid} has no user profile — skipping`);
      continue;
    }

    const userData = userDoc.data();
    const activeHouseholdId = userData.household_id;

    if (!activeHouseholdId || activeHouseholdId === householdDoc.id) {
      // This IS their active household — not orphaned
      continue;
    }

    // This household is orphaned
    orphanCount++;

    // Count subcollection docs
    let subDocCount = 0;
    for (const sub of SUBCOLLECTIONS) {
      const subSnap = await db.collection("households").doc(householdDoc.id).collection(sub).get();
      subDocCount += subSnap.size;
    }

    console.log(
      `🗑️  Orphaned: ${householdDoc.id}\n` +
      `   Member: ${memberUid} (${userData.name || userData.email || "unknown"})\n` +
      `   Active household: ${activeHouseholdId}\n` +
      `   Subcollection docs to delete: ${subDocCount}\n` +
      `   Invite code: ${data.invite_code || "none"}`
    );

    if (!DRY_RUN) {
      // Delete all subcollection docs
      for (const sub of SUBCOLLECTIONS) {
        const subSnap = await db.collection("households").doc(householdDoc.id).collection(sub).get();
        const batch = db.batch();
        for (const d of subSnap.docs) {
          batch.delete(d.ref);
          deletedDocs++;
        }
        if (subSnap.size > 0) await batch.commit();
      }

      // Delete invite code lookup doc
      if (data.invite_code) {
        try {
          await db.collection("invite_codes").doc(data.invite_code).delete();
          deletedDocs++;
          console.log(`   ✓ Deleted invite_codes/${data.invite_code}`);
        } catch {
          console.log(`   ⚠️  Could not delete invite_codes/${data.invite_code}`);
        }
      }

      // Delete the household document itself
      await householdDoc.ref.delete();
      deletedDocs++;
      console.log(`   ✓ Deleted household ${householdDoc.id}`);

      // Remove old household from user's household_ids
      const householdIds = userData.household_ids || [];
      if (householdIds.includes(householdDoc.id)) {
        await userDoc.ref.update({
          household_ids: FieldValue.arrayRemove(householdDoc.id),
        });
        console.log(`   ✓ Removed from ${memberUid}'s household_ids`);
      }
    }

    console.log();
  }

  console.log("─".repeat(50));
  console.log(`Orphaned households found: ${orphanCount}`);
  if (DRY_RUN) {
    console.log("Re-run with --execute to delete them:");
    console.log("  node scripts/cleanup-orphaned-households.mjs --execute");
  } else {
    console.log(`Documents deleted: ${deletedDocs}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
