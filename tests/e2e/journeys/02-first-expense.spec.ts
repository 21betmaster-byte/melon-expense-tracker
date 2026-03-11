import { test, expect } from "../fixtures";
import { testExpenseData } from "../helpers/test-data-factory";
import { waitForExpenseByDescription } from "../helpers/wait-strategies";
import { expectExpenseInStore } from "../helpers/assertions";
import { ExpenseCardComponent } from "../components/expense-card.component";

test.describe("Journey 02: First Expense", () => {
  test("create a solo expense and verify it appears", async ({ dashboardPage, page }) => {
    const data = testExpenseData({ amount: "25.00", description: "E2E_TEST_first_expense" });

    // Open the add expense form
    await dashboardPage.openAddExpenseDialog();

    // Verify form defaults
    const form = dashboardPage.expenseForm;
    await expect(page.locator('[data-testid="expense-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="amount-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="submit-expense"]')).toBeVisible();

    // Fill and submit
    await form.fillExpense(data);
    await form.submit();

    // Wait for expense to appear in store
    await waitForExpenseByDescription(page, data.description);

    // Verify in UI
    const card = ExpenseCardComponent.findByDescription(page, data.description);
    await expect(card.locator).toBeVisible({ timeout: 5000 });
    const cardText = await card.getText();
    expect(cardText).toContain("25");

    // Verify in store
    await expectExpenseInStore(page, data.description, { amount: 25 });
  });
});
