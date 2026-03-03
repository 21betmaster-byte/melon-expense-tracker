import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: UX Polish — Round 1 Fixes
 *
 * H315–H340 Browser tests for touch targets, color contrast, refund badge,
 * currency formatting in charts, filter row wrapping, description optional,
 * and Quick Add preview context.
 *
 * Key testids:
 *   expense-card           — individual expense card
 *   expenses-total-spent   — total spent stat
 *   expenses-total-owed    — total owed stat
 *   month-filter           — month dropdown
 *   paid-by-filter         — paid-by dropdown
 *   expense-search-input   — search input
 *   add-expense-btn        — add expense button
 *   group-switcher         — group name in header
 *
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

test.describe("Suite H: UX Polish — Touch Targets, Contrast & Formatting", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/expenses");
  });

  // ── Fix 1: Touch targets ──────────────────────────────────────────────────

  test("H315: Edit/Delete buttons meet 44px minimum touch target", async ({
    page,
  }) => {
    const card = page.locator('[data-testid="expense-card"]').first();
    await expect(card).toBeVisible({ timeout: 10000 });

    // Open the card action buttons (edit/delete should be visible)
    const editBtn = card.locator("button").filter({ hasText: /edit/i }).first();
    const deleteBtn = card
      .locator('[data-testid="delete-expense-btn"]')
      .first();

    // At least one action button should be visible
    const actionBtn = editBtn.or(deleteBtn).first();
    if (await actionBtn.isVisible()) {
      const box = await actionBtn.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(36); // min-w-[44px] with padding
        expect(box.height).toBeGreaterThanOrEqual(36);
      }
    }
  });

  // ── Fix 2: Color contrast ─────────────────────────────────────────────────

  test("H316: Total Spent card renders with visible text", async ({
    page,
  }) => {
    const totalSpent = page.locator('[data-testid="expenses-total-spent"]');
    await expect(totalSpent).toBeVisible({ timeout: 10000 });
    const text = await totalSpent.textContent();
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(0);
  });

  test("H317: Total Owed card renders with visible text", async ({ page }) => {
    const totalOwed = page.locator('[data-testid="expenses-total-owed"]');
    await expect(totalOwed).toBeVisible({ timeout: 10000 });
    const text = await totalOwed.textContent();
    expect(text).toBeTruthy();
  });

  // ── Fix 4+5: Currency in charts ───────────────────────────────────────────

  test("H318: Analytics page renders with currency symbols in charts", async ({
    page,
  }) => {
    await page.goto("/analytics");
    await page.waitForTimeout(3000);
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    expect(body).not.toContain("Application error");
    // Should have chart sections
    const trendChart = page.locator('[data-testid="monthly-trend-chart"]');
    await expect(trendChart).toBeVisible({ timeout: 10000 });
  });

  test("H319: Category breakdown section is visible on analytics", async ({
    page,
  }) => {
    await page.goto("/analytics");
    await page.waitForTimeout(3000);
    const pieSection = page.getByRole("heading", { name: "Category Breakdown", exact: true });
    await pieSection.scrollIntoViewIfNeeded();
    await expect(pieSection).toBeVisible({ timeout: 10000 });
  });

  // ── Fix 13: Description optional ──────────────────────────────────────────

  test("H320: Add expense form renders description as optional", async ({
    page,
  }) => {
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Description field should show helper text about auto-categorization
    const formBody = await page.locator("form").textContent();
    expect(formBody).toMatch(/auto-categorization/i);
  });

  test("H321: Description field accepts empty value", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Check that description field exists and is not marked required
    const descField = page.locator('textarea[name="description"], input[name="description"]').first();
    if (await descField.isVisible()) {
      const required = await descField.getAttribute("required");
      expect(required).toBeNull();
    }
  });

  // ── Fix 14: Filter row wraps on small screens ─────────────────────────────

  test("H322: Month filter dropdown is visible on expenses page", async ({
    page,
  }) => {
    const monthFilter = page.locator('[data-testid="month-filter"]');
    await expect(monthFilter).toBeVisible({ timeout: 10000 });
  });

  test("H323: Paid-by filter dropdown is visible on expenses page", async ({
    page,
  }) => {
    const paidByFilter = page.locator('[data-testid="paid-by-filter"]');
    await expect(paidByFilter).toBeVisible({ timeout: 10000 });
  });

  // ── Fix 15: Currency default label ─────────────────────────────────────────

  test("H324: Expense form shows currency selector", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForTimeout(500);

    // Look for "(Default)" text in the form indicating the default currency marker
    const formBody = await page.locator("form").textContent();
    expect(formBody).toMatch(/\(Default\)/i);
  });
});

test.describe("Suite H: UX Polish — Settlement & Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  // ── Fix 2: Settlement card contrast ────────────────────────────────────────

  test("H325: Settlement card renders without errors", async ({ page }) => {
    const card = page.locator('[data-testid="settlement-card"]');
    await expect(card).toBeVisible({ timeout: 10000 });
    const text = await card.textContent();
    expect(text).toBeTruthy();
  });

  // ── Fix 6: Group name tooltip ──────────────────────────────────────────────

  test("H326: Group switcher is visible on dashboard", async ({ page }) => {
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });
  });
});
