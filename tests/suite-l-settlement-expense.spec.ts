import { test, expect, type Page } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite L: Settlement-as-Expense Tests (L1–L24)
 *
 * Verifies that settlements are recorded as real expenses (not separate
 * settlement events). Covers:
 *
 * L1–L12:  Pure unit tests — settlement math with expense_type "settlement"
 * L13–L24: E2E tests — full flow from "Mark as Settled" to expense list
 *
 * The settlement fix records settlements as expenses with:
 *   expense_type: "settlement"
 *   split_ratio: 0        (payer covers 0%, full amount reduces debt)
 *   paid_by_user_id: owedBy  (the debtor pays)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// Pure Unit Tests — mirrors the actual calculateSettlement() from
// lib/utils/settlement.ts using its real formula.
// ═══════════════════════════════════════════════════════════════════════════════

interface User {
  uid: string;
  name: string;
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
 * Exact copy of the production calculateSettlement logic.
 * Uses the real formula: netBalanceA += sign * amount * (1 - split_ratio)
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

const A: User = { uid: "uid-A", name: "Alice" };
const B: User = { uid: "uid-B", name: "Bob" };

function joint(id: string, amount: number, paidBy: string, ratio: number): Expense {
  return { id, amount, paid_by_user_id: paidBy, expense_type: "joint", split_ratio: ratio };
}

function settlement(id: string, amount: number, paidBy: string): Expense {
  return { id, amount, paid_by_user_id: paidBy, expense_type: "settlement", split_ratio: 0 };
}

// ─── L1–L12: Pure Settlement Math ──────────────────────────────────────────

test.describe("Suite L: Settlement-as-Expense Unit Tests", () => {
  test("L1: Settlement expense with split_ratio 0 fully reduces balance", () => {
    const expenses = [
      joint("e1", 1000, A.uid, 0.5),     // B owes A 500
      settlement("s1", 500, B.uid),        // B pays A 500 (settlement)
    ];
    const result = calculateSettlement(expenses, A, B);
    expect(result.isSettled).toBe(true);
    expect(result.amount).toBe(0);
  });

  test("L2: Partial settlement reduces balance proportionally", () => {
    const expenses = [
      joint("e1", 1000, A.uid, 0.5),     // B owes A 500
      settlement("s1", 200, B.uid),        // B pays A 200
    ];
    const result = calculateSettlement(expenses, A, B);
    expect(result.isSettled).toBe(false);
    expect(result.owedBy).toBe(B.uid);
    expect(result.owedTo).toBe(A.uid);
    expect(result.amount).toBe(300);
  });

  test("L3: Over-settlement flips debt direction", () => {
    const expenses = [
      joint("e1", 1000, A.uid, 0.5),     // B owes A 500
      settlement("s1", 700, B.uid),        // B pays A 700 (200 too much)
    ];
    const result = calculateSettlement(expenses, A, B);
    expect(result.isSettled).toBe(false);
    expect(result.owedBy).toBe(A.uid);    // Now A owes B
    expect(result.owedTo).toBe(B.uid);
    expect(result.amount).toBe(200);
  });

  test("L4: Multiple settlements accumulate correctly", () => {
    const expenses = [
      joint("e1", 2000, A.uid, 0.5),     // B owes A 1000
      settlement("s1", 300, B.uid),        // B pays A 300
      settlement("s2", 400, B.uid),        // B pays A 400
    ];
    const result = calculateSettlement(expenses, A, B);
    expect(result.owedBy).toBe(B.uid);
    expect(result.amount).toBe(300);       // 1000 - 300 - 400 = 300
  });

  test("L5: Settlement by wrong direction (creditor pays) increases debt", () => {
    const expenses = [
      joint("e1", 1000, A.uid, 0.5),     // B owes A 500
      settlement("s1", 200, A.uid),        // A pays — goes the wrong way
    ];
    const result = calculateSettlement(expenses, A, B);
    // A paying a settlement with split_ratio 0 means: netBalanceA += 200 * (1-0) = +200
    // Total: 500 + 200 = 700 — B owes A more now
    expect(result.owedBy).toBe(B.uid);
    expect(result.amount).toBe(700);
  });

  test("L6: Settlement combined with asymmetric split", () => {
    const expenses = [
      joint("e1", 1000, A.uid, 0.7),     // A covers 70%, B owes A 300
      settlement("s1", 300, B.uid),        // B settles fully
    ];
    const result = calculateSettlement(expenses, A, B);
    expect(result.isSettled).toBe(true);
  });

  test("L7: Settlement among multiple joint expenses", () => {
    const expenses = [
      joint("e1", 1000, A.uid, 0.5),     // B owes A 500
      joint("e2", 600, B.uid, 0.5),      // A owes B 300
      // Net: B owes A 200
      settlement("s1", 200, B.uid),        // B settles the net
    ];
    const result = calculateSettlement(expenses, A, B);
    expect(result.isSettled).toBe(true);
  });

  test("L8: Settlement with zero amount is a no-op", () => {
    const expenses = [
      joint("e1", 1000, A.uid, 0.5),     // B owes A 500
      settlement("s1", 0, B.uid),          // Zero-amount settlement
    ];
    const result = calculateSettlement(expenses, A, B);
    expect(result.owedBy).toBe(B.uid);
    expect(result.amount).toBe(500);
  });

  test("L9: Solo expenses do not affect settlement even with settlements present", () => {
    const expenses: Expense[] = [
      { id: "e1", amount: 5000, paid_by_user_id: A.uid, expense_type: "solo", split_ratio: 1 },
      joint("e2", 1000, A.uid, 0.5),     // B owes A 500
      settlement("s1", 500, B.uid),
    ];
    const result = calculateSettlement(expenses, A, B);
    expect(result.isSettled).toBe(true);
  });

  test("L10: Negative amount (refund) settlement reverses the reduction", () => {
    const expenses = [
      joint("e1", 1000, A.uid, 0.5),     // B owes A 500
      { id: "s1", amount: -200, paid_by_user_id: B.uid, expense_type: "settlement" as const, split_ratio: 0 },
    ];
    const result = calculateSettlement(expenses, A, B);
    // Negative amount + B paid: netBalanceA -= (-1) * 200 * 1 = +200
    // Total: 500 + 200 = 700
    expect(result.owedBy).toBe(B.uid);
    expect(result.amount).toBe(700);
  });

  test("L11: Large settlement exactly cancels large debt", () => {
    const expenses = [
      joint("e1", 70000, A.uid, 0.5),    // B owes A 35000
      settlement("s1", 35000, B.uid),
    ];
    const result = calculateSettlement(expenses, A, B);
    expect(result.isSettled).toBe(true);
    expect(result.amount).toBe(0);
  });

  test("L12: Settlement preserves floating-point precision", () => {
    const expenses = [
      joint("e1", 333.33, A.uid, 0.5),   // B owes A 166.665 → rounds to 166.67
      settlement("s1", 166.67, B.uid),
    ];
    const result = calculateSettlement(expenses, A, B);
    // Should be settled (within 0.01 tolerance)
    expect(result.isSettled).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// E2E Tests — verify settlement-as-expense in the browser
// ═══════════════════════════════════════════════════════════════════════════════

const FAKE_PARTNER_UID = "fake-partner-uid-l";

/** Inject a fake second member into the Zustand store. */
async function injectFakePartner(page: Page) {
  await page.evaluate((partnerUid: string) => {
    const store = (window as unknown as Record<string, unknown>).__zustand_store as {
      getState: () => Record<string, unknown>;
      setState: (s: Record<string, unknown>) => void;
    } | undefined;
    if (!store) return;
    const state = store.getState();
    const currentUser = state.user as { uid: string; household_id: string } | null;
    if (!currentUser) return;
    const members = state.members as Array<{ uid: string }>;
    if (members.length >= 2) return;
    const fakePartner = {
      uid: partnerUid,
      name: "Partner",
      email: "partner@test.dev",
      household_id: currentUser.household_id,
    };
    store.setState({ members: [...members, fakePartner] });
  }, FAKE_PARTNER_UID);
  await page.waitForTimeout(1500);
}

/** Robust category selection with retry. */
async function selectFirstCategory(page: Page) {
  const categorySelect = page.locator('[data-testid="category-select"]');
  await expect(categorySelect).toBeVisible({ timeout: 5000 });
  let found = false;
  for (let attempt = 0; attempt < 5 && !found; attempt++) {
    await categorySelect.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000 * (attempt + 1));
    await categorySelect.click();
    found = await page.getByRole("option").first().isVisible().catch(() => false);
    if (!found) await page.keyboard.press("Escape");
  }
  if (found) {
    await page.getByRole("option").first().click();
    await page.waitForTimeout(300);
  }
}

/** Create a joint expense to ensure a non-zero settlement balance. */
async function createJointExpense(page: Page, amount = "1000") {
  const addBtn = page.locator('[data-testid="add-expense-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

  await page.fill('[data-testid="amount-input"]', amount);
  await page.fill('[data-testid="description-input"]', `Joint expense ${Date.now()}`);
  await selectFirstCategory(page);

  const submitBtn = page.locator('[data-testid="submit-expense"]');
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await expect(page.locator('[data-testid="expense-form"]')).toBeHidden({ timeout: 10000 });

  await page.waitForTimeout(3000);
  // Re-inject partner since expense subscription re-renders may reset members
  await injectFakePartner(page);
  await page.waitForTimeout(1000);
}

/** Ensure the "Mark as Settled" button is visible by creating a balance if needed. */
async function ensureMarkSettledVisible(page: Page) {
  const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
  const isVisible = await markSettledBtn.isVisible().catch(() => false);
  if (!isVisible) {
    await createJointExpense(page);
    await page.waitForTimeout(2000);
  }
  await expect(markSettledBtn).toBeVisible({ timeout: 15000 });
}

/** Click "Mark as Settled" and confirm the settlement. */
async function performSettlement(page: Page) {
  const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
  await markSettledBtn.click();

  const confirmBtn = page.locator('[data-testid="settle-confirm-btn"]');
  await expect(confirmBtn).toBeVisible({ timeout: 5000 });
  await confirmBtn.click();

  // Wait for optimistic update + Firestore write
  await page.waitForTimeout(3000);
}

/** Read the store's expenses array from the browser. */
async function getStoreExpenses(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(() => {
    const store = (window as unknown as Record<string, unknown>).__zustand_store as {
      getState: () => { expenses: Array<Record<string, unknown>> };
    } | undefined;
    if (!store) return [];
    return store.getState().expenses.map((e) => ({
      id: e.id,
      amount: e.amount,
      description: e.description,
      expense_type: e.expense_type,
      split_ratio: e.split_ratio,
      paid_by_user_id: e.paid_by_user_id,
      category_id: e.category_id,
      _pending: e._pending,
    }));
  });
}

// ─── L13–L24: E2E Settlement-as-Expense Tests ─────────────────────────────

test.describe("Suite L: Settlement-as-Expense E2E Tests", () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(5000);
    await injectFakePartner(page);
  });

  test("L13: Mark as Settled creates an expense in the store (not a settlement event)", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);

    // Count expenses before
    const expensesBefore = await getStoreExpenses(page);
    const settlementCountBefore = expensesBefore.filter(
      (e) => e.expense_type === "settlement"
    ).length;

    await performSettlement(page);

    // Count expenses after
    const expensesAfter = await getStoreExpenses(page);
    const settlementCountAfter = expensesAfter.filter(
      (e) => e.expense_type === "settlement"
    ).length;

    expect(settlementCountAfter).toBe(settlementCountBefore + 1);
  });

  test("L14: Settlement expense has correct fields (type, split_ratio, description)", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);
    await performSettlement(page);

    const expenses = await getStoreExpenses(page);
    const settlementExp = expenses.find((e) => e.expense_type === "settlement");

    expect(settlementExp).toBeDefined();
    expect(settlementExp!.expense_type).toBe("settlement");
    expect(settlementExp!.split_ratio).toBe(0);
    expect(settlementExp!.description).toBe("Settlement");
  });

  test("L15: Settlement expense amount matches the displayed settlement amount", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);

    // Capture the displayed settlement amount
    const amountEl = page.locator('[data-testid="settlement-amount"]');
    await expect(amountEl).toBeVisible({ timeout: 10000 });
    const displayedText = await amountEl.textContent();
    // Extract numeric value (e.g., "₹500" → 500, "₹1,000" → 1000)
    const numericAmount = parseFloat(
      (displayedText ?? "0").replace(/[^0-9.]/g, "")
    );

    await performSettlement(page);

    const expenses = await getStoreExpenses(page);
    const settlementExp = expenses.find((e) => e.expense_type === "settlement");

    expect(settlementExp).toBeDefined();
    expect(settlementExp!.amount).toBe(numericAmount);
  });

  test("L16: Settlement expense paid_by is the debtor (owedBy)", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);

    // Read the current user's UID and the settlement state
    const { owedBy } = await page.evaluate(() => {
      const store = (window as unknown as Record<string, unknown>).__zustand_store as {
        getState: () => Record<string, unknown>;
      } | undefined;
      if (!store) return { owedBy: null };
      const state = store.getState();
      const user = state.user as { uid: string } | null;
      const members = state.members as Array<{ uid: string }>;
      const expenses = state.expenses as Array<Record<string, unknown>>;

      // Re-run settlement logic to find who owes whom
      let netA = 0;
      const uidA = user?.uid ?? "";
      for (const e of expenses) {
        if (e.expense_type === "solo") continue;
        const amt = Math.abs(e.amount as number);
        const refund = (e.amount as number) < 0 ? -1 : 1;
        if (e.paid_by_user_id === uidA) {
          netA += refund * amt * (1 - (e.split_ratio as number));
        } else {
          netA -= refund * amt * (1 - (e.split_ratio as number));
        }
      }
      const uidB = members.find((m) => m.uid !== uidA)?.uid ?? "";
      return { owedBy: netA > 0 ? uidB : uidA };
    });

    await performSettlement(page);

    const expenses = await getStoreExpenses(page);
    const settlementExp = expenses.find((e) => e.expense_type === "settlement");

    expect(settlementExp).toBeDefined();
    expect(settlementExp!.paid_by_user_id).toBe(owedBy);
  });

  test("L17: After settlement, balance shows 'All settled up'", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);
    await performSettlement(page);

    const settlementCard = page.locator('[data-testid="settlement-card"]');
    await expect(settlementCard).toBeVisible({ timeout: 10000 });
    const cardText = await settlementCard.textContent();
    expect(cardText).toMatch(/all settled up/i);
  });

  test("L18: Settlement expense appears in the expense list on expenses page", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);
    await performSettlement(page);

    // Navigate to expenses page
    await page.goto("/expenses", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // Look for an expense card with "Settlement" description
    const expenseCards = page.locator('[data-testid="expense-card"]');
    const count = await expenseCards.count();

    let foundSettlement = false;
    for (let i = 0; i < count; i++) {
      const cardText = await expenseCards.nth(i).textContent();
      if (cardText?.includes("Settlement") && cardText?.includes("settlement")) {
        foundSettlement = true;
        break;
      }
    }
    expect(foundSettlement).toBe(true);
  });

  test("L19: Settlement expense shows green 'settlement' badge", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);
    await performSettlement(page);

    // Navigate to expenses page
    await page.goto("/expenses", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // Find an expense card containing "Settlement"
    const expenseCards = page.locator('[data-testid="expense-card"]');
    const count = await expenseCards.count();

    let settlementCard: ReturnType<typeof expenseCards.nth> | null = null;
    for (let i = 0; i < count; i++) {
      const cardText = await expenseCards.nth(i).textContent();
      if (cardText?.includes("Settlement")) {
        settlementCard = expenseCards.nth(i);
        break;
      }
    }
    expect(settlementCard).not.toBeNull();

    // Verify it has the green "settlement" type badge (Badge component with outline variant)
    // Use the exact text to distinguish from the "Settlement" description heading
    const badge = settlementCard!.locator('[data-variant="outline"]', { hasText: "settlement" });
    await expect(badge.first()).toBeVisible({ timeout: 5000 });
  });

  test("L20: Settlement toast appears on confirm", async ({ page }) => {
    await ensureMarkSettledVisible(page);

    const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
    await markSettledBtn.click();
    const confirmBtn = page.locator('[data-testid="settle-confirm-btn"]');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Toast should mention "settlement"
    const toast = page.locator("[data-sonner-toast]").first();
    await expect(toast).toBeVisible({ timeout: 10000 });
    const toastText = await toast.textContent();
    expect(toastText).toMatch(/settlement/i);
  });

  test("L21: Settlement expense is NOT in settlements store slice", async ({
    page,
  }) => {
    // Record how many settlement events are in the store before
    const settlementEventsBefore = await page.evaluate(() => {
      const store = (window as unknown as Record<string, unknown>).__zustand_store as {
        getState: () => { settlements: unknown[] };
      } | undefined;
      return store?.getState().settlements.length ?? 0;
    });

    await ensureMarkSettledVisible(page);
    await performSettlement(page);

    // Settlement events count should NOT increase (we no longer create events)
    const settlementEventsAfter = await page.evaluate(() => {
      const store = (window as unknown as Record<string, unknown>).__zustand_store as {
        getState: () => { settlements: unknown[] };
      } | undefined;
      return store?.getState().settlements.length ?? 0;
    });

    expect(settlementEventsAfter).toBe(settlementEventsBefore);
  });

  test("L22: Settlement history in SettlementCard shows settlement expenses", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);
    await performSettlement(page);

    // If there's a non-zero balance remaining, settle again after creating more expenses
    // For this test, we just need at least one settlement expense in history
    const historyList = page.locator('[data-testid="settlement-history-list"]');
    const historyItems = page.locator('[data-testid="settlement-history-item"]');

    await expect(historyList).toBeVisible({ timeout: 10000 });
    const count = await historyItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test("L23: Multiple settle-create cycles produce multiple settlement expenses", async ({
    page,
  }) => {
    // Cycle 1: create expense + settle
    await ensureMarkSettledVisible(page);
    await performSettlement(page);

    const countAfterFirst = (await getStoreExpenses(page)).filter(
      (e) => e.expense_type === "settlement"
    ).length;

    // Cycle 2: create another expense + settle
    await createJointExpense(page, "2000");
    await ensureMarkSettledVisible(page);
    await performSettlement(page);

    const countAfterSecond = (await getStoreExpenses(page)).filter(
      (e) => e.expense_type === "settlement"
    ).length;

    expect(countAfterSecond).toBe(countAfterFirst + 1);
  });

  test("L24: Settlement expense persists in store after soft navigation", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);
    await performSettlement(page);

    // Count settlement expenses
    const countBefore = (await getStoreExpenses(page)).filter(
      (e) => e.expense_type === "settlement"
    ).length;
    expect(countBefore).toBeGreaterThan(0);

    // Navigate away and back (soft navigation via client-side routing)
    await page.goto("/expenses", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const countAfter = (await getStoreExpenses(page)).filter(
      (e) => e.expense_type === "settlement"
    ).length;

    // Count should be the same or more (Firestore subscription may bring in the real doc)
    expect(countAfter).toBeGreaterThanOrEqual(countBefore);
  });
});
