import { Page, Locator } from "@playwright/test";

/**
 * Component object for the GroupSwitcher dropdown.
 */
export class GroupSwitcherComponent {
  constructor(private readonly page: Page) {}

  /** Open the group switcher dropdown */
  async openSwitcher(): Promise<void> {
    await this.page.locator('[data-testid="group-switcher"]').click();
    await this.page.waitForTimeout(300);
  }

  /** Select a group by name */
  async selectGroup(name: string): Promise<void> {
    await this.openSwitcher();
    // Group names appear as items in the dropdown
    await this.page.getByRole("option", { name }).click();
    await this.page.waitForTimeout(500);
  }

  /** Create a new group via the switcher */
  async createGroup(name: string): Promise<void> {
    await this.openSwitcher();
    await this.page.locator('[data-testid="create-group-switcher-btn"]').click();
    const input = this.page.locator('[data-testid="switcher-group-name-input"]');
    await input.waitFor({ state: "visible" });
    await input.fill(name);
    await this.page.locator('[data-testid="switcher-group-confirm-btn"]').click();
    await this.page.waitForTimeout(1000);
  }

  /** Get the currently displayed active group name from the trigger */
  async getActiveGroupName(): Promise<string> {
    const trigger = this.page.locator('[data-testid="group-switcher"]');
    return (await trigger.textContent()) ?? "";
  }
}
