import { Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class SettingsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get path() { return "/settings"; }

  // ── Groups ──────────────────────────────────────────

  /** Add a new group */
  async addGroup(name: string): Promise<void> {
    const input = this.testId("new-group-input");
    await input.fill(name);
    await this.testId("add-group-btn").click();
    await this.page.waitForTimeout(1000);
  }

  // ── Categories ──────────────────────────────────────

  /** Add a new category */
  async addCategory(name: string): Promise<void> {
    const input = this.testId("new-category-input");
    await input.fill(name);
    await this.testId("add-category-btn").click();
    await this.page.waitForTimeout(1000);
  }

  // ── Currency ────────────────────────────────────────

  /** Change household currency */
  async changeCurrency(currency: string): Promise<void> {
    await this.testId("currency-select").click();
    await this.page.waitForTimeout(300);
    await this.page.getByRole("option", { name: new RegExp(currency, "i") }).click();
    await this.testId("save-currency-btn").click();
    await this.page.waitForTimeout(500);
  }

  // ── Invite ──────────────────────────────────────────

  /** Copy invite link */
  async copyInviteLink(): Promise<void> {
    await this.testId("copy-invite-btn").click();
  }

  /** Get invite status text */
  async getInviteStatus(): Promise<string> {
    const badge = this.testId("invite-status-badge");
    if (await badge.isVisible({ timeout: 2000 }).catch(() => false)) {
      return (await badge.textContent()) ?? "";
    }
    return "";
  }

  // ── Danger Zone ─────────────────────────────────────

  /** Check if danger zone is visible */
  async isDangerZoneVisible(): Promise<boolean> {
    return this.testId("danger-zone").isVisible({ timeout: 2000 }).catch(() => false);
  }

  // ── Section Visibility ──────────────────────────────

  /** Check if groups section is visible (by looking for the group input) */
  async hasGroupsSection(): Promise<boolean> {
    return this.testId("new-group-input").isVisible({ timeout: 2000 }).catch(() => false);
  }

  /** Check if categories section is visible */
  async hasCategoriesSection(): Promise<boolean> {
    return this.testId("new-category-input").isVisible({ timeout: 2000 }).catch(() => false);
  }

  /** Check if currency section is visible */
  async hasCurrencySection(): Promise<boolean> {
    return this.testId("currency-select").isVisible({ timeout: 2000 }).catch(() => false);
  }
}
