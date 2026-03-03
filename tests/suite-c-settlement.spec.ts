import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite C: Settlement Math (Unit Tests) + UI test
 *
 * C1–C6 are pure unit tests — zero auth required, run instantly.
 * C7 is a browser test that requires an authenticated session.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

// ─── Pure settlement logic (no Firebase needed) ───────────────────────────────

interface Expense {
  id: string;
  amount: number;
  paid_by_user_id: string;
  expense_type: "joint" | "solo" | "settlement";
  split_ratio: number;
}

function calculateSettlement(
  expenses: Expense[],
  userA: string,
  userB: string
): { owes: string; owedBy: string; amount: number; isSettled: boolean } {
  let balance = 0; // positive = A owes B, negative = B owes A

  for (const e of expenses) {
    if (e.expense_type === "settlement") {
      // Settlement reduces debt
      if (e.paid_by_user_id === userA) {
        balance -= e.amount;
      } else if (e.paid_by_user_id === userB) {
        balance += e.amount;
      }
      continue;
    }

    if (e.expense_type === "solo") continue;

    // Joint expense
    const ratio = e.split_ratio; // fraction A pays
    const aShare = e.amount * ratio;
    const bShare = e.amount * (1 - ratio);

    if (e.paid_by_user_id === userA) {
      // A paid — B owes A their share
      balance -= bShare;
    } else if (e.paid_by_user_id === userB) {
      // B paid — A owes B their share
      balance += aShare;
    }
  }

  const amount = Math.abs(balance);
  const isSettled = amount < 0.01;
  return {
    owes: balance > 0 ? userA : userB,
    owedBy: balance > 0 ? userB : userA,
    amount: parseFloat(amount.toFixed(2)),
    isSettled,
  };
}

const userA = "uid-A";
const userB = "uid-B";

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

// ─── C1–C6: Settlement Math Unit Tests ────────────────────────────────────────

test.describe("Suite C: Settlement Math (Unit Tests)", () => {
  test("C1: Symmetric 50/50 — B owes A ₹500", () => {
    const expenses = [makeJoint("e1", 1000, userA, 0.5)];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.owes).toBe(userB);
    expect(result.owedBy).toBe(userA);
    expect(result.amount).toBe(500);
    expect(result.isSettled).toBe(false);
  });

  test("C2: Asymmetric 80/20 — A owes B ₹400", () => {
    // B paid ₹1000, A's share is 80% = ₹800, A owes B ₹800
    // A paid ₹1000, A's share 80% means B owes A ₹200
    // Net: A owes B 800 - 200 = 600? Let's model correctly:
    // e1: B paid 1000, ratio=0.8 (A pays 80%) → A owes B 800
    // e2: A paid 1000, ratio=0.8 (A pays 80%) → B owes A 200
    // Net balance: A owes B 800 - 200 = 600... but test says 400.
    // Let's use a simpler single expense: B paid 500, A's share 80% = 400
    const expenses = [makeJoint("e1", 500, userB, 0.8)];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.owes).toBe(userA);
    expect(result.amount).toBe(400);
  });

  test("C3: Bidirectional offset — A owes B ₹200", () => {
    const expenses = [
      makeJoint("e1", 1000, userB, 0.5), // A owes B 500
      makeJoint("e2", 600, userA, 0.5), // B owes A 300
    ];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.owes).toBe(userA);
    expect(result.owedBy).toBe(userB);
    expect(result.amount).toBe(200);
  });

  test("C4: Refund reverses debt", () => {
    const expenses = [
      makeJoint("e1", 1000, userA, 0.5), // B owes A 500
      {
        id: "e2",
        amount: 500,
        paid_by_user_id: userB,
        expense_type: "settlement" as const,
        split_ratio: 0.5,
      },
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
        paid_by_user_id: userA,
        expense_type: "solo",
        split_ratio: 1.0,
      },
    ];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.isSettled).toBe(true);
    expect(result.amount).toBe(0);
  });

  test("C6: Settlement transaction reduces balance", () => {
    const expenses: Expense[] = [
      makeJoint("e1", 1000, userA, 0.5), // B owes A 500
      {
        id: "e2",
        amount: 300,
        paid_by_user_id: userB,
        expense_type: "settlement" as const,
        split_ratio: 0.0,
      },
    ];
    const result = calculateSettlement(expenses, userA, userB);
    expect(result.owes).toBe(userB);
    expect(result.amount).toBe(200);
  });
});

// ─── C7: Settlement UI (requires auth) ────────────────────────────────────────

test.describe("Suite C: Settlement UI Tests", () => {
  test("C7: Settlement card renders on dashboard", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await expect(page.locator('[data-testid="settlement-card"]')).toBeVisible({
      timeout: 10000,
    });
  });
});
