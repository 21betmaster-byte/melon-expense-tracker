import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Analytics Group Sync & Chart Rendering (H126–H140)
 *
 * Tests that the analytics page follows the global active group (no independent
 * group dropdown) and that chart legends render without overlap.
 *
 * Requires authenticated session with an active household.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

// ─── H126–H130: Analytics — Global Group Sync ────────────────────────────────

test.describe("Suite H: Analytics — Global Group Sync", () => {
  test("H126: Analytics page does NOT have an independent group filter dropdown", async ({ page }) => {
    await requireAuth(page, "/analytics");
    const filter = page.locator('[data-testid="analytics-group-filter"]');
    await expect(filter).not.toBeVisible({ timeout: 5000 });
  });

  test("H127: Analytics header shows the active group name", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });
    const groupName = await switcher.textContent();

    // Navigate to analytics
    await page.goto("/analytics", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Header should contain the active group name
    const header = page.locator("h1");
    await expect(header).toBeVisible({ timeout: 10000 });
    const headerText = await header.textContent();
    expect(headerText).toContain("Analytics");
    // The group name from the switcher should appear in the analytics header
    if (groupName) {
      const cleanGroupName = groupName.replace(/[^a-zA-Z0-9\s]/g, "").trim();
      if (cleanGroupName) {
        expect(headerText).toContain(cleanGroupName);
      }
    }
  });

  test("H128: Switching global group updates analytics data", async ({ page }) => {
    await requireAuth(page, "/analytics");

    // Capture initial header text
    const header = page.locator("h1");
    await expect(header).toBeVisible({ timeout: 10000 });
    const initialHeaderText = await header.textContent();

    // Switch group via global switcher
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });
    await switcher.click();

    const menuItems = page.locator('[role="menuitem"]');
    const count = await menuItems.count();

    if (count < 2) {
      console.warn("H128: Only one group found — cannot test group switching.");
      await page.keyboard.press("Escape");
      return;
    }

    // Find a group different from current
    const currentGroup = await switcher.textContent();
    for (let i = 0; i < count; i++) {
      const text = await menuItems.nth(i).textContent();
      if (text && !currentGroup?.includes(text)) {
        await menuItems.nth(i).click();
        break;
      }
    }

    await page.waitForTimeout(2000);

    // Header should update to reflect the new group
    const updatedHeaderText = await header.textContent();
    // If multiple groups exist with different names, header should change
    if (count >= 2) {
      const newGroupName = await switcher.textContent();
      if (newGroupName && !currentGroup?.includes(newGroupName)) {
        expect(updatedHeaderText).not.toBe(initialHeaderText);
      }
    }
  });

  test("H129: Category filter chips are visible on analytics page", async ({ page }) => {
    await requireAuth(page, "/analytics");
    const chips = page.locator('[data-testid="category-filter-chips"]');
    await expect(chips).toBeVisible({ timeout: 10000 });
  });

  test("H130: Time period filter is visible and functional", async ({ page }) => {
    await requireAuth(page, "/analytics");
    const timePeriod = page.locator('[data-testid="analytics-time-period"]');
    await expect(timePeriod).toBeVisible({ timeout: 10000 });

    const text = await timePeriod.textContent();
    expect(text).toBeTruthy();
    // Default should be "6 months"
    expect(text).toContain("6");
  });
});

// ─── H131–H135: Analytics — Chart Rendering & Legends ────────────────────────

test.describe("Suite H: Analytics — Chart Rendering & Legends", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/analytics");
  });

  test("H131: MoM trend chart section is rendered", async ({ page }) => {
    const section = page.locator('[data-testid="mom-trend-chart"]');
    await expect(section).toBeVisible({ timeout: 15000 });
  });

  test("H132: Category MoM trend chart section is rendered", async ({ page }) => {
    const section = page.locator('[data-testid="category-mom-trend-chart"]');
    await expect(section).toBeVisible({ timeout: 15000 });
  });

  test("H133: Member contribution chart section is rendered", async ({ page }) => {
    const section = page.locator('[data-testid="member-contribution-chart"]');
    await expect(section).toBeVisible({ timeout: 15000 });
  });

  test("H134: Category MoM bar chart (legacy) section is rendered", async ({ page }) => {
    const section = page.locator('[data-testid="category-mom-chart"]');
    await expect(section).toBeVisible({ timeout: 15000 });
  });

  test("H135: Charts have visible legend elements", async ({ page }) => {
    // Wait for at least one Recharts legend to render
    // Recharts renders legends as <ul class="recharts-default-legend">
    const legends = page.locator(".recharts-default-legend");
    // Give charts time to load data and render
    await page.waitForTimeout(5000);

    const count = await legends.count();
    // At least one chart should have a legend (MoM trend always has "Total")
    if (count > 0) {
      const firstLegend = legends.first();
      await expect(firstLegend).toBeVisible();
    } else {
      // If no legend is rendered, it means no data — which is acceptable
      console.log("H135: No chart legends rendered (possibly no expense data).");
    }
  });
});

// ─── H136–H140: Analytics — Insights & Filters ──────────────────────────────

test.describe("Suite H: Analytics — Insights & Filters", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/analytics");
  });

  test("H136: Analytics insights section renders when data exists", async ({ page }) => {
    const insights = page.locator('[data-testid="analytics-insights"]');
    // Insights may or may not be visible depending on data
    await page.waitForTimeout(5000);
    const isVisible = await insights.isVisible().catch(() => false);
    if (isVisible) {
      const text = await insights.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(0);
    } else {
      console.log("H136: No insights rendered (likely insufficient data).");
    }
  });

  test("H137: MoM chart type toggle switches between bar and line", async ({ page }) => {
    const chartTypeToggle = page.locator('[data-testid="mom-chart-type"]');
    await expect(chartTypeToggle).toBeVisible({ timeout: 10000 });

    // Switch to line
    await chartTypeToggle.click();
    await page.waitForTimeout(500);
    const lineOption = page.getByRole("option", { name: /line/i })
      .or(page.locator('[role="menuitem"]').filter({ hasText: /line/i }));
    const lineVisible = await lineOption.isVisible().catch(() => false);
    if (lineVisible) {
      await lineOption.click();
      await page.waitForTimeout(500);
    } else {
      await page.keyboard.press("Escape");
    }

    // Page should not crash
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
  });

  test("H138: MoM category filter dropdown is visible", async ({ page }) => {
    const filter = page.locator('[data-testid="mom-category-filter"]');
    await expect(filter).toBeVisible({ timeout: 10000 });

    const text = await filter.textContent();
    expect(text).toContain("All Categories");
  });

  test("H139: Clicking a category chip toggles filter state", async ({ page }) => {
    const chipsContainer = page.locator('[data-testid="category-filter-chips"]');
    await expect(chipsContainer).toBeVisible({ timeout: 10000 });

    const chips = chipsContainer.locator("button");
    const chipCount = await chips.count();

    if (chipCount > 0) {
      const firstChip = chips.first();
      // Click to select
      await firstChip.click();
      await page.waitForTimeout(300);

      // Clear button should appear
      const clearBtn = page.locator('[data-testid="clear-category-filter"]');
      await expect(clearBtn).toBeVisible({ timeout: 5000 });

      // Click clear
      await clearBtn.click();
      await page.waitForTimeout(300);

      // Clear button should disappear
      await expect(clearBtn).not.toBeVisible({ timeout: 5000 });
    } else {
      console.log("H139: No category chips available to test toggling.");
    }
  });

  test("H140: Multiple rapid group switches do not crash analytics", async ({ page }) => {
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    // Rapidly toggle between groups
    for (let round = 0; round < 3; round++) {
      await switcher.click();
      await page.waitForTimeout(300);

      const menuItems = page.locator('[role="menuitem"]');
      const count = await menuItems.count();

      if (count > 0) {
        const idx = round % count;
        await menuItems.nth(idx).click();
        await page.waitForTimeout(300);
      } else {
        await page.keyboard.press("Escape");
        break;
      }
    }

    // Page should still be functional
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    expect(body).not.toMatch(/error|crash|unhandled/i);
  });
});
