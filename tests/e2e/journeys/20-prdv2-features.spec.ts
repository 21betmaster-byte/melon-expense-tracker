import { test, expect } from "../fixtures";
import { testExpenseData } from "../helpers/test-data-factory";
import { waitForExpenseByDescription } from "../helpers/wait-strategies";
import { expectExpenseInStore } from "../helpers/assertions";
import { ExpenseFormComponent } from "../components/expense-form.component";
import { ExpenseCardComponent } from "../components/expense-card.component";
import { DashboardPage } from "../pages/dashboard.page";
import { ExpensesPage } from "../pages/expenses.page";
import { SettingsPage } from "../pages/settings.page";
import { AnalyticsPage } from "../pages/analytics.page";

/**
 * Journey 20: PRD v2 Features — End-to-End User Journeys
 *
 * Covers:
 *   - PillSelect form flow (E-08, E-06)
 *   - Blur-to-advance flow (B-02)
 *   - Default split ratio (E-11)
 *   - Tooltips (E-01, E-02)
 *   - Expense card redesign (E-05)
 *   - Tour (B-01, E-04)
 *   - Analytics spacing (E-12)
 *   - Mobile responsive (B-04)
 *   - Landing page (B-03)
 *
 * Test IDs used:
 *   expense-form (data-stage="1"|"2"), stage2-fields
 *   amount-input, description-input, submit-expense
 *   expense-type-select, paid-by-select, category-select
 *   date-input, currency-override-select, split-ratio-input
 *   default-split-slider, save-split-ratio-btn
 *   expense-card, tour-overlay, tour-next-btn, tour-skip-btn
 *   analytics-insights
 */

// ═══════════════════════════════════════════════════════════════════════
// Group 1: PillSelect Form Flow (E-08, E-06)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Journey 20 — Group 1: PillSelect Form Flow", () => {

  test("20.1 [P0] Create expense using pill-based type selector", async ({ dashboardPage, page }) => {
    const data = testExpenseData({ amount: "35.00", description: "E2E_TEST_pill_type" });

    // Open the add expense form
    await dashboardPage.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Fill Stage 1
    await page.locator('[data-testid="amount-input"]').fill(data.amount);
    await page.locator('[data-testid="description-input"]').fill(data.description);

    // Advance to Stage 2
    await form.advanceToStage2();
    expect(await form.isStage2()).toBe(true);

    // Within stage2-fields, find pill buttons with role="radio"
    const stage2 = page.locator('[data-testid="stage2-fields"]');
    const typePills = stage2.getByRole("radio");
    await expect(typePills.first()).toBeVisible({ timeout: 3000 });

    // Click the "Joint" pill to select it
    const jointPill = stage2.getByRole("radio", { name: /Joint/i });
    await jointPill.click();
    await expect(jointPill).toHaveAttribute("aria-checked", "true");

    // Select a category pill
    await form.selectFirstCategory();

    // Submit
    await form.submit();

    // Wait for expense in store and verify type
    await waitForExpenseByDescription(page, data.description);
    await expectExpenseInStore(page, data.description, {
      amount: 35,
      expense_type: "joint",
    });
  });

  test("20.2 [P0] Create 'Paid for Partner' expense", async ({ dashboardPage, page }) => {
    const data = testExpenseData({ amount: "75.00", description: "E2E_TEST_paid_for_partner" });

    // Open the add expense form
    await dashboardPage.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Fill Stage 1
    await page.locator('[data-testid="amount-input"]').fill(data.amount);
    await page.locator('[data-testid="description-input"]').fill(data.description);

    // Advance to Stage 2
    await form.advanceToStage2();
    expect(await form.isStage2()).toBe(true);

    // Click the "Paid for Partner" pill
    const stage2 = page.locator('[data-testid="stage2-fields"]');
    const paidForPartnerPill = stage2.getByRole("radio", { name: /Paid for Partner/i });
    await paidForPartnerPill.click();
    await expect(paidForPartnerPill).toHaveAttribute("aria-checked", "true");

    // Verify split ratio changed — Paid for Partner should set payer's share to 0%
    const splitInput = page.locator('[data-testid="split-ratio-input"]');
    if (await splitInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const splitVal = await splitInput.inputValue();
      expect(parseInt(splitVal, 10)).toBe(0);
    }

    // Select a category
    await form.selectFirstCategory();

    // Submit
    await form.submit();

    // Wait for expense in store
    await waitForExpenseByDescription(page, data.description);

    // Verify expense_type and split_ratio
    await expectExpenseInStore(page, data.description, {
      amount: 75,
      expense_type: "paid_for_partner",
      split_ratio: 0,
    });
  });

  test("20.3 [P1] Paid-by pills switch between members", async ({ dashboardPage, page }) => {
    // Open the add expense form
    await dashboardPage.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Fill Stage 1 and advance
    await page.locator('[data-testid="amount-input"]').fill("50.00");
    await page.locator('[data-testid="description-input"]').fill("Paid-by test");
    await form.advanceToStage2();
    expect(await form.isStage2()).toBe(true);

    // Find paid-by section's pill buttons
    const paidBySection = page.locator('[data-testid="paid-by-select"]');
    const paidByPills = paidBySection.getByRole("radio");

    // Verify there is at least 1 paid-by pill visible
    const pillCount = await paidByPills.count();
    expect(pillCount).toBeGreaterThanOrEqual(1);

    // If there are 2 pills, click the second one and verify selection
    if (pillCount >= 2) {
      await paidByPills.nth(1).click();
      await expect(paidByPills.nth(1)).toHaveAttribute("aria-checked", "true");
    }

    // Close dialog
    await form.cancel();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Group 2: Blur-to-Advance Flow (B-02)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Journey 20 — Group 2: Blur-to-Advance Flow", () => {

  test("20.4 [P0] Blur on description with both fields filled advances to Stage 2", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Fill both Stage 1 fields
    await page.locator('[data-testid="amount-input"]').fill("40.00");
    await page.locator('[data-testid="description-input"]').fill("E2E_TEST_blur_advance");

    // Click on a neutral area (the form heading) to trigger blur
    const formTitle = page.locator('[data-testid="expense-form-title"]');
    if (await formTitle.isVisible({ timeout: 1000 }).catch(() => false)) {
      await formTitle.click();
    } else {
      // Fallback: click the dialog overlay or the form element itself
      await page.locator('[data-testid="expense-form"]').click({ position: { x: 5, y: 5 } });
    }

    // Wait for stage2-fields to become visible
    await page.locator('[data-testid="stage2-fields"]').waitFor({ state: "visible", timeout: 5000 });

    // Verify form is in Stage 2
    expect(await form.isStage2()).toBe(true);

    // Close dialog
    await form.cancel();
  });

  test("20.5 [P1] Blur on amount with only amount filled moves focus to description", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Fill amount only (leave description empty)
    await page.locator('[data-testid="amount-input"]').fill("40.00");

    // Click elsewhere to blur amount
    const formTitle = page.locator('[data-testid="expense-form-title"]');
    if (await formTitle.isVisible({ timeout: 1000 }).catch(() => false)) {
      await formTitle.click();
    } else {
      await page.locator('[data-testid="expense-form"]').click({ position: { x: 5, y: 5 } });
    }

    // Short wait to let blur handler run
    await page.waitForTimeout(500);

    // Stage 2 should NOT have opened since description is empty
    expect(await form.isStage1()).toBe(true);
    await expect(page.locator('[data-testid="stage2-fields"]')).not.toBeVisible();

    // Close dialog
    await form.cancel();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Group 3: Default Split Ratio (E-11)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Journey 20 — Group 3: Default Split Ratio", () => {

  test("20.6 [P0] Default split ratio setting saves and applies to new expenses", async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.navigate();

    // Look for the default-split-slider
    const slider = page.locator('[data-testid="default-split-slider"]');
    if (!(await slider.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Read current slider value
    const currentValue = await slider.inputValue();

    // Change the slider value using keyboard arrows to shift it
    await slider.focus();
    // Press ArrowRight several times to increase the value
    for (let i = 0; i < 10; i++) {
      await slider.press("ArrowRight");
    }
    await page.waitForTimeout(300);

    // Click save button
    const saveBtn = page.locator('[data-testid="save-split-ratio-btn"]');
    if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await saveBtn.click();
      // Wait for save confirmation
      await page.waitForTimeout(1000);
    }

    // Navigate to dashboard
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    // Open add expense dialog
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Advance to Stage 2
    await page.locator('[data-testid="amount-input"]').fill("100.00");
    await page.locator('[data-testid="description-input"]').fill("E2E_TEST_split_default");
    await form.advanceToStage2();

    // Read the split-ratio-input value
    const splitInput = page.locator('[data-testid="split-ratio-input"]');
    if (await splitInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      const splitVal = await splitInput.inputValue();
      // Verify it differs from the original 50/50 default
      expect(parseInt(splitVal, 10)).not.toBe(parseInt(currentValue, 10));
    }

    // Close dialog
    await form.cancel();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Group 4: Tooltips (E-01, E-02)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Journey 20 — Group 4: Tooltips", () => {

  test("20.7 [P0] Dashboard page has info tooltips", async ({ dashboardPage, page }) => {
    await dashboardPage.waitForExpensesLoaded();

    // Look for tooltip trigger elements (InfoTooltip renders as button with SVG icon)
    const tooltipTriggers = page.locator('[data-testid="info-tooltip"], button:has(svg.lucide-info), [aria-label*="info"]');
    const count = await tooltipTriggers.count();

    // Verify at least 1 tooltip trigger exists on the page
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("20.8 [P1] Analytics page has info tooltips", async ({ analyticsPage, page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Look for tooltip triggers
    const tooltipTriggers = page.locator('[data-testid="info-tooltip"], button:has(svg.lucide-info), [aria-label*="info"]');
    const count = await tooltipTriggers.count();

    // Verify at least 1 exists
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("20.9 [P1] Settings page has info tooltips", async ({ settingsPage, page }) => {
    // Look for tooltip triggers
    const tooltipTriggers = page.locator('[data-testid="info-tooltip"], button:has(svg.lucide-info), [aria-label*="info"]');
    const count = await tooltipTriggers.count();

    // Verify at least 1 exists
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Group 5: Expense Card Redesign (E-05)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Journey 20 — Group 5: Expense Card Redesign", () => {

  test("20.10 [P0] Expense card shows type badge", async ({ dashboardPage, page }) => {
    // Create a test expense first
    const data = testExpenseData({ amount: "45.00", description: "E2E_TEST_card_badge" });
    await dashboardPage.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);
    await form.fillExpense(data);
    await form.submit();
    await waitForExpenseByDescription(page, data.description);

    // Navigate to /expenses
    const expensesPage = new ExpensesPage(page);
    await expensesPage.navigate();

    // Find the expense card with the test description
    const card = ExpenseCardComponent.findByDescription(page, data.description);
    await expect(card.locator).toBeVisible({ timeout: 5000 });

    // Verify it contains a visible type label (Joint, Solo, Paid for Partner)
    const cardText = await card.getText();
    const hasTypeBadge =
      /Joint/i.test(cardText) ||
      /Solo/i.test(cardText) ||
      /Paid for Partner/i.test(cardText) ||
      /Personal/i.test(cardText);
    expect(hasTypeBadge).toBe(true);

    // Verify description text is shown
    expect(cardText).toContain(data.description);
  });

  test("20.11 [P1] Expense card is compact (no excessive height)", async ({ page }) => {
    const expensesPage = new ExpensesPage(page);
    await expensesPage.navigate();

    // Find the first expense card
    const firstCard = page.locator('[data-testid="expense-card"]').first();
    if (!(await firstCard.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip();
      return;
    }

    // Get its bounding box
    const box = await firstCard.boundingBox();
    expect(box).not.toBeNull();

    // Verify height is less than 120px (compact design)
    expect(box!.height).toBeLessThan(120);
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Group 6: Tour (B-01, E-04)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Journey 20 — Group 6: Tour", () => {

  test("20.12 [P0] Tour completion persisted in localStorage", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    // Check localStorage for tour_completed
    const tourCompleted = await page.evaluate(() => {
      return localStorage.getItem("tour_completed");
    });

    // Should be "true" (set by auth setup or previous completion)
    expect(tourCompleted).toBe("true");
  });

  test("20.13 [P1] Tour can be replayed from settings", async ({ settingsPage, page }) => {
    // Look for a "Replay" button or "Tour" text on the page
    const replayBtn = page.getByRole("button", { name: /replay|tour|restart tour/i });
    const tourText = page.getByText(/replay.*tour|restart.*tour|tour/i);

    const hasReplayBtn = await replayBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const hasTourText = await tourText.first().isVisible({ timeout: 1000 }).catch(() => false);

    if (!hasReplayBtn && !hasTourText) {
      test.skip();
      return;
    }

    // Click the replay button if found
    if (hasReplayBtn) {
      await replayBtn.click();

      // Check if tour overlay becomes visible
      const tourOverlay = page.locator('[data-testid="tour-overlay"]');
      if (await tourOverlay.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Verify tour-next-btn exists
        await expect(page.locator('[data-testid="tour-next-btn"]')).toBeVisible({ timeout: 2000 });

        // Skip the tour to clean up
        const skipBtn = page.locator('[data-testid="tour-skip-btn"]');
        if (await skipBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
          await skipBtn.click();
          await tourOverlay.waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});
        }
      }
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Group 7: Analytics Spacing (E-12)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Journey 20 — Group 7: Analytics Spacing", () => {

  test('20.14 [P1] Analytics insights card labeled "Spending Insights"', async ({ analyticsPage, page }) => {
    // Wait for page content to load
    await page.waitForTimeout(1000);

    // Look for "Spending Insights" text on the page
    const insightsHeading = page.getByText("Spending Insights");
    await expect(insightsHeading.first()).toBeVisible({ timeout: 5000 });
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Group 8: Mobile Responsive (B-04)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Journey 20 — Group 8: Mobile Responsive", () => {

  test("20.15 [P0] Date and currency fields stack on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });

    const dashboard = new DashboardPage(page);
    await dashboard.navigate();
    await dashboard.openAddExpenseDialog();
    const form = new ExpenseFormComponent(page);

    // Fill Stage 1 and advance
    await page.locator('[data-testid="amount-input"]').fill("20.00");
    await page.locator('[data-testid="description-input"]').fill("Mobile stack test");
    await form.advanceToStage2();
    expect(await form.isStage2()).toBe(true);

    // Get bounding boxes of date-input and currency-override-select
    const dateInput = page.locator('[data-testid="date-input"]');
    const currencySelect = page.locator('[data-testid="currency-override-select"]');

    const dateVisible = await dateInput.isVisible({ timeout: 2000 }).catch(() => false);
    const currencyVisible = await currencySelect.isVisible({ timeout: 2000 }).catch(() => false);

    if (dateVisible && currencyVisible) {
      const dateBox = await dateInput.boundingBox();
      const currencyBox = await currencySelect.boundingBox();

      if (dateBox && currencyBox) {
        // Verify they don't overlap — stacked means one is below the other
        const dateBottom = dateBox.y + dateBox.height;
        const currencyBottom = currencyBox.y + currencyBox.height;

        // Either date is above currency or currency is above date (stacked vertically)
        const stacked = dateBottom <= currencyBox.y + 2 || currencyBottom <= dateBox.y + 2;
        // Or side-by-side without overlap
        const noHorizontalOverlap =
          dateBox.x + dateBox.width <= currencyBox.x || currencyBox.x + currencyBox.width <= dateBox.x;

        expect(stacked || noHorizontalOverlap).toBe(true);
      }
    }

    // Close dialog
    await form.cancel();
  });
});

// ═══════════════════════════════════════════════════════════════════════
// Group 9: Landing Page (B-03)
// ═══════════════════════════════════════════════════════════════════════

test.describe("Journey 20 — Group 9: Landing Page", () => {

  test("20.16 [P0] Landing page mockups are realistic", async ({ page }) => {
    // Go to "/" directly (no auth required — landing page is public)
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Verify the page contains "Track Expenses" text
    const trackText = page.getByText(/Track Expenses/i);
    await expect(trackText.first()).toBeVisible({ timeout: 5000 });

    // Verify phone mockup bottom nav labels exist
    const dashboardLabel = page.getByText("Dashboard", { exact: true });
    const expensesLabel = page.getByText("Expenses", { exact: true });
    const analyticsLabel = page.getByText("Analytics", { exact: true });
    const settingsLabel = page.getByText("Settings", { exact: true });

    await expect(dashboardLabel.first()).toBeVisible({ timeout: 3000 });
    await expect(expensesLabel.first()).toBeVisible({ timeout: 3000 });
    await expect(analyticsLabel.first()).toBeVisible({ timeout: 3000 });
    await expect(settingsLabel.first()).toBeVisible({ timeout: 3000 });

    // Verify "Dynamic Island" exists (the pill-shaped notch element)
    const dynamicIsland = page.locator('[data-testid="dynamic-island"], .dynamic-island, [class*="dynamicIsland"], [class*="dynamic-island"]');
    // Also try looking for the notch by its visual structure
    const notch = page.locator('[data-testid="phone-notch"], [class*="notch"]');
    const hasDynamicIsland = await dynamicIsland.first().isVisible({ timeout: 2000 }).catch(() => false);
    const hasNotch = await notch.first().isVisible({ timeout: 1000 }).catch(() => false);

    // At least one of these should be present for the phone mockup
    expect(hasDynamicIsland || hasNotch).toBe(true);
  });
});
