import { test, expect } from "../fixtures";
import { AnalyticsPage } from "../pages/analytics.page";
import { waitForStoreReady } from "../helpers/wait-strategies";

test.describe("Journey 08: Analytics", () => {
  test("analytics page renders chart sections", async ({ page }) => {
    const analytics = new AnalyticsPage(page);
    await analytics.navigate();

    // The pie chart or insights section should be visible
    // (may not have data, but the container should render)
    const hasPie = await analytics.hasPieChart();
    const hasInsights = await analytics.hasInsights();

    // At least one analytics component should be present
    expect(hasPie || hasInsights).toBe(true);
  });

  test("month selector changes the displayed period", async ({ page }) => {
    const analytics = new AnalyticsPage(page);
    await analytics.navigate();

    const hasPie = await analytics.hasPieChart();
    if (!hasPie) {
      test.skip();
      return;
    }

    // Get current month text
    const initialMonth = await analytics.getCurrentMonth();

    // Change to previous month
    await analytics.changeMonth("prev");
    const prevMonth = await analytics.getCurrentMonth();

    // Month text should have changed
    expect(prevMonth).not.toBe(initialMonth);

    // Change back to next
    await analytics.changeMonth("next");
    const backMonth = await analytics.getCurrentMonth();
    expect(backMonth).toBe(initialMonth);
  });
});
