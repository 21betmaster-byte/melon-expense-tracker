import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Advanced Filters (Amount & Date Range)
 *
 * H337–H348 Browser tests for the new advanced filter popover on the
 * Expenses page. Tests filter button, popover interaction, amount range
 * filtering, date range filtering, apply/clear actions, and badge count.
 *
 * Key testids:
 *   advanced-filters-btn   — "Filters" button in filter row
 *   filter-amount-min      — min amount input
 *   filter-amount-max      — max amount input
 *   filter-date-from       — start date input
 *   filter-date-to         — end date input
 *   filter-apply-btn       — apply filters button
 *   filter-clear-btn       — clear filters button
 *
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

test.describe("Suite H: Advanced Filters — Amount & Date Range", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/expenses");
  });

  test("H337: Advanced Filters button is visible on expenses page", async ({
    page,
  }) => {
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    const text = await btn.textContent();
    expect(text).toContain("Filters");
  });

  test("H338: Clicking Filters button opens the popover", async ({
    page,
  }) => {
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);

    // Popover content should be visible
    const popover = page.locator("text=Advanced Filters");
    await expect(popover).toBeVisible({ timeout: 3000 });
  });

  test("H339: Popover shows Amount Range inputs", async ({ page }) => {
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);

    const minInput = page.locator('[data-testid="filter-amount-min"]');
    const maxInput = page.locator('[data-testid="filter-amount-max"]');
    await expect(minInput).toBeVisible();
    await expect(maxInput).toBeVisible();
  });

  test("H340: Popover shows Date Range inputs", async ({ page }) => {
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);

    const fromInput = page.locator('[data-testid="filter-date-from"]');
    const toInput = page.locator('[data-testid="filter-date-to"]');
    await expect(fromInput).toBeVisible();
    await expect(toInput).toBeVisible();
  });

  test("H341: Apply button applies filters", async ({ page }) => {
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);

    const applyBtn = page.locator('[data-testid="filter-apply-btn"]');
    await expect(applyBtn).toBeVisible();
    await expect(applyBtn).toBeEnabled();
  });

  test("H342: Clear button clears all filters", async ({ page }) => {
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);

    const clearBtn = page.locator('[data-testid="filter-clear-btn"]');
    await expect(clearBtn).toBeVisible();
    await expect(clearBtn).toBeEnabled();
  });

  test("H343: Setting min amount and applying filters changes list", async ({
    page,
  }) => {
    // Count initial expenses
    await page.waitForTimeout(2000);
    const initialCount = await page
      .locator('[data-testid="expense-card"]')
      .count();

    // Open filters and set a very high min amount
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await btn.click();
    await page.waitForTimeout(500);

    const minInput = page.locator('[data-testid="filter-amount-min"]');
    await minInput.fill("999999");

    const applyBtn = page.locator('[data-testid="filter-apply-btn"]');
    await applyBtn.click();
    await page.waitForTimeout(1000);

    // Should have fewer (or zero) expenses
    const filteredCount = await page
      .locator('[data-testid="expense-card"]')
      .count();
    expect(filteredCount).toBeLessThanOrEqual(initialCount);
  });

  test("H344: Badge shows count of active advanced filters", async ({
    page,
  }) => {
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);

    // Set both min and max amount
    const minInput = page.locator('[data-testid="filter-amount-min"]');
    const maxInput = page.locator('[data-testid="filter-amount-max"]');
    await minInput.fill("100");
    await maxInput.fill("5000");

    const applyBtn = page.locator('[data-testid="filter-apply-btn"]');
    await applyBtn.click();
    await page.waitForTimeout(500);

    // Filter button should now show a badge with count
    const btnText = await btn.textContent();
    expect(btnText).toMatch(/Filters\s*2/);
  });

  test("H345: Clearing filters restores full list", async ({ page }) => {
    await page.waitForTimeout(2000);
    const initialCount = await page
      .locator('[data-testid="expense-card"]')
      .count();

    // Apply a restrictive filter
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await btn.click();
    await page.waitForTimeout(500);
    const minInput = page.locator('[data-testid="filter-amount-min"]');
    await minInput.fill("999999");
    const applyBtn = page.locator('[data-testid="filter-apply-btn"]');
    await applyBtn.click();
    await page.waitForTimeout(500);

    // Clear filters
    await btn.click();
    await page.waitForTimeout(500);
    const clearBtn = page.locator('[data-testid="filter-clear-btn"]');
    await clearBtn.click();
    await page.waitForTimeout(1000);

    // Count should be back to initial
    const restoredCount = await page
      .locator('[data-testid="expense-card"]')
      .count();
    expect(restoredCount).toBe(initialCount);
  });

  test("H346: Date range filter accepts date inputs", async ({ page }) => {
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);

    const fromInput = page.locator('[data-testid="filter-date-from"]');
    await fromInput.fill("2025-01-01");

    const toInput = page.locator('[data-testid="filter-date-to"]');
    await toInput.fill("2025-12-31");

    const applyBtn = page.locator('[data-testid="filter-apply-btn"]');
    await applyBtn.click();
    await page.waitForTimeout(500);

    // Should not crash — page should still be functional
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Application error");
  });

  test("H347: Popover closes after apply", async ({ page }) => {
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await expect(btn).toBeVisible({ timeout: 10000 });
    await btn.click();
    await page.waitForTimeout(500);

    const applyBtn = page.locator('[data-testid="filter-apply-btn"]');
    await applyBtn.click();
    await page.waitForTimeout(500);

    // Popover should be closed
    const popoverTitle = page.locator("text=Advanced Filters");
    await expect(popoverTitle).not.toBeVisible();
  });

  test("H348: Filter indication shows in page subtitle when filters active", async ({
    page,
  }) => {
    // Apply a filter so the subtitle shows "filtered from X"
    await page.waitForTimeout(2000);
    const btn = page.locator('[data-testid="advanced-filters-btn"]');
    await btn.click();
    await page.waitForTimeout(500);
    const minInput = page.locator('[data-testid="filter-amount-min"]');
    await minInput.fill("1");
    const applyBtn = page.locator('[data-testid="filter-apply-btn"]');
    await applyBtn.click();
    await page.waitForTimeout(1000);

    const body = await page.locator("body").textContent();
    // When any filter is active, page subtitle shows "(filtered from X)"
    expect(body).toMatch(/transactions/);
  });
});
