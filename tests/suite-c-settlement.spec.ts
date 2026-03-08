import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite C: Settlement Math (Unit Tests) + UI test
 *
 * C1–C7 are pure unit tests — zero auth required, run instantly.
 * C8 is a browser test that requires an authenticated session.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 *
 * The inline calculateSettlement mirrors the ACTUAL production function
 * from lib/utils/settlement.ts. Settlement expenses use split_ratio: 0
 * so the full amount reduces the debt.
 */

// ─── Pure settlement logic (no Firebase needed) ───────────────────────────────

interface User {
  uid: string;
}

interface Expense {
  id: string;
  amount: number;
  paid_by_user_id: string;
  expense_type: "joint" | "solo" | "settlement";
  split_ratio: number;
}

interface SettlementResult {
  netBalance: number;
  owedBy: string | null;
  owedTo: string | null;
  amount: number;
  isSettled: boolean;
}

/**
 * Mirrors the production calculateSettlement from lib/utils/settlement.ts.
 *
 * Formula for all non-solo expenses (including settlement):
 *   If A paid: netBalanceA += sign × amount × (1 − split_ratio)
 *   If B paid: netBalanceA -= sign × amount × (1 − split_ratio)
 *
 * Settlement expenses use split_ratio = 0, so the full amount is applied.
 */
function calculateSettlement(
  expenses: Expense[],
  userA: User,
  userB: User
): SettlementResult {
  let netBalanceA = 0;

  for (const expense of expenses) {
    if (expense.expense_type === "solo") continue;

    const amount = Math.abs(expense.amount);
    const isRefund = expense.amount < 0;
    const sign = isRefund ? -1 : 1;

    if (expense.paid_by_user_id === userA.uid) {
      netBalanceA += sign * amount * (1 - expense.split_ratio);
    } else if (expense.paid_by_user_id === userB.uid) {
      netBalanceA -= sign * amount * (1 - expense.split_ratio);
    }
  }

  netBalanceA = Math.round(netBalanceA * 100) / 100;

  if (Math.abs(netBalanceA) < 0.01) {
    return { netBalance: 0, owedBy: null, owedTo: null, amount: 0, isSettled: true };
  }

  if (netBalanceA > 0) {
    return {
      netBalance: netBalanceA,
      owedBy: userB.uid,
      owedTo: userA.uid,
      amount: netBalanceA,
      isSettled: false,
    };
  } else {
    return {
      netBalance: netBalanceA,
      owedBy: userA.uid,
      owedTo: userB.uid,
      amount: Math.abs(netBalanceA),
      isSettled: false,
    };
  }
}

const userA: User = { uid: "uid-A" };
const userB: User = { uid: "uid-B" };

function makeJoint(
  id: string,
  amount: number,
  paidBy: string,
  ratio: number
): Expense {
  return {
    id,
    amount,
    paid_by_user_id: paidBy,
    expense_type: "joint",
    split_ratio: ratio,
  };
}

function makeSettlement(
  id: string,
  amount: number,
  paidBy: string
): Expense {
  return {
    id,
    amount,
    paid_by_user_id: paidBy,
    expense_type: "settlement",
    split_ratio: 0,
  };
}

// ─── C1–C7: Settlement Math Unit Tests ────────────────────────────────────────

test.describe("Suite C: Settlement Math (Unit Tests)", () => {
  test("C1: Symmetric 50/50 — B owes A ₹500", () => {
    const expenses = [makeJoint("e1", 1000, userA.uid, 0.5)];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.owedBy).toBe(userB.uid);
    expect(result.owedTo).toBe(userA.uid);
    expect(result.amount).toBe(500);
    expect(result.isSettled).toBe(false);
  });

  test("C2: Asymmetric 80/20 — A owes B ₹400", () => {
    // B paid 500, A's share (split_ratio) = 0.8 → A covers 80%, B covers 20%
    // B paid → netBalanceA -= 500 × (1 − 0.8) = −100
    // Wait, let me re-derive. split_ratio = payer's share.
    // B paid 500 with ratio 0.8 → B covers 80%, partner (A) covers 20%
    // A owes B: 500 × (1 − 0.8) = 100? No...
    // Formula: if B paid → netBalanceA -= amount × (1 − split_ratio)
    // = -500 × (1 − 0.8) = -100. So A owes B 100.
    // To get A owes B 400: B paid 500, ratio 0.2 → netBalanceA -= 500 × 0.8 = -400
    const expenses = [makeJoint("e1", 500, userB.uid, 0.2)];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.owedBy).toBe(userA.uid);
    expect(result.amount).toBe(400);
  });

  test("C3: Bidirectional offset — A owes B ₹200", () => {
    const expenses = [
      makeJoint("e1", 1000, userB.uid, 0.5), // A owes B 500
      makeJoint("e2", 600, userA.uid, 0.5),  // B owes A 300
    ];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.owedBy).toBe(userA.uid);
    expect(result.owedTo).toBe(userB.uid);
    expect(result.amount).toBe(200);
  });

  test("C4: Settlement expense fully cancels debt (split_ratio 0)", () => {
    const expenses = [
      makeJoint("e1", 1000, userA.uid, 0.5),  // B owes A 500
      makeSettlement("s1", 500, userB.uid),     // B pays A 500 via settlement
    ];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.isSettled).toBe(true);
    expect(result.amount).toBe(0);
  });

  test("C5: Solo expenses are ignored in settlement", () => {
    const expenses: Expense[] = [
      {
        id: "e1",
        amount: 999,
        paid_by_user_id: userA.uid,
        expense_type: "solo",
        split_ratio: 1.0,
      },
    ];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.isSettled).toBe(true);
    expect(result.amount).toBe(0);
  });

  test("C6: Settlement transaction partially reduces balance", () => {
    const expenses: Expense[] = [
      makeJoint("e1", 1000, userA.uid, 0.5),  // B owes A 500
      makeSettlement("s1", 300, userB.uid),     // B pays A 300
    ];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.owedBy).toBe(userB.uid);
    expect(result.amount).toBe(200);
  });

  test("C7: Settlement + joint combined resolves correctly", () => {
    const expenses: Expense[] = [
      makeJoint("e1", 2000, userA.uid, 0.5),  // B owes A 1000
      makeJoint("e2", 400, userB.uid, 0.5),   // A owes B 200
      // Net: B owes A 800
      makeSettlement("s1", 500, userB.uid),     // B pays A 500
      // Remaining: B owes A 300
    ];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.owedBy).toBe(userB.uid);
    expect(result.amount).toBe(300);
  });
});

// ─── C8: Settlement UI (requires auth) ────────────────────────────────────────

test.describe("Suite C: Settlement UI Tests", () => {
  test("C8: Settlement card renders on dashboard", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await expect(page.locator('[data-testid="settlement-card"]')).toBeVisible({
      timeout: 10000,
    });
  });
});
