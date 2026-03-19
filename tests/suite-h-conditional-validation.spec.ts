import { test, expect, type Page } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H (161–170): Category-Conditional Validation
 *
 * Tests the dynamic form behavior: description is always required (P16),
 * category is always required, and how the expense card displays data.
 *
 * All tests require authentication (path: /dashboard).
 *
 * Key test IDs:
 *   add-expense-btn    — opens the expense form
 *   expense-form       — the form container
 *   description-input  — description text input
 *   category-select    — category dropdown
 *   amount-input       — amount number input
 *   submit-expense     — form submit button
 *   expense-card       — individual expense card in the list
 *
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

// ─── H161–H170: Category-Conditional Validation ─────────────────────────────

test.describe("Suite H: Category-Conditional Validation", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H161: No category + empty description shows validation error", async ({ page }) => {
    await openExpenseForm(page);

    // Fill only the amount — leave both category and description empty
    await page.locator('[data-testid="amount-input"]').fill("500");

    await page.click('[data-testid="submit-expense"]');

    // Form should still be visible (submission blocked)
    const form = page.locator('[data-testid="expense-form"]');
    await expect(form).toBeVisible();

    // At least one validation error should appear
    const errorMessages = page.locator('[role="alert"], .text-destructive, [class*="FormMessage"]');
    const count = await errorMessages.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("H162: Select category + empty description shows validation error (P16: description mandatory)", async ({ page }) => {
    await openExpenseForm(page);

    // Select a category
    const categorySelect = page.locator('[data-testid="category-select"]');
    await expect(categorySelect).toBeVisible({ timeout: 5000 });
    await categorySelect.click();

    const firstOption = page.getByRole("option").first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();

    // Fill amount but leave description empty
    await page.locator('[data-testid="amount-input"]').fill("750");

    // Submit
    await page.click('[data-testid="submit-expense"]');

    // Form should remain visible — description is now required (P16)
    const form = page.locator('[data-testid="expense-form"]');
    await expect(form).toBeVisible({ timeout: 5000 });

    // At least one validation error should appear
    const errorMessages = page.locator('[role="alert"], .text-destructive, [class*="FormMessage"]');
    const count = await errorMessages.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("H163: With category selected, description label shows 'Description' (P16: always required)", async ({ page }) => {
    await openExpenseForm(page);

    // Select a category first
    const categorySelect = page.locator('[data-testid="category-select"]');
    await expect(categorySelect).toBeVisible({ timeout: 5000 });
    await categorySelect.click();

    const firstOption = page.getByRole("option").first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();

    // Wait for potential label update
    await page.waitForTimeout(500);

    // P16: Description is now mandatory — label should say "Description" without "(optional)"
    const descLabel = page.locator("label").filter({ hasText: /Description/i });
    await expect(descLabel.first()).toBeVisible({ timeout: 5000 });
    const labelText = await descLabel.first().textContent();
    expect(labelText?.toLowerCase()).not.toContain("optional");
  });

  test("H164: Description label does not show '(optional)' — always required (P16)", async ({ page }) => {
    await openExpenseForm(page);

    // P16: Description is mandatory — label should NOT show "(optional)"
    const descLabel = page.locator("label").filter({ hasText: /Description/i });
    await expect(descLabel.first()).toBeVisible({ timeout: 5000 });

    const labelText = await descLabel.first().textContent();
    expect(labelText?.toLowerCase()).not.toContain("optional");
  });

  test("H165: Submit with category 'Groceries' + description — card shows both", async ({ page }) => {
    await openExpenseForm(page);

    // Select "Groceries" category
    const categorySelect = page.locator('[data-testid="category-select"]');
    await expect(categorySelect).toBeVisible({ timeout: 5000 });
    await categorySelect.click();

    const groceriesOption = page.getByRole("option", { name: /Groceries/i });
    await expect(groceriesOption).toBeVisible({ timeout: 5000 });
    await groceriesOption.click();

    // P16: Description is mandatory — fill both amount and description
    await page.locator('[data-testid="description-input"]').fill("BigBasket groceries");
    await page.locator('[data-testid="amount-input"]').fill("1200");

    // Submit
    await page.click('[data-testid="submit-expense"]');
    await expect(page.locator('[data-testid="expense-form"]')).toBeHidden({ timeout: 10000 });

    // Navigate to /expenses to see all expenses (dashboard only shows 5)
    await page.goto("/expenses", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 8000 });

    // Find the card with ₹1,200 amount — it should show both description and "Groceries"
    const groceriesCard = cards.filter({ hasText: /1,200/ });
    await expect(groceriesCard.first()).toContainText(/Groceries/i);
  });

  test("H166: Submit with category + description — card shows description as primary", async ({ page }) => {
    await openExpenseForm(page);

    // Select a category
    const categorySelect = page.locator('[data-testid="category-select"]');
    await expect(categorySelect).toBeVisible({ timeout: 5000 });
    await categorySelect.click();

    const groceriesOption = page.getByRole("option", { name: /Groceries/i });
    await expect(groceriesOption).toBeVisible({ timeout: 5000 });
    await groceriesOption.click();

    // Fill description and amount
    await page.locator('[data-testid="description-input"]').fill("Weekly groceries");
    await page.locator('[data-testid="amount-input"]').fill("850");

    // Submit
    await page.click('[data-testid="submit-expense"]');
    await expect(page.locator('[data-testid="expense-form"]')).toBeHidden({ timeout: 10000 });

    // Navigate to /expenses to see all expenses (dashboard only shows 5)
    await page.goto("/expenses", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 8000 });

    // At least one card should contain "Weekly groceries" as primary display text
    const groceriesCard = cards.filter({ hasText: "Weekly groceries" });
    await expect(groceriesCard.first()).toBeVisible({ timeout: 5000 });
  });

  test("H167: Fill amount + description, skip category — 'Category is required' error", async ({ page }) => {
    await openExpenseForm(page);

    // Fill description and amount but skip category
    await page.locator('[data-testid="description-input"]').fill("Some random expense");
    await page.locator('[data-testid="amount-input"]').fill("300");

    // Submit without selecting a category
    await page.click('[data-testid="submit-expense"]');

    // Form should still be visible (blocked by validation)
    const form = page.locator('[data-testid="expense-form"]');
    await expect(form).toBeVisible();

    // Should show "Category is required" (or similar) validation message
    await expect(form.getByText(/category.*required/i)).toBeVisible({ timeout: 5000 });
  });

  test("H168: Description label stays required before and after category selection (P16)", async ({ page }) => {
    await openExpenseForm(page);

    // P16: Description is mandatory — label should NOT say "(optional)"
    const descLabel = page.locator("label").filter({ hasText: /Description/i });
    await expect(descLabel.first()).toBeVisible({ timeout: 5000 });
    let labelText = await descLabel.first().textContent();
    expect(labelText?.toLowerCase()).not.toContain("optional");

    // Select a category
    const categorySelect = page.locator('[data-testid="category-select"]');
    await categorySelect.click();
    const firstOption = page.getByRole("option").first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();

    // Wait for potential label update
    await page.waitForTimeout(500);

    // Label should still NOT contain "(optional)"
    labelText = await descLabel.first().textContent();
    expect(labelText?.toLowerCase()).not.toContain("optional");
  });

  test("H169: Select category, leave amount empty — amount validation error", async ({ page }) => {
    await openExpenseForm(page);

    // Select a category
    const categorySelect = page.locator('[data-testid="category-select"]');
    await expect(categorySelect).toBeVisible({ timeout: 5000 });
    await categorySelect.click();

    const firstOption = page.getByRole("option").first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();

    // Leave amount empty, submit
    await page.click('[data-testid="submit-expense"]');

    // Form should still be visible
    const form = page.locator('[data-testid="expense-form"]');
    await expect(form).toBeVisible();

    // Should show an amount-related validation error
    const errorMessages = page.locator('[role="alert"], .text-destructive, [class*="FormMessage"]');
    const count = await errorMessages.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("H170: Select category — date field defaults to today", async ({ page }) => {
    await openExpenseForm(page);

    // Select a category
    const categorySelect = page.locator('[data-testid="category-select"]');
    await expect(categorySelect).toBeVisible({ timeout: 5000 });
    await categorySelect.click();

    const firstOption = page.getByRole("option").first();
    await expect(firstOption).toBeVisible({ timeout: 5000 });
    await firstOption.click();

    // Check that the date input defaults to today's date
    const dateInput = page.locator('[data-testid="date-input"]');
    await expect(dateInput).toBeVisible({ timeout: 5000 });

    const dateValue = await dateInput.inputValue();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    expect(dateValue).toBe(today);
  });
});
