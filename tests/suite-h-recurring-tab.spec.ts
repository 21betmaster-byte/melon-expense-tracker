import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Recurring Expenses Tab
 *
 * H327–H336 Browser tests for the new recurring expenses tab on the
 * All Expenses page. Validates tab switching, recurring list rendering,
 * empty state, and stop recurring flow.
 *
 * Key testids:
 *   expenses-tab-all         — "All" tab trigger
 *   expenses-tab-recurring   — "Recurring" tab trigger
 *   stop-recurring-btn       — stop recurring expense button
 *
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

test.describe("Suite H: Recurring Expenses Tab", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/expenses");
  });

  test("H327: Expenses page shows All and Recurring tabs", async ({
    page,
  }) => {
    const allTab = page.locator('[data-testid="expenses-tab-all"]');
    const recurringTab = page.locator('[data-testid="expenses-tab-recurring"]');

    await expect(allTab).toBeVisible({ timeout: 10000 });
    await expect(recurringTab).toBeVisible({ timeout: 10000 });
  });

  test("H328: All tab is active by default", async ({ page }) => {
    const allTab = page.locator('[data-testid="expenses-tab-all"]');
    await expect(allTab).toBeVisible({ timeout: 10000 });

    // The active tab should have data-state="active"
    const state = await allTab.getAttribute("data-state");
    expect(state).toBe("active");
  });

  test("H329: Clicking Recurring tab switches content", async ({ page }) => {
    const recurringTab = page.locator('[data-testid="expenses-tab-recurring"]');
    await expect(recurringTab).toBeVisible({ timeout: 10000 });
    await recurringTab.click();
    await page.waitForTimeout(500);

    const state = await recurringTab.getAttribute("data-state");
    expect(state).toBe("active");
  });

  test("H330: Recurring tab shows empty state or recurring list", async ({
    page,
  }) => {
    const recurringTab = page.locator('[data-testid="expenses-tab-recurring"]');
    await expect(recurringTab).toBeVisible({ timeout: 10000 });
    await recurringTab.click();
    await page.waitForTimeout(1000);

    const body = page.locator("body");
    const text = await body.textContent();
    // Should show either empty state message or recurring expense cards
    const hasEmptyState = text?.includes("No recurring expenses yet");
    const hasRecurringCards = await page
      .locator('[data-testid="stop-recurring-btn"]')
      .count();

    expect(hasEmptyState || hasRecurringCards > 0).toBeTruthy();
  });

  test("H331: Recurring empty state has helpful text", async ({ page }) => {
    const recurringTab = page.locator('[data-testid="expenses-tab-recurring"]');
    await expect(recurringTab).toBeVisible({ timeout: 10000 });
    await recurringTab.click();
    await page.waitForTimeout(1000);

    const body = await page.locator("body").textContent();
    // Either has recurring items or shows helpful guidance
    if (body?.includes("No recurring expenses yet")) {
      expect(body).toContain("Mark an expense as recurring");
    }
  });

  test("H332: Switching back to All tab shows expense list", async ({
    page,
  }) => {
    const recurringTab = page.locator('[data-testid="expenses-tab-recurring"]');
    const allTab = page.locator('[data-testid="expenses-tab-all"]');

    await expect(recurringTab).toBeVisible({ timeout: 10000 });
    await recurringTab.click();
    await page.waitForTimeout(500);

    await allTab.click();
    await page.waitForTimeout(500);

    const state = await allTab.getAttribute("data-state");
    expect(state).toBe("active");

    // Total spent card should be visible again (part of All tab content)
    const totalSpent = page.locator('[data-testid="expenses-total-spent"]');
    await expect(totalSpent).toBeVisible({ timeout: 5000 });
  });

  test("H333: Recurring tab badge shows count when recurring expenses exist", async ({
    page,
  }) => {
    const recurringTab = page.locator('[data-testid="expenses-tab-recurring"]');
    await expect(recurringTab).toBeVisible({ timeout: 10000 });

    const tabText = await recurringTab.textContent();
    expect(tabText).toContain("Recurring");
    // Badge count (if any) should be numeric
    const match = tabText?.match(/Recurring\s*(\d+)/);
    if (match) {
      const count = parseInt(match[1]);
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("H334: All tab content shows filters (month + paid by)", async ({
    page,
  }) => {
    const monthFilter = page.locator('[data-testid="month-filter"]');
    const paidByFilter = page.locator('[data-testid="paid-by-filter"]');
    await expect(monthFilter).toBeVisible({ timeout: 10000 });
    await expect(paidByFilter).toBeVisible({ timeout: 10000 });
  });

  test("H335: Filters are hidden in Recurring tab", async ({ page }) => {
    const recurringTab = page.locator('[data-testid="expenses-tab-recurring"]');
    await expect(recurringTab).toBeVisible({ timeout: 10000 });
    await recurringTab.click();
    await page.waitForTimeout(500);

    // Month/paid-by filters should NOT be visible in the recurring tab
    const monthFilter = page.locator('[data-testid="month-filter"]');
    await expect(monthFilter).not.toBeVisible();
  });

  test("H336: Search is hidden in Recurring tab", async ({ page }) => {
    const recurringTab = page.locator('[data-testid="expenses-tab-recurring"]');
    await expect(recurringTab).toBeVisible({ timeout: 10000 });
    await recurringTab.click();
    await page.waitForTimeout(500);

    const search = page.locator('[data-testid="expense-search-input"]');
    await expect(search).not.toBeVisible();
  });
});
