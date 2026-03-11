import { Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class SignupPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get path() { return "/signup"; }

  override async waitForPageReady(): Promise<void> {
    await this.testId("email-input").waitFor({ state: "visible", timeout: 15000 });
  }

  /** Fill signup form */
  async fillForm(name: string, email: string, password: string): Promise<void> {
    await this.testId("name-input").fill(name);
    await this.testId("email-input").fill(email);
    await this.testId("password-input").fill(password);
  }

  /** Submit signup form */
  async submit(): Promise<void> {
    await this.testId("signup-submit").click();
  }

  /** Check if Google signup button is visible */
  async hasGoogleSignUp(): Promise<boolean> {
    return this.testId("google-signup-btn").isVisible({ timeout: 2000 }).catch(() => false);
  }
}
