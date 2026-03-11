import { Page, Locator } from "@playwright/test";

/**
 * Component object for the SettlementCard on the dashboard.
 */
export class SettlementCardComponent {
  private readonly card: Locator;

  constructor(private readonly page: Page) {
    this.card = page.locator('[data-testid="settlement-card"]');
  }

  /** Check if the settlement card is visible */
  async isVisible(): Promise<boolean> {
    return this.card.isVisible({ timeout: 5000 }).catch(() => false);
  }

  /** Check if all settled up (no outstanding balance) */
  async isSettled(): Promise<boolean> {
    const text = await this.card.textContent();
    return text?.includes("settled up") ?? false;
  }

  /** Get the settlement amount text */
  async getSettlementAmount(): Promise<string> {
    const amount = this.page.locator('[data-testid="settlement-amount"]');
    if (await amount.isVisible({ timeout: 2000 }).catch(() => false)) {
      return (await amount.textContent()) ?? "";
    }
    return "";
  }

  /** Click "Mark as Settled" and confirm */
  async settle(): Promise<void> {
    await this.page.locator('[data-testid="mark-settled-btn"]').click();
    const dialog = this.page.locator('[data-testid="settle-confirm-dialog"]');
    await dialog.waitFor({ state: "visible" });
    await this.page.locator('[data-testid="settle-confirm-btn"]').click();
    await dialog.waitFor({ state: "hidden", timeout: 5000 });
  }

  /** Click "Mark as Settled" but cancel */
  async cancelSettle(): Promise<void> {
    await this.page.locator('[data-testid="mark-settled-btn"]').click();
    const dialog = this.page.locator('[data-testid="settle-confirm-dialog"]');
    await dialog.waitFor({ state: "visible" });
    await this.page.locator('[data-testid="settle-cancel-btn"]').click();
  }

  /** Get settlement history items */
  async getHistoryItems(): Promise<Locator> {
    return this.page.locator('[data-testid="settlement-history-item"]');
  }

  /** Get count of history items */
  async getHistoryCount(): Promise<number> {
    const items = this.page.locator('[data-testid="settlement-history-item"]');
    return items.count();
  }

  /** Click "Show all" to expand history */
  async showAllHistory(): Promise<void> {
    const btn = this.page.locator('[data-testid="settlement-show-all-btn"]');
    if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btn.click();
    }
  }

  /** Get the full text of the settlement card */
  async getText(): Promise<string> {
    return (await this.card.textContent()) ?? "";
  }
}
