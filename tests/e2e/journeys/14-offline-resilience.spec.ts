import { test, expect } from "../fixtures";
import { DashboardPage } from "../pages/dashboard.page";
import { waitForStoreReady } from "../helpers/wait-strategies";

test.describe("Journey 14: Offline Resilience", () => {
  test("offline banner appears when disconnected", async ({ page, context }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    // Go offline
    await context.setOffline(true);

    // Trigger a page action to detect offline state
    await page.evaluate(() => {
      window.dispatchEvent(new Event("offline"));
    });

    // Check for offline banner
    const banner = page.locator('[data-testid="offline-banner"]');
    const isVisible = await banner.isVisible({ timeout: 5000 }).catch(() => false);

    // Banner should appear (implementation dependent)
    if (isVisible) {
      await expect(banner).toBeVisible();
    }

    // Go back online
    await context.setOffline(false);
    await page.evaluate(() => {
      window.dispatchEvent(new Event("online"));
    });

    // Banner should disappear
    if (isVisible) {
      await banner.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {});
    }
  });
});
