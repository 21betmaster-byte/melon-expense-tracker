import { Page, Locator, expect } from "@playwright/test";

export interface ExpenseFormData {
  amount: string;
  description: string;
  type?: "solo" | "joint" | "settlement";
  category?: string;
  notes?: string;
  recurring?: boolean;
  currency?: string;
  date?: string;
}

/**
 * Component object for the ExpenseForm — used in both add and edit dialogs.
 *
 * The form uses progressive disclosure:
 * - Stage 1: Amount + Description only (create mode)
 * - Stage 2: All fields visible (after Enter or in edit mode)
 */
export class ExpenseFormComponent {
  private readonly form: Locator;

  constructor(private readonly page: Page) {
    this.form = page.locator('[data-testid="expense-form"]');
  }

  /** Wait for the form to be visible and interactive */
  async waitForFormReady(): Promise<void> {
    await this.form.waitFor({ state: "visible", timeout: 10000 });
    await this.page.locator('[data-testid="amount-input"]').waitFor({ state: "visible" });
  }

  /** Get the current form stage (1 or 2) */
  async getStage(): Promise<number> {
    const stage = await this.form.getAttribute("data-stage");
    return parseInt(stage ?? "1", 10);
  }

  /** Check if form is in Stage 1 (quick entry) */
  async isStage1(): Promise<boolean> {
    return (await this.getStage()) === 1;
  }

  /** Check if form is in Stage 2 (full form) */
  async isStage2(): Promise<boolean> {
    return (await this.getStage()) === 2;
  }

  /** Wait for Stage 2 to be fully visible (fields revealed + animation done) */
  async waitForStage2(): Promise<void> {
    await this.page.locator('[data-testid="stage2-fields"]').waitFor({ state: "visible", timeout: 5000 });
    // Wait for animation to complete
    await this.page.waitForTimeout(400);
  }

  /**
   * Advance from Stage 1 to Stage 2 by pressing Enter.
   * Assumes amount and description are already filled.
   */
  async advanceToStage2(): Promise<void> {
    const descInput = this.page.locator('[data-testid="description-input"]');
    await descInput.press("Enter");
    // Wait for transition loader then stage 2 fields
    await this.waitForStage2();
  }

  /**
   * Fill expense form fields — handles progressive disclosure automatically.
   * In create mode: fills amount + description, advances to Stage 2, then fills remaining fields.
   * In edit mode: Stage 2 is already visible, fills all fields directly.
   */
  async fillExpense(data: ExpenseFormData): Promise<void> {
    // Amount
    const amountInput = this.page.locator('[data-testid="amount-input"]');
    await amountInput.click();
    await amountInput.fill(data.amount);

    // Description
    const descInput = this.page.locator('[data-testid="description-input"]');
    await descInput.click();
    await descInput.fill(data.description);

    // If in Stage 1, advance to Stage 2
    if (await this.isStage1()) {
      await this.advanceToStage2();
    }

    // Now in Stage 2 — fill remaining fields

    // Type (Radix Select)
    if (data.type) {
      await this.page.locator('[data-testid="expense-type-select"]').click();
      await this.page.waitForTimeout(300);
      // Radix select items use role="option" or data-value
      await this.page.getByRole("option", { name: new RegExp(data.type, "i") }).click();
    }

    // Category
    if (data.category) {
      await this.selectCategory(data.category);
    } else {
      // Select the first available category as a fallback
      await this.selectFirstCategory();
    }

    // Date
    if (data.date) {
      const dateInput = this.page.locator('[data-testid="date-input"]');
      await dateInput.fill(data.date);
    }

    // Currency override
    if (data.currency) {
      await this.page.locator('[data-testid="currency-override-select"]').click();
      await this.page.waitForTimeout(300);
      await this.page.getByRole("option", { name: new RegExp(data.currency, "i") }).click();
    }

    // Recurring
    if (data.recurring) {
      const toggle = this.page.locator('[data-testid="recurring-toggle"]');
      if (!(await toggle.isChecked())) {
        await toggle.click();
      }
    }

    // Notes
    if (data.notes) {
      const notesInput = this.page.locator('[data-testid="expense-notes-input"]');
      await notesInput.click();
      await notesInput.fill(data.notes);
    }
  }

  /** Select a category by name with retry */
  async selectCategory(name: string): Promise<void> {
    const trigger = this.page.locator('[data-testid="category-select"]');
    // Retry: categories may load asynchronously
    for (let attempt = 0; attempt < 3; attempt++) {
      await trigger.click();
      await this.page.waitForTimeout(500);
      const option = this.page.getByRole("option", { name: new RegExp(`^${name}$`, "i") });
      if (await option.isVisible({ timeout: 2000 }).catch(() => false)) {
        await option.click();
        return;
      }
      // Close dropdown and retry
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(1000);
    }
    throw new Error(`Category "${name}" not found after 3 attempts`);
  }

  /** Select the first available category (with retry for async loading) */
  async selectFirstCategory(): Promise<void> {
    const trigger = this.page.locator('[data-testid="category-select"]');
    for (let attempt = 0; attempt < 3; attempt++) {
      if (await trigger.isDisabled()) {
        await this.page.waitForTimeout(1000);
        continue;
      }
      await trigger.click();
      await this.page.waitForTimeout(500);
      const firstOption = this.page.locator('[role="option"]').first();
      if (await firstOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await firstOption.click();
        return;
      }
      await this.page.keyboard.press("Escape");
      await this.page.waitForTimeout(1000);
    }
    throw new Error("No categories available after 3 attempts");
  }

  /** Create a new inline category */
  async createInlineCategory(name: string): Promise<void> {
    await this.page.locator('[data-testid="inline-category-trigger"]').click();
    const input = this.page.locator('[data-testid="inline-category-input"]');
    await input.waitFor({ state: "visible" });
    await input.fill(name);
    await this.page.locator('[data-testid="inline-category-confirm"]').click();
    // Wait for the category to be created and selected
    await this.page.waitForTimeout(1000);
  }

  /** Submit the form (only works in Stage 2) */
  async submit(): Promise<void> {
    await this.page.locator('[data-testid="submit-expense"]').click();
  }

  /** Cancel the form by clicking the dialog's X (close) button */
  async cancel(): Promise<void> {
    await this.page.locator('[data-slot="dialog-close"]').click();
  }

  /** Get the form title text (for edit vs add verification) */
  async getFormTitle(): Promise<string> {
    const title = this.page.locator('[data-testid="expense-form-title"]');
    return (await title.textContent()) ?? "";
  }

  /** Check if form is visible */
  async isVisible(): Promise<boolean> {
    return this.form.isVisible();
  }

  /** Check if the Save Expense button is visible */
  async isSaveButtonVisible(): Promise<boolean> {
    return this.page.locator('[data-testid="submit-expense"]').isVisible({ timeout: 1000 }).catch(() => false);
  }

  /** Check if the dialog close (X) button is visible */
  async isCloseButtonVisible(): Promise<boolean> {
    return this.page.locator('[data-slot="dialog-close"]').isVisible({ timeout: 1000 }).catch(() => false);
  }

  /** Check if Stage 1 validation error is shown for a field */
  async hasStage1Error(field: "amount" | "description"): Promise<boolean> {
    return this.page.locator(`[data-testid="${field}-error"]`).isVisible({ timeout: 1000 }).catch(() => false);
  }

  /** Get Stage 1 validation error text */
  async getStage1ErrorText(field: "amount" | "description"): Promise<string> {
    const errorEl = this.page.locator(`[data-testid="${field}-error"]`);
    return (await errorEl.textContent()) ?? "";
  }
}
