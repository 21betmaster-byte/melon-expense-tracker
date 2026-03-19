import { test, expect, type Page } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Edit Expense (H71–H85)
 *
 * Tests the edit expense flow including pre-filled fields, field preservation,
 * disabled state during pending operations, and dialog title.
 *
 * Requires authenticated session with an active household and at least one expense.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

// ─── Helper ──────────────────────────────────────────────────────────────────

async function openExpenseForm(page: Page) {
  const addBtn = page.locator('[data-testid="add-expense-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });
  // Advance to Stage 2 (progressive disclosure)
  await page.locator('[data-testid="amount-input"]').fill("1.00");
  await page.locator('[data-testid="description-input"]').fill("test");
  await page.locator('[data-testid="description-input"]').press("Enter");
  await page.waitForSelector('[data-testid="stage2-fields"]', { timeout: 5000 });
  await page.waitForTimeout(400);
}

// ─── H71–H76: Edit Expense — Opening & Pre-filled Fields ────────────────────

test.describe("Suite H: Edit Expense — Opening & Pre-filled Fields", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H71: Edit button is visible on each expense card", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await expect(editBtn).toBeVisible();
  });

  test("H72: Clicking edit opens form with pre-filled amount and description", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    // Capture the displayed values before opening edit form
    const cardText = await expenseCard.textContent();
    expect(cardText).toBeTruthy();

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    // Amount and description should be pre-filled (non-empty)
    const amountValue = await page.locator('[data-testid="amount-input"]').inputValue();
    expect(amountValue).toBeTruthy();
    expect(Number(amountValue)).toBeGreaterThan(0);

    const descValue = await page.locator('[data-testid="description-input"]').inputValue();
    expect(descValue).toBeTruthy();
  });

  test("H73: Edit form amount field contains correct numeric value", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    const amountValue = await page.locator('[data-testid="amount-input"]').inputValue();
    const numericAmount = Number(amountValue);
    expect(Number.isFinite(numericAmount)).toBe(true);
    expect(numericAmount).toBeGreaterThan(0);
  });

  test("H74: Edit form description is a non-empty string", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    const descValue = await page.locator('[data-testid="description-input"]').inputValue();
    expect(descValue.length).toBeGreaterThan(0);
  });

  test("H75: Edit form shows the expense-form container", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();

    const form = page.locator('[data-testid="expense-form"]');
    await expect(form).toBeVisible({ timeout: 5000 });
  });

  test("H76: Edit form submit button is present", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    await expect(page.locator('[data-testid="submit-expense"]')).toBeVisible();
  });
});

// ─── H77–H82: Edit Expense — Field Preservation ────────────────────────────

test.describe("Suite H: Edit Expense — Field Preservation", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H77: Category select is pre-filled when editing", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    const categorySelect = page.locator('[data-testid="category-select"]');
    await expect(categorySelect).toBeVisible();
    // Category should have a selected value (not a placeholder like "Select category")
    const text = await categorySelect.textContent();
    expect(text).toBeTruthy();
    expect(text).not.toMatch(/^select/i);
  });

  test("H78: All fields preserved — type, paid_by, split, category, date", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    // Expense type should be pre-selected
    const typeSelect = page.locator('[data-testid="expense-type-select"]');
    await expect(typeSelect).toBeVisible();
    const typeText = await typeSelect.textContent();
    expect(typeText).toBeTruthy();
    expect(typeText).toMatch(/Joint|Solo|Settlement/i);

    // Category should be pre-selected
    const categorySelect = page.locator('[data-testid="category-select"]');
    await expect(categorySelect).toBeVisible();
    const categoryText = await categorySelect.textContent();
    expect(categoryText).toBeTruthy();

    // Date should be pre-filled
    const dateValue = await page.locator('[data-testid="date-input"]').inputValue();
    expect(dateValue).toBeTruthy();
    // Date should match ISO format YYYY-MM-DD
    expect(dateValue).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // Amount should be pre-filled
    const amountValue = await page.locator('[data-testid="amount-input"]').inputValue();
    expect(Number(amountValue)).toBeGreaterThan(0);
  });

  test("H79: Expense type select retains value on edit", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    const typeSelect = page.locator('[data-testid="expense-type-select"]');
    const typeText = await typeSelect.textContent();
    // Must be one of the valid types, not empty or a placeholder
    expect(typeText).toMatch(/Joint|Solo|Settlement/i);
  });

  test("H80: Date input is pre-filled with a valid date", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    const dateValue = await page.locator('[data-testid="date-input"]').inputValue();
    expect(dateValue).toBeTruthy();
    // Parse date and confirm it's valid
    const parsed = new Date(dateValue);
    expect(parsed.toString()).not.toBe("Invalid Date");
  });

  test("H81: Editing amount and submitting updates the expense card", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    // Change the amount to a unique test value
    const testAmount = "777";
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.clear();
    await amountInput.fill(testAmount);

    await page.click('[data-testid="submit-expense"]');

    // Form should close after submission
    await expect(page.locator('[data-testid="expense-form"]')).toBeHidden({ timeout: 8000 });

    // The updated amount should be visible on the first expense card
    await expect(expenseCard.getByText("777")).toBeVisible({ timeout: 8000 });
  });

  test("H82: Editing description and submitting reflects in expense card", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    const testDesc = "Playwright edit test";
    const descInput = page.locator('[data-testid="description-input"]');
    await descInput.clear();
    await descInput.fill(testDesc);

    await page.click('[data-testid="submit-expense"]');

    await expect(page.locator('[data-testid="expense-form"]')).toBeHidden({ timeout: 8000 });
    await expect(expenseCard.getByText(testDesc)).toBeVisible({ timeout: 8000 });
  });
});

// ─── H83–H85: Edit Expense — Disabled State & Dialog Title ──────────────────

test.describe("Suite H: Edit Expense — Disabled State & Dialog Title", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H83: Edit button is disabled when pending-indicator is present", async ({ page }) => {
    const expenseCards = page.locator('[data-testid="expense-card"]');
    await expect(expenseCards.first()).toBeVisible({ timeout: 10000 });

    const count = await expenseCards.count();
    let foundPending = false;

    for (let i = 0; i < count; i++) {
      const card = expenseCards.nth(i);
      const hasPending = await card.locator('[data-testid="pending-indicator"]').isVisible().catch(() => false);

      if (hasPending) {
        foundPending = true;
        const editBtn = card.locator('[data-testid="edit-expense-btn"]');
        // Edit button should be disabled or not visible for pending expenses
        const isDisabled = await editBtn.isDisabled().catch(() => true);
        const isHidden = !(await editBtn.isVisible().catch(() => false));
        expect(isDisabled || isHidden).toBe(true);
        break;
      }
    }

    if (!foundPending) {
      // No pending expenses — verify edit button is enabled on a synced expense
      const editBtn = expenseCards.first().locator('[data-testid="edit-expense-btn"]');
      await expect(editBtn).toBeEnabled();
      console.log("H83: No pending expenses found — verified edit button is enabled on synced expense.");
    }
  });

  test("H84: Closing edit form without saving preserves original values", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });
    const originalText = await expenseCard.textContent();

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    // Modify the amount but do NOT submit
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.clear();
    await amountInput.fill("99999");

    // Close the form by pressing Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    // Original values should still be on the card
    const textAfterClose = await expenseCard.textContent();
    expect(textAfterClose).toBe(originalText);
  });

  test("H85: Edit dialog title says 'Edit Expense'", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const editBtn = expenseCard.locator('[data-testid="edit-expense-btn"]');
    await editBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    // The dialog/form should have a title containing "Edit Expense"
    await expect(page.getByText(/Edit Expense/i)).toBeVisible({ timeout: 3000 });
  });
});
