import { test, expect } from "../fixtures";
import { testExpenseData, testGroupName } from "../helpers/test-data-factory";
import { waitForExpenseByDescription, waitForStoreReady } from "../helpers/wait-strategies";
import { expectExpenseInStore, expectActiveGroup } from "../helpers/assertions";
import { getActiveGroupName, getExpenses } from "../helpers/store-reader";
import { DashboardPage } from "../pages/dashboard.page";
import { cleanupAllTestData } from "../helpers/data-cleanup";

const NEW_GROUP = testGroupName();
const GROUP_EXPENSE = testExpenseData({
  description: "E2E_TEST_group_expense",
  amount: "33.33",
});

test.describe.serial("Journey 05: Group Management", () => {
  test.afterAll(async ({ page }) => {
    await cleanupAllTestData(page).catch(() => {});
  });

  let originalGroup: string | null;

  test("Step 1: Record original group name", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    originalGroup = await getActiveGroupName(page);
    expect(originalGroup).not.toBeNull();
  });

  test("Step 2: Create a new group via switcher", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    await dashboard.groupSwitcher.createGroup(NEW_GROUP);

    // Wait for the store to update
    await waitForStoreReady(page);

    // Verify the new group is active
    await expectActiveGroup(page, NEW_GROUP);
  });

  test("Step 3: New group should be empty", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    // Switch to new group if not already
    const current = await getActiveGroupName(page);
    if (current !== NEW_GROUP) {
      await dashboard.groupSwitcher.selectGroup(NEW_GROUP);
      await waitForStoreReady(page);
    }

    const expenses = await getExpenses(page);
    expect(expenses.length).toBe(0);
  });

  test("Step 4: Add expense in the new group", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    // Ensure we're on the new group
    const current = await getActiveGroupName(page);
    if (current !== NEW_GROUP) {
      await dashboard.groupSwitcher.selectGroup(NEW_GROUP);
      await waitForStoreReady(page);
    }

    await dashboard.openAddExpenseDialog();
    await dashboard.expenseForm.fillExpense(GROUP_EXPENSE);
    await dashboard.expenseForm.submit();

    await waitForExpenseByDescription(page, GROUP_EXPENSE.description);
    await expectExpenseInStore(page, GROUP_EXPENSE.description);
  });

  test("Step 5: Switch to original group — expense is NOT visible", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    if (originalGroup) {
      await dashboard.groupSwitcher.selectGroup(originalGroup);
      await waitForStoreReady(page);

      // Expense from new group should not be in this group's expenses
      const expenses = await getExpenses(page);
      const found = expenses.some(
        (e: any) => e.description === GROUP_EXPENSE.description
      );
      expect(found).toBe(false);
    }
  });

  test("Step 6: Switch back to new group — expense IS visible", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    await dashboard.groupSwitcher.selectGroup(NEW_GROUP);
    await waitForStoreReady(page);

    // Wait for expenses to load in the new group
    await waitForExpenseByDescription(page, GROUP_EXPENSE.description);
    await expectExpenseInStore(page, GROUP_EXPENSE.description);
  });
});
