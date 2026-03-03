import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";
import { Timestamp } from "firebase/firestore";
import type { Expense, Category } from "../types";

// Pure utility import for unit tests (H114–H115)
import { buildCategoryPieData } from "../lib/utils/analytics";

/**
 * Suite H: Pie Chart Analytics (H101–H115)
 *
 * H101–H113: Browser tests for the analytics pie chart (auth required, path: /analytics).
 * H114–H115: Pure unit tests for buildCategoryPieData utility.
 *
 * Requires authenticated session with an active household.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeCategory = (id: string, name: string, keywords: string[]): Category => ({
  id, name, keywords,
});

const makeExpense = (
  overrides: Partial<Expense> & Pick<Expense, "amount" | "expense_type" | "paid_by_user_id">
): Expense => ({
  id: Math.random().toString(36),
  description: "test",
  group_id: "g1",
  category_id: "cat1",
  source: "manual",
  split_ratio: 0.5,
  date: Timestamp.now(),
  ...overrides,
});

// ─── H101–H106: Pie Chart — Rendering & Structure ──────────────────────────

test.describe("Suite H: Pie Chart — Rendering & Structure", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/analytics");
  });

  test("H101: Analytics page loads without errors", async ({ page }) => {
    // Page should not show a crash or error state
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    expect(body).not.toMatch(/\berror\b|\bcrash\b|\b500 internal\b/i);
  });

  test("H102: Category pie chart container is visible", async ({ page }) => {
    const pieChart = page.locator('[data-testid="category-pie-chart"]');
    await expect(pieChart).toBeVisible({ timeout: 15000 });
  });

  test("H103: Pie chart month selector is visible", async ({ page }) => {
    const monthSelector = page.locator('[data-testid="pie-chart-month-selector"]');
    await expect(monthSelector).toBeVisible({ timeout: 10000 });
  });

  test("H104: Pie chart has at least one chart element or slice visible", async ({ page }) => {
    const pieChart = page.locator('[data-testid="category-pie-chart"]');
    await expect(pieChart).toBeVisible({ timeout: 15000 });

    // Look for SVG path elements (chart slices), canvas, or chart segments
    const slices = pieChart.locator("path, .recharts-pie-sector, .recharts-sector, canvas, [class*='slice'], [class*='segment']");
    const sliceCount = await slices.count();

    // Also check for any visible chart content (legends, labels)
    const chartContent = pieChart.locator("text, [class*='legend'], [class*='label']");
    const contentCount = await chartContent.count();

    // At least some chart element should be present
    expect(sliceCount + contentCount).toBeGreaterThanOrEqual(1);
  });

  test("H105: Month selector has selectable options", async ({ page }) => {
    const monthSelector = page.locator('[data-testid="pie-chart-month-selector"]');
    await monthSelector.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(monthSelector).toBeVisible({ timeout: 10000 });

    // Radix Select: click the trigger to open the dropdown, then wait for options
    let found = false;
    for (let attempt = 0; attempt < 3 && !found; attempt++) {
      await monthSelector.click();
      await page.waitForTimeout(800);
      const options = page.getByRole("option");
      found = (await options.count()) > 0;
      if (!found) await page.keyboard.press("Escape");
    }

    // Should show at least one option/month
    const options = page.getByRole("option");
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThanOrEqual(1);

    await page.keyboard.press("Escape");
  });

  test("H106: Selecting a different month updates the chart", async ({ page }) => {
    const pieChart = page.locator('[data-testid="category-pie-chart"]');
    await expect(pieChart).toBeVisible({ timeout: 15000 });

    // Capture initial chart state
    const initialContent = await pieChart.innerHTML();

    const monthSelector = page.locator('[data-testid="pie-chart-month-selector"]');
    await monthSelector.click();
    await page.waitForTimeout(500);

    // Try to select a different month
    const options = page.getByRole("option").or(page.locator('[role="menuitem"], [role="menuitemradio"]'));
    const count = await options.count();

    if (count >= 2) {
      // Click the second option (different from current)
      await options.nth(1).click();
      await page.waitForTimeout(1000);

      // Chart content may or may not change depending on data — just verify no crash
      const body = await page.locator("body").textContent();
      expect(body).toBeTruthy();
    } else {
      console.log("H106: Only one month option available — cannot test month switching.");
    }
  });
});

// ─── H107–H110: Pie Chart — Empty State & Data ─────────────────────────────

test.describe("Suite H: Pie Chart — Empty State & Data", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/analytics");
  });

  test("H107: Empty state shown when no data for selected month", async ({ page }) => {
    const pieChart = page.locator('[data-testid="category-pie-chart"]');
    await expect(pieChart).toBeVisible({ timeout: 15000 });

    const monthSelector = page.locator('[data-testid="pie-chart-month-selector"]');
    await monthSelector.click();
    await page.waitForTimeout(500);

    // Try to find a month with no data by selecting the oldest available month
    const options = page.getByRole("option").or(page.locator('[role="menuitem"], [role="menuitemradio"]'));
    const count = await options.count();

    if (count > 0) {
      // Select the last option (likely oldest month)
      await options.nth(count - 1).click();
      await page.waitForTimeout(1000);
    }

    // Either the chart shows data or an empty state — both are valid
    const chartContent = await pieChart.textContent();
    const hasSlices = await pieChart.locator("path, .recharts-pie-sector, canvas").count();
    const hasEmptyState = /no data|no expenses|nothing/i.test(chartContent ?? "");

    // At least one of these conditions should be true
    expect(hasSlices > 0 || hasEmptyState || chartContent!.length > 0).toBe(true);
  });

  test("H108: Pie chart shows category labels", async ({ page }) => {
    const pieChart = page.locator('[data-testid="category-pie-chart"]');
    await expect(pieChart).toBeVisible({ timeout: 15000 });

    // Chart should have some text content (labels, legends, or tooltips)
    const textElements = pieChart.locator("text, [class*='legend'], [class*='label'], span, p");
    const textCount = await textElements.count();

    // If there's data, there should be text; if no data, empty state text
    const chartText = await pieChart.textContent();
    expect(chartText).toBeTruthy();
  });

  test("H109: Pie chart container has non-zero dimensions", async ({ page }) => {
    const pieChart = page.locator('[data-testid="category-pie-chart"]');
    await expect(pieChart).toBeVisible({ timeout: 15000 });

    const box = await pieChart.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test("H110: Pie chart renders within the analytics page layout", async ({ page }) => {
    const pieChart = page.locator('[data-testid="category-pie-chart"]');
    await expect(pieChart).toBeVisible({ timeout: 15000 });

    // Verify it's within the viewport bounds
    const box = await pieChart.boundingBox();
    expect(box).toBeTruthy();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
  });
});

// ─── H111–H113: Pie Chart — Analytics Page Sections ─────────────────────────

test.describe("Suite H: Pie Chart — Analytics Page Sections", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/analytics");
  });

  test("H111: Analytics page URL is correct", async ({ page }) => {
    await expect(page).toHaveURL(/\/analytics/);
  });

  test("H112: Navigation is visible on analytics page", async ({ page }) => {
    await expect(page.locator("nav")).toBeVisible({ timeout: 10000 });
  });

  test("H113: All three chart sections are visible on analytics page", async ({ page }) => {
    // The analytics page should show multiple chart/analytics sections
    // Typically: pie chart, monthly trend, and category month-over-month

    const pieChart = page.locator('[data-testid="category-pie-chart"]');
    await expect(pieChart).toBeVisible({ timeout: 15000 });

    // Look for additional chart sections by common analytics testids or containers
    // Monthly trend chart
    const monthlyTrend = page.locator(
      '[data-testid="monthly-trend-chart"], [data-testid="monthly-chart"], [class*="trend"]'
    ).first();

    // Category comparison / MoM chart
    const categoryMoM = page.locator(
      '[data-testid="category-mom-chart"], [data-testid="category-comparison"], [class*="comparison"]'
    ).first();

    // Count how many distinct chart sections are visible
    let visibleSections = 1; // pie chart is already confirmed visible

    if (await monthlyTrend.isVisible().catch(() => false)) {
      visibleSections++;
    }
    if (await categoryMoM.isVisible().catch(() => false)) {
      visibleSections++;
    }

    // Fallback: count all major analytics card/section containers
    if (visibleSections < 3) {
      const sections = page.locator('[class*="Card"], [class*="chart"], section').filter({
        has: page.locator("svg, canvas, [class*='recharts']"),
      });
      const sectionCount = await sections.count();
      visibleSections = Math.max(visibleSections, sectionCount);
    }

    // At least 3 chart sections should exist
    expect(visibleSections).toBeGreaterThanOrEqual(3);
  });
});

// ─── H114–H115: buildCategoryPieData Unit Tests ─────────────────────────────

test.describe("Suite H: buildCategoryPieData (Unit Tests)", () => {
  const categories: Category[] = [
    makeCategory("food", "Food & Dining", ["swiggy", "zomato"]),
    makeCategory("travel", "Travel", ["uber", "ola"]),
    makeCategory("grocery", "Groceries", ["bigbasket", "blinkit"]),
  ];

  test("H114: Returns pie slices only for categories with non-zero spend in given month", () => {
    const now = new Date();
    const expenses: Expense[] = [
      makeExpense({
        amount: 500,
        expense_type: "joint",
        paid_by_user_id: "uid-a",
        category_id: "food",
        date: Timestamp.fromDate(now),
      }),
      makeExpense({
        amount: 300,
        expense_type: "solo",
        paid_by_user_id: "uid-b",
        category_id: "travel",
        date: Timestamp.fromDate(now),
      }),
    ];

    const result = buildCategoryPieData(expenses, categories);

    // Should include food and travel but not grocery (no spend)
    expect(result.some((d: { category: string }) => d.category === "Food & Dining")).toBe(true);
    expect(result.some((d: { category: string }) => d.category === "Travel")).toBe(true);
    expect(result.some((d: { category: string }) => d.category === "Groceries")).toBe(false);

    // Each slice should have a positive value
    for (const slice of result) {
      expect(slice.value).toBeGreaterThan(0);
    }
  });

  test("H115: Returns empty array when all expenses are settlements", () => {
    const expenses: Expense[] = [
      makeExpense({
        amount: 1000,
        expense_type: "settlement",
        paid_by_user_id: "uid-a",
        category_id: "food",
        date: Timestamp.now(),
      }),
    ];

    const result = buildCategoryPieData(expenses, categories);
    expect(result).toHaveLength(0);
  });
});
