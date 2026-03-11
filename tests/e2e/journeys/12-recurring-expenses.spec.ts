import { test, expect } from "../fixtures";
import { testExpenseData } from "../helpers/test-data-factory";
import { waitForExpenseByDescription, waitForStoreReady } from "../helpers/wait-strategies";
import { DashboardPage } from "../pages/dashboard.page";
import { ExpenseCardComponent } from "../components/expense-card.component";
import { cleanupAllTestData } from "../helpers/data-cleanup";

test.describe.serial("Journey 12: Recurring Expenses", () => {
  test.afterAll(async ({ page }) => {
    await cleanupAllTestData(page).catch(() => {});
  });

  test("Step 1: Create recurring expense", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    const data = testExpenseData({
      description: "E2E_TEST_recurring",
      amount: "15.00",
      recurring: true,
    });

    await dashboard.openAddExpenseDialog();
    await dashboard.expenseForm.fillExpense(data);
    await dashboard.expenseForm.submit();

    await waitForExpenseByDescription(page, data.description);
  });

  test("Step 2: Verify recurring indicator on card", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    const card = ExpenseCardComponent.findByDescription(page, "E2E_TEST_recurring");
    await expect(card.locator).toBeVisible({ timeout: 5000 });

    const hasRecurring = await card.hasRecurringIndicator();
    expect(hasRecurring).toBe(true);
  });

  test("Step 3: Settlement type hides recurring toggle", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    await dashboard.openAddExpenseDialog();

    // Select settlement type
    await page.locator('[data-testid="expense-type-select"]').click();
    await page.waitForTimeout(300);
    const settlementOption = page.getByRole("option", { name: /settlement/i });
    if (await settlementOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settlementOption.click();

      // Recurring toggle should be hidden for settlement type
      const toggle = page.locator('[data-testid="recurring-toggle"]');
      const isVisible = await toggle.isVisible({ timeout: 1000 }).catch(() => false);
      expect(isVisible).toBe(false);
    }

    // Close dialog
    await page.keyboard.press("Escape");
  });
});
