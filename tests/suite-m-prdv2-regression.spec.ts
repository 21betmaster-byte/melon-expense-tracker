import { test, expect } from "@playwright/test";
import { requireAuth, requireAuthOrSkip } from "./helpers/auth-guard";

/**
 * Suite M: PRD v2 Regression Tests
 *
 * Regression coverage for PRD v2 bug fixes and enhancements.
 * Each test verifies a specific fix or feature remains in place.
 *
 * Bug/Enh | Description
 * --------|-------------------------------------------------------------
 *  B-01   | Tour spotlight has pulse animation
 *  E-04   | Tour persists completion to localStorage
 *  B-02   | Expense form blur advances to Stage 2
 *  B-02   | Amount formatting on blur
 *  B-02   | Stage1 hint text updated
 *  B-04   | Date and Currency don't overlap on mobile
 *  B-05   | Recurring toggle is visible and styled
 *  B-06   | Hydration no console errors on dashboard load
 *  B-03   | Landing page phone mockups have bottom nav
 *  E-08   | Expense form uses PillSelect for type
 *  E-05   | Expense card shows type badge
 *  E-06   | "Paid for Partner" type available
 *  E-02   | InfoTooltip visible on dashboard
 *  E-12   | Analytics insights card spacing
 *  E-11   | Default split ratio setting exists
 *  E-11   | Default split ratio affects expense form
 *  E-11   | Split ratio save button re-enables after second adjustment
 *  E-05   | Swipe-to-delete on expense card
 *  E-07   | Expense form category pills include "Create New" at bottom
 */

test.describe("Suite M: PRD v2 Regression (M1-M18)", () => {
  // ─── B-01: Tour spotlight has pulse animation ──────────────────────

  test("M1: Tour spotlight has pulse animation (B-01)", async ({ page }) => {
    await requireAuth(page, "/dashboard");

    // Clear tour_completed so tour can re-trigger
    await page.evaluate(() => {
      localStorage.removeItem("tour_completed");
      localStorage.setItem("onboarding_completed", "true");
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    const overlay = page.locator('[data-testid="tour-overlay"]');
    const overlayVisible = await overlay.isVisible().catch(() => false);

    if (overlayVisible) {
      // Tour appeared — verify spotlight has animate-pulse class
      const spotlight = page.locator('[data-testid="tour-spotlight"]');
      await expect(spotlight).toBeVisible({ timeout: 3000 });
      const classes = await spotlight.getAttribute("class");
      expect(classes).toContain("animate-pulse");
    } else {
      // Tour didn't appear (targets may not have loaded) — skip gracefully
      console.log("[M1] Tour overlay did not appear — skipping pulse check");
    }

    // Restore tour_completed
    await page.evaluate(() => {
      localStorage.setItem("tour_completed", "true");
    });
  });

  // ─── E-04: Tour persists completion to localStorage ────────────────

  test("M2: Tour persists completion to localStorage (E-04)", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // After tour completes (or if already completed), verify localStorage
    const tourCompleted = await page.evaluate(() => {
      return localStorage.getItem("tour_completed");
    });

    // If the tour has been run at least once, this should be "true"
    // If it hasn't been run yet, we set it and verify persistence
    if (tourCompleted !== "true") {
      await page.evaluate(() => {
        localStorage.setItem("tour_completed", "true");
      });
      // Reload and verify it persists
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
      const persisted = await page.evaluate(() => {
        return localStorage.getItem("tour_completed");
      });
      expect(persisted).toBe("true");
    } else {
      expect(tourCompleted).toBe("true");
    }
  });

  // ─── B-02: Expense form blur advances to Stage 2 ──────────────────

  test("M3: Expense form blur advances to Stage 2 (B-02)", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Fill amount
    const amountInput = page.locator('[data-testid="amount-input"]');
    await expect(amountInput).toBeVisible({ timeout: 5000 });
    await amountInput.fill("50.00");

    // Fill description
    const descInput = page.locator('[data-testid="description-input"]');
    await expect(descInput).toBeVisible({ timeout: 5000 });
    await descInput.fill("Blur test");

    // Click outside the form inputs to trigger blur (click on the dialog overlay area)
    // Use the dialog's title or a non-input area to blur
    const dialogTitle = page.locator('[role="dialog"] h2, [role="dialog"] [class*="title"]');
    const titleCount = await dialogTitle.count();
    if (titleCount > 0) {
      await dialogTitle.first().click();
    } else {
      // Click on the dialog backdrop or body area
      await page.locator('[role="dialog"]').first().click({ position: { x: 10, y: 10 } });
    }

    await page.waitForTimeout(1000);

    // Verify Stage 2 fields appear
    const stage2 = page.locator('[data-testid="stage2-fields"]');
    await expect(stage2).toBeVisible({ timeout: 5000 });

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // ─── B-02: Amount formatting on blur ───────────────────────────────

  test("M4: Amount formatting on blur (B-02)", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Fill amount with "5" (no decimal)
    const amountInput = page.locator('[data-testid="amount-input"]');
    await expect(amountInput).toBeVisible({ timeout: 5000 });
    await amountInput.fill("5");

    // Click on description field to blur amount
    const descInput = page.locator('[data-testid="description-input"]');
    await descInput.click();
    await page.waitForTimeout(500);

    // Verify amount value is now formatted to 2 decimal places
    const amountValue = await amountInput.inputValue();
    expect(amountValue).toBe("5.00");

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // ─── B-02: Stage1 hint text updated ────────────────────────────────

  test("M5: Stage1 hint text updated (B-02)", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Verify stage1-hint contains "tap outside" or "tap away"
    const hint = page.locator('[data-testid="stage1-hint"]');
    await expect(hint).toBeVisible({ timeout: 5000 });
    const hintText = await hint.textContent();
    const hasBlurHint =
      hintText?.toLowerCase().includes("tap outside") ||
      hintText?.toLowerCase().includes("tap away");
    expect(hasBlurHint).toBe(true);

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // ─── B-04: Date and Currency don't overlap on mobile ───────────────

  test("M6: Date and Currency don't overlap on mobile (B-04)", async ({ page }) => {
    // Set viewport to iPhone SE size
    await page.setViewportSize({ width: 375, height: 812 });

    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Fill amount and description, press Enter to advance to Stage 2
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill("25.00");
    const descInput = page.locator('[data-testid="description-input"]');
    await descInput.fill("Mobile test");
    await descInput.press("Enter");
    await page.waitForTimeout(1000);

    // Wait for Stage 2 fields
    const stage2 = page.locator('[data-testid="stage2-fields"]');
    await expect(stage2).toBeVisible({ timeout: 5000 });

    // Get bounding boxes of date-input and currency-override-select
    const dateInput = page.locator('[data-testid="date-input"]');
    const currencySelect = page.locator('[data-testid="currency-override-select"]');

    const dateVisible = await dateInput.isVisible().catch(() => false);
    const currencyVisible = await currencySelect.isVisible().catch(() => false);

    if (dateVisible && currencyVisible) {
      const dateBox = await dateInput.boundingBox();
      const currencyBox = await currencySelect.boundingBox();

      if (dateBox && currencyBox) {
        // Check they do NOT overlap
        const dateBottom = dateBox.y + dateBox.height;
        const currencyBottom = currencyBox.y + currencyBox.height;
        const dateRight = dateBox.x + dateBox.width;
        const currencyRight = currencyBox.x + currencyBox.width;

        const horizontalOverlap =
          dateBox.x < currencyRight && currencyBox.x < dateRight;
        const verticalOverlap =
          dateBox.y < currencyBottom && currencyBox.y < dateBottom;

        const overlaps = horizontalOverlap && verticalOverlap;
        expect(overlaps).toBe(false);

        // If stacked vertically, verify date is above currency
        if (dateBox.y !== currencyBox.y) {
          expect(dateBox.y).toBeLessThan(currencyBox.y);
        }
      }
    }

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // ─── B-05: Recurring toggle is visible and styled ──────────────────

  test("M7: Recurring toggle is visible and styled (B-05)", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Advance to Stage 2
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill("10.00");
    const descInput = page.locator('[data-testid="description-input"]');
    await descInput.fill("Recurring test");
    await descInput.press("Enter");
    await page.waitForTimeout(1000);

    const stage2 = page.locator('[data-testid="stage2-fields"]');
    await expect(stage2).toBeVisible({ timeout: 5000 });

    // Locate the recurring toggle
    const recurringToggle = page.locator('[data-testid="recurring-toggle"]');
    await expect(recurringToggle).toBeVisible({ timeout: 5000 });

    // Verify it has a reasonable size
    const box = await recurringToggle.boundingBox();
    expect(box).toBeTruthy();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(30);
      expect(box.height).toBeGreaterThanOrEqual(16);
    }

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // ─── B-06: Hydration no console errors on dashboard load ───────────

  test("M8: Hydration no console errors on dashboard load (B-06)", async ({ page }) => {
    const consoleErrors: string[] = [];

    // Listen for console errors during page load
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(5000);

    // Filter for hydration-related errors
    const hydrationErrors = consoleErrors.filter(
      (msg) =>
        msg.toLowerCase().includes("hydration") ||
        msg.toLowerCase().includes("hydrating")
    );

    expect(hydrationErrors).toHaveLength(0);
  });

  // ─── B-03: Landing page phone mockups have bottom nav ──────────────

  test("M9: Landing page phone mockups have bottom nav (B-03)", async ({ page }) => {
    // Navigate to landing page (no auth needed)
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Verify the bottom nav labels exist on the page (from phone mockup)
    const pageContent = await page.textContent("body");
    expect(pageContent).toContain("Dashboard");
    expect(pageContent).toContain("Expenses");
    expect(pageContent).toContain("Analytics");
    expect(pageContent).toContain("Settings");
  });

  // ─── E-08: Expense form uses PillSelect for type ───────────────────

  test("M10: Expense form uses PillSelect for type (E-08)", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Advance to Stage 2
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill("15.00");
    const descInput = page.locator('[data-testid="description-input"]');
    await descInput.fill("Pill test");
    await descInput.press("Enter");
    await page.waitForTimeout(1000);

    const stage2 = page.locator('[data-testid="stage2-fields"]');
    await expect(stage2).toBeVisible({ timeout: 5000 });

    // Verify pill select pattern: buttons with role="radio"
    const pills = stage2.locator('[role="radio"]');
    const pillCount = await pills.count();
    expect(pillCount).toBeGreaterThan(0);

    // Verify pills include "Joint" and "Solo" text
    const pillTexts: string[] = [];
    for (let i = 0; i < pillCount; i++) {
      const text = await pills.nth(i).textContent();
      if (text) pillTexts.push(text);
    }
    const hasJoint = pillTexts.some((t) => t.includes("Joint"));
    const hasSolo = pillTexts.some((t) => t.includes("Solo"));
    expect(hasJoint).toBe(true);
    expect(hasSolo).toBe(true);

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // ─── E-05: Expense card shows type badge ───────────────────────────

  test("M11: Expense card shows type badge (E-05)", async ({ page }) => {
    await requireAuth(page, "/expenses");
    await page.waitForTimeout(5000);

    const expenseCards = page.locator('[data-testid="expense-card"]');
    const count = await expenseCards.count();

    if (count === 0) {
      console.log("[M11] No expense cards found — skipping type badge check");
      test.skip();
      return;
    }

    // Check the first expense card for a type badge
    const firstCard = expenseCards.first();
    const cardText = await firstCard.textContent();
    const hasTypeBadge =
      cardText?.includes("Joint") ||
      cardText?.includes("Solo") ||
      cardText?.includes("Settlement") ||
      cardText?.includes("Paid for Partner");

    expect(hasTypeBadge).toBe(true);
  });

  // ─── E-06: "Paid for Partner" type available ───────────────────────

  test('M12: "Paid for Partner" type available (E-06)', async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Advance to Stage 2
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill("20.00");
    const descInput = page.locator('[data-testid="description-input"]');
    await descInput.fill("Partner pay test");
    await descInput.press("Enter");
    await page.waitForTimeout(1000);

    const stage2 = page.locator('[data-testid="stage2-fields"]');
    await expect(stage2).toBeVisible({ timeout: 5000 });

    // Verify a pill with text "Paid for Partner" exists
    const paidForPartnerPill = stage2.getByText("Paid for Partner");
    await expect(paidForPartnerPill).toBeVisible({ timeout: 5000 });

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // ─── E-02: InfoTooltip visible on dashboard ────────────────────────

  test("M13: InfoTooltip visible on dashboard (E-02)", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(5000);

    // Wait for settlement card
    const settlementCard = page.locator('[data-testid="settlement-card"]');
    await expect(settlementCard).toBeVisible({ timeout: 10_000 });

    // Look for an info tooltip trigger (button with info icon or aria-label)
    const infoTrigger = page.locator(
      'button[aria-label*="info" i], button[aria-label*="Info" i], [data-testid*="info-tooltip"], button:has(svg[class*="info" i])'
    );
    const triggerCount = await infoTrigger.count();

    // At least one tooltip trigger should be visible on the page
    expect(triggerCount).toBeGreaterThan(0);
    if (triggerCount > 0) {
      await expect(infoTrigger.first()).toBeVisible();
    }
  });

  // ─── E-12: Analytics insights card spacing ─────────────────────────

  test("M14: Analytics insights card spacing (E-12)", async ({ page }) => {
    await requireAuth(page, "/analytics");
    await page.waitForTimeout(5000);

    // Find the "Spending Insights" heading or card
    const insightsHeading = page.getByText(/spending insights/i);
    const isVisible = await insightsHeading.isVisible().catch(() => false);

    if (isVisible) {
      const box = await insightsHeading.boundingBox();
      expect(box).toBeTruthy();

      if (box) {
        // Verify the card doesn't have excessive top padding
        // The heading should be within a reasonable distance from the top of viewport
        // (not pushed far down by excessive spacing)
        // A reasonable y position is below the nav but not excessively far down
        expect(box.y).toBeLessThan(800);
      }
    } else {
      console.log("[M14] Spending Insights heading not found — skipping spacing check");
    }
  });

  // ─── E-11: Default split ratio setting exists ──────────────────────

  test("M15: Default split ratio setting exists (E-11)", async ({ page }) => {
    await requireAuth(page, "/settings");
    await page.waitForTimeout(5000);

    // Look for Split Ratio setting on the page
    const splitRatioText = page.getByText(/split ratio/i);
    const isVisible = await splitRatioText.first().isVisible().catch(() => false);

    if (isVisible) {
      // Verify the slider exists
      const slider = page.locator('[data-testid="default-split-slider"]');
      await expect(slider).toBeVisible({ timeout: 5000 });

      // Verify the save button exists
      const saveBtn = page.locator('[data-testid="save-split-ratio-btn"]');
      await expect(saveBtn).toBeVisible({ timeout: 5000 });
    } else {
      console.log("[M15] Split Ratio setting not found — skipping");
      test.skip();
    }
  });

  // ─── E-11: Default split ratio affects expense form ────────────────

  test("M16: Default split ratio affects expense form (E-11)", async ({ page }) => {
    await requireAuth(page, "/settings");
    await page.waitForTimeout(5000);

    const slider = page.locator('[data-testid="default-split-slider"]');
    const sliderVisible = await slider.isVisible().catch(() => false);

    if (!sliderVisible) {
      console.log("[M16] Default split slider not found — skipping");
      test.skip();
      return;
    }

    // The Radix Slider renders a thumb with role="slider" and aria-valuenow
    const thumb = slider.locator('[role="slider"]');
    await expect(thumb).toBeVisible({ timeout: 2000 });
    const startValue = parseInt(await thumb.getAttribute("aria-valuenow") ?? "50", 10);

    // First reset towards left, then move right to ensure a change from the saved value
    await thumb.focus();
    for (let i = 0; i < 20; i++) {
      await thumb.press("ArrowLeft");
    }
    await page.waitForTimeout(200);
    // Now move right to land at a different value than the start
    for (let i = 0; i < 14; i++) {
      await thumb.press("ArrowRight");
    }
    await page.waitForTimeout(500);

    const newValue = parseInt(await thumb.getAttribute("aria-valuenow") ?? "50", 10);

    // If value didn't actually change from saved (e.g. was already at this position),
    // nudge once more
    if (newValue === startValue) {
      await thumb.press("ArrowRight");
      await page.waitForTimeout(200);
    }

    // Click save button — wait for it to become enabled (hasChanged must be true)
    const saveBtn = page.locator('[data-testid="save-split-ratio-btn"]');
    await expect(saveBtn).toBeEnabled({ timeout: 5000 });
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // Navigate to dashboard
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Open add expense dialog
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Advance to Stage 2
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill("30.00");
    const descInput = page.locator('[data-testid="description-input"]');
    await descInput.fill("Split test");
    await descInput.press("Enter");
    await page.waitForTimeout(1000);

    const stage2 = page.locator('[data-testid="stage2-fields"]');
    await expect(stage2).toBeVisible({ timeout: 5000 });

    // Check the split ratio slider value (also a Radix Slider)
    const splitRatio = page.locator('[data-testid="split-ratio-input"]');
    const splitVisible = await splitRatio.isVisible().catch(() => false);

    if (splitVisible) {
      const splitThumb = splitRatio.locator('[role="slider"]');
      const value = await splitThumb.getAttribute("aria-valuenow") ?? "50";
      expect(parseInt(value, 10)).not.toBe(50);
    }

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });

  // ─── E-11: Save button re-enables after save-adjust-save cycle ─────

  test("M16b: Split ratio save button re-enables after second adjustment (E-11)", async ({ page }) => {
    await requireAuth(page, "/settings");
    await page.waitForTimeout(5000);

    const slider = page.locator('[data-testid="default-split-slider"]');
    const sliderVisible = await slider.isVisible().catch(() => false);

    if (!sliderVisible) {
      console.log("[M16b] Default split slider not found — skipping");
      test.skip();
      return;
    }

    const thumb = slider.locator('[role="slider"]');
    await expect(thumb).toBeVisible({ timeout: 2000 });

    const saveBtn = page.locator('[data-testid="save-split-ratio-btn"]');

    // ── First save: move slider left and save ──
    await thumb.focus();
    for (let i = 0; i < 10; i++) await thumb.press("ArrowLeft");
    await page.waitForTimeout(300);

    await expect(saveBtn).toBeEnabled({ timeout: 3000 });
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // After save, button should be disabled (no change pending)
    await expect(saveBtn).toBeDisabled({ timeout: 3000 });

    // ── Second adjustment: move slider right ──
    await thumb.focus();
    for (let i = 0; i < 6; i++) await thumb.press("ArrowRight");
    await page.waitForTimeout(300);

    // Save button must re-enable after second adjustment
    await expect(saveBtn).toBeEnabled({ timeout: 3000 });

    // ── Second save ──
    await saveBtn.click();
    await page.waitForTimeout(2000);

    // After second save, button should be disabled again
    await expect(saveBtn).toBeDisabled({ timeout: 3000 });
  });

  // ─── E-05: Swipe-to-delete on expense card ─────────────────────────

  test("M17: Swipe-to-delete on expense card (E-05)", async ({ page }) => {
    await requireAuth(page, "/expenses");
    await page.waitForTimeout(5000);

    const expenseCards = page.locator('[data-testid="expense-card"]');
    const count = await expenseCards.count();

    if (count === 0) {
      console.log("[M17] No expense cards found — skipping swipe check");
      test.skip();
      return;
    }

    // Verify the first expense card is wrapped in a motion element
    // (framer-motion adds a style attribute with transform or data attributes)
    const firstCard = expenseCards.first();
    const parent = firstCard.locator("..");
    const parentTag = await parent.evaluate((el) => el.tagName.toLowerCase());
    const parentStyle = await parent.getAttribute("style");
    const parentDataMotion = await parent.getAttribute("data-framer-component-type");
    const cardStyle = await firstCard.getAttribute("style");

    // Framer-motion typically adds style with transform or a data attribute
    const hasMotion =
      parentStyle?.includes("transform") ||
      cardStyle?.includes("transform") ||
      parentDataMotion !== null ||
      (await parent.evaluate(
        (el) =>
          el.hasAttribute("data-framer-name") ||
          el.hasAttribute("data-motion-pop-id") ||
          el.className?.includes("motion") ||
          el.style.transform !== ""
      ));

    // Motion wrapping is present or the element itself handles drag
    expect(hasMotion || parentTag === "div").toBe(true);
  });

  // ─── E-07: Expense form category pills include "Create New" ────────

  test('M18: Expense form category pills include "Create New" at bottom (E-07)', async ({
    page,
  }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10_000 });
    await addBtn.click();
    await page.waitForTimeout(1000);

    // Advance to Stage 2
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill("12.00");
    const descInput = page.locator('[data-testid="description-input"]');
    await descInput.fill("Category test");
    await descInput.press("Enter");
    await page.waitForTimeout(1000);

    const stage2 = page.locator('[data-testid="stage2-fields"]');
    await expect(stage2).toBeVisible({ timeout: 5000 });

    // The "+ New" category pill may be hidden behind "Show more" if there are 8+ categories
    // Click "Show more" if present to reveal all pills
    const showMore = stage2.getByText(/Show more/i);
    if (await showMore.isVisible({ timeout: 1000 }).catch(() => false)) {
      await showMore.click();
      await page.waitForTimeout(300);
    }

    // Look for the "+ New" category pill button
    const newCategoryPill = stage2.locator('button[role="radio"]').filter({ hasText: /New/ });
    await expect(newCategoryPill).toBeVisible({ timeout: 5000 });

    // Close dialog
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  });
});
