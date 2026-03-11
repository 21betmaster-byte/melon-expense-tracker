import { Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get path() { return "/login"; }

  override async waitForPageReady(): Promise<void> {
    await this.testId("email-input").waitFor({ state: "visible", timeout: 15000 });
  }

  /** Fill login form */
  async fillCredentials(email: string, password: string): Promise<void> {
    await this.testId("email-input").click();
    await this.testId("email-input").fill(email);
    await this.testId("password-input").click();
    await this.testId("password-input").fill(password);
  }

  /** Submit login form */
  async submit(): Promise<void> {
    await this.testId("login-submit").click();
  }

  /** Check if Google sign-in button is visible */
  async hasGoogleSignIn(): Promise<boolean> {
    return this.testId("google-signin-btn").isVisible({ timeout: 2000 }).catch(() => false);
  }

  /** Check if form is visible */
  async isFormVisible(): Promise<boolean> {
    return this.testId("email-input").isVisible();
  }
}
