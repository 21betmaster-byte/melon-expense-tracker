import { Page, Locator, Download } from "@playwright/test";
import { BasePage } from "./base.page";
import { ExpenseCardComponent } from "../components/expense-card.component";

export class ExpensesPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get path() { return "/expenses"; }

  /** Search for expenses by description */
  async search(query: string): Promise<void> {
    const searchInput = this.page.locator('input[placeholder*="earch"]').first();
    await searchInput.click();
    await searchInput.fill(query);
    await this.page.waitForTimeout(500); // debounce
  }

  /** Clear the search input */
  async clearSearch(): Promise<void> {
    const searchInput = this.page.locator('input[placeholder*="earch"]').first();
    await searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /** Get count of visible expense cards */
  async getExpenseCount(): Promise<number> {
    return this.page.locator('[data-testid="expense-card"]').count();
  }

  /** Find an expense card by description */
  findExpenseByDescription(description: string): ExpenseCardComponent {
    return ExpenseCardComponent.findByDescription(this.page, description);
  }

  /** Trigger CSV export and return the download */
  async exportCsv(): Promise<Download> {
    const [download] = await Promise.all([
      this.page.waitForEvent("download"),
      this.page.getByRole("button", { name: /export|csv|download/i }).click(),
    ]);
    return download;
  }

  /** Open advanced filters panel */
  async openAdvancedFilters(): Promise<void> {
    await this.testId("advanced-filters-btn").click();
    await this.page.waitForTimeout(300);
  }

  /** Apply filters */
  async applyFilters(): Promise<void> {
    await this.testId("filter-apply-btn").click();
    await this.page.waitForTimeout(500);
  }

  /** Clear all filters */
  async clearFilters(): Promise<void> {
    await this.testId("filter-clear-btn").click();
    await this.page.waitForTimeout(500);
  }

  /** Check if "no results" message is shown */
  async hasNoResults(): Promise<boolean> {
    return this.testId("expense-no-results").isVisible({ timeout: 2000 }).catch(() => false);
  }

  /** Open add expense dialog (expenses page also has add-expense-btn) */
  async openAddExpenseDialog(): Promise<void> {
    await this.testId("add-expense-btn").click();
  }
}
