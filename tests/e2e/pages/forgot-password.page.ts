import { Page } from "@playwright/test";
import { BasePage } from "./base.page";

export class ForgotPasswordPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get path() { return "/forgot-password"; }

  override async waitForPageReady(): Promise<void> {
    await this.testId("forgot-email-input").waitFor({ state: "visible", timeout: 15000 });
  }

  /** Fill the email field */
  async fillEmail(email: string): Promise<void> {
    await this.testId("forgot-email-input").click();
    await this.testId("forgot-email-input").fill(email);
  }

  /** Submit the forgot password form */
  async submit(): Promise<void> {
    await this.testId("forgot-submit").click();
  }

  /** Check if the success state is visible */
  async isSuccessVisible(): Promise<boolean> {
    return this.testId("reset-success").isVisible({ timeout: 10000 }).catch(() => false);
  }

  /** Click the "try again" button on the success screen */
  async clickTryAgain(): Promise<void> {
    await this.testId("try-again-btn").click();
  }

  /** Click the "Back to sign in" link */
  async clickBackToLogin(): Promise<void> {
    await this.testId("back-to-login").click();
  }

  /** Check if the email input is visible (form state) */
  async isFormVisible(): Promise<boolean> {
    return this.testId("forgot-email-input").isVisible();
  }

  /** Check if the submit button is visible */
  async isSubmitVisible(): Promise<boolean> {
    return this.testId("forgot-submit").isVisible();
  }
}
