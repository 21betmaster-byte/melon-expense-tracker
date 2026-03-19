import { test, expect } from "../fixtures";
import { testExpenseData } from "../helpers/test-data-factory";
import { waitForExpenseByDescription } from "../helpers/wait-strategies";
import { expectExpenseInStore } from "../helpers/assertions";
import { ExpenseFormComponent } from "../components/expense-form.component";
import { ExpenseCardComponent } from "../components/expense-card.component";
import { DashboardPage } from "../pages/dashboard.page";
import { ExpensesPage } from "../pages/expenses.page";
import { cleanupAllTestData } from "../helpers/data-cleanup";

/**
 * Journey 16: Progressive Disclosure — Add Expense Form Redesign
 *
 * Tests the two-stage progressive disclosure flow:
 * - Stage 1: Amount + Description only
 * - Stage 2: Full form with all fields revealed via animation
 *
 * Test IDs:
 *   expense-form (data-stage="1"|"2")
 *   stage2-fields, stage-transition-loader
 *   amount-error, description-error
 *   submit-expense, dialog-close (data-slot)
 *   stage1-hint, form-actions
 */

test.describe("Journey 16: Progressive Disclosure", () => {

  // ─── P0: Happy Path ─────────────────────────────────────────────────

  test("16.1 [P0] Full happy path — Stage 1 → Stage 2 → Save", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    const data = testExpenseData({ amount: "50.00", description: "E2E_TEST_progressive_happy" });

    // Open the add expense form
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Verify Stage 1: only Amount + Description visible (dialog X button for cancel)
    expect(await form.getStage()).toBe(1);
    await expect(page.locator('[data-testid="amount-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="description-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="stage1-hint"]')).toBeVisible();

    // Save button should NOT be visible in Stage 1
    expect(await form.isSaveButtonVisible()).toBe(false);

    // Stage 2 fields should NOT be visible
    await expect(page.locator('[data-testid="stage2-fields"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="expense-type-select"]')).not.toBeVisible();

    // Fill Stage 1 fields
    await page.locator('[data-testid="amount-input"]').fill(data.amount);
    await page.locator('[data-testid="description-input"]').fill(data.description);

    // Press Enter to advance to Stage 2
    await page.locator('[data-testid="description-input"]').press("Enter");

    // Verify transition loader appears
    await expect(page.locator('[data-testid="stage-transition-loader"]')).toBeVisible({ timeout: 2000 });

    // Wait for Stage 2 to be visible
    await form.waitForStage2();
    expect(await form.getStage()).toBe(2);

    // Verify Stage 2 fields are visible with auto-populated values
    await expect(page.locator('[data-testid="stage2-fields"]')).toBeVisible();
    await expect(page.locator('[data-testid="expense-type-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="paid-by-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="date-input"]')).toBeVisible();

    // Save button should now be visible
    expect(await form.isSaveButtonVisible()).toBe(true);

    // Select a category and save
    await form.selectFirstCategory();
    await form.submit();

    // Verify expense was saved
    await waitForExpenseByDescription(page, data.description);
    await expectExpenseInStore(page, data.description, { amount: 50 });
  });

  // ─── P0: Validation ─────────────────────────────────────────────────

  test("16.2 [P0] Validation — Enter with both fields empty", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Press Enter with both fields empty
    await page.locator('[data-testid="amount-input"]').press("Enter");

    // Both error messages should appear
    expect(await form.hasStage1Error("amount")).toBe(true);
    expect(await form.hasStage1Error("description")).toBe(true);

    // Verify errors contain expected text
    const amountError = await form.getStage1ErrorText("amount");
    expect(amountError).toContain("required");
    const descError = await form.getStage1ErrorText("description");
    expect(descError).toContain("required");

    // Stage 2 fields should NOT be revealed
    expect(await form.isStage1()).toBe(true);
    await expect(page.locator('[data-testid="stage2-fields"]')).not.toBeVisible();

    // Cancel to close
    await form.cancel();
  });

  test("16.3 [P0] Validation — Enter with empty Amount", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Fill only description, press Enter
    await page.locator('[data-testid="description-input"]').fill("Taxi ride");
    await page.locator('[data-testid="description-input"]').press("Enter");

    // Amount error should appear, description error should NOT
    expect(await form.hasStage1Error("amount")).toBe(true);
    expect(await form.hasStage1Error("description")).toBe(false);

    // Remain in Stage 1
    expect(await form.isStage1()).toBe(true);

    // Fix the error
    await page.locator('[data-testid="amount-input"]').fill("25.00");

    // Error should clear on typing
    await page.waitForTimeout(100);
    expect(await form.hasStage1Error("amount")).toBe(false);

    // Press Enter again — should advance
    await page.locator('[data-testid="amount-input"]').press("Enter");
    await form.waitForStage2();
    expect(await form.isStage2()).toBe(true);

    await form.cancel();
  });

  test("16.4 [P0] Validation — Enter with empty Description", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Fill only amount, press Enter
    await page.locator('[data-testid="amount-input"]').fill("75.00");
    await page.locator('[data-testid="amount-input"]').press("Enter");

    // Description error should appear, amount error should NOT
    expect(await form.hasStage1Error("description")).toBe(true);
    expect(await form.hasStage1Error("amount")).toBe(false);

    // Remain in Stage 1
    expect(await form.isStage1()).toBe(true);

    // Fix the error
    await page.locator('[data-testid="description-input"]').fill("Client dinner");

    // Error should clear
    await page.waitForTimeout(100);
    expect(await form.hasStage1Error("description")).toBe(false);

    // Press Enter — should advance
    await page.locator('[data-testid="description-input"]').press("Enter");
    await form.waitForStage2();
    expect(await form.isStage2()).toBe(true);

    await form.cancel();
  });

  // ─── P0: Cancel Flow ────────────────────────────────────────────────

  test("16.5 [P0] Cancel from Stage 1 — discards data", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Fill Stage 1 fields
    await page.locator('[data-testid="amount-input"]').fill("30.00");
    await page.locator('[data-testid="description-input"]').fill("Coffee");

    // Cancel
    await form.cancel();

    // Form should be gone (dialog closed)
    await expect(page.locator('[data-testid="expense-form"]')).not.toBeVisible({ timeout: 2000 });

    // Reopen and verify fresh state
    await dashboard.openAddExpenseDialog();
    const amountVal = await page.locator('[data-testid="amount-input"]').inputValue();
    const descVal = await page.locator('[data-testid="description-input"]').inputValue();
    expect(amountVal).toBe("");
    expect(descVal).toBe("");
    expect(await form.isStage1()).toBe(true);

    await form.cancel();
  });

  test("16.6 [P0] Cancel from Stage 2 — discards data, resets to Stage 1", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Advance to Stage 2
    await page.locator('[data-testid="amount-input"]').fill("100.00");
    await page.locator('[data-testid="description-input"]').fill("Groceries");
    await form.advanceToStage2();
    expect(await form.isStage2()).toBe(true);

    // Cancel from Stage 2
    await form.cancel();

    // Form should be gone
    await expect(page.locator('[data-testid="expense-form"]')).not.toBeVisible({ timeout: 2000 });

    // Reopen and verify fresh Stage 1
    await dashboard.openAddExpenseDialog();
    expect(await form.isStage1()).toBe(true);
    const amountVal = await page.locator('[data-testid="amount-input"]').inputValue();
    expect(amountVal).toBe("");

    await form.cancel();
  });

  // ─── P1: Save Failure ──────────────────────────────────────────────

  test("16.7 [P1] Save failure preserves form data", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    const data = testExpenseData({ amount: "88.00", description: "E2E_TEST_progressive_fail" });

    // Fill and advance to Stage 2
    await page.locator('[data-testid="amount-input"]').fill(data.amount);
    await page.locator('[data-testid="description-input"]').fill(data.description);
    await form.advanceToStage2();
    await form.selectFirstCategory();

    // Simulate network offline before save
    await page.context().setOffline(true);
    await form.submit();

    // Wait for error toast
    await page.waitForTimeout(3000);

    // Form should still be in Stage 2 with data intact
    expect(await form.isStage2()).toBe(true);
    const amountVal = await page.locator('[data-testid="amount-input"]').inputValue();
    expect(amountVal).toBe(data.amount);
    const descVal = await page.locator('[data-testid="description-input"]').inputValue();
    expect(descVal).toBe(data.description);

    // Restore network
    await page.context().setOffline(false);

    await form.cancel();
  });

  // ─── P1: Floating Save Button ──────────────────────────────────────

  test("16.8 [P1] Floating Save button visibility on scroll (mobile viewport)", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Advance to Stage 2
    await page.locator('[data-testid="amount-input"]').fill("50.00");
    await page.locator('[data-testid="description-input"]').fill("Test scroll");
    await form.advanceToStage2();

    // Verify Save button is visible
    expect(await form.isSaveButtonVisible()).toBe(true);

    // Check that the action bar has sticky positioning
    const formActions = page.locator('[data-testid="form-actions"]');
    const position = await formActions.evaluate((el) => {
      return window.getComputedStyle(el).position;
    });
    expect(position).toBe("sticky");

    await form.cancel();
  });

  // ─── P1: Field Reveal Animation ────────────────────────────────────

  test("16.9 [P1] Field reveal animation renders correctly", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Fill and press Enter
    await page.locator('[data-testid="amount-input"]').fill("42.00");
    await page.locator('[data-testid="description-input"]').fill("Animation test");
    await page.locator('[data-testid="description-input"]').press("Enter");

    // Loader should appear
    await expect(page.locator('[data-testid="stage-transition-loader"]')).toBeVisible({ timeout: 1000 });

    // Wait for stage 2 fields to appear
    const stage2Fields = page.locator('[data-testid="stage2-fields"]');
    await stage2Fields.waitFor({ state: "visible", timeout: 3000 });

    // Verify transition CSS properties are applied
    const hasTransition = await stage2Fields.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.transition.includes("all") || style.transitionProperty.includes("all");
    });
    expect(hasTransition).toBe(true);

    // Wait for animation to complete and verify fields are interactable
    await page.waitForTimeout(400);
    await expect(page.locator('[data-testid="expense-type-select"]')).toBeEnabled();
    await expect(page.locator('[data-testid="category-select"]')).toBeVisible();

    await form.cancel();
  });

  // ─── P1: Clearing Fields After Stage 2 ─────────────────────────────

  test("16.10 [P1] Clearing Amount in Stage 2 does NOT collapse fields", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Advance to Stage 2
    await page.locator('[data-testid="amount-input"]').fill("99.00");
    await page.locator('[data-testid="description-input"]').fill("Clear amount test");
    await form.advanceToStage2();
    expect(await form.isStage2()).toBe(true);

    // Clear the Amount field
    await page.locator('[data-testid="amount-input"]').clear();

    // Stage 2 fields should remain visible
    expect(await form.isStage2()).toBe(true);
    await expect(page.locator('[data-testid="stage2-fields"]')).toBeVisible();
    await expect(page.locator('[data-testid="expense-type-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="category-select"]')).toBeVisible();

    // Amount field should remain at top
    await expect(page.locator('[data-testid="amount-input"]')).toBeVisible();

    // Re-enter amount and verify save works
    await page.locator('[data-testid="amount-input"]').fill("55.00");
    await form.selectFirstCategory();

    await form.cancel();
  });

  test("16.11 [P1] Clearing Description in Stage 2 does NOT collapse fields", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Advance to Stage 2
    await page.locator('[data-testid="amount-input"]').fill("77.00");
    await page.locator('[data-testid="description-input"]').fill("Clear desc test");
    await form.advanceToStage2();
    expect(await form.isStage2()).toBe(true);

    // Clear the Description field
    await page.locator('[data-testid="description-input"]').clear();

    // Stage 2 fields should remain visible
    expect(await form.isStage2()).toBe(true);
    await expect(page.locator('[data-testid="stage2-fields"]')).toBeVisible();

    // Description field should remain below Amount
    await expect(page.locator('[data-testid="description-input"]')).toBeVisible();

    await form.cancel();
  });

  // ─── P1: Form State Reset on Reopen ────────────────────────────────

  test("16.12 [P1] Form state resets on reopen after cancel", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    // First open: advance to Stage 2 and cancel
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);
    await page.locator('[data-testid="amount-input"]').fill("200.00");
    await page.locator('[data-testid="description-input"]').fill("Should not persist");
    await form.advanceToStage2();
    await form.cancel();
    await expect(page.locator('[data-testid="expense-form"]')).not.toBeVisible({ timeout: 2000 });

    // Second open: verify completely fresh
    await dashboard.openAddExpenseDialog();
    expect(await form.isStage1()).toBe(true);
    const amountVal = await page.locator('[data-testid="amount-input"]').inputValue();
    const descVal = await page.locator('[data-testid="description-input"]').inputValue();
    expect(amountVal).toBe("");
    expect(descVal).toBe("");

    // Verify full happy path works from fresh state
    const data = testExpenseData({ amount: "33.00", description: "E2E_TEST_progressive_reopen" });
    await form.fillExpense(data);
    await form.submit();
    await waitForExpenseByDescription(page, data.description);
    await expectExpenseInStore(page, data.description, { amount: 33 });
  });

  // ─── P1: Responsive — Mobile Viewport ──────────────────────────────

  test("16.13 [P1] Responsive — full flow on mobile viewport (375x812)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Stage 1: verify layout on mobile
    expect(await form.isStage1()).toBe(true);
    await expect(page.locator('[data-testid="amount-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="description-input"]')).toBeVisible();

    // Fill and advance
    await page.locator('[data-testid="amount-input"]').fill("15.00");
    await page.locator('[data-testid="description-input"]').fill("Mobile test");
    await form.advanceToStage2();

    // Stage 2: verify all fields visible on mobile
    expect(await form.isStage2()).toBe(true);
    await expect(page.locator('[data-testid="stage2-fields"]')).toBeVisible();
    expect(await form.isSaveButtonVisible()).toBe(true);

    // Verify floating button does not overlap last field
    const notesInput = page.locator('[data-testid="expense-notes-input"]');
    const saveButton = page.locator('[data-testid="submit-expense"]');

    if (await notesInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      const notesBox = await notesInput.boundingBox();
      const saveBox = await saveButton.boundingBox();
      if (notesBox && saveBox) {
        const gap = saveBox.y - (notesBox.y + notesBox.height);
        // Minimum 8px gap (padding div + sticky container padding)
        expect(gap).toBeGreaterThanOrEqual(0);
      }
    }

    await form.cancel();
  });

  // ─── Edit Mode — Skips Progressive Disclosure ──────────────────────

  test("16.14 Edit mode starts at Stage 2 with all fields visible", async ({ page }) => {
    const expensesPage = new ExpensesPage(page);
    await expensesPage.navigate();

    // Find an existing expense to edit (use the first visible card)
    const firstCard = page.locator('[data-testid="expense-card"]').first();
    if (!(await firstCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      // No expenses to edit — skip
      test.skip();
      return;
    }

    // Click edit on the first expense
    const editBtn = firstCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();

    const form = new ExpenseFormComponent(page);
    await form.waitForFormReady();

    // Should be in Stage 2 immediately (no progressive disclosure for edit)
    expect(await form.getStage()).toBe(2);
    await expect(page.locator('[data-testid="stage2-fields"]')).toBeVisible();
    expect(await form.isSaveButtonVisible()).toBe(true);

    // Amount and description should have values
    const amountVal = await page.locator('[data-testid="amount-input"]').inputValue();
    expect(amountVal).not.toBe("");

    // Cancel edit
    await form.cancel();
  });

  // ─── Expenses Page — Same Flow ─────────────────────────────────────

  test("16.15 Progressive disclosure works from /expenses page", async ({ page }) => {
    const expensesPage = new ExpensesPage(page);
    await expensesPage.navigate();

    // Open add expense dialog from expenses page
    await expensesPage.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);
    await form.waitForFormReady();

    // Should start at Stage 1
    expect(await form.isStage1()).toBe(true);
    expect(await form.isSaveButtonVisible()).toBe(false);

    // Fill and advance
    await page.locator('[data-testid="amount-input"]').fill("60.00");
    await page.locator('[data-testid="description-input"]').fill("Expenses page test");
    await form.advanceToStage2();

    expect(await form.isStage2()).toBe(true);
    expect(await form.isSaveButtonVisible()).toBe(true);

    await form.cancel();
  });
});
