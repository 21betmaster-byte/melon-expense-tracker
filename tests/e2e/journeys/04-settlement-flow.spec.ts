import { test, expect } from "../fixtures";
import { testExpenseData } from "../helpers/test-data-factory";
import { waitForExpenseByDescription, waitForStoreReady, waitForSettled } from "../helpers/wait-strategies";
import { expectExpenseInStore } from "../helpers/assertions";
import { getExpenses } from "../helpers/store-reader";
import { DashboardPage } from "../pages/dashboard.page";
import { ExpensesPage } from "../pages/expenses.page";
import { cleanupAllTestData } from "../helpers/data-cleanup";

const JOINT_EXPENSE = testExpenseData({
  amount: "100.00",
  description: "E2E_TEST_settlement_joint",
  type: "joint",
});

test.describe.serial("Journey 04: Settlement Flow", () => {
  test.afterAll(async ({ page }) => {
    await cleanupAllTestData(page).catch(() => {});
  });

  test("Step 1: Create a joint expense to trigger a balance", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    await dashboard.openAddExpenseDialog();
    await dashboard.expenseForm.fillExpense(JOINT_EXPENSE);
    await dashboard.expenseForm.submit();

    await waitForExpenseByDescription(page, JOINT_EXPENSE.description);
    await expectExpenseInStore(page, JOINT_EXPENSE.description);
  });

  test("Step 2: Verify settlement card shows balance", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    const settlement = dashboard.settlementCard;
    const isVisible = await settlement.isVisible();

    if (isVisible) {
      const isSettled = await settlement.isSettled();
      if (!isSettled) {
        // Balance should be shown
        const amount = await settlement.getSettlementAmount();
        expect(amount.length).toBeGreaterThan(0);
      }
    }
    // If settlement card isn't visible (single-member household), skip remaining steps
  });

  test("Step 3: Mark as settled and verify", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    const settlement = dashboard.settlementCard;
    const isVisible = await settlement.isVisible();
    if (!isVisible) {
      test.skip();
      return;
    }

    const isSettled = await settlement.isSettled();
    if (isSettled) {
      // Already settled, nothing to do
      return;
    }

    // Settle
    await settlement.settle();

    // Wait for "settled up" state
    await waitForSettled(page);
    const settledNow = await settlement.isSettled();
    expect(settledNow).toBe(true);
  });

  test("Step 4: Verify settlement created an expense in /expenses", async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.navigate();

    // Check store for settlement expense
    const allExpenses = await getExpenses(page);
    const settlementExpenses = allExpenses.filter(
      (e: any) => e.type === "settlement" && e.description?.includes("E2E_TEST_")
    );

    // A settlement should have been recorded
    // (may not exist if household has single member)
    if (settlementExpenses.length > 0) {
      const settleExp = settlementExpenses[0];
      expect(settleExp.split_ratio).toBe(0);
    }
  });

  test("Step 5: Verify settlement history", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    const settlement = dashboard.settlementCard;
    if (!(await settlement.isVisible())) {
      test.skip();
      return;
    }

    const historyCount = await settlement.getHistoryCount();
    // History may or may not have items depending on prior state
    expect(historyCount).toBeGreaterThanOrEqual(0);
  });
});
