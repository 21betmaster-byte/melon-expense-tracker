import { Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class OnboardingPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get path() { return "/onboarding"; }

  override async waitForPageReady(): Promise<void> {
    // Onboarding doesn't need store ready — it's pre-auth/pre-household
    const welcome = this.testId("stepper-welcome");
    const create = this.testId("create-household-btn");
    await welcome.or(create).waitFor({ state: "visible", timeout: 15000 });
  }

  /** Skip the welcome step */
  async skipWelcome(): Promise<void> {
    await this.testId("stepper-skip-btn").click();
    await this.page.waitForTimeout(500);
  }

  /** Choose "Create" path */
  async chooseCreate(): Promise<void> {
    await this.testId("stepper-create-btn").click();
    await this.page.waitForTimeout(500);
  }

  /** Choose "Join" path */
  async chooseJoin(): Promise<void> {
    await this.testId("stepper-join-btn").click();
    await this.page.waitForTimeout(500);
  }

  /** Create a household */
  async createHousehold(): Promise<void> {
    await this.testId("create-household-btn").click();
    await this.page.waitForTimeout(2000);
  }

  /** Check if welcome step is visible */
  async isWelcomeVisible(): Promise<boolean> {
    return this.testId("stepper-welcome").isVisible({ timeout: 2000 }).catch(() => false);
  }

  /** Get the progress indicator text */
  async getProgress(): Promise<string> {
    return (await this.testId("stepper-counter").textContent()) ?? "";
  }
}
