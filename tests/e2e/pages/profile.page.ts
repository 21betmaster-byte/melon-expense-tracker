import { Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class ProfilePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get path() { return "/profile"; }

  /** Get displayed user name */
  async getUserName(): Promise<string> {
    const el = this.testId("profile-name-display");
    return (await el.textContent()) ?? "";
  }

  /** Get displayed email */
  async getEmail(): Promise<string> {
    const el = this.testId("profile-email-display");
    return (await el.textContent()) ?? "";
  }

  /** Enter edit mode */
  async startEditing(): Promise<void> {
    await this.testId("profile-edit-btn").click();
  }

  /** Edit the user's name */
  async editName(newName: string): Promise<void> {
    const input = this.testId("profile-name-input");
    await input.clear();
    await input.fill(newName);
  }

  /** Save profile changes */
  async save(): Promise<void> {
    await this.testId("profile-save-btn").click();
    await this.page.waitForTimeout(1000);
  }

  /** Cancel editing */
  async cancelEdit(): Promise<void> {
    await this.testId("profile-cancel-btn").click();
  }

  /** Check if household card is visible */
  async hasHouseholdCard(): Promise<boolean> {
    return this.testId("profile-household-card").isVisible({ timeout: 2000 }).catch(() => false);
  }

  /** Check if we're in edit mode */
  async isEditing(): Promise<boolean> {
    return this.testId("profile-save-btn").isVisible({ timeout: 1000 }).catch(() => false);
  }
}
