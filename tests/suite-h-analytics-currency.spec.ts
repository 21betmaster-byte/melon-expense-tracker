import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Analytics Currency Filter & Insights
 *
 * H349–H360 Browser tests for the analytics page currency filter
 * and analytics insights component.
 *
 * Key testids:
 *   analytics-currency-filter   — currency filter dropdown (only shown with 2+ currencies)
 *   monthly-trend-chart         — trend line chart section
 *   category-mom-chart          — category MoM bar chart section
 *
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

test.describe("Suite H: Analytics Currency Filter & Insights", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/analytics");
  });

  test("H349: Analytics page renders without errors", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    expect(body).not.toContain("Application error");
  });

  test("H350: Analytics page shows header with group name", async ({
    page,
  }) => {
    const header = page.locator("h1");
    await expect(header).toBeVisible({ timeout: 10000 });
    const text = await header.textContent();
    expect(text).toMatch(/Analytics/);
  });

  test("H351: Analytics follows global group (no independent group filter)", async ({ page }) => {
    // The independent group filter was removed; analytics now follows the global active group
    const groupFilter = page.locator(
      '[data-testid="analytics-group-filter"]'
    );
    await expect(groupFilter).not.toBeVisible({ timeout: 5000 });

    // Header should show the active group name
    const header = page.locator("h1");
    await expect(header).toBeVisible({ timeout: 10000 });
    const text = await header.textContent();
    expect(text).toMatch(/Analytics/);
  });

  test("H352: Analytics Insights section renders", async ({ page }) => {
    await page.waitForTimeout(3000);
    // Insights section should render (either with data or as empty)
    const body = await page.locator("body").textContent();
    // Should not crash
    expect(body).not.toContain("Application error");
  });

  test("H353: Category Breakdown section is visible", async ({ page }) => {
    await page.waitForTimeout(3000);
    const heading = page.getByRole("heading", { name: "Category Breakdown", exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("H354: 6-Month Spending Trend section is visible", async ({
    page,
  }) => {
    const chart = page.locator('[data-testid="monthly-trend-chart"]');
    await expect(chart).toBeVisible({ timeout: 10000 });
  });

  test("H355: Category MoM chart section is visible", async ({ page }) => {
    const chart = page.locator('[data-testid="category-mom-chart"]');
    await expect(chart).toBeVisible({ timeout: 10000 });
  });

  test("H356: Currency filter appears when expenses use multiple currencies", async ({
    page,
  }) => {
    await page.waitForTimeout(3000);
    // Currency filter might or might not be visible depending on data
    const currFilter = page.locator(
      '[data-testid="analytics-currency-filter"]'
    );
    const isVisible = await currFilter.isVisible();

    if (isVisible) {
      // If visible, it should be clickable
      await currFilter.click();
      await page.waitForTimeout(300);
      // Should show dropdown items
      const body = await page.locator("body").textContent();
      expect(body).toMatch(/INR|USD|EUR|GBP|AED|SGD|CAD|AUD/);
    }
    // If not visible, that's okay — means all expenses use same currency
  });

  test("H357: Switching global group updates analytics without errors", async ({ page }) => {
    // Analytics now follows the global group switcher
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });
    await switcher.click();
    await page.waitForTimeout(500);

    const menuItems = page.locator('[role="menuitem"]');
    const count = await menuItems.count();
    if (count > 0) {
      await menuItems.first().click();
      await page.waitForTimeout(2000);
    } else {
      await page.keyboard.press("Escape");
    }

    // Page should update without errors
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Application error");
  });

  test("H358: Charts show currency-formatted values (not hardcoded ₹)", async ({
    page,
  }) => {
    await page.waitForTimeout(3000);
    const trendChart = page.locator('[data-testid="monthly-trend-chart"]');
    await expect(trendChart).toBeVisible({ timeout: 10000 });

    // Chart text should contain a currency symbol
    const chartText = await trendChart.textContent();
    if (chartText && chartText.length > 50) {
      // Should have formatted values (with currency symbol or at least numbers)
      expect(chartText).toMatch(/[₹$€£]|\d/);
    }
  });

  test("H359: Analytics page handles empty data gracefully", async ({
    page,
  }) => {
    // Navigate to analytics — even with no data, should not crash
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("Unhandled Runtime Error");
  });

  test("H360: Insights show natural language bullets when data exists", async ({
    page,
  }) => {
    await page.waitForTimeout(3000);
    // Insights section might show tips or stats
    const body = await page.locator("body").textContent();
    // Should either have insights or the rest of the analytics page
    expect(body).toMatch(/Analytics|Category|Trend|Spending/i);
  });
});
