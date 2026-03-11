import { test, expect } from "../fixtures";
import { testExpenseData } from "../helpers/test-data-factory";
import { waitForExpenseByDescription, waitForStoreReady } from "../helpers/wait-strategies";
import { getHouseholdCurrency } from "../helpers/store-reader";
import { DashboardPage } from "../pages/dashboard.page";
import { ExpenseCardComponent } from "../components/expense-card.component";
import { cleanupAllTestData } from "../helpers/data-cleanup";

test.describe.serial("Journey 11: Multi-Currency", () => {
  test.afterAll(async ({ page }) => {
    await cleanupAllTestData(page).catch(() => {});
  });

  test("Step 1: Create expense with currency override", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    const householdCurrency = await getHouseholdCurrency(page);
    // Pick a currency different from household
    const overrideCurrency = householdCurrency === "EUR" ? "USD" : "EUR";

    const data = testExpenseData({
      description: "E2E_TEST_multi_currency",
      amount: "55.00",
      currency: overrideCurrency,
    });

    await dashboard.openAddExpenseDialog();
    await dashboard.expenseForm.fillExpense(data);
    await dashboard.expenseForm.submit();

    await waitForExpenseByDescription(page, data.description);
  });

  test("Step 2: Verify currency badge appears on card", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    const card = ExpenseCardComponent.findByDescription(page, "E2E_TEST_multi_currency");
    await expect(card.locator).toBeVisible({ timeout: 5000 });

    const hasBadge = await card.hasCurrencyBadge();
    expect(hasBadge).toBe(true);
  });

  test("Step 3: Expense with household currency has NO badge", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    const data = testExpenseData({
      description: "E2E_TEST_default_currency",
      amount: "30.00",
    });

    await dashboard.openAddExpenseDialog();
    await dashboard.expenseForm.fillExpense(data);
    await dashboard.expenseForm.submit();

    await waitForExpenseByDescription(page, data.description);

    const card = ExpenseCardComponent.findByDescription(page, data.description);
    await expect(card.locator).toBeVisible({ timeout: 5000 });

    // Default currency should not show badge
    const hasBadge = await card.hasCurrencyBadge();
    expect(hasBadge).toBe(false);
  });
});
