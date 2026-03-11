import { test, expect } from "../fixtures";
import { testExpenseData } from "../helpers/test-data-factory";
import { waitForExpenseByDescription, waitForStoreReady } from "../helpers/wait-strategies";
import { DashboardPage } from "../pages/dashboard.page";
import { ExpensesPage } from "../pages/expenses.page";
import { ExpenseCardComponent } from "../components/expense-card.component";
import { cleanupAllTestData } from "../helpers/data-cleanup";

const EXPENSE_A = testExpenseData({ description: "E2E_TEST_search_alpha", amount: "10.00" });
const EXPENSE_B = testExpenseData({ description: "E2E_TEST_search_beta", amount: "50.00" });

test.describe.serial("Journey 07: Search, Sort & Filter", () => {
  test.afterAll(async ({ page }) => {
    await cleanupAllTestData(page).catch(() => {});
  });

  test("Step 1: Create two test expenses", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    // Create expense A
    await dashboard.openAddExpenseDialog();
    await dashboard.expenseForm.fillExpense(EXPENSE_A);
    await dashboard.expenseForm.submit();
    await waitForExpenseByDescription(page, EXPENSE_A.description);

    // Create expense B
    await page.waitForTimeout(1000);
    await dashboard.openAddExpenseDialog();
    await dashboard.expenseForm.fillExpense(EXPENSE_B);
    await dashboard.expenseForm.submit();
    await waitForExpenseByDescription(page, EXPENSE_B.description);
  });

  test("Step 2: Search filters by description", async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.navigate();

    await expenses.search("alpha");
    await page.waitForTimeout(500);

    // Alpha should be visible
    const alphaCard = ExpenseCardComponent.findByDescription(page, EXPENSE_A.description);
    await expect(alphaCard.locator).toBeVisible({ timeout: 5000 });

    // Beta should NOT be visible
    const betaCard = ExpenseCardComponent.findByDescription(page, EXPENSE_B.description);
    await expect(betaCard.locator).not.toBeVisible();
  });

  test("Step 3: Clear search restores all results", async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.navigate();

    await expenses.search("alpha");
    await page.waitForTimeout(500);
    await expenses.clearSearch();
    await page.waitForTimeout(500);

    // Both should be visible (or at least both exist in the full list)
    const count = await expenses.getExpenseCount();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("Step 4: Search with no matches shows no results", async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.navigate();

    await expenses.search("zzz_nonexistent_zzz");
    await page.waitForTimeout(500);

    const count = await expenses.getExpenseCount();
    expect(count).toBe(0);
  });
});
