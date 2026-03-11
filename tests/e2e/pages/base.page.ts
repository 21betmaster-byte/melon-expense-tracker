import { Page, Locator, expect } from "@playwright/test";
import { waitForStoreReady, waitForToast } from "../helpers/wait-strategies";

/**
 * Base page object — shared functionality for all page objects.
 */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  /** The route path this page represents (e.g., "/dashboard") */
  abstract get path(): string;

  /**
   * Navigate to this page and wait for it to be ready.
   */
  async navigate(): Promise<void> {
    await this.page.goto(this.path, { waitUntil: "domcontentloaded" });
    await this.waitForPageReady();
  }

  /**
   * Wait for the page to be fully loaded — store ready + page-specific checks.
   */
  async waitForPageReady(): Promise<void> {
    await waitForStoreReady(this.page);
  }

  /**
   * Get the full Zustand store state.
   */
  async getStoreState(): Promise<any> {
    return this.page.evaluate(() => {
      const store = (window as any).__zustand_store;
      if (!store) return null;
      return JSON.parse(JSON.stringify(store.getState()));
    });
  }

  /**
   * Wait for a toast notification matching the pattern.
   */
  async waitForToastMessage(pattern: string | RegExp): Promise<void> {
    await waitForToast(this.page, pattern);
  }

  /**
   * Dismiss any visible toast by clicking it.
   */
  async dismissToast(): Promise<void> {
    const toast = this.page.locator("[data-sonner-toast]").first();
    if (await toast.isVisible({ timeout: 1000 }).catch(() => false)) {
      await toast.click();
      await toast.waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
    }
  }

  /**
   * Get the current URL path.
   */
  get currentPath(): Promise<string> {
    return Promise.resolve(new URL(this.page.url()).pathname);
  }

  /**
   * Shorthand for page.locator with data-testid.
   */
  protected testId(id: string): Locator {
    return this.page.locator(`[data-testid="${id}"]`);
  }
}
