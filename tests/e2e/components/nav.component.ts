import { Page } from "@playwright/test";

type NavTab = "Dashboard" | "Expenses" | "Analytics" | "Settings";

/**
 * Component object for the app navigation (bottom tabs + profile).
 */
export class NavComponent {
  constructor(private readonly page: Page) {}

  /** Navigate to a tab by clicking the bottom nav link */
  async goTo(tab: NavTab): Promise<void> {
    const nav = this.page.locator('[data-testid="bottom-nav"]');
    await nav.getByText(tab, { exact: true }).click();
    // Wait for navigation to settle
    await this.page.waitForTimeout(500);
  }

  /** Open the quick add FAB dialog */
  async openQuickAdd(): Promise<void> {
    await this.page.locator('[data-testid="quick-add-fab"]').click();
  }

  /** Navigate to the profile page via the avatar button */
  async goToProfile(): Promise<void> {
    await this.page.locator('[data-testid="profile-avatar-btn"]').click();
    await this.page.waitForTimeout(500);
  }

  /** Check if bottom nav is visible */
  async isVisible(): Promise<boolean> {
    return this.page.locator('[data-testid="bottom-nav"]').isVisible();
  }
}
