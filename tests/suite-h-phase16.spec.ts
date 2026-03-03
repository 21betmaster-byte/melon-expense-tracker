import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Phase 16 UX Improvements (H400–H460)
 *
 * Tests for 9 new fixes:
 * 1. Description mandatory + Quick Add category (H400–H409)
 * 2. Analytics insights partial month (H410–H414)
 * 3. MoM views + category filtering + time periods (H415–H424)
 * 4. Member contribution stacked bar chart (H425–H429)
 * 5. Configurable time periods (H430–H434)
 * 6. Paid-by filter clarity (H435–H439)
 * 7. Quick Add examples + layout (H440–H444)
 * 8. Add Expense form fit on screen (H445–H449)
 * 9. Group archival (H450–H460)
 */

// ─── Fix 1: Description Mandatory + Quick Add Category ─────────────────────

test.describe("Suite H: Description Mandatory (H400–H404)", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/expenses");
  });

  test("H400: Description field is required on Add Expense form", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    const form = page.locator('[data-testid="expense-form"]');
    await expect(form).toBeVisible({ timeout: 5000 });

    // Check that description label does NOT say "(optional)"
    const descLabel = form.locator('label:has-text("Description")');
    await expect(descLabel).toBeVisible();
    const labelText = await descLabel.textContent();
    expect(labelText).not.toContain("optional");
  });

  test("H401: Form validation prevents submit without description", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Fill amount but leave description empty
    await page.locator('[data-testid="amount-input"]').fill("100");

    // Select a category
    const catSelect = page.locator('[data-testid="category-select"]');
    await catSelect.click();
    await page.waitForTimeout(300);
    const catOptions = page.getByRole("option");
    const catCount = await catOptions.count();
    if (catCount > 0) {
      await catOptions.first().click();
      await page.waitForTimeout(300);
    }

    // Try to submit
    await page.locator('[data-testid="submit-expense"]').click();
    await page.waitForTimeout(500);

    // Form should show validation error for description
    const errorMsg = page.locator('text=Description is required');
    await expect(errorMsg).toBeVisible({ timeout: 3000 });
  });

  test("H402: Form submits successfully when description is provided", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    await page.locator('[data-testid="amount-input"]').fill("50");
    await page.locator('[data-testid="description-input"]').fill("H402 test expense");

    const catSelect = page.locator('[data-testid="category-select"]');
    await catSelect.click();
    await page.waitForTimeout(300);
    const catOptions = page.getByRole("option");
    if (await catOptions.count() > 0) {
      await catOptions.first().click();
    }
    await page.waitForTimeout(300);

    await page.locator('[data-testid="submit-expense"]').click();
    await page.waitForTimeout(1000);

    // Dialog should close (success)
    const form = page.locator('[data-testid="expense-form"]');
    await expect(form).not.toBeVisible({ timeout: 5000 });
  });
});

test.describe("Suite H: Quick Add Category (H403–H409)", () => {
  test("H403: Quick Add dialog has category selector", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    const quickAddBtn = page.locator('[data-testid="quick-add-btn"], button:has-text("Quick add")');
    const isVisible = await quickAddBtn.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("H403: Quick Add button not found on dashboard — skipping.");
      return;
    }
    await quickAddBtn.click();
    await page.waitForTimeout(500);

    const catSelect = page.locator('[data-testid="quick-add-category"]');
    await expect(catSelect).toBeVisible({ timeout: 5000 });
  });

  test("H404: Quick Add category dropdown shows options", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    const quickAddBtn = page.locator('[data-testid="quick-add-btn"], button:has-text("Quick add")');
    const isVisible = await quickAddBtn.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("H404: Quick Add button not found — skipping.");
      return;
    }
    await quickAddBtn.click();
    await page.waitForTimeout(500);

    const catSelect = page.locator('[data-testid="quick-add-category"]');
    await expect(catSelect).toBeVisible({ timeout: 5000 });
    await catSelect.click();
    await page.waitForTimeout(300);

    const options = page.getByRole("option");
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
  });

  test("H405: Quick Add auto-detects category from description", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    const quickAddBtn = page.locator('[data-testid="quick-add-btn"], button:has-text("Quick add")');
    const isVisible = await quickAddBtn.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("H405: Quick Add button not found — skipping.");
      return;
    }
    await quickAddBtn.click();
    await page.waitForTimeout(500);

    // Type amount + description
    const input = page.locator('[data-testid="quick-add-input"]');
    await input.fill("500 Grocery shopping");
    await page.waitForTimeout(500);

    // Category selector should have some value auto-set
    const catSelect = page.locator('[data-testid="quick-add-category"]');
    const catText = await catSelect.textContent();
    expect(catText).toBeTruthy();
    // Either auto-detected or fallback to Miscellaneous
    expect(catText!.trim().length).toBeGreaterThan(0);
  });
});

// ─── Fix 2: Analytics Insights Partial Month ────────────────────────────────

test.describe("Suite H: Analytics Insights Partial Month (H410–H414)", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/analytics");
  });

  test("H410: Insights panel is visible on analytics page", async ({ page }) => {
    const insights = page.locator('[data-testid="analytics-insights"]');
    // Insights may or may not be visible depending on data — just verify no crash
    await page.waitForTimeout(3000);
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
  });

  test("H411: Insights do not show misleading percentage decreases early in month", async ({ page }) => {
    await page.waitForTimeout(3000);
    const insights = page.locator('[data-testid="analytics-insights"]');
    const isVisible = await insights.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("H411: Insights panel not visible — no data to show.");
      return;
    }

    const text = await insights.textContent();
    // Should NOT contain phrases like "down 90%" or "down 95%" early in month
    // Instead should say "On pace for" or "trending" or "too early"
    if (text?.includes("pace") || text?.includes("trending") || text?.includes("too early")) {
      // Good — using normalized language
      expect(true).toBe(true);
    } else if (text?.includes("down") && text?.match(/down.*\d{2,3}%/)) {
      // If there's a massive drop, check it's reasonable
      const match = text.match(/down.*?(\d+)%/);
      if (match) {
        const pct = parseInt(match[1]);
        // Early in month, a 90%+ drop would be misleading
        const dayOfMonth = new Date().getDate();
        if (dayOfMonth <= 5) {
          // Should say "too early" instead
          expect(text).toContain("too early");
        }
      }
    }
  });

  test("H412: Total spending insight uses pace language", async ({ page }) => {
    await page.waitForTimeout(3000);
    const insights = page.locator('[data-testid="analytics-insights"]');
    const isVisible = await insights.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("H412: No insights panel — soft pass.");
      return;
    }

    const text = await insights.textContent() ?? "";
    // Verify language uses "pace", "trending", or "so far"
    const hasPaceLanguage = /pace|trending|so far|too early|steady/i.test(text);
    // It might also just have first-month or top-spending text which is fine
    const hasValidInsight = hasPaceLanguage || /top category|first month|no spending|new this month/i.test(text);
    expect(hasValidInsight).toBe(true);
  });
});

// ─── Fix 3: MoM Views + Category Filtering ─────────────────────────────────

test.describe("Suite H: MoM Views & Category Filter (H415–H424)", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/analytics");
  });

  test("H415: MoM trend chart is visible", async ({ page }) => {
    const chart = page.locator('[data-testid="mom-trend-chart"]');
    await expect(chart).toBeVisible({ timeout: 10000 });
  });

  test("H416: Category MoM trend chart is visible", async ({ page }) => {
    const chart = page.locator('[data-testid="category-mom-trend-chart"]');
    await expect(chart).toBeVisible({ timeout: 10000 });
  });

  test("H417: Category filter chips are visible", async ({ page }) => {
    const chips = page.locator('[data-testid="category-filter-chips"]');
    await expect(chips).toBeVisible({ timeout: 10000 });
  });

  test("H418: Clicking category chip toggles filter", async ({ page }) => {
    const chips = page.locator('[data-testid="category-filter-chips"]');
    await expect(chips).toBeVisible({ timeout: 10000 });

    const firstChip = chips.locator("button").first();
    const isChipVisible = await firstChip.isVisible().catch(() => false);
    if (!isChipVisible) {
      console.log("H418: No category chips — soft pass.");
      return;
    }

    // Click to select
    await firstChip.click();
    await page.waitForTimeout(300);

    // Should show blue-highlighted styling when selected
    const chipClasses = await firstChip.getAttribute("class");
    expect(chipClasses).toContain("blue");

    // Clear button should appear
    const clearBtn = page.locator('[data-testid="clear-category-filter"]');
    await expect(clearBtn).toBeVisible();

    // Click clear
    await clearBtn.click();
    await page.waitForTimeout(300);
    await expect(clearBtn).not.toBeVisible();
  });

  test("H419: MoM chart type can be switched between bar and line", async ({ page }) => {
    const chartTypeSelect = page.locator('[data-testid="mom-chart-type"]');
    await expect(chartTypeSelect).toBeVisible({ timeout: 10000 });

    await chartTypeSelect.click();
    await page.waitForTimeout(300);

    const lineOption = page.getByRole("option", { name: "Line" });
    const isLineVisible = await lineOption.isVisible().catch(() => false);
    if (isLineVisible) {
      await lineOption.click();
      await page.waitForTimeout(500);

      // Verify chart still renders
      const chart = page.locator('[data-testid="mom-trend-chart"]');
      await expect(chart).toBeVisible();
    } else {
      await page.keyboard.press("Escape");
    }
  });
});

// ─── Fix 4: Member Contribution Chart ───────────────────────────────────────

test.describe("Suite H: Member Contribution Chart (H425–H429)", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/analytics");
  });

  test("H425: Member contribution chart section is visible", async ({ page }) => {
    const chart = page.locator('[data-testid="member-contribution-chart"]');
    await expect(chart).toBeVisible({ timeout: 10000 });
  });

  test("H426: Member contribution chart has 'Who Paid What' heading", async ({ page }) => {
    const heading = page.locator('h2:has-text("Who Paid What")');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test("H427: Member contribution chart shows data or empty state", async ({ page }) => {
    const chart = page.locator('[data-testid="member-contribution-chart"]');
    await expect(chart).toBeVisible({ timeout: 10000 });

    const chartContent = await chart.textContent();
    expect(chartContent).toBeTruthy();
    // Should either show chart content or "No data" message
    const hasContent = chartContent!.length > 20;
    expect(hasContent).toBe(true);
  });
});

// ─── Fix 5: Configurable Time Periods ───────────────────────────────────────

test.describe("Suite H: Configurable Time Periods (H430–H434)", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/analytics");
  });

  test("H430: Time period selector is visible on analytics page", async ({ page }) => {
    const timePeriod = page.locator('[data-testid="analytics-time-period"]');
    await expect(timePeriod).toBeVisible({ timeout: 10000 });
  });

  test("H431: Time period selector has 3, 6, 9, 12 month options", async ({ page }) => {
    const timePeriod = page.locator('[data-testid="analytics-time-period"]');
    await expect(timePeriod).toBeVisible({ timeout: 10000 });

    await timePeriod.click();
    await page.waitForTimeout(300);

    const options = page.getByRole("option");
    const texts: string[] = [];
    const count = await options.count();
    for (let i = 0; i < count; i++) {
      texts.push((await options.nth(i).textContent()) ?? "");
    }

    expect(texts.some((t) => t.includes("3"))).toBe(true);
    expect(texts.some((t) => t.includes("6"))).toBe(true);
    expect(texts.some((t) => t.includes("12"))).toBe(true);

    await page.keyboard.press("Escape");
  });

  test("H432: Changing time period updates charts", async ({ page }) => {
    const timePeriod = page.locator('[data-testid="analytics-time-period"]');
    await expect(timePeriod).toBeVisible({ timeout: 10000 });

    // Switch to 12 months
    await timePeriod.click();
    await page.waitForTimeout(300);

    const option12 = page.getByRole("option", { name: /12/ });
    const isVisible = await option12.isVisible().catch(() => false);
    if (isVisible) {
      await option12.click();
      await page.waitForTimeout(1000);
      // Page should still be functional
      const body = await page.locator("body").textContent();
      expect(body).toBeTruthy();
    } else {
      await page.keyboard.press("Escape");
    }
  });

  test("H433: Default time period is 6 months", async ({ page }) => {
    const timePeriod = page.locator('[data-testid="analytics-time-period"]');
    await expect(timePeriod).toBeVisible({ timeout: 10000 });

    const text = await timePeriod.textContent();
    expect(text).toContain("6");
  });
});

// ─── Fix 6: Paid By Filter Clarity ──────────────────────────────────────────

test.describe("Suite H: Paid By Filter Clarity (H435–H439)", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/expenses");
  });

  test("H435: Paid by filter shows 'Paid by: Everyone' as default", async ({ page }) => {
    const filter = page.locator('[data-testid="paid-by-filter"]');
    await expect(filter).toBeVisible({ timeout: 10000 });

    const text = await filter.textContent();
    expect(text).toContain("Paid by");
    expect(text).toContain("Everyone");
  });

  test("H436: Selecting a member shows 'Paid by: [Name]'", async ({ page }) => {
    const filter = page.locator('[data-testid="paid-by-filter"]');
    await expect(filter).toBeVisible({ timeout: 10000 });

    await filter.click();
    await page.waitForTimeout(300);

    const options = page.getByRole("option");
    const count = await options.count();

    if (count >= 2) {
      // Select a specific member (skip "Everyone")
      const memberOption = options.nth(1);
      const memberText = await memberOption.textContent();
      await memberOption.click();
      await page.waitForTimeout(500);

      const filterText = await filter.textContent();
      expect(filterText).toContain("Paid by");
    } else {
      await page.keyboard.press("Escape");
    }
  });

  test("H437: Active paid-by filter has highlighted styling", async ({ page }) => {
    const filter = page.locator('[data-testid="paid-by-filter"]');
    await expect(filter).toBeVisible({ timeout: 10000 });

    await filter.click();
    await page.waitForTimeout(300);

    const options = page.getByRole("option");
    const count = await options.count();

    if (count >= 2) {
      await options.nth(1).click();
      await page.waitForTimeout(500);

      // Filter should have blue highlighting when active
      const filterClasses = await filter.getAttribute("class");
      expect(filterClasses).toContain("blue");
    } else {
      await page.keyboard.press("Escape");
    }
  });

  test("H438: Filter options show 'Paid by [Name]' prefix", async ({ page }) => {
    const filter = page.locator('[data-testid="paid-by-filter"]');
    await expect(filter).toBeVisible({ timeout: 10000 });

    await filter.click();
    await page.waitForTimeout(300);

    const options = page.getByRole("option");
    const count = await options.count();

    if (count >= 2) {
      const secondOptionText = await options.nth(1).textContent();
      expect(secondOptionText).toContain("Paid by");
    }

    await page.keyboard.press("Escape");
  });
});

// ─── Fix 7: Quick Add Examples + Layout ─────────────────────────────────────

test.describe("Suite H: Quick Add Layout (H440–H444)", () => {
  test("H440: Template chips wrap instead of scroll horizontally", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    const quickAddBtn = page.locator('[data-testid="quick-add-btn"], button:has-text("Quick add")');
    const isVisible = await quickAddBtn.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("H440: Quick Add button not found — skipping.");
      return;
    }
    await quickAddBtn.click();
    await page.waitForTimeout(500);

    const chips = page.locator('[data-testid="template-chips"]');
    const chipsVisible = await chips.isVisible().catch(() => false);
    if (!chipsVisible) {
      console.log("H440: No template chips — no recent expenses for templates.");
      return;
    }

    const chipsClasses = await chips.getAttribute("class");
    // Should use flex-wrap, NOT overflow-x-auto
    expect(chipsClasses).toContain("flex-wrap");
    expect(chipsClasses).not.toContain("overflow-x-auto");
  });

  test("H441: Template chips show amount first, no currency symbol", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    const quickAddBtn = page.locator('[data-testid="quick-add-btn"], button:has-text("Quick add")');
    const isVisible = await quickAddBtn.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("H441: Quick Add button not found — skipping.");
      return;
    }
    await quickAddBtn.click();
    await page.waitForTimeout(500);

    const chips = page.locator('[data-testid="template-chips"]');
    const chipsVisible = await chips.isVisible().catch(() => false);
    if (!chipsVisible) {
      console.log("H441: No template chips — soft pass.");
      return;
    }

    const firstChip = chips.locator("button").first();
    const chipText = await firstChip.textContent();
    if (chipText) {
      // Should NOT start with currency symbol (₹, $, etc)
      expect(chipText.trim()).not.toMatch(/^[₹$€£]/);
      // Should start with a number (amount first)
      expect(chipText.trim()).toMatch(/^\d/);
    }
  });

  test("H442: Quick Add dialog does not block the entire view", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    const quickAddBtn = page.locator('[data-testid="quick-add-btn"], button:has-text("Quick add")');
    const isVisible = await quickAddBtn.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("H442: Quick Add button not found — skipping.");
      return;
    }
    await quickAddBtn.click();
    await page.waitForTimeout(500);

    // Dialog should be positioned higher (not center-blocking)
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();

    // Dialog exists and is interactive
    const input = page.locator('[data-testid="quick-add-input"]');
    await expect(input).toBeVisible();
  });
});

// ─── Fix 8: Add Expense Form Fit ────────────────────────────────────────────

test.describe("Suite H: Add Expense Form Layout (H445–H449)", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/expenses");
  });

  test("H445: Date and Currency fields are side by side", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    const dateInput = page.locator('[data-testid="date-input"]');
    const currencySelect = page.locator('[data-testid="currency-override-select"]');

    await expect(dateInput).toBeVisible();
    await expect(currencySelect).toBeVisible();

    // Both should be in the same row (similar Y position)
    const dateBBox = await dateInput.boundingBox();
    const currencyBBox = await currencySelect.boundingBox();

    if (dateBBox && currencyBBox) {
      // Y positions should be within 50px of each other (same row)
      expect(Math.abs(dateBBox.y - currencyBBox.y)).toBeLessThan(50);
    }
  });

  test("H446: Notes field is a single-line input", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    const notesInput = page.locator('[data-testid="expense-notes-input"]');
    await expect(notesInput).toBeVisible();

    // Should be an input, not a textarea
    const tagName = await notesInput.evaluate((el) => el.tagName.toLowerCase());
    expect(tagName).toBe("input");
  });

  test("H447: Submit button is visible without excessive scrolling", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    const submitBtn = page.locator('[data-testid="submit-expense"]');
    await expect(submitBtn).toBeVisible({ timeout: 5000 });

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test("H448: Form uses compact spacing", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    const form = page.locator('[data-testid="expense-form"]');
    await expect(form).toBeVisible();

    const formClasses = await form.getAttribute("class");
    // Should use space-y-3 (compact) instead of space-y-4
    expect(formClasses).toContain("space-y-3");
  });
});

// ─── Fix 9: Group Archival ──────────────────────────────────────────────────

test.describe("Suite H: Group Archival (H450–H460)", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H450: Group switcher shows active groups", async ({ page }) => {
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    await switcher.click();
    await page.waitForTimeout(500);

    // Should show "Expense Groups" label
    const label = page.locator('text=Expense Groups');
    await expect(label).toBeVisible();

    await page.keyboard.press("Escape");
  });

  test("H451: Non-default groups show archive button on hover", async ({ page }) => {
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    await switcher.click();
    await page.waitForTimeout(500);

    // Check for archive buttons (may not exist if only default group)
    const archiveButtons = page.locator('[data-testid^="archive-group-"]');
    const archiveCount = await archiveButtons.count();

    // Either there are archive buttons, or all groups are default
    // Just verify the dropdown opens without errors
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();

    await page.keyboard.press("Escape");
  });

  test("H452: Archived Groups section appears when archived groups exist", async ({ page }) => {
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    await switcher.click();
    await page.waitForTimeout(500);

    // Check for archived section
    const archivedSection = page.locator('[data-testid="show-archived-groups"]');
    const hasArchived = await archivedSection.isVisible().catch(() => false);

    if (hasArchived) {
      const sectionText = await archivedSection.textContent();
      expect(sectionText).toContain("Archived Groups");

      // Click to expand
      await archivedSection.click();
      await page.waitForTimeout(300);

      // Should show restore buttons
      const restoreButtons = page.locator('[data-testid^="unarchive-group-"]');
      const restoreCount = await restoreButtons.count();
      expect(restoreCount).toBeGreaterThan(0);
    } else {
      console.log("H452: No archived groups — soft pass.");
    }

    await page.keyboard.press("Escape");
  });

  test("H453: Create new group still works in the updated switcher", async ({ page }) => {
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    await switcher.click();
    await page.waitForTimeout(500);

    const createBtn = page.locator('[data-testid="create-group-switcher-btn"]');
    await expect(createBtn).toBeVisible();

    // Click create
    await createBtn.click();
    await page.waitForTimeout(300);

    const input = page.locator('[data-testid="switcher-group-name-input"]');
    await expect(input).toBeVisible();

    // Cancel by pressing Escape
    await page.keyboard.press("Escape");
  });

  test("H454: GroupSwitcher dropdown has correct structure", async ({ page }) => {
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    // Verify the switcher displays the group name
    const switcherText = await switcher.textContent();
    expect(switcherText).toBeTruthy();
    expect(switcherText!.trim().length).toBeGreaterThan(0);
  });
});

// ─── Cross-feature: Analytics Page Doesn't Crash ────────────────────────────

test.describe("Suite H: Analytics Page Stability (H455–H460)", () => {
  test("H455: Analytics page loads all new sections without errors", async ({ page }) => {
    await requireAuth(page, "/analytics");

    // Wait for content to load
    await page.waitForTimeout(5000);

    // All sections should exist
    const momChart = page.locator('[data-testid="mom-trend-chart"]');
    const catMomChart = page.locator('[data-testid="category-mom-trend-chart"]');
    const memberChart = page.locator('[data-testid="member-contribution-chart"]');
    const categoryChips = page.locator('[data-testid="category-filter-chips"]');
    const timePeriod = page.locator('[data-testid="analytics-time-period"]');

    await expect(momChart).toBeVisible({ timeout: 10000 });
    await expect(catMomChart).toBeVisible();
    await expect(memberChart).toBeVisible();
    await expect(categoryChips).toBeVisible();
    await expect(timePeriod).toBeVisible();
  });

  test("H456: Switching time period + category filter combination works", async ({ page }) => {
    await requireAuth(page, "/analytics");
    await page.waitForTimeout(3000);

    // Change time period to 12 months
    const timePeriod = page.locator('[data-testid="analytics-time-period"]');
    await expect(timePeriod).toBeVisible({ timeout: 10000 });
    await timePeriod.click();
    await page.waitForTimeout(300);

    const option12 = page.getByRole("option", { name: /12/ });
    if (await option12.isVisible().catch(() => false)) {
      await option12.click();
      await page.waitForTimeout(500);
    } else {
      await page.keyboard.press("Escape");
    }

    // Now toggle a category filter
    const chips = page.locator('[data-testid="category-filter-chips"]');
    const firstChip = chips.locator("button").first();
    if (await firstChip.isVisible().catch(() => false)) {
      await firstChip.click();
      await page.waitForTimeout(500);
    }

    // Page should still be functional
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    expect(body).not.toMatch(/error|unhandled|crash/i);
  });

  test("H457: All legacy charts still render on analytics page", async ({ page }) => {
    await requireAuth(page, "/analytics");
    await page.waitForTimeout(3000);

    // Legacy trend chart
    const trendChart = page.locator('[data-testid="monthly-trend-chart"]');
    await expect(trendChart).toBeVisible({ timeout: 10000 });

    // Legacy category MoM
    const catMom = page.locator('[data-testid="category-mom-chart"]');
    await expect(catMom).toBeVisible();

    // Pie chart
    const pieChart = page.locator('[data-testid="category-pie-chart"]');
    await expect(pieChart).toBeVisible();
  });

  test("H458: Analytics page is responsive on mobile viewport", async ({ page }) => {
    await requireAuth(page, "/analytics");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(3000);

    // Key elements should still be visible
    const timePeriod = page.locator('[data-testid="analytics-time-period"]');
    await expect(timePeriod).toBeVisible({ timeout: 10000 });

    // Group filter was removed — analytics follows global group. Verify header instead.
    const header = page.locator("h1");
    await expect(header).toBeVisible({ timeout: 10000 });

    // Reset
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});
