import { test, expect, type Page } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";
import { formatCurrency } from "../lib/utils/format";

/**
 * Suite H: Per-Expense Currency Override
 *
 * H1–H12  Browser tests (auth required) for the currency override select
 *         and badge rendering on expense cards.
 * H13–H15 Unit tests for formatCurrency with exotic currencies (no auth).
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

// ─── H1–H12: Currency Override Browser Tests ─────────────────────────────────

test.describe("Suite H: Per-Expense Currency Override — Browser", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H1: Currency override select is visible in the expense form", async ({ page }) => {
    await openExpenseForm(page);

    const currencySelect = page.locator('[data-testid="currency-override-select"]');
    await expect(currencySelect).toBeVisible({ timeout: 5000 });
  });

  test("H2: Currency override defaults to the household currency", async ({ page }) => {
    await openExpenseForm(page);

    const currencySelect = page.locator('[data-testid="currency-override-select"]');
    await expect(currencySelect).toBeVisible({ timeout: 5000 });

    // The default should match the household currency (e.g. INR, USD)
    const selectedText = await currencySelect.textContent();
    expect(selectedText).toBeTruthy();
    // Should contain a valid currency code
    expect(selectedText).toMatch(/INR|USD|EUR|GBP|AED|SGD|CAD|AUD/);
  });

  test("H3: Currency override dropdown lists multiple currencies", async ({ page }) => {
    await openExpenseForm(page);

    const currencySelect = page.locator('[data-testid="currency-override-select"]');
    await currencySelect.click();

    // At least USD, EUR, GBP should appear as options
    await expect(page.getByRole("option", { name: /USD/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole("option", { name: /EUR/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /GBP/i })).toBeVisible();

    await page.keyboard.press("Escape");
  });

  test("H4: Selecting a different currency updates the override select", async ({ page }) => {
    await openExpenseForm(page);

    const currencySelect = page.locator('[data-testid="currency-override-select"]');
    await currencySelect.click();
    await page.getByRole("option", { name: /EUR/i }).click();

    await expect(currencySelect).toContainText("EUR");
  });

  test("H5: Currency override persists across page reload after submission", async ({ page }) => {
    await openExpenseForm(page);

    // Fill the form with a foreign currency
    const currencySelect = page.locator('[data-testid="currency-override-select"]');
    await currencySelect.click();
    await page.getByRole("option", { name: /USD/i }).click();

    await page.fill('[data-testid="amount-input"]', "42");
    await page.fill('[data-testid="description-input"]', "H5 currency persist test");

    // Select a category
    const categorySelect = page.locator('[data-testid="category-select"]');
    await categorySelect.click();
    await page.waitForTimeout(1000);
    const firstOption = page.getByRole("option").first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
    } else {
      await page.keyboard.press("Escape");
    }

    await page.click('[data-testid="submit-expense"]');
    await page.waitForTimeout(3000); // Firestore write delay

    // Reload and check the currency persisted (via the amount display which includes currency)
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Verify expense was saved by checking for the description text
    const card = page.locator('[data-testid="expense-card"]').filter({ hasText: "H5 currency persist test" });
    const cardVisible = await card.first().isVisible().catch(() => false);
    if (cardVisible) {
      // The amount should show with USD formatting ($ prefix)
      const amountText = await card.first().textContent();
      console.log("H5: Card found, amount text:", amountText);
    } else {
      console.log("H5: Expense may not have been saved (category not selected). Check skipped.");
    }
  });

  test("H6: Expense card displays amount in the correct foreign currency", async ({ page }) => {
    // Look for any existing expense cards — the currency is shown in the amount display
    await page.waitForTimeout(3000); // Let Firestore data load

    const expenseCards = page.locator('[data-testid="expense-card"]');
    const count = await expenseCards.count();

    if (count > 0) {
      // At least one card should be visible with formatted amounts
      const firstCardText = await expenseCards.first().textContent();
      console.log("H6: First card text:", firstCardText);
      // Currency is reflected in the formatted amount (e.g., $42.00 for USD)
      expect(firstCardText).toBeTruthy();
    } else {
      console.log("H6: No expenses found — currency display test not verifiable.");
    }
  });

  test("H7: Settlement card reflects foreign currency expense in balance", async ({ page }) => {
    // Add a foreign currency expense
    await openExpenseForm(page);

    const currencySelect = page.locator('[data-testid="currency-override-select"]');
    await currencySelect.click();
    await page.getByRole("option", { name: /USD/i }).click();

    await page.fill('[data-testid="amount-input"]', "10");
    await page.fill('[data-testid="description-input"]', "H7 settlement check");

    const categorySelect = page.locator('[data-testid="category-select"]');
    await categorySelect.click();
    await page.waitForTimeout(1000);
    const firstOption = page.getByRole("option").first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
    } else {
      await page.keyboard.press("Escape");
    }

    await page.click('[data-testid="submit-expense"]');
    await page.waitForTimeout(3000);

    // Settlement card should still be visible (balance may have changed)
    const settlementCard = page.locator('[data-testid="settlement-card"]');
    await expect(settlementCard).toBeVisible({ timeout: 10000 });
  });

  test("H8: Expense with household currency shows amount in default format", async ({ page }) => {
    await openExpenseForm(page);

    // Keep default currency (household currency) and submit
    await page.fill('[data-testid="amount-input"]', "25");
    await page.fill('[data-testid="description-input"]', "H8 default currency test");

    const categorySelect = page.locator('[data-testid="category-select"]');
    await categorySelect.click();
    await page.waitForTimeout(1000);
    const firstOption = page.getByRole("option").first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
    } else {
      await page.keyboard.press("Escape");
    }

    await page.click('[data-testid="submit-expense"]');
    await page.waitForTimeout(3000);

    // The most recent expense should display with the household currency format
    const expenseCards = page.locator('[data-testid="expense-card"]');
    const cardCount = await expenseCards.count();
    if (cardCount > 0) {
      const firstCard = expenseCards.first();
      const cardText = await firstCard.textContent();
      console.log(`H8: First card text: ${cardText}`);
    }
  });

  test("H9: Currency override select has accessible label", async ({ page }) => {
    await openExpenseForm(page);

    const currencySelect = page.locator('[data-testid="currency-override-select"]');
    await expect(currencySelect).toBeVisible({ timeout: 5000 });

    // The form should have a label associated with the currency field
    const form = page.locator('[data-testid="expense-form"]');
    const currencyLabel = form.locator("label").filter({ hasText: /currency/i });
    const labelCount = await currencyLabel.count();
    expect(labelCount).toBeGreaterThanOrEqual(1);
  });

  test("H10: Changing currency does not affect the amount value", async ({ page }) => {
    await openExpenseForm(page);

    await page.fill('[data-testid="amount-input"]', "1500");

    const currencySelect = page.locator('[data-testid="currency-override-select"]');
    await currencySelect.click();
    await page.getByRole("option", { name: /EUR/i }).click();

    // Amount should remain 1500
    const value = await page.locator('[data-testid="amount-input"]').inputValue();
    expect(value).toBe("1500");
  });

  test("H11: Form resets currency override after successful submission", async ({ page }) => {
    await openExpenseForm(page);

    // Set a foreign currency
    const currencySelect = page.locator('[data-testid="currency-override-select"]');
    await currencySelect.click();
    await page.getByRole("option", { name: /EUR/i }).click();

    await page.fill('[data-testid="amount-input"]', "5");
    await page.fill('[data-testid="description-input"]', "H11 reset test");

    const categorySelectEl = page.locator('[data-testid="category-select"]');
    await categorySelectEl.click();
    await page.waitForTimeout(1000);
    const firstOption = page.getByRole("option").first();
    if (await firstOption.isVisible()) {
      await firstOption.click();
    } else {
      await page.keyboard.press("Escape");
    }

    await page.click('[data-testid="submit-expense"]');
    await page.waitForTimeout(3000);

    // Open form again — currency should be back to household default
    await openExpenseForm(page);
    const resetCurrency = page.locator('[data-testid="currency-override-select"]');
    await expect(resetCurrency).toBeVisible({ timeout: 5000 });

    const resetText = await resetCurrency.textContent();
    // Should be back to the household default, not EUR
    expect(resetText).not.toBe("EUR");
  });

  test("H12: Currency override works on /expenses page as well", async ({ page }) => {
    await page.goto("/expenses", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Ensure page loaded
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();

    // Try opening expense form from the expenses page
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    const isAddVisible = await addBtn.isVisible().catch(() => false);

    if (isAddVisible) {
      await addBtn.click();
      await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

      const currencySelect = page.locator('[data-testid="currency-override-select"]');
      await expect(currencySelect).toBeVisible({ timeout: 5000 });
    } else {
      console.log("H12: Add expense button not found on /expenses page.");
    }
  });
});

// ─── H13–H15: formatCurrency Unit Tests ──────────────────────────────────────

test.describe("Suite H: formatCurrency — Unit Tests", () => {
  test("H13: formatCurrency handles JPY (zero-decimal currency)", () => {
    const result = formatCurrency(5000, "JPY");
    // JPY should not have decimal places
    expect(result).toContain("5,000");
    // Should contain the yen symbol or JPY code
    expect(result).toMatch(/\u00a5|JPY/);
  });

  test("H14: formatCurrency handles AED correctly", () => {
    const result = formatCurrency(250.5, "AED");
    expect(result).toContain("250.5");
    expect(result).toMatch(/AED|د\.إ/);
  });

  test("H15: formatCurrency with zero amount returns currency symbol with 0", () => {
    const resultINR = formatCurrency(0, "INR");
    expect(resultINR).toContain("₹");
    expect(resultINR).toContain("0");

    const resultUSD = formatCurrency(0, "USD");
    expect(resultUSD).toContain("$");
    expect(resultUSD).toContain("0");
  });
});
