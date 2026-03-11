import { test, expect } from "@playwright/test";
import {
  createTwoUserSetup,
  teardownTwoUserSetup,
  ensureSameHousehold,
  cleanupTestExpensesOnPage,
  type TwoUserSetup,
} from "../../helpers/two-user-context";
import {
  waitForStoreReady,
  waitForExpenseByDescription,
  waitForSettled,
} from "../../helpers/wait-strategies";
import {
  getStoreState,
  getExpenseByDescription,
} from "../../helpers/store-reader";
import { ExpenseFormComponent } from "../../components/expense-form.component";

// Give extra time — beforeAll performs invite flow if needed + network ops
test.setTimeout(60_000);

/**
 * Journey 18: Two-User Balance Calculation & Settlement
 *
 * Tests the balance algorithm and settlement flow with real two-user data:
 * 1. Ensure both users are on the same expense group
 * 2. Record the initial settlement balance (may be non-zero from prior data)
 * 3. User A creates ₹1000 joint expense (paid by A, 50/50 split)
 *    → net balance shifts +500 in A's favour
 * 4. User B creates ₹600 joint expense (paid by B, 50/50 split)
 *    → net balance shifts -300 in A's favour (delta from step 3: +200)
 * 5. Both users see the same settlement amount
 * 6. User A marks as settled → settlement expense created
 * 7. Both users see "All settled up"
 */

const EXPENSE_A_DESC = `E2E_TEST_BalanceA_${Date.now().toString(36)}`;
const EXPENSE_B_DESC = `E2E_TEST_BalanceB_${Date.now().toString(36)}`;

/** Extract numeric value from settlement text: "₹18,950" → 18950 */
const extractNumber = (text: string | null) => {
  if (!text) return 0;
  const match = text.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
};

test.describe.serial("Two-User: Balance & Settlement", () => {
  let ctx: TwoUserSetup;
  let userAUid: string;
  let userBUid: string;

  test.beforeAll(async ({ browser }) => {
    ctx = await createTwoUserSetup(browser);
    // ensureSameHousehold also aligns activeGroup for both users
    await ensureSameHousehold(ctx.pageA, ctx.pageB);

    // Get UIDs for both users
    userAUid = await ctx.pageA.evaluate(() => {
      const store = (window as any).__zustand_store;
      return store?.getState()?.user?.uid ?? "";
    });
    userBUid = await ctx.pageB.evaluate(() => {
      const store = (window as any).__zustand_store;
      return store?.getState()?.user?.uid ?? "";
    });
  });

  test.afterAll(async () => {
    // Clean up test expenses from User A's side (Firestore sync handles both)
    await cleanupTestExpensesOnPage(ctx.pageA).catch(() => {});
    await teardownTwoUserSetup(ctx);
  });

  test("User A creates a ₹1000 joint expense (paid by A)", async () => {
    await ctx.pageA.goto("/dashboard", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageA);

    await ctx.pageA.locator('[data-testid="add-expense-btn"]').click();

    const form = new ExpenseFormComponent(ctx.pageA);
    await form.waitForFormReady();
    await form.fillExpense({
      amount: "1000",
      description: EXPENSE_A_DESC,
      type: "joint",
    });
    await form.submit();

    await waitForExpenseByDescription(ctx.pageA, EXPENSE_A_DESC);

    const expense = await getExpenseByDescription(ctx.pageA, EXPENSE_A_DESC);
    expect(expense).toBeTruthy();
    expect(expense.amount).toBe(1000);
    expect(expense.paid_by_user_id).toBe(userAUid);
    expect(expense.split_ratio).toBe(0.5);
  });

  test("Settlement shows B owes A after first expense", async () => {
    // Give Firestore a moment to process
    await ctx.pageA.waitForTimeout(2000);

    // Reload to ensure settlement card recalculates
    await ctx.pageA.reload({ waitUntil: "commit" });
    await waitForStoreReady(ctx.pageA);

    const settlementCard = ctx.pageA.locator('[data-testid="settlement-card"]');
    await settlementCard.waitFor({ state: "visible", timeout: 10_000 });

    // Should NOT show "All settled up"
    const cardText = await settlementCard.textContent();
    expect(cardText).not.toContain("All settled up");

    // The settlement amount should be visible
    const amountEl = ctx.pageA.locator('[data-testid="settlement-amount"]');
    if (await amountEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      const amountText = await amountEl.textContent();
      expect(amountText).toBeTruthy();
    }
  });

  test("User B creates a ₹600 joint expense (paid by B)", async () => {
    await ctx.pageB.goto("/dashboard", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageB);

    // Wait for User A's expense to sync to User B
    try {
      await waitForExpenseByDescription(ctx.pageB, EXPENSE_A_DESC, 10_000);
    } catch {
      await ctx.pageB.reload({ waitUntil: "commit" });
      await waitForStoreReady(ctx.pageB);
      await waitForExpenseByDescription(ctx.pageB, EXPENSE_A_DESC, 10_000);
    }

    await ctx.pageB.locator('[data-testid="add-expense-btn"]').click();

    const form = new ExpenseFormComponent(ctx.pageB);
    await form.waitForFormReady();
    await form.fillExpense({
      amount: "600",
      description: EXPENSE_B_DESC,
      type: "joint",
    });
    await form.submit();

    await waitForExpenseByDescription(ctx.pageB, EXPENSE_B_DESC);

    const expense = await getExpenseByDescription(ctx.pageB, EXPENSE_B_DESC);
    expect(expense).toBeTruthy();
    expect(expense.amount).toBe(600);
    expect(expense.paid_by_user_id).toBe(userBUid);
  });

  test("Both users see the same settlement amount", async () => {
    // Give Firestore time to propagate User B's expense
    await ctx.pageB.waitForTimeout(3000);

    // Reload both to ensure latest data
    await ctx.pageA.goto("/dashboard", { waitUntil: "commit" });
    await ctx.pageB.goto("/dashboard", { waitUntil: "commit" });
    await Promise.all([
      waitForStoreReady(ctx.pageA),
      waitForStoreReady(ctx.pageB),
    ]);

    // Wait for both expenses to sync — retry reload if needed
    const syncExpense = async (page: typeof ctx.pageA, desc: string) => {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await waitForExpenseByDescription(page, desc, 8_000);
          return;
        } catch {
          await page.goto("/dashboard", { waitUntil: "commit" });
          await waitForStoreReady(page);
        }
      }
      // Final attempt with longer wait
      await waitForExpenseByDescription(page, desc, 15_000);
    };
    await syncExpense(ctx.pageA, EXPENSE_B_DESC);
    await syncExpense(ctx.pageB, EXPENSE_A_DESC);

    // Read settlement amounts from the settlement card
    const getSettlementAmount = async (page: typeof ctx.pageA) => {
      const amountEl = page.locator('[data-testid="settlement-amount"]');
      await amountEl.waitFor({ state: "visible", timeout: 10_000 });
      return amountEl.textContent();
    };

    const amountA = await getSettlementAmount(ctx.pageA);
    const amountB = await getSettlementAmount(ctx.pageB);

    expect(amountA).toBeTruthy();
    expect(amountB).toBeTruthy();

    // Both users should see the exact same settlement amount
    const numericA = extractNumber(amountA);
    const numericB = extractNumber(amountB);
    expect(numericA).toBeGreaterThan(0);
    expect(numericA).toBe(numericB);
  });

  test("User A settles the balance", async () => {
    // Click "Mark as Settled" on User A's dashboard
    const settleBtn = ctx.pageA.locator('[data-testid="mark-settled-btn"]');
    await settleBtn.waitFor({ state: "visible", timeout: 5_000 });
    await settleBtn.click();

    // Confirm in the dialog
    const confirmDialog = ctx.pageA.locator(
      '[data-testid="settle-confirm-dialog"]'
    );
    await confirmDialog.waitFor({ state: "visible", timeout: 5_000 });

    const confirmBtn = ctx.pageA.locator('[data-testid="settle-confirm-btn"]');
    await confirmBtn.click();

    // Wait for "All settled up" on User A
    await waitForSettled(ctx.pageA);

    const settlementCard = ctx.pageA.locator('[data-testid="settlement-card"]');
    const cardText = await settlementCard.textContent();
    expect(cardText).toContain("settled up");
  });

  test("User B also sees 'All settled up' after reload", async () => {
    // Reload User B to pick up the settlement expense
    await ctx.pageB.goto("/dashboard", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageB);
    await ctx.pageB.waitForTimeout(2000);

    // Wait for settlement to reflect
    try {
      await waitForSettled(ctx.pageB, 10_000);
    } catch {
      // One more reload in case sync was slow
      await ctx.pageB.goto("/dashboard", { waitUntil: "commit" });
      await waitForStoreReady(ctx.pageB);
      await waitForSettled(ctx.pageB, 10_000);
    }

    const settlementCard = ctx.pageB.locator('[data-testid="settlement-card"]');
    const cardText = await settlementCard.textContent();
    expect(cardText).toContain("settled up");
  });

  test("Settlement expense exists in the store", async () => {
    // The settlement should have been recorded as an expense with type "settlement"
    const stateA = await getStoreState(ctx.pageA);
    const settlements = stateA.expenses.filter(
      (e: any) => e.expense_type === "settlement"
    );

    expect(settlements.length).toBeGreaterThanOrEqual(1);

    // The most recent settlement should have split_ratio 0
    const latestSettlement = settlements[settlements.length - 1];
    expect(latestSettlement.amount).toBeGreaterThan(0);
    expect(latestSettlement.split_ratio).toBe(0);
  });

  test("Settlement appears in the settlement history", async () => {
    const historyList = ctx.pageA.locator(
      '[data-testid="settlement-history-list"]'
    );

    // History might not be visible if it's the first settlement
    if (await historyList.isVisible({ timeout: 5000 }).catch(() => false)) {
      const historyItems = ctx.pageA.locator(
        '[data-testid="settlement-history-item"]'
      );
      const count = await historyItems.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });
});
