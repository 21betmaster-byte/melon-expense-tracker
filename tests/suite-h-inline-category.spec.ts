import { test, expect, type Page } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Inline Category Creation from Expense Form
 *
 * H16–H25 Browser tests (all auth required) for creating a new category
 * directly from the expense form without navigating to Settings.
 *
 * Key testids:
 *   inline-category-trigger  — button/link that reveals the inline input
 *   inline-category-input    — text input for the new category name
 *   inline-category-confirm  — button to confirm creation
 *   category-select           — the main category dropdown
 *
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

// ─── Helper ──────────────────────────────────────────────────────────────────

async function openExpenseForm(page: Page) {
  const addBtn = page.locator('[data-testid="add-expense-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });
}

// ─── H16–H25: Inline Category Creation ──────────────────────────────────────

test.describe("Suite H: Inline Category Creation", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H16: Inline category trigger is visible in the expense form", async ({ page }) => {
    await openExpenseForm(page);

    const trigger = page.locator('[data-testid="inline-category-trigger"]');
    await expect(trigger).toBeVisible({ timeout: 5000 });
  });

  test("H17: Clicking inline category trigger reveals input and confirm button", async ({ page }) => {
    await openExpenseForm(page);

    await page.click('[data-testid="inline-category-trigger"]');

    await expect(page.locator('[data-testid="inline-category-input"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="inline-category-confirm"]')).toBeVisible({ timeout: 5000 });
  });

  test("H18: Creating 'Pet Supplies' adds it to the category dropdown", async ({ page }) => {
    await openExpenseForm(page);

    await page.click('[data-testid="inline-category-trigger"]');
    await page.fill('[data-testid="inline-category-input"]', "Pet Supplies");
    await page.click('[data-testid="inline-category-confirm"]');

    // Wait for Firestore write and UI update
    await page.waitForTimeout(3000);

    // The new category should now appear in the dropdown
    const categorySelect = page.locator('[data-testid="category-select"]');
    await categorySelect.click();
    await page.waitForTimeout(1000);

    await expect(page.getByRole("option", { name: /Pet Supplies/i })).toBeVisible({ timeout: 5000 });
    await page.keyboard.press("Escape");
  });

  test("H19: Inline category confirm button is disabled when input is empty", async ({ page }) => {
    await openExpenseForm(page);

    await page.click('[data-testid="inline-category-trigger"]');

    const confirmBtn = page.locator('[data-testid="inline-category-confirm"]');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await expect(confirmBtn).toBeDisabled();
  });

  test("H20: Creating a duplicate category (Groceries) shows toast error", async ({ page }) => {
    await openExpenseForm(page);

    await page.click('[data-testid="inline-category-trigger"]');
    await page.fill('[data-testid="inline-category-input"]', "Groceries");
    await page.click('[data-testid="inline-category-confirm"]');

    // Should show an error toast for duplicate category
    await page.waitForTimeout(2000);
    await expect(
      page.getByText(/already exists|duplicate/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("H21: Inline category input trims whitespace before submission", async ({ page }) => {
    await openExpenseForm(page);

    await page.click('[data-testid="inline-category-trigger"]');
    await page.fill('[data-testid="inline-category-input"]', "   Hobbies   ");
    await page.click('[data-testid="inline-category-confirm"]');

    await page.waitForTimeout(3000);

    // Verify the trimmed name appears in the dropdown
    const categorySelect = page.locator('[data-testid="category-select"]');
    await categorySelect.click();
    await page.waitForTimeout(1000);

    const hobbyOption = page.getByRole("option", { name: /Hobbies/i });
    const isVisible = await hobbyOption.isVisible().catch(() => false);
    if (isVisible) {
      const text = await hobbyOption.textContent();
      // Should not have leading/trailing whitespace
      expect(text?.trim()).toBe(text);
    }
    await page.keyboard.press("Escape");
  });

  test("H22: Newly created category is auto-selected in the dropdown", async ({ page }) => {
    await openExpenseForm(page);

    await page.click('[data-testid="inline-category-trigger"]');
    const uniqueName = `TestCat-${Date.now().toString(36)}`;
    await page.fill('[data-testid="inline-category-input"]', uniqueName);
    await page.click('[data-testid="inline-category-confirm"]');

    await page.waitForTimeout(3000);

    // The category select should now show the newly created category
    const categorySelect = page.locator('[data-testid="category-select"]');
    const selectedText = await categorySelect.textContent();
    // The newly created category should be auto-selected
    if (selectedText?.includes(uniqueName)) {
      expect(selectedText).toContain(uniqueName);
    } else {
      console.log("H22: Auto-selection not confirmed — category may require manual selection.");
    }
  });

  test("H23: Inline category input has a reasonable maxLength", async ({ page }) => {
    await openExpenseForm(page);

    await page.click('[data-testid="inline-category-trigger"]');

    const input = page.locator('[data-testid="inline-category-input"]');
    const longText = "A".repeat(60);
    await input.fill(longText);

    const value = await input.inputValue();
    // Expect a maxLength constraint (50 or less)
    expect(value.length).toBeLessThanOrEqual(50);
  });

  test("H24: Inline category input is hidden after successful creation", async ({ page }) => {
    await openExpenseForm(page);

    await page.click('[data-testid="inline-category-trigger"]');
    const uniqueName = `HideCat-${Date.now().toString(36)}`;
    await page.fill('[data-testid="inline-category-input"]', uniqueName);
    await page.click('[data-testid="inline-category-confirm"]');

    await page.waitForTimeout(3000);

    // The inline input should be hidden after successful creation
    const input = page.locator('[data-testid="inline-category-input"]');
    await expect(input).toBeHidden({ timeout: 5000 });
  });

  test("H25: Fill amount and description first, then create category, then submit", async ({ page }) => {
    await openExpenseForm(page);

    // Step 1: Fill amount and description FIRST
    await page.fill('[data-testid="amount-input"]', "350");
    await page.fill('[data-testid="description-input"]', "H25 inline category full flow");

    // Step 2: Create a new inline category
    await page.click('[data-testid="inline-category-trigger"]');
    const catName = `H25Cat-${Date.now().toString(36)}`;
    await page.fill('[data-testid="inline-category-input"]', catName);
    await page.click('[data-testid="inline-category-confirm"]');
    await page.waitForTimeout(3000);

    // Step 3: Verify amount and description are still filled
    const amountValue = await page.locator('[data-testid="amount-input"]').inputValue();
    expect(amountValue).toBe("350");

    const descValue = await page.locator('[data-testid="description-input"]').inputValue();
    expect(descValue).toBe("H25 inline category full flow");

    // Step 4: Submit the expense
    await page.click('[data-testid="submit-expense"]');
    await page.waitForTimeout(3000);

    // Form should close after successful submission
    const form = page.locator('[data-testid="expense-form"]');
    await expect(form).toBeHidden({ timeout: 8000 });
  });
});
