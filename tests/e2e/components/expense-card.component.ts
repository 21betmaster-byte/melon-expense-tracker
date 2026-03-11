import { Page, Locator, expect } from "@playwright/test";

/**
 * Component object for individual ExpenseCard interactions.
 */
export class ExpenseCardComponent {
  constructor(
    private readonly page: Page,
    private readonly card: Locator
  ) {}

  /**
   * Find an expense card by its description text.
   */
  static findByDescription(page: Page, description: string): ExpenseCardComponent {
    // Expense cards contain the description in their text content
    const card = page
      .locator('[data-testid="expense-card"]')
      .filter({ hasText: description });
    return new ExpenseCardComponent(page, card);
  }

  /**
   * Get all expense cards on the page.
   */
  static async getAllCards(page: Page): Promise<Locator> {
    return page.locator('[data-testid="expense-card"]');
  }

  /** Click the edit button to open edit dialog */
  async edit(): Promise<void> {
    await this.card.locator('[data-testid="edit-expense-btn"]').click();
  }

  /** Delete with confirmation */
  async deleteWithConfirm(): Promise<void> {
    await this.card.locator('[data-testid="delete-expense-btn"]').click();
    const dialog = this.page.locator('[data-testid="delete-confirm-dialog"]');
    await dialog.waitFor({ state: "visible" });
    await this.page.locator('[data-testid="delete-confirm-btn"]').click();
    await dialog.waitFor({ state: "hidden", timeout: 5000 });
  }

  /** Open delete dialog but cancel */
  async deleteAndCancel(): Promise<void> {
    await this.card.locator('[data-testid="delete-expense-btn"]').click();
    const dialog = this.page.locator('[data-testid="delete-confirm-dialog"]');
    await dialog.waitFor({ state: "visible" });
    await this.page.locator('[data-testid="delete-cancel-btn"]').click();
    await dialog.waitFor({ state: "hidden", timeout: 5000 });
  }

  /** Get the full text content of the card */
  async getText(): Promise<string> {
    return (await this.card.textContent()) ?? "";
  }

  /** Check if the card is visible */
  async isVisible(): Promise<boolean> {
    return this.card.isVisible();
  }

  /** Check if currency badge is shown */
  async hasCurrencyBadge(): Promise<boolean> {
    return this.card.locator('[data-testid="expense-currency-badge"]').isVisible();
  }

  /** Get currency badge text */
  async getCurrencyBadgeText(): Promise<string> {
    const badge = this.card.locator('[data-testid="expense-currency-badge"]');
    return (await badge.textContent()) ?? "";
  }

  /** Check if recurring indicator is shown */
  async hasRecurringIndicator(): Promise<boolean> {
    return this.card.locator('[data-testid="recurring-indicator"]').isVisible();
  }

  /** Check if pending indicator is shown */
  async hasPendingIndicator(): Promise<boolean> {
    return this.card.locator('[data-testid="pending-indicator"]').isVisible();
  }

  /** Get "added by" text */
  async getAddedBy(): Promise<string> {
    const el = this.card.locator('[data-testid="expense-added-by"]');
    return (await el.textContent()) ?? "";
  }

  /** Toggle notes visibility */
  async toggleNotes(): Promise<void> {
    await this.card.locator('[data-testid="expense-notes-toggle"]').click();
  }

  /** Get notes content (must be expanded first) */
  async getNotesContent(): Promise<string> {
    const content = this.card.locator('[data-testid="expense-notes-content"]');
    return (await content.textContent()) ?? "";
  }

  /** Get the card locator for custom assertions */
  get locator(): Locator {
    return this.card;
  }
}
