import { test, expect } from "@playwright/test";
import { ForgotPasswordPage } from "../pages/forgot-password.page";

test.describe("Journey 19: Forgot Password", () => {
  // These tests use a CLEAN browser context (no storageState)
  // since forgot password is an unauthenticated flow
  test.use({ storageState: { cookies: [], origins: [] } });

  let forgotPasswordPage: ForgotPasswordPage;

  test.beforeEach(async ({ page }) => {
    forgotPasswordPage = new ForgotPasswordPage(page);
  });

  test("forgot password page renders correctly", async ({ page }) => {
    await forgotPasswordPage.navigate();

    // Page heading
    await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
    await expect(page.getByText("Enter your email and we'll send you a reset link")).toBeVisible();

    // Form elements
    expect(await forgotPasswordPage.isFormVisible()).toBe(true);
    expect(await forgotPasswordPage.isSubmitVisible()).toBe(true);

    // Back to sign in link
    await expect(page.locator('[data-testid="back-to-login"]')).toBeVisible();
  });

  test("login page forgot password link navigates to forgot password page", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="email-input"]').waitFor({ state: "visible", timeout: 15000 });

    // Click the "Forgot password?" link
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await page.waitForURL("**/forgot-password", { timeout: 10000 });
    expect(page.url()).toContain("/forgot-password");

    // Verify the forgot password form loaded
    expect(await forgotPasswordPage.isFormVisible()).toBe(true);
  });

  test("shows validation error for empty email", async ({ page }) => {
    await forgotPasswordPage.navigate();

    // Submit without entering email
    await forgotPasswordPage.submit();

    // Should show validation error
    await expect(page.getByText("Invalid email address")).toBeVisible({ timeout: 5000 });

    // Should NOT show success state
    expect(await forgotPasswordPage.isFormVisible()).toBe(true);
  });

  test("shows validation error for invalid email format", async ({ page }) => {
    await forgotPasswordPage.navigate();

    await forgotPasswordPage.fillEmail("not-an-email");
    await forgotPasswordPage.submit();

    // Should show validation error
    await expect(page.getByText("Invalid email address")).toBeVisible({ timeout: 5000 });

    // Should stay on form
    expect(await forgotPasswordPage.isFormVisible()).toBe(true);
  });

  test("shows success state after submitting valid email", async ({ page }) => {
    await forgotPasswordPage.navigate();

    await forgotPasswordPage.fillEmail("test@example.com");
    await forgotPasswordPage.submit();

    // Should show success state (Firebase may or may not error for non-existent
    // emails depending on project settings, but our component handles both cases)
    expect(await forgotPasswordPage.isSuccessVisible()).toBe(true);

    // Email input should no longer be visible
    expect(await forgotPasswordPage.isFormVisible()).toBe(false);

    // Success message content
    await expect(
      page.getByText("If an account exists with that email")
    ).toBeVisible();
  });

  test("try again button returns to form from success state", async ({ page }) => {
    await forgotPasswordPage.navigate();

    // Submit a valid email to get to success state
    await forgotPasswordPage.fillEmail("test@example.com");
    await forgotPasswordPage.submit();
    expect(await forgotPasswordPage.isSuccessVisible()).toBe(true);

    // Click "try again"
    await forgotPasswordPage.clickTryAgain();

    // Should return to the form
    expect(await forgotPasswordPage.isFormVisible()).toBe(true);
    expect(await forgotPasswordPage.isSubmitVisible()).toBe(true);
  });

  test("back to sign in link navigates to login page", async ({ page }) => {
    await forgotPasswordPage.navigate();

    await forgotPasswordPage.clickBackToLogin();
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("back to sign in link works from success state", async ({ page }) => {
    await forgotPasswordPage.navigate();

    // Get to success state
    await forgotPasswordPage.fillEmail("test@example.com");
    await forgotPasswordPage.submit();
    expect(await forgotPasswordPage.isSuccessVisible()).toBe(true);

    // Click back to login from success screen
    await forgotPasswordPage.clickBackToLogin();
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});
