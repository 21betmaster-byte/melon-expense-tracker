import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base.page";
import { ExpenseFormComponent } from "../components/expense-form.component";
import { SettlementCardComponent } from "../components/settlement-card.component";
import { GroupSwitcherComponent } from "../components/group-switcher.component";

export class DashboardPage extends BasePage {
  readonly expenseForm: ExpenseFormComponent;
  readonly settlementCard: SettlementCardComponent;
  readonly groupSwitcher: GroupSwitcherComponent;

  constructor(page: Page) {
    super(page);
    this.expenseForm = new ExpenseFormComponent(page);
    this.settlementCard = new SettlementCardComponent(page);
    this.groupSwitcher = new GroupSwitcherComponent(page);
  }

  get path() { return "/dashboard"; }

  /** Open the add expense dialog */
  async openAddExpenseDialog(): Promise<void> {
    await this.testId("add-expense-btn").click();
    await this.expenseForm.waitForFormReady();
  }

  /** Get count of recent expense cards visible on dashboard */
  async getRecentExpenseCount(): Promise<number> {
    return this.page.locator('[data-testid="expense-card"]').count();
  }

  /** Wait for expenses to finish loading */
  async waitForExpensesLoaded(): Promise<void> {
    await this.page.waitForFunction(() => {
      const store = (window as any).__zustand_store;
      return store && !store.getState().isLoading;
    }, { timeout: 10000 });
  }

  /** Check if offline banner is showing */
  async isOffline(): Promise<boolean> {
    return this.testId("offline-banner").isVisible({ timeout: 1000 }).catch(() => false);
  }

  /** Check if empty state is shown */
  async hasEmptyState(): Promise<boolean> {
    return this.testId("empty-state").isVisible({ timeout: 2000 }).catch(() => false);
  }
}
