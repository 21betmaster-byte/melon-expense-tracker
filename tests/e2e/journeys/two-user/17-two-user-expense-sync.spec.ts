import { test, expect } from "@playwright/test";
import {
  createTwoUserSetup,
  teardownTwoUserSetup,
  ensureSameHousehold,
  cleanupTestExpensesOnPage,
  type TwoUserSetup,
} from "../../helpers/two-user-context";
import { waitForStoreReady, waitForExpenseByDescription } from "../../helpers/wait-strategies";
import { getExpenses, getExpenseByDescription, getStoreState } from "../../helpers/store-reader";
import { ExpenseFormComponent } from "../../components/expense-form.component";

// Give extra time — beforeAll performs invite flow if needed + network ops
test.setTimeout(60_000);

/**
 * Journey 17: Two-User Expense Sync
 *
 * Tests that expenses created by one user appear for the other:
 * 1. Ensure both users are in the same household
 * 2. User A creates an expense → verify User A sees it
 * 3. User B reloads → sees User A's expense (Firestore sync)
 * 4. User B creates an expense → verify User B sees it
 * 5. User A reloads → sees User B's expense
 * 6. Both users see the same total expense list
 */

const EXPENSE_A_DESC = `E2E_TEST_UserA_${Date.now().toString(36)}`;
const EXPENSE_B_DESC = `E2E_TEST_UserB_${Date.now().toString(36)}`;

test.describe.serial("Two-User: Expense Sync", () => {
  let ctx: TwoUserSetup;

  test.beforeAll(async ({ browser }) => {
    ctx = await createTwoUserSetup(browser);
    await ensureSameHousehold(ctx.pageA, ctx.pageB);
  });

  test.afterAll(async () => {
    // Clean up test expenses from both users
    await cleanupTestExpensesOnPage(ctx.pageA).catch(() => {});
    // Reload User B to pick up deletions, then clean from their side too
    await ctx.pageB.reload({ waitUntil: "commit" }).catch(() => {});
    await waitForStoreReady(ctx.pageB).catch(() => {});
    await cleanupTestExpensesOnPage(ctx.pageB).catch(() => {});
    await teardownTwoUserSetup(ctx);
  });

  test("User A creates an expense", async () => {
    await ctx.pageA.goto("/dashboard", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageA);

    // Open the add-expense dialog
    await ctx.pageA.locator('[data-testid="add-expense-btn"]').click();

    const form = new ExpenseFormComponent(ctx.pageA);
    await form.waitForFormReady();
    await form.fillExpense({
      amount: "750",
      description: EXPENSE_A_DESC,
      type: "joint",
    });
    await form.submit();

    // Verify expense appears in User A's store
    await waitForExpenseByDescription(ctx.pageA, EXPENSE_A_DESC);
    const expense = await getExpenseByDescription(ctx.pageA, EXPENSE_A_DESC);
    expect(expense).toBeTruthy();
    expect(expense.amount).toBe(750);
  });

  test("User B sees User A's expense after reload", async () => {
    // Reload User B's dashboard to pick up the new expense via Firestore sync
    await ctx.pageB.goto("/dashboard", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageB);

    // Wait for Firestore real-time sync (may need a moment)
    try {
      await waitForExpenseByDescription(ctx.pageB, EXPENSE_A_DESC, 10_000);
    } catch {
      // If real-time sync didn't catch it, reload
      await ctx.pageB.reload({ waitUntil: "commit" });
      await waitForStoreReady(ctx.pageB);
      await waitForExpenseByDescription(ctx.pageB, EXPENSE_A_DESC, 10_000);
    }

    const expense = await getExpenseByDescription(ctx.pageB, EXPENSE_A_DESC);
    expect(expense).toBeTruthy();
    expect(expense.amount).toBe(750);
    expect(expense.description).toBe(EXPENSE_A_DESC);
  });

  test("User B creates an expense", async () => {
    // Ensure User B is on dashboard
    if (!ctx.pageB.url().includes("/dashboard")) {
      await ctx.pageB.goto("/dashboard", { waitUntil: "commit" });
      await waitForStoreReady(ctx.pageB);
    }

    // Open the add-expense dialog
    await ctx.pageB.locator('[data-testid="add-expense-btn"]').click();

    const form = new ExpenseFormComponent(ctx.pageB);
    await form.waitForFormReady();
    await form.fillExpense({
      amount: "300",
      description: EXPENSE_B_DESC,
      type: "joint",
    });
    await form.submit();

    // Verify expense appears in User B's store
    await waitForExpenseByDescription(ctx.pageB, EXPENSE_B_DESC);
    const expense = await getExpenseByDescription(ctx.pageB, EXPENSE_B_DESC);
    expect(expense).toBeTruthy();
    expect(expense.amount).toBe(300);
  });

  test("User A sees User B's expense after reload", async () => {
    // Reload User A's dashboard to pick up User B's expense
    await ctx.pageA.reload({ waitUntil: "commit" });
    await waitForStoreReady(ctx.pageA);

    try {
      await waitForExpenseByDescription(ctx.pageA, EXPENSE_B_DESC, 10_000);
    } catch {
      await ctx.pageA.reload({ waitUntil: "commit" });
      await waitForStoreReady(ctx.pageA);
      await waitForExpenseByDescription(ctx.pageA, EXPENSE_B_DESC, 10_000);
    }

    const expense = await getExpenseByDescription(ctx.pageA, EXPENSE_B_DESC);
    expect(expense).toBeTruthy();
    expect(expense.amount).toBe(300);
    expect(expense.description).toBe(EXPENSE_B_DESC);
  });

  test("Both users see the same expenses", async () => {
    const expensesA = await getExpenses(ctx.pageA);
    const expensesB = await getExpenses(ctx.pageB);

    // Both should have at least the two test expenses
    const testExpensesA = expensesA.filter((e: any) =>
      e.description?.startsWith("E2E_TEST_")
    );
    const testExpensesB = expensesB.filter((e: any) =>
      e.description?.startsWith("E2E_TEST_")
    );

    expect(testExpensesA.length).toBeGreaterThanOrEqual(2);
    expect(testExpensesB.length).toBe(testExpensesA.length);

    // Both should have User A's and User B's expense
    expect(testExpensesA.find((e: any) => e.description === EXPENSE_A_DESC)).toBeTruthy();
    expect(testExpensesA.find((e: any) => e.description === EXPENSE_B_DESC)).toBeTruthy();
    expect(testExpensesB.find((e: any) => e.description === EXPENSE_A_DESC)).toBeTruthy();
    expect(testExpensesB.find((e: any) => e.description === EXPENSE_B_DESC)).toBeTruthy();
  });

  test("User B sees User A's expense on the expenses page", async () => {
    await ctx.pageB.goto("/expenses", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageB);
    await ctx.pageB.waitForTimeout(1000);

    // Search for User A's expense by description
    const searchInput = ctx.pageB.locator('[data-testid="search-input"]');
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill(EXPENSE_A_DESC);
      await ctx.pageB.waitForTimeout(500);
    }

    // The expense card should be visible in the list
    const expenseCard = ctx.pageB.locator('[data-testid="expense-card"]', {
      hasText: EXPENSE_A_DESC,
    });
    await expect(expenseCard.first()).toBeVisible({ timeout: 5000 });
  });
});
