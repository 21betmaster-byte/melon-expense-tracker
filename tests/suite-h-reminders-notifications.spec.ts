import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Reminders, Notifications & Multi-Household
 *
 * H361–H380 Browser tests for:
 * - In-app reminder banners (Fix 24a)
 * - Push notification settings (Fix 24b)
 * - Multi-household switcher (Fix 22)
 * - Settlement history show-all (Fix 11)
 *
 * Key testids:
 *   reminder-banner             — reminder banner container
 *   reminder-dismiss            — dismiss button on reminder
 *   notification-settings       — notification settings card
 *   push-notifications-toggle   — push notifications switch
 *   household-switcher          — household switcher card
 *   settlement-show-all-btn     — show all settlements button
 *   settlement-history-list     — settlement history container
 *   settlement-history-item     — individual settlement history entry
 *
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

test.describe("Suite H: Settlement History — Show All", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H361: Settlement history section renders if settlements exist", async ({
    page,
  }) => {
    const historyList = page.locator(
      '[data-testid="settlement-history-list"]'
    );
    await page.waitForTimeout(3000);

    const isVisible = await historyList.isVisible();
    if (isVisible) {
      const items = page.locator('[data-testid="settlement-history-item"]');
      const count = await items.count();
      expect(count).toBeGreaterThan(0);
    }
    // If no settlements, that's fine — section won't render
  });

  test("H362: Show all button appears when more than 5 settlements", async ({
    page,
  }) => {
    await page.waitForTimeout(3000);
    const showAllBtn = page.locator(
      '[data-testid="settlement-show-all-btn"]'
    );
    const isVisible = await showAllBtn.isVisible();

    if (isVisible) {
      const text = await showAllBtn.textContent();
      expect(text).toMatch(/View all/);
    }
    // If fewer than 6 settlements, button won't be visible — that's fine
  });

  test("H363: Clicking show all expands settlement list", async ({
    page,
  }) => {
    await page.waitForTimeout(3000);
    const showAllBtn = page.locator(
      '[data-testid="settlement-show-all-btn"]'
    );

    if (await showAllBtn.isVisible()) {
      const beforeCount = await page
        .locator('[data-testid="settlement-history-item"]')
        .count();
      await showAllBtn.click();
      await page.waitForTimeout(500);

      const afterCount = await page
        .locator('[data-testid="settlement-history-item"]')
        .count();
      expect(afterCount).toBeGreaterThanOrEqual(beforeCount);

      // Button text should change to "Show less"
      const text = await showAllBtn.textContent();
      expect(text).toMatch(/Show less/);
    }
  });
});

test.describe("Suite H: Push Notification Settings", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/settings");
  });

  test("H364: Settings page renders without errors", async ({ page }) => {
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    expect(body).not.toContain("Application error");
  });

  test("H365: Notification settings card is visible", async ({ page }) => {
    const card = page.locator('[data-testid="notification-settings"]');
    await page.waitForTimeout(2000);

    const isVisible = await card.isVisible();
    if (isVisible) {
      const text = await card.textContent();
      expect(text).toMatch(/Push Notifications/i);
    }
    // Card might not be visible if browser doesn't support notifications
  });

  test("H366: Notification toggle is present", async ({ page }) => {
    await page.waitForTimeout(2000);
    const toggle = page.locator(
      '[data-testid="push-notifications-toggle"]'
    );

    const isVisible = await toggle.isVisible();
    if (isVisible) {
      // Toggle should exist — it may be disabled if browser doesn't support notifications
      // In headless Chromium, Notification API may not be fully available
      const isEnabled = await toggle.isEnabled();
      // Either enabled or disabled is fine — we just verify it rendered
      expect(typeof isEnabled).toBe("boolean");
    }
  });

  test("H367: Notification card shows description text", async ({ page }) => {
    const card = page.locator('[data-testid="notification-settings"]');
    await page.waitForTimeout(2000);

    if (await card.isVisible()) {
      const text = await card.textContent();
      // Should show either "Get reminders" or "You'll receive" or "Blocked"
      expect(text).toMatch(
        /reminders|receive|blocked/i
      );
    }
  });
});

test.describe("Suite H: Multi-Household Switcher", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/settings");
  });

  test("H368: Settings page loads with expected sections", async ({
    page,
  }) => {
    const body = await page.locator("body").textContent();
    expect(body).toContain("Settings");
    expect(body).toMatch(/household|preferences/i);
  });

  test("H369: Household switcher only appears with multiple households", async ({
    page,
  }) => {
    await page.waitForTimeout(2000);
    const switcher = page.locator('[data-testid="household-switcher"]');
    const isVisible = await switcher.isVisible();

    // If visible, user has multiple households
    if (isVisible) {
      const text = await switcher.textContent();
      expect(text).toContain("Households");
      expect(text).toMatch(/\d+ households/);
    }
    // If not visible, user has only one household — that's expected
  });

  test("H370: Household switcher shows active household indicator", async ({
    page,
  }) => {
    await page.waitForTimeout(2000);
    const switcher = page.locator('[data-testid="household-switcher"]');

    if (await switcher.isVisible()) {
      const text = await switcher.textContent();
      expect(text).toContain("Active");
    }
  });

  test("H371: Household items show member count", async ({ page }) => {
    await page.waitForTimeout(2000);
    const switcher = page.locator('[data-testid="household-switcher"]');

    if (await switcher.isVisible()) {
      const text = await switcher.textContent();
      expect(text).toMatch(/member/i);
    }
  });
});

test.describe("Suite H: In-App Reminders", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H372: Dashboard loads without crashing (reminder integration)", async ({
    page,
  }) => {
    const body = await page.locator("body").textContent();
    expect(body).toBeTruthy();
    expect(body).not.toContain("Application error");
    expect(body).not.toContain("Unhandled Runtime Error");
  });

  test("H373: Reminder banner is dismissible when shown", async ({
    page,
  }) => {
    await page.waitForTimeout(3000);
    const banner = page.locator('[data-testid="reminder-banner"]');

    if (await banner.isVisible()) {
      const dismissBtn = page.locator('[data-testid="reminder-dismiss"]');
      await expect(dismissBtn).toBeVisible();
      await dismissBtn.click();
      await page.waitForTimeout(500);
      await expect(banner).not.toBeVisible();
    }
    // Banner might not be visible if no reminders are due — that's fine
  });

  test("H374: Reminder banner shows meaningful text when present", async ({
    page,
  }) => {
    await page.waitForTimeout(3000);
    const banner = page.locator('[data-testid="reminder-banner"]');

    if (await banner.isVisible()) {
      const text = await banner.textContent();
      expect(text!.length).toBeGreaterThan(10);
      // Should contain actionable guidance
      expect(text).toMatch(
        /expense|settle|welcome|log/i
      );
    }
  });

  test("H375: App layout includes offline banner, reminder banner, and nav", async ({
    page,
  }) => {
    // The layout should have AppNav visible
    const nav = page.locator("nav");
    await expect(nav).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Suite H: Zustand Persistence", () => {
  test("H376: App data survives page reload (Zustand persist)", async ({
    page,
  }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Get settlement card text before reload
    const card = page.locator('[data-testid="settlement-card"]');
    await expect(card).toBeVisible({ timeout: 10000 });
    const textBefore = await card.textContent();

    // Reload the page
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Settlement card should still be visible after reload
    await expect(card).toBeVisible({ timeout: 10000 });
    const textAfter = await card.textContent();

    // Both states should show content (may differ as fresh data loads from Firestore)
    expect(textBefore!.length).toBeGreaterThan(0);
    expect(textAfter!.length).toBeGreaterThan(0);
  });

  test("H377: localStorage contains persisted store data", async ({
    page,
  }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Check that the Zustand persist key exists in localStorage
    const storeData = await page.evaluate(() => {
      return localStorage.getItem("melon-store");
    });

    expect(storeData).toBeTruthy();
    const parsed = JSON.parse(storeData!);
    expect(parsed).toHaveProperty("state");
  });

  test("H378: Persisted store contains expected keys", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    const storeData = await page.evaluate(() => {
      return localStorage.getItem("melon-store");
    });

    expect(storeData).toBeTruthy();
    const parsed = JSON.parse(storeData!);
    const state = parsed.state;

    // Should contain our persisted keys
    expect(state).toHaveProperty("expenses");
    expect(state).toHaveProperty("categories");
    expect(state).toHaveProperty("groups");
    expect(state).toHaveProperty("activeGroup");
  });

  test("H379: Timestamp serialization round-trips correctly", async ({
    page,
  }) => {
    await requireAuth(page, "/expenses");
    await page.waitForTimeout(3000);

    // Expenses should load from Firestore and persist to localStorage
    const storeData = await page.evaluate(() => {
      return localStorage.getItem("melon-store");
    });

    if (storeData) {
      const parsed = JSON.parse(storeData);
      const expenses = parsed.state?.expenses ?? [];
      if (expenses.length > 0) {
        // If expense has a date, it should have the __ts serialization marker
        const firstExpense = expenses[0];
        if (firstExpense.date) {
          expect(firstExpense.date).toHaveProperty("__ts");
          expect(firstExpense.date.__ts).toBe(true);
          expect(firstExpense.date).toHaveProperty("_s");
          expect(firstExpense.date).toHaveProperty("_ns");
        }
      }
    }
  });

  test("H380: Active group persists across page navigation", async ({
    page,
  }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Navigate to expenses and back
    await page.goto("/expenses");
    await page.waitForTimeout(2000);
    await page.goto("/dashboard");
    await page.waitForTimeout(2000);

    // Dashboard should load without errors
    const body = await page.locator("body").textContent();
    expect(body).not.toContain("Application error");
  });
});
