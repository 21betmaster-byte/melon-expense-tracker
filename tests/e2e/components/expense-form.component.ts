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

  /** Fill expense form fields */
  async fillExpense(data: ExpenseFormData): Promise<void> {
    // Amount
    const amountInput = this.page.locator('[data-testid="amount-input"]');
    await amountInput.click();
    await amountInput.fill(data.amount);

    // Description
    const descInput = this.page.locator('[data-testid="description-input"]');
    await descInput.click();
    await descInput.fill(data.description);

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

  /** Submit the form */
  async submit(): Promise<void> {
    await this.page.locator('[data-testid="submit-expense"]').click();
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
}
