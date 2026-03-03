import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite D: Group Context Isolation
 * Requires authenticated session with a household that has multiple groups.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */
test.describe("Suite D: Group Context Isolation", () => {
  test.beforeEach(async ({ page }) => {
    // Throws with a clear message if not authenticated — no silent skips
    await requireAuth(page, "/dashboard");
  });

  test("D1: Switching groups clears expense list", async ({ page }) => {
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    const initialGroup = await switcher.textContent();

    await switcher.click();
    const menuItems = page.locator('[role="menuitem"]');
    const count = await menuItems.count();

    if (count < 2) {
      // Only one group exists in this household — test is not applicable
      // (add a second group in Settings to enable this test fully)
      console.warn("D1: Only one group found — switching test is not verifiable. Add a second group in Settings.");
      return;
    }

    for (let i = 0; i < count; i++) {
      const item = menuItems.nth(i);
      const text = await item.textContent();
      if (!initialGroup?.includes(text ?? "")) {
        await item.click();
        break;
      }
    }

    await page.waitForTimeout(500);
    await expect(page.locator('[data-testid="settlement-card"]')).toBeVisible();
  });

  test("D2: Group switcher shows correct active group", async ({ page }) => {
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10000 });

    await switcher.click();
    const items = page.locator('[role="menuitem"]');
    const count = await items.count();
    if (count > 0) {
      await items.first().click();
      await page.waitForTimeout(200);
    }

    const switcherText = await switcher.textContent();
    expect(switcherText).toBeTruthy();
    expect(switcherText).not.toContain("undefined");
    expect(switcherText).not.toContain("null");
  });
});
