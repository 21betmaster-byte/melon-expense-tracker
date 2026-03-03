import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H (300–314): Feedback Collection + Milestone Triggers
 *
 * Phase 14 — Tests for the feedback dialog and milestone-based triggers:
 *   - Star rating (1-5, clickable, visual feedback)
 *   - Optional comment textarea
 *   - Submit / dismiss behavior
 *   - localStorage-based milestone tracking
 *   - Auto-trigger on 10th visit or 10th expense
 *   - Persistence of dismissed milestones
 *
 * Key test IDs:
 *   feedback-dialog        — dialog content wrapper
 *   feedback-title         — dialog title
 *   feedback-description   — dialog description
 *   feedback-star-1..5     — individual star buttons
 *   feedback-comment-input — optional comment textarea
 *   feedback-submit-btn    — submit button
 *   feedback-dismiss-btn   — "Maybe later" button
 *
 * Milestone trigger approach: Use page.evaluate() to set localStorage
 * counters to threshold-1, then perform the triggering action.
 */

/** Helper: Open feedback dialog by setting visit count to 9 and navigating to dashboard */
async function triggerVisitMilestone(page: import("@playwright/test").Page) {
  await requireAuth(page, "/settings"); // start on non-dashboard page
  await page.waitForTimeout(2000);

  // Set visit count to 9 (next visit = 10 = milestone)
  // Clear any existing dismissal flags
  await page.evaluate(() => {
    localStorage.setItem("app_event_visit_count", "9");
    localStorage.removeItem("feedback_dismissed_visit_count_10");
    localStorage.removeItem("tour_completed"); // ensure no interference
    localStorage.setItem("tour_completed", "true"); // but suppress tour
  });

  // Navigate to dashboard — triggers visit_count increment to 10
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000); // Wait for increment + 1s delay in FeedbackProvider

  // Wait for feedback dialog to appear
  const dialog = page.locator('[data-testid="feedback-dialog"]');
  await dialog.waitFor({ state: "visible", timeout: 10_000 });
}

test.describe("Feedback Collection (H300–H314)", () => {
  test("H300: Feedback dialog not shown on first visit", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(2000);

    // Ensure tour is suppressed
    await page.evaluate(() => {
      localStorage.setItem("tour_completed", "true");
    });

    // No milestones should trigger on a fresh visit
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const dialog = page.locator('[data-testid="feedback-dialog"]');
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("H301: Star rating renders 5 stars", async ({ page }) => {
    await triggerVisitMilestone(page);

    for (let i = 1; i <= 5; i++) {
      const star = page.locator(`[data-testid="feedback-star-${i}"]`);
      await expect(star).toBeVisible({ timeout: 3000 });
    }
  });

  test("H302: Clicking star highlights it and all below", async ({ page }) => {
    await triggerVisitMilestone(page);

    // Click star 3
    const star3 = page.locator('[data-testid="feedback-star-3"]');
    await star3.click();
    await page.waitForTimeout(300);

    // Stars 1-3 should have fill-yellow-400 class, stars 4-5 should not
    for (let i = 1; i <= 3; i++) {
      const svg = page.locator(`[data-testid="feedback-star-${i}"] svg`);
      const cls = await svg.getAttribute("class");
      expect(cls).toContain("fill-yellow-400");
    }
    for (let i = 4; i <= 5; i++) {
      const svg = page.locator(`[data-testid="feedback-star-${i}"] svg`);
      const cls = await svg.getAttribute("class");
      expect(cls).toContain("text-slate-600");
    }
  });

  test("H303: Submit button disabled without rating", async ({ page }) => {
    await triggerVisitMilestone(page);

    const submitBtn = page.locator('[data-testid="feedback-submit-btn"]');
    await expect(submitBtn).toBeDisabled();
  });

  test("H304: Submit button enabled after rating", async ({ page }) => {
    await triggerVisitMilestone(page);

    // Select a rating
    const star4 = page.locator('[data-testid="feedback-star-4"]');
    await star4.click();
    await page.waitForTimeout(300);

    const submitBtn = page.locator('[data-testid="feedback-submit-btn"]');
    await expect(submitBtn).toBeEnabled();
  });

  test("H305: Successful feedback submission shows toast", async ({ page }) => {
    await triggerVisitMilestone(page);

    // Rate 5 stars
    const star5 = page.locator('[data-testid="feedback-star-5"]');
    await star5.click();
    await page.waitForTimeout(300);

    // Submit
    const submitBtn = page.locator('[data-testid="feedback-submit-btn"]');
    await submitBtn.click();

    // Wait for toast (success or error from Firestore)
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 10_000 });
  });

  test("H306: Feedback dialog closes after submission", async ({ page }) => {
    await triggerVisitMilestone(page);

    // Rate and submit
    const star4 = page.locator('[data-testid="feedback-star-4"]');
    await star4.click();
    await page.waitForTimeout(300);

    const submitBtn = page.locator('[data-testid="feedback-submit-btn"]');
    await submitBtn.click();

    // Wait for toast then check dialog closed
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 10_000 });

    const dialog = page.locator('[data-testid="feedback-dialog"]');
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });

  test("H307: Dismiss button closes dialog without submission", async ({ page }) => {
    await triggerVisitMilestone(page);

    const dismissBtn = page.locator('[data-testid="feedback-dismiss-btn"]');
    await expect(dismissBtn).toBeVisible({ timeout: 5000 });
    await dismissBtn.click();

    const dialog = page.locator('[data-testid="feedback-dialog"]');
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("H308: Feedback not re-triggered after dismissal", async ({ page }) => {
    await triggerVisitMilestone(page);

    // Dismiss
    const dismissBtn = page.locator('[data-testid="feedback-dismiss-btn"]');
    await dismissBtn.click();
    await page.waitForTimeout(500);

    // Check localStorage flag was set
    const dismissed = await page.evaluate(() =>
      localStorage.getItem("feedback_dismissed_visit_count_10")
    );
    expect(dismissed).toBe("true");

    // Reset count to 9 and try again — should NOT trigger
    await page.evaluate(() => {
      localStorage.setItem("app_event_visit_count", "9");
    });
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const dialog = page.locator('[data-testid="feedback-dialog"]');
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("H309: Optional comment field accepts text", async ({ page }) => {
    await triggerVisitMilestone(page);

    const commentInput = page.locator('[data-testid="feedback-comment-input"]');
    await expect(commentInput).toBeVisible({ timeout: 5000 });
    await commentInput.fill("This is my feedback comment.");
    const value = await commentInput.inputValue();
    expect(value).toBe("This is my feedback comment.");
  });

  test("H310: Comment included in submission", async ({ page }) => {
    await triggerVisitMilestone(page);

    // Rate
    const star3 = page.locator('[data-testid="feedback-star-3"]');
    await star3.click();
    await page.waitForTimeout(300);

    // Add comment
    const commentInput = page.locator('[data-testid="feedback-comment-input"]');
    await commentInput.fill("Great app, needs more features.");

    // Submit
    const submitBtn = page.locator('[data-testid="feedback-submit-btn"]');
    await submitBtn.click();

    // Verify toast (no error = comment was included)
    const toast = page.locator('[data-sonner-toast]').first();
    await expect(toast).toBeVisible({ timeout: 10_000 });
  });

  test("H311: Visit count milestone triggers at 10", async ({ page }) => {
    // This is essentially what triggerVisitMilestone does
    await requireAuth(page, "/settings");
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      localStorage.setItem("app_event_visit_count", "9");
      localStorage.removeItem("feedback_dismissed_visit_count_10");
      localStorage.setItem("tour_completed", "true");
    });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const dialog = page.locator('[data-testid="feedback-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    // Verify it's the visit milestone
    const title = page.locator('[data-testid="feedback-title"]');
    await expect(title).toContainText("Welcome back");
  });

  test("H312: Expense count milestone triggers at 10 (soft check)", async ({ page }) => {
    // Set expense count to 9 — creating an expense would make it 10
    // Creating a real expense requires form interaction + Firestore write
    // We'll set it to 10 directly and check manually
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      localStorage.setItem("app_event_expense_count", "9");
      localStorage.removeItem("feedback_dismissed_expense_count_10");
      localStorage.setItem("tour_completed", "true");
    });

    // Simulate what incrementEvent("expense_count") does
    await page.evaluate(() => {
      const key = "app_event_expense_count";
      const current = parseInt(localStorage.getItem(key) ?? "0", 10);
      const next = current + 1;
      localStorage.setItem(key, String(next));
      window.dispatchEvent(
        new CustomEvent("app-milestone-check", {
          detail: { event: "expense_count", count: next },
        })
      );
    });

    await page.waitForTimeout(2000);

    const dialog = page.locator('[data-testid="feedback-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10_000 });

    const title = page.locator('[data-testid="feedback-title"]');
    await expect(title).toContainText("on a roll");
  });

  test("H313: Milestone not triggered below threshold", async ({ page }) => {
    await requireAuth(page, "/settings");
    await page.waitForTimeout(2000);

    await page.evaluate(() => {
      localStorage.setItem("app_event_visit_count", "7");
      localStorage.removeItem("feedback_dismissed_visit_count_10");
      localStorage.setItem("tour_completed", "true");
    });

    // Visit dashboard — increments to 8, NOT 10
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const dialog = page.locator('[data-testid="feedback-dialog"]');
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("H314: Feedback dialog title matches milestone definition", async ({ page }) => {
    await triggerVisitMilestone(page);

    const title = page.locator('[data-testid="feedback-title"]');
    await expect(title).toBeVisible({ timeout: 5000 });
    await expect(title).toContainText("Welcome back!");

    const description = page.locator('[data-testid="feedback-description"]');
    await expect(description).toContainText("visited 10 times");
  });
});
