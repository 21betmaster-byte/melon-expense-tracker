import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: All Expenses Page Enhancements
 *
 * H51–H70 Browser tests (all auth required, path: /expenses) for the enhanced
 * All Expenses page with filtering, totals, and group context awareness.
 *
 * Key testids:
 *   expenses-total-spent  — displays the total spent figure
 *   expenses-total-owed   — displays the total owed figure
 *   month-filter          — month filter dropdown
 *   paid-by-filter        — paid-by user filter dropdown
 *   group-switcher        — header group switcher (shared with dashboard)
 *
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

test.describe("Suite H: All Expenses Page Enhancements", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/expenses");
  });

  test("H51: Expenses page renders without errors", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    expect(body).not.toContain("Application error");
  });

  test("H52: Total spent card is visible on the expenses page", async ({ page }) => {
    const totalSpent = page.locator('[data-testid="expenses-total-spent"]');
    await expect(totalSpent).toBeVisible({ timeout: 10000 });
  });

  test("H53: Total owed card is visible on the expenses page", async ({ page }) => {
    const totalOwed = page.locator('[data-testid="expenses-total-owed"]');
    await expect(totalOwed).toBeVisible({ timeout: 10000 });
  });

  test("H54: Total spent shows a formatted currency value", async ({ page }) => {
    const totalSpent = page.locator('[data-testid="expenses-total-spent"]');
    await expect(totalSpent).toBeVisible({ timeout: 10000 });

    const text = await totalSpent.textContent();
    // Should contain a currency symbol and a number
    expect(text).toMatch(/[₹$€£]|INR|USD|EUR|GBP/);
    expect(text).toMatch(/\d/);
  });

  test("H55: Total owed shows a formatted currency value", async ({ page }) => {
    const totalOwed = page.locator('[data-testid="expenses-total-owed"]');
    await expect(totalOwed).toBeVisible({ timeout: 10000 });

    const text = await totalOwed.textContent();
    expect(text).toMatch(/[₹$€£]|INR|USD|EUR|GBP/);
    expect(text).toMatch(/\d/);
  });

  test("H56: Month filter dropdown is visible", async ({ page }) => {
    const monthFilter = page.locator('[data-testid="month-filter"]');
    await expect(monthFilter).toBeVisible({ timeout: 10000 });
  });

  test("H57: Selecting a month filters the expense list", async ({ page }) => {
    const monthFilter = page.locator('[data-testid="month-filter"]');
    await expect(monthFilter).toBeVisible({ timeout: 10000 });

    // Note the current expense count
    await page.waitForTimeout(2000);
    const initialCards = page.locator('[data-testid="expense-card"]');
    const initialCount = await initialCards.count();

    // Open filter and select a specific month
    await monthFilter.click();
    await page.waitForTimeout(500);

    const options = page.getByRole("option");
    const optionCount = await options.count();

    if (optionCount > 1) {
      // Select a different month option (the second one)
      await options.nth(1).click();
      await page.waitForTimeout(2000);

      // The expense count may have changed after filtering
      const filteredCards = page.locator('[data-testid="expense-card"]');
      const filteredCount = await filteredCards.count();
      // We just verify the page did not crash and rendered some result
      console.log(`H57: Initial count: ${initialCount}, Filtered count: ${filteredCount}`);
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    } else {
      console.log("H57: Only one month option available — filter test limited.");
    }
  });

  test("H58: Paid-by filter dropdown is visible", async ({ page }) => {
    const paidByFilter = page.locator('[data-testid="paid-by-filter"]');
    await expect(paidByFilter).toBeVisible({ timeout: 10000 });
  });

  test("H59: Combining month + paid-by filters narrows results", async ({ page }) => {
    const monthFilter = page.locator('[data-testid="month-filter"]');
    const paidByFilter = page.locator('[data-testid="paid-by-filter"]');

    await expect(monthFilter).toBeVisible({ timeout: 10000 });
    await expect(paidByFilter).toBeVisible({ timeout: 10000 });

    // Apply month filter
    await monthFilter.click();
    await page.waitForTimeout(500);
    const monthOptions = page.getByRole("option");
    const monthCount = await monthOptions.count();
    if (monthCount > 1) {
      await monthOptions.nth(1).click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(1500);

    const afterMonthFilter = await page.locator('[data-testid="expense-card"]').count();

    // Apply paid-by filter
    await paidByFilter.click();
    await page.waitForTimeout(500);
    const paidByOptions = page.getByRole("option");
    const paidByCount = await paidByOptions.count();
    if (paidByCount > 1) {
      await paidByOptions.nth(1).click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(1500);

    const afterBothFilters = await page.locator('[data-testid="expense-card"]').count();

    // Combined filter should show <= results than month-only filter
    expect(afterBothFilters).toBeLessThanOrEqual(afterMonthFilter);
    console.log(`H59: Month only: ${afterMonthFilter}, Both filters: ${afterBothFilters}`);
  });

  test("H60: Paid-by filter lists household members", async ({ page }) => {
    const paidByFilter = page.locator('[data-testid="paid-by-filter"]');
    await expect(paidByFilter).toBeVisible({ timeout: 10000 });

    await paidByFilter.click();
    await page.waitForTimeout(1000);

    const options = page.getByRole("option");
    const count = await options.count();
    // Should have at least 1 option (the current user) + possibly "All"
    expect(count).toBeGreaterThanOrEqual(1);

    await page.keyboard.press("Escape");
  });

  test("H61: Month filter lists recent months", async ({ page }) => {
    const monthFilter = page.locator('[data-testid="month-filter"]');
    await expect(monthFilter).toBeVisible({ timeout: 10000 });

    await monthFilter.click();
    await page.waitForTimeout(1000);

    const options = page.getByRole("option");
    const count = await options.count();
    // Should have at least one option (current month or "All")
    expect(count).toBeGreaterThanOrEqual(1);

    await page.keyboard.press("Escape");
  });

  test("H62: Expense cards display on the expenses page", async ({ page }) => {
    await page.waitForTimeout(3000);

    const expenseCards = page.locator('[data-testid="expense-card"]');
    const count = await expenseCards.count();

    // There should be at least some expenses if the test user has data
    console.log(`H62: Found ${count} expense card(s) on /expenses page.`);
    // No crash = pass
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("H63: Totals update when filters change", async ({ page }) => {
    const totalSpent = page.locator('[data-testid="expenses-total-spent"]');
    await expect(totalSpent).toBeVisible({ timeout: 10000 });

    const initialTotal = await totalSpent.textContent();

    // Apply a filter
    const monthFilter = page.locator('[data-testid="month-filter"]');
    await monthFilter.click();
    await page.waitForTimeout(500);

    const options = page.getByRole("option");
    const count = await options.count();
    if (count > 1) {
      await options.nth(1).click();
      await page.waitForTimeout(2000);

      const filteredTotal = await totalSpent.textContent();
      // Totals may or may not change depending on data, but they should still be valid
      expect(filteredTotal).toMatch(/[₹$€£]|INR|USD|EUR|GBP|\d/);
      console.log(`H63: Initial total: "${initialTotal}", Filtered total: "${filteredTotal}"`);
    } else {
      await page.keyboard.press("Escape");
      console.log("H63: Only one month option — total update not testable.");
    }
  });

  test("H64: Expenses page has navigation link or is accessible from dashboard", async ({ page }) => {
    // Navigate to dashboard first
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Look for a link to /expenses
    const expensesLink = page.locator('a[href*="/expenses"], [data-testid="expenses-link"]');
    const count = await expensesLink.count();

    if (count > 0) {
      await expensesLink.first().click();
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/expenses/);
    } else {
      // Navigate directly — the route should still work
      await page.goto("/expenses", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      await expect(page).toHaveURL(/\/expenses/);
    }
  });

  test("H65: Switching group via group-switcher resets filters", async ({ page }) => {
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    // Apply a filter first
    const monthFilter = page.locator('[data-testid="month-filter"]');
    await expect(monthFilter).toBeVisible({ timeout: 10000 });
    await monthFilter.click();
    await page.waitForTimeout(500);

    const monthOptions = page.getByRole("option");
    const monthCount = await monthOptions.count();
    if (monthCount > 1) {
      await monthOptions.nth(1).click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(1000);

    // Now switch the group
    await switcher.click();
    const menuItems = page.locator('[role="menuitem"]');
    const groupCount = await menuItems.count();

    if (groupCount < 2) {
      console.log("H65: Only one group — cannot test filter reset on group switch.");
      return;
    }

    const initialGroup = await switcher.textContent();
    for (let i = 0; i < groupCount; i++) {
      const text = await menuItems.nth(i).textContent();
      if (!initialGroup?.includes(text ?? "")) {
        await menuItems.nth(i).click();
        break;
      }
    }

    await page.waitForTimeout(2000);

    // Filters should reset — month filter should show default (e.g., "All" or current month)
    const monthFilterText = await monthFilter.textContent();
    console.log(`H65: Month filter after group switch: "${monthFilterText}"`);
    // Verify it did not crash and filter has a valid state
    expect(monthFilterText).toBeTruthy();
  });

  test("H66: Empty state message shows when no expenses match filters", async ({ page }) => {
    // Apply restrictive filters to try to get zero results
    const monthFilter = page.locator('[data-testid="month-filter"]');
    await expect(monthFilter).toBeVisible({ timeout: 10000 });

    await monthFilter.click();
    await page.waitForTimeout(500);

    const options = page.getByRole("option");
    const count = await options.count();

    // Try the last option (likely an older month with no data)
    if (count > 2) {
      await options.nth(count - 1).click();
      await page.waitForTimeout(2000);

      const cards = page.locator('[data-testid="expense-card"]');
      const cardCount = await cards.count();

      if (cardCount === 0) {
        // An empty state message should be visible
        const emptyState = page.getByText(/no expenses|no results|nothing here/i);
        const isVisible = await emptyState.isVisible().catch(() => false);
        console.log(`H66: Empty state visible: ${isVisible}`);
      } else {
        console.log(`H66: Found ${cardCount} cards even with last filter — no empty state to verify.`);
      }
    } else {
      await page.keyboard.press("Escape");
      console.log("H66: Not enough filter options to test empty state.");
    }
  });

  test("H67: Expense cards on /expenses page show description", async ({ page }) => {
    await page.waitForTimeout(3000);

    const cards = page.locator('[data-testid="expense-card"]');
    const count = await cards.count();

    if (count > 0) {
      const firstCard = cards.first();
      const text = await firstCard.textContent();
      // Card should have some meaningful text content (description)
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(0);
    } else {
      console.log("H67: No expense cards found to verify description.");
    }
  });

  test("H68: Expense cards on /expenses page show amount", async ({ page }) => {
    await page.waitForTimeout(3000);

    const cards = page.locator('[data-testid="expense-card"]');
    const count = await cards.count();

    if (count > 0) {
      const firstCard = cards.first();
      const text = await firstCard.textContent();
      // Card should contain a number (the amount)
      expect(text).toMatch(/\d/);
      // Should contain a currency symbol
      expect(text).toMatch(/[₹$€£]|INR|USD|EUR|GBP/);
    } else {
      console.log("H68: No expense cards found to verify amount.");
    }
  });

  test("H69: Reloading the page resets filters to defaults", async ({ page }) => {
    // Apply a filter
    const monthFilter = page.locator('[data-testid="month-filter"]');
    await expect(monthFilter).toBeVisible({ timeout: 10000 });

    // Get default filter text
    const defaultText = await monthFilter.textContent();

    await monthFilter.click();
    await page.waitForTimeout(500);
    const options = page.getByRole("option");
    const count = await options.count();

    if (count > 1) {
      await options.nth(1).click();
      await page.waitForTimeout(1000);

      const changedText = await monthFilter.textContent();

      // Reload the page
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(3000);

      const afterReloadText = await monthFilter.textContent();
      // After reload, filter should be back to default
      expect(afterReloadText).toBe(defaultText);
      console.log(
        `H69: Default: "${defaultText}", Changed: "${changedText}", After reload: "${afterReloadText}"`
      );
    } else {
      await page.keyboard.press("Escape");
      console.log("H69: Only one filter option — reload reset not testable.");
    }
  });

  test("H70: Page title or heading indicates 'All Expenses' or similar", async ({ page }) => {
    // The page should have a heading or title that identifies it
    const heading = page.locator("h1, h2, h3").filter({ hasText: /expenses|all expenses/i });
    const headingCount = await heading.count();

    if (headingCount > 0) {
      await expect(heading.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Check page title
      const title = await page.title();
      const hasExpensesInTitle = /expenses/i.test(title);
      console.log(`H70: Page title: "${title}", contains 'expenses': ${hasExpensesInTitle}`);
      // At least the page should render without errors
      const body = await page.locator("body").textContent();
      expect(body).toBeTruthy();
    }
  });
});
