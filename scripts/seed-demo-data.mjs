#!/usr/bin/env node

/**
 * seed-demo-data.mjs
 *
 * Cleans up garbage test data and seeds 3 months of realistic
 * couples expense data for the expense tracker demo.
 *
 * Usage: node scripts/seed-demo-data.mjs
 */

import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

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

loadEnvFile(resolve(ROOT, ".env.test"));
loadEnvFile(resolve(ROOT, ".env.local"));

// ─── Firebase Init (standalone — no browser APIs) ─────────────────────────────

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  writeBatch,
  Timestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BATCH = 499;

const DEFAULT_CATEGORY_NAMES = new Set([
  "Housing & Utilities",
  "Groceries",
  "Food & Dining",
  "Transportation",
  "Shopping & Lifestyle",
  "Health & Wellness",
  "Entertainment & Subs",
  "Miscellaneous",
]);

const MONTHS = [
  { year: 2025, month: 11 }, // Dec 2025
  { year: 2026, month: 0 },  // Jan 2026
  { year: 2026, month: 1 },  // Feb 2026
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDateInMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const day = randInt(1, daysInMonth);
  const hour = randInt(8, 22);
  const minute = randInt(0, 59);
  return new Date(year, month, day, hour, minute);
}

// ─── Expense Templates ────────────────────────────────────────────────────────

const EXPENSE_TEMPLATES = [
  // ── Housing & Utilities ──
  {
    category: "Housing & Utilities",
    entries: [
      {
        descriptions: ["Rent"],
        amountRange: [25000, 25000],
        type: "joint",
        splitRatios: [0.5],
        recurring: { frequency: "monthly", day: 1 },
        perMonth: 1,
      },
      {
        descriptions: ["Electricity bill", "BESCOM bill"],
        amountRange: [1500, 2800],
        type: "joint",
        splitRatios: [0.5],
        recurring: null,
        perMonth: 1,
      },
      {
        descriptions: ["Internet - Airtel", "Jio Fiber", "Internet bill"],
        amountRange: [800, 1500],
        type: "joint",
        splitRatios: [0.5],
        recurring: { frequency: "monthly", day: 5 },
        perMonth: 1,
      },
      {
        descriptions: ["Gas cylinder", "Piped gas bill"],
        amountRange: [500, 900],
        type: "joint",
        splitRatios: [0.5],
        recurring: null,
        perMonth: [0, 1],
      },
    ],
  },
  // ── Groceries ──
  {
    category: "Groceries",
    entries: [
      {
        descriptions: [
          "BigBasket order",
          "Blinkit groceries",
          "Zepto order",
          "Instamart delivery",
          "DMart shopping",
          "Vegetables & fruits",
          "Weekly groceries",
          "Milk & dairy",
          "Grocery run",
          "Kitchen essentials",
          "Spices & condiments",
        ],
        amountRange: [200, 2500],
        type: "joint",
        splitRatios: [0.5, 0.5, 0.5, 0.6, 0.4],
        recurring: null,
        perMonth: [8, 12],
      },
    ],
  },
  // ── Food & Dining ──
  {
    category: "Food & Dining",
    entries: [
      {
        descriptions: [
          "Swiggy order",
          "Zomato delivery",
          "Domino's pizza",
          "McDonald's",
          "KFC",
          "Starbucks coffee",
          "Chai & snacks",
          "Dinner at restaurant",
          "Lunch out",
          "Cafe visit",
          "Breakfast out",
          "Weekend brunch",
          "Ice cream",
        ],
        amountRange: [150, 3000],
        type: "mixed",
        splitRatios: [0.5, 0.5, 0.6, 0.4, 0.7],
        recurring: null,
        perMonth: [6, 10],
      },
    ],
  },
  // ── Transportation ──
  {
    category: "Transportation",
    entries: [
      {
        descriptions: [
          "Uber ride",
          "Ola auto",
          "Rapido bike",
          "Metro recharge",
          "Petrol",
          "Parking charges",
          "FASTag toll",
          "Auto rickshaw",
        ],
        amountRange: [100, 2000],
        type: "mixed",
        splitRatios: [0.5, 1.0],
        recurring: null,
        perMonth: [4, 8],
      },
    ],
  },
  // ── Shopping & Lifestyle ──
  {
    category: "Shopping & Lifestyle",
    entries: [
      {
        descriptions: [
          "Amazon order",
          "Flipkart purchase",
          "Myntra haul",
          "Nykaa beauty",
          "Salon visit",
          "Clothing",
          "Household items",
          "Electronics accessory",
        ],
        amountRange: [500, 5000],
        type: "mixed",
        splitRatios: [0.5, 0.5, 1.0],
        recurring: null,
        perMonth: [2, 4],
      },
    ],
  },
  // ── Health & Wellness ──
  {
    category: "Health & Wellness",
    entries: [
      {
        descriptions: [
          "Apollo Pharmacy",
          "Medicine order",
          "Doctor consultation",
          "Vitamins & supplements",
        ],
        amountRange: [200, 3000],
        type: "mixed",
        splitRatios: [0.5, 1.0],
        recurring: null,
        perMonth: [1, 2],
      },
      {
        descriptions: ["Gym membership"],
        amountRange: [1500, 2500],
        type: "solo",
        splitRatios: [1.0],
        recurring: { frequency: "monthly", day: 1 },
        perMonth: 1,
      },
    ],
  },
  // ── Entertainment & Subs ──
  {
    category: "Entertainment & Subs",
    entries: [
      {
        descriptions: ["Netflix subscription"],
        amountRange: [649, 649],
        type: "joint",
        splitRatios: [0.5],
        recurring: { frequency: "monthly", day: 15 },
        perMonth: 1,
      },
      {
        descriptions: ["Spotify Premium"],
        amountRange: [119, 119],
        type: "solo",
        splitRatios: [1.0],
        recurring: { frequency: "monthly", day: 10 },
        perMonth: 1,
      },
      {
        descriptions: [
          "Movie tickets - PVR",
          "BookMyShow movie",
          "Weekend outing",
          "Concert tickets",
        ],
        amountRange: [400, 1500],
        type: "joint",
        splitRatios: [0.5, 0.6],
        recurring: null,
        perMonth: [1, 2],
      },
    ],
  },
  // ── Miscellaneous ──
  {
    category: "Miscellaneous",
    entries: [
      {
        descriptions: [
          "ATM withdrawal",
          "Cash for maid",
          "Gift for friend",
          "Donation",
          "Courier charges",
          "Laundry",
          "Key copy",
          "Misc expense",
        ],
        amountRange: [100, 2000],
        type: "mixed",
        splitRatios: [0.5, 0.5, 1.0],
        recurring: null,
        perMonth: [1, 3],
      },
    ],
  },
];

// ── Annual Expenses ──

const ANNUAL_TEMPLATES = [
  {
    category: "Housing & Utilities",
    descriptions: ["Society maintenance (annual)", "Home insurance premium"],
    amountRange: [5000, 15000],
    type: "joint",
    splitRatios: [0.5],
  },
  {
    category: "Health & Wellness",
    descriptions: ["Health insurance premium", "Annual health checkup"],
    amountRange: [8000, 25000],
    type: "joint",
    splitRatios: [0.5, 0.6],
  },
  {
    category: "Entertainment & Subs",
    descriptions: ["Amazon Prime annual", "Hotstar annual plan"],
    amountRange: [1499, 2999],
    type: "joint",
    splitRatios: [0.5],
  },
  {
    category: "Miscellaneous",
    descriptions: ["Anniversary dinner", "Birthday gift - partner"],
    amountRange: [2000, 8000],
    type: "joint",
    splitRatios: [0.5, 0.7, 0.3],
  },
];

// ─── Data Generation ──────────────────────────────────────────────────────────

function generateMonthlyExpenses(year, month, groupId, categoryMap, members) {
  const expenses = [];
  let payerToggle = randInt(0, 1); // start random

  for (const tmpl of EXPENSE_TEMPLATES) {
    const catId = categoryMap[tmpl.category];
    if (!catId) {
      console.warn(`  ⚠ Category not found: ${tmpl.category}`);
      continue;
    }

    for (const entry of tmpl.entries) {
      const count = Array.isArray(entry.perMonth)
        ? randInt(entry.perMonth[0], entry.perMonth[1])
        : entry.perMonth;

      for (let i = 0; i < count; i++) {
        const desc = pick(entry.descriptions);
        const amount = randInt(entry.amountRange[0], entry.amountRange[1]);

        // Determine expense type
        let expenseType;
        if (entry.type === "mixed") {
          const roll = Math.random();
          expenseType = roll < 0.65 ? "joint" : "solo";
        } else {
          expenseType = entry.type;
        }

        // Split ratio
        const splitRatio =
          expenseType === "solo" ? 1.0 : pick(entry.splitRatios);

        // Payer alternation
        const payerId = members[payerToggle % 2];
        payerToggle++;

        // Date
        let date;
        if (entry.recurring?.day) {
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const day = Math.min(entry.recurring.day, daysInMonth);
          date = new Date(year, month, day, randInt(8, 20), randInt(0, 59));
        } else {
          date = randomDateInMonth(year, month);
        }

        const expense = {
          amount,
          description: desc,
          group_id: groupId,
          category_id: catId,
          expense_type: expenseType,
          paid_by_user_id: payerId,
          split_ratio: splitRatio,
          date: Timestamp.fromDate(date),
          source: "manual",
          created_by: payerId,
        };

        if (entry.recurring) {
          expense.is_recurring = true;
          expense.recurring_frequency = entry.recurring.frequency;
          if (entry.recurring.day) expense.recurrence_day = entry.recurring.day;
        }

        expenses.push(expense);
      }
    }
  }

  return expenses;
}

function generateAnnualExpenses(groupId, categoryMap, members) {
  const expenses = [];
  let payerToggle = 0;

  for (const tmpl of ANNUAL_TEMPLATES) {
    const catId = categoryMap[tmpl.category];
    if (!catId) continue;

    const desc = pick(tmpl.descriptions);
    const amount = randInt(tmpl.amountRange[0], tmpl.amountRange[1]);
    const splitRatio = pick(tmpl.splitRatios);
    const payerId = members[payerToggle % 2];
    payerToggle++;

    const monthInfo = pick(MONTHS);
    const date = randomDateInMonth(monthInfo.year, monthInfo.month);

    expenses.push({
      amount,
      description: desc,
      group_id: groupId,
      category_id: catId,
      expense_type: tmpl.type,
      paid_by_user_id: payerId,
      split_ratio: splitRatio,
      date: Timestamp.fromDate(date),
      source: "manual",
      created_by: payerId,
    });
  }

  return expenses;
}

function generateSettlements(members, groupId) {
  return [
    {
      amount: randInt(3000, 8000),
      paid_by: members[0],
      paid_to: members[1],
      settled_at: Timestamp.fromDate(new Date(2025, 11, 28, 20, 0)),
      note: "Monthly settlement",
      group_id: groupId,
    },
    {
      amount: randInt(3000, 8000),
      paid_by: members[1],
      paid_to: members[0],
      settled_at: Timestamp.fromDate(new Date(2026, 0, 30, 19, 30)),
      note: "Monthly settlement",
      group_id: groupId,
    },
  ];
}

// ─── Batch Utilities ──────────────────────────────────────────────────────────

async function batchDelete(db, refs) {
  let batch = writeBatch(db);
  let ops = 0;
  let total = 0;

  for (const ref of refs) {
    batch.delete(ref);
    ops++;
    if (ops >= MAX_BATCH) {
      await batch.commit();
      total += ops;
      batch = writeBatch(db);
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
    total += ops;
  }
  return total;
}

async function batchCreate(db, householdId, subcollection, documents) {
  let batch = writeBatch(db);
  let ops = 0;
  let total = 0;

  for (const data of documents) {
    const ref = doc(collection(db, "households", householdId, subcollection));
    batch.set(ref, data);
    ops++;
    if (ops >= MAX_BATCH) {
      await batch.commit();
      total += ops;
      batch = writeBatch(db);
      ops = 0;
    }
  }

  if (ops > 0) {
    await batch.commit();
    total += ops;
  }
  return total;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  Melon — Seed Demo Data                              ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // ── Step 1: Sign in ──
  console.log("Step 1: Signing in...");
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) {
    console.error("ERROR: TEST_USER_EMAIL or TEST_USER_PASSWORD not set in .env.test");
    process.exit(1);
  }

  const cred = await signInWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;
  console.log(`  ✓ Signed in as ${email} (uid: ${uid})`);

  // ── Step 2: Lookup household ──
  console.log("\nStep 2: Looking up household...");
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) {
    console.error("ERROR: User profile not found in Firestore");
    process.exit(1);
  }
  const householdId = userSnap.data().household_id;
  if (!householdId) {
    console.error("ERROR: User has no household_id");
    process.exit(1);
  }

  const householdSnap = await getDoc(doc(db, "households", householdId));
  const household = householdSnap.data();
  const members = household.members;
  console.log(`  ✓ Household: ${householdId}`);
  console.log(`  ✓ Members: ${members.length} (${members.join(", ")})`);

  // Ensure we have 2 members for realistic couples data
  // If only 1 member, duplicate the single user as both payer slots
  const effectiveMembers =
    members.length >= 2 ? members : [members[0], members[0]];
  if (members.length < 2) {
    console.warn(
      "  ⚠ Only 1 member — expenses will alternate payer but use same UID"
    );
  }

  // ── Step 3: Cleanup ──
  console.log("\nStep 3: Cleaning up existing data...");

  // Small delay to ensure auth token is propagated
  await new Promise((r) => setTimeout(r, 1000));

  // 3a: Categories — keep only 8 defaults
  console.log("  Fetching categories...");
  const catSnap = await getDocs(
    collection(db, "households", householdId, "categories")
  );
  const catsToDelete = [];
  const categoryMap = {};

  for (const d of catSnap.docs) {
    const name = d.data().name;
    if (DEFAULT_CATEGORY_NAMES.has(name) && !categoryMap[name]) {
      categoryMap[name] = d.id;
    } else if (DEFAULT_CATEGORY_NAMES.has(name) && categoryMap[name]) {
      catsToDelete.push(d.ref);
    } else {
      catsToDelete.push(d.ref);
    }
  }

  // 3b: Groups — keep only "Day to day" and "Annual expenses"
  console.log("  Fetching groups...");
  const groupCleanSnap = await getDocs(
    collection(db, "households", householdId, "groups")
  );
  const KEEP_GROUPS = new Set(["Day to day", "Annual expenses"]);
  const groupsToDelete = [];
  for (const d of groupCleanSnap.docs) {
    const name = d.data().name;
    if (!KEEP_GROUPS.has(name)) {
      groupsToDelete.push(d.ref);
    }
  }

  // 3c: Fetch all collections to delete
  console.log("  Fetching expenses...");
  const expSnap = await getDocs(
    collection(db, "households", householdId, "expenses")
  );
  // category_memory and settlements may have stricter rules — make optional
  let memSnap = null;
  try {
    console.log("  Fetching category_memory...");
    memSnap = await getDocs(
      collection(db, "households", householdId, "category_memory")
    );
  } catch {
    console.log("  ⚠ category_memory fetch blocked (security rules) — skipping");
  }

  let setSnap = null;
  try {
    console.log("  Fetching settlements...");
    setSnap = await getDocs(
      collection(db, "households", householdId, "settlements")
    );
  } catch {
    console.log("  ⚠ settlements fetch blocked (security rules) — skipping");
  }

  // 3d: Batch delete everything
  const allDeleteRefs = [
    ...catsToDelete,
    ...groupsToDelete,
    ...expSnap.docs.map((d) => d.ref),
    ...(memSnap ? memSnap.docs.map((d) => d.ref) : []),
    ...(setSnap ? setSnap.docs.map((d) => d.ref) : []),
  ];

  const deletedCount = await batchDelete(db, allDeleteRefs);
  console.log(`  ✓ Deleted ${catsToDelete.length} non-default categories`);
  console.log(`  ✓ Deleted ${groupsToDelete.length} garbage groups`);
  console.log(`  ✓ Deleted ${expSnap.size} expenses`);
  console.log(`  ✓ Deleted ${memSnap ? memSnap.size : 0} category_memory docs`);
  console.log(`  ✓ Deleted ${setSnap ? setSnap.size : 0} settlements`);
  console.log(`  ✓ Total deletions: ${deletedCount}`);

  // ── Step 4: Verify groups & categories ──
  console.log("\nStep 4: Verifying groups & categories...");

  const groupSnap = await getDocs(
    collection(db, "households", householdId, "groups")
  );
  let dayToDayGroupId = null;
  let annualGroupId = null;

  for (const d of groupSnap.docs) {
    const data = d.data();
    if (data.name === "Day to day") dayToDayGroupId = d.id;
    if (data.name === "Annual expenses") annualGroupId = d.id;
  }

  if (!dayToDayGroupId) {
    console.error("ERROR: 'Day to day' group not found!");
    process.exit(1);
  }

  console.log(`  ✓ Day to day group: ${dayToDayGroupId}`);
  console.log(
    `  ✓ Annual expenses group: ${annualGroupId || "(not found — skipping annual expenses)"}`
  );
  console.log(
    `  ✓ Categories: ${Object.keys(categoryMap).length}/8 — [${Object.keys(categoryMap).join(", ")}]`
  );

  // ── Step 5: Generate data ──
  console.log("\nStep 5: Generating expenses...");

  const allExpenses = [];

  for (const { year, month } of MONTHS) {
    const monthExpenses = generateMonthlyExpenses(
      year,
      month,
      dayToDayGroupId,
      categoryMap,
      effectiveMembers
    );
    allExpenses.push(...monthExpenses);
    const label = new Date(year, month).toLocaleString("en", {
      month: "short",
      year: "numeric",
    });
    const monthTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
    console.log(
      `  ${label}: ${monthExpenses.length} expenses — ₹${monthTotal.toLocaleString("en-IN")}`
    );
  }

  // Annual expenses
  if (annualGroupId) {
    const annual = generateAnnualExpenses(annualGroupId, categoryMap, effectiveMembers);
    allExpenses.push(...annual);
    const annualTotal = annual.reduce((s, e) => s + e.amount, 0);
    console.log(
      `  Annual: ${annual.length} expenses — ₹${annualTotal.toLocaleString("en-IN")}`
    );
  }

  // Settlements
  const settlements = generateSettlements(effectiveMembers, dayToDayGroupId);
  console.log(`  Settlements: ${settlements.length}`);

  // Summary
  const totalAmount = allExpenses.reduce((s, e) => s + e.amount, 0);
  const jointCount = allExpenses.filter((e) => e.expense_type === "joint").length;
  const soloCount = allExpenses.filter((e) => e.expense_type === "solo").length;
  const recurringCount = allExpenses.filter((e) => e.is_recurring).length;

  console.log(`\n  ────────────────────────────────`);
  console.log(`  Total expenses: ${allExpenses.length}`);
  console.log(
    `  Total amount:   ₹${totalAmount.toLocaleString("en-IN")}`
  );
  console.log(
    `  Avg per month:  ₹${Math.round(totalAmount / 3).toLocaleString("en-IN")}`
  );
  console.log(`  Joint: ${jointCount} | Solo: ${soloCount} | Recurring: ${recurringCount}`);
  console.log(`  ────────────────────────────────`);

  // ── Step 6: Write to Firestore ──
  console.log("\nStep 6: Writing to Firestore...");

  const expWritten = await batchCreate(
    db,
    householdId,
    "expenses",
    allExpenses
  );
  console.log(`  ✓ ${expWritten} expenses written`);

  // Settlements: use addDoc (individual writes) — batch.set may be blocked by security rules
  let setWritten = 0;
  try {
    for (const s of settlements) {
      await addDoc(collection(db, "households", householdId, "settlements"), s);
      setWritten++;
    }
    console.log(`  ✓ ${setWritten} settlements written`);
  } catch (err) {
    console.warn(`  ⚠ Settlements write failed after ${setWritten}/${settlements.length}: ${err.message || err}`);
    console.warn(`    (Firestore security rules may block settlement writes — skipping)`);
  }

  // ── Done ──
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║  ✅ Seeding complete!                                ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log("\nOpen http://localhost:3000 to see the demo data.\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("\nFATAL:", err.message || err);
  process.exit(1);
});
