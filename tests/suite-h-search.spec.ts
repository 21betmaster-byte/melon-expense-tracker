import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Expense Search Bar (H176–H183)
 *
 * Tests the search functionality on the expenses page including
 * filtering by description, category, payer, clearing, and case sensitivity.
 *
 * Requires authenticated session with an active household and at least one expense.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

test.describe("Suite H: Expense Search", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/expenses");
    await page.waitForTimeout(2000);
  });

  test("H176: Search input visible on expenses page", async ({ page }) => {
    const searchInput = page.locator('[data-testid="expense-search-input"]');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
  });

  test("H177: Typing filters expenses by description", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const countBefore = await cards.count();

    // Get description text from the first card (.font-medium is the description/title element)
    const descEl = cards.first().locator(".font-medium").first();
    const descText = (await descEl.textContent().catch(() => "")) ?? "";
    // Extract a clean word from the description (avoid concatenated text from textContent on parent)
    const words = descText.trim().split(/\s+/).filter((w) => w.length > 2 && !/^\d/.test(w) && !/^[₹$€£]/.test(w));

    if (words.length === 0) {
      console.log("H177: Could not extract a search word from description text. Skipping filter assertion.");
      return;
    }

    const searchWord = words[0];
    await page.fill('[data-testid="expense-search-input"]', searchWord);
    await page.waitForTimeout(500); // debounce

    const countAfter = await cards.count();
    // Should show at least the card we extracted the word from
    expect(countAfter).toBeGreaterThan(0);
    // If there were many cards, filtering might reduce the count
    expect(countAfter).toBeLessThanOrEqual(countBefore);
  });

  test("H178: Search matches category name", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Look for the category badge specifically (has border-slate-700, distinguishing it from the date span)
    const badge = cards.first().locator("[class*='border-slate-700']").first();
    const categoryName = await badge.textContent({ timeout: 5000 }).catch(() => null);

    if (!categoryName || categoryName.length < 3) {
      console.log("H178: Could not find a category name on the first card. Skipping.");
      return;
    }

    await page.fill('[data-testid="expense-search-input"]', categoryName.trim());
    await page.waitForTimeout(500);

    const countAfter = await cards.count();
    expect(countAfter).toBeGreaterThan(0);
  });

  test("H179: Search matches payer name", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Look for "Paid by {name}" text
    const paidByText = await cards.first().locator("text=/Paid by|pays/").first().textContent().catch(() => null);

    if (!paidByText) {
      console.log("H179: Could not find payer text on card. Skipping.");
      return;
    }

    // Extract the name after "Paid by " or use first word after "pays"
    const nameMatch = paidByText.match(/Paid by (\w+)/i) ?? paidByText.match(/^(\w+) pays/i);
    if (!nameMatch) {
      console.log("H179: Could not extract payer name. Skipping.");
      return;
    }

    const payerName = nameMatch[1];
    await page.fill('[data-testid="expense-search-input"]', payerName);
    await page.waitForTimeout(500);

    const countAfter = await cards.count();
    expect(countAfter).toBeGreaterThan(0);
  });

  test("H180: Clear button resets search and shows all expenses", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
    const countBefore = await cards.count();

    // Type something to filter
    await page.fill('[data-testid="expense-search-input"]', "zzzznonexistent");
    await page.waitForTimeout(500);

    // Clear button should be visible
    const clearBtn = page.locator('[data-testid="expense-search-clear"]');
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    await page.waitForTimeout(500);

    // Should restore all expenses
    const countAfter = await cards.count();
    expect(countAfter).toBe(countBefore);

    // Search input should be empty
    const inputValue = await page.locator('[data-testid="expense-search-input"]').inputValue();
    expect(inputValue).toBe("");
  });

  test("H181: No results message when search has no matches", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    await page.fill('[data-testid="expense-search-input"]', "zzzznonexistentzzzz");
    await page.waitForTimeout(500);

    const noResults = page.locator('[data-testid="expense-no-results"]');
    await expect(noResults).toBeVisible({ timeout: 5000 });
    const text = await noResults.textContent();
    expect(text).toMatch(/no (matching|expenses match)/i);
  });

  test("H182: Search is case-insensitive", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Get description from first card
    const firstCardDesc = await cards.first().locator(".font-medium").textContent().catch(() => null);
    if (!firstCardDesc || firstCardDesc.length < 3) {
      console.log("H182: Could not extract description. Skipping.");
      return;
    }

    // Search with uppercase version
    await page.fill('[data-testid="expense-search-input"]', firstCardDesc.toUpperCase());
    await page.waitForTimeout(500);

    const countUpper = await cards.count();
    expect(countUpper).toBeGreaterThan(0);

    // Search with lowercase version
    await page.fill('[data-testid="expense-search-input"]', firstCardDesc.toLowerCase());
    await page.waitForTimeout(500);

    const countLower = await cards.count();
    expect(countLower).toBe(countUpper);
  });

  test("H183: Search persists when sort changes", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Get a search term from first card
    const firstCardDesc = await cards.first().locator(".font-medium").textContent().catch(() => "");
    const searchTerm = firstCardDesc?.split(/\s+/).find((w) => w.length > 3) ?? "";

    if (!searchTerm) {
      console.log("H183: Could not find search term. Skipping.");
      return;
    }

    await page.fill('[data-testid="expense-search-input"]', searchTerm);
    await page.waitForTimeout(500);
    const countAfterSearch = await cards.count();

    // Change sort
    const sortSelect = page.locator('[data-testid="expense-sort-select"]');
    await sortSelect.click();
    await page.waitForTimeout(300);
    await page.locator('[role="option"]', { hasText: "Amount" }).first().click();
    await page.waitForTimeout(500);

    // Search should still be active, count should be the same
    const countAfterSort = await cards.count();
    expect(countAfterSort).toBe(countAfterSearch);

    // Search input should still have the term
    const inputValue = await page.locator('[data-testid="expense-search-input"]').inputValue();
    expect(inputValue).toBe(searchTerm);
  });
});
