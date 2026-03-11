import { test, expect } from "../fixtures";
import { testExpenseData } from "../helpers/test-data-factory";
import { waitForExpenseByDescription, waitForExpenseRemoved, waitForStoreReady } from "../helpers/wait-strategies";
import { expectExpenseInStore, expectExpenseNotInStore } from "../helpers/assertions";
import { getExpenseByDescription } from "../helpers/store-reader";
import { ExpenseCardComponent } from "../components/expense-card.component";
import { ExpenseFormComponent } from "../components/expense-form.component";
import { DashboardPage } from "../pages/dashboard.page";
import { ExpensesPage } from "../pages/expenses.page";
import { NavComponent } from "../components/nav.component";
import { cleanupAllTestData } from "../helpers/data-cleanup";

const EXPENSE = testExpenseData({
  amount: "67.89",
  description: "E2E_TEST_crud_lifecycle",
  notes: "Test notes for CRUD",
});

const UPDATED_AMOUNT = "99.99";

test.describe.serial("Journey 03: Expense CRUD Lifecycle", () => {
  test.afterAll(async ({ page }) => {
    await cleanupAllTestData(page).catch(() => {});
  });

  test("Step 1: CREATE expense via dashboard form", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    await dashboard.openAddExpenseDialog();
    await dashboard.expenseForm.fillExpense(EXPENSE);
    await dashboard.expenseForm.submit();

    // Wait for expense in store
    await waitForExpenseByDescription(page, EXPENSE.description);

    // Verify in UI on dashboard
    const card = ExpenseCardComponent.findByDescription(page, EXPENSE.description);
    await expect(card.locator).toBeVisible({ timeout: 5000 });
  });

  test("Step 2: READ — verify expense in store with correct fields", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    await expectExpenseInStore(page, EXPENSE.description, {
      amount: 67.89,
    });

    // Verify notes
    const card = ExpenseCardComponent.findByDescription(page, EXPENSE.description);
    await card.toggleNotes();
    const notes = await card.getNotesContent();
    expect(notes).toContain("Test notes for CRUD");
  });

  test("Step 3: Navigate to /expenses and verify in list", async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.navigate();

    const card = expenses.findExpenseByDescription(EXPENSE.description);
    await expect(card.locator).toBeVisible({ timeout: 5000 });
  });

  test("Step 4: EDIT expense amount", async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.navigate();

    // Find and click edit
    const card = expenses.findExpenseByDescription(EXPENSE.description);
    await card.edit();

    // Edit the amount
    const form = new ExpenseFormComponent(page);
    await form.waitForFormReady();
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.clear();
    await amountInput.fill(UPDATED_AMOUNT);
    await form.submit();

    // Wait for the update to be reflected in the store
    await page.waitForFunction(
      (desc) => {
        const store = (window as any).__zustand_store;
        if (!store) return false;
        const expense = store.getState().expenses.find((e: any) => e.description === desc);
        return expense?.amount === 99.99;
      },
      EXPENSE.description,
      { timeout: 10000 }
    );

    await expectExpenseInStore(page, EXPENSE.description, { amount: 99.99 });
  });

  test("Step 5: RELOAD and verify persistence", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "domcontentloaded" });
    await waitForStoreReady(page);

    // Expense should still exist with updated amount
    await expectExpenseInStore(page, EXPENSE.description, { amount: 99.99 });

    // Verify in UI
    const card = ExpenseCardComponent.findByDescription(page, EXPENSE.description);
    await expect(card.locator).toBeVisible({ timeout: 5000 });
    const text = await card.getText();
    expect(text).toContain("99.99");
  });

  test("Step 6: DELETE expense", async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.navigate();

    const card = expenses.findExpenseByDescription(EXPENSE.description);
    await card.deleteWithConfirm();

    // Wait for removal from store
    await waitForExpenseRemoved(page, EXPENSE.description);
    await expectExpenseNotInStore(page, EXPENSE.description);
  });

  test("Step 7: RELOAD and verify deletion persisted", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "domcontentloaded" });
    await waitForStoreReady(page);

    await expectExpenseNotInStore(page, EXPENSE.description);
  });
});
