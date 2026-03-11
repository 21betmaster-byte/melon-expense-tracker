import { Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class AnalyticsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get path() { return "/analytics"; }

  /** Check if pie chart is visible */
  async hasPieChart(): Promise<boolean> {
    return this.testId("category-pie-chart").isVisible({ timeout: 5000 }).catch(() => false);
  }

  /** Check if analytics insights section is visible */
  async hasInsights(): Promise<boolean> {
    return this.testId("analytics-insights").isVisible({ timeout: 5000 }).catch(() => false);
  }

  /** Change the month selector for the pie chart */
  async changeMonth(direction: "prev" | "next"): Promise<void> {
    const selector = this.testId("category-pie-chart-month-selector");
    const btn = direction === "prev"
      ? selector.locator('button').first()
      : selector.locator('button').last();
    await btn.click();
    await this.page.waitForTimeout(500);
  }

  /** Get the current month text from the pie chart selector */
  async getCurrentMonth(): Promise<string> {
    const selector = this.testId("category-pie-chart-month-selector");
    return (await selector.textContent()) ?? "";
  }
}
