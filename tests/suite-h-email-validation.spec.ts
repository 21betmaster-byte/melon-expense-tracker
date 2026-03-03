import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H (151–160): Partner Invite Email Validation
 *
 * Tests the email validation UX on the /settings page for the partner
 * invite email input. Validation triggers on blur (not on every keystroke).
 *
 * All tests require authentication (path: /settings).
 *
 * Key test IDs:
 *   partner-email-input  — the email input field
 *   partner-email-error  — the inline validation error message
 *
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

test.describe("Suite H: Partner Email Validation", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/settings");

    // Wait for the invite panel or member list to load
    const either = page
      .getByText("Invite Your Partner")
      .or(page.getByText("Household Members"));
    await expect(either).toBeVisible({ timeout: 10000 });

    // If the household already has 2 members, the partner email input won't be
    // visible. Skip the test in that case.
    const isInviteVisible = await page
      .getByText("Invite Your Partner")
      .isVisible()
      .catch(() => false);

    if (!isInviteVisible) {
      console.log(
        "Suite H (151–160): Household has 2 members — partner email input not shown. Skipping."
      );
      test.skip();
    }
  });

  test("H151: Partner email input is visible for single-member household", async ({ page }) => {
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });
  });

  test("H152: Valid email shows no error on blur", async ({ page }) => {
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    await emailInput.fill("partner@example.com");

    // Trigger blur by clicking elsewhere
    await page.locator("body").click();
    await page.waitForTimeout(500);

    // No error should be visible
    const error = page.locator('[data-testid="partner-email-error"]');
    await expect(error).toBeHidden({ timeout: 3000 });
  });

  test("H153: Missing @ symbol shows error on blur", async ({ page }) => {
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    await emailInput.fill("partnerexample.com");

    // Trigger blur
    await page.locator("body").click();
    await page.waitForTimeout(500);

    // Validation error should appear
    const error = page.locator('[data-testid="partner-email-error"]');
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test("H154: No domain after @ shows error on blur", async ({ page }) => {
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    await emailInput.fill("partner@");

    // Trigger blur
    await page.locator("body").click();
    await page.waitForTimeout(500);

    const error = page.locator('[data-testid="partner-email-error"]');
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test("H155: No TLD (partner@example) shows error on blur", async ({ page }) => {
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    await emailInput.fill("partner@example");

    // Trigger blur
    await page.locator("body").click();
    await page.waitForTimeout(500);

    const error = page.locator('[data-testid="partner-email-error"]');
    await expect(error).toBeVisible({ timeout: 3000 });
  });

  test("H156: Empty input shows no error — field is optional", async ({ page }) => {
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    // Focus and immediately blur (empty input)
    await emailInput.focus();
    await page.locator("body").click();
    await page.waitForTimeout(500);

    // No error — the field is optional
    const error = page.locator('[data-testid="partner-email-error"]');
    await expect(error).toBeHidden({ timeout: 3000 });
  });

  test("H157: Invalid email disables Save button", async ({ page }) => {
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    await emailInput.fill("not-an-email");

    // Trigger blur
    await page.locator("body").click();
    await page.waitForTimeout(500);

    // Find the Save button near the partner email input
    const saveButton = page
      .locator('[data-testid="partner-email-input"]')
      .locator("xpath=ancestor::form | ancestor::section | ancestor::div[contains(@class, 'card') or contains(@class, 'Card')]")
      .locator("button", { hasText: /Save/i })
      .first();

    await expect(saveButton).toBeDisabled({ timeout: 3000 });
  });

  test("H158: Valid email enables Save button", async ({ page }) => {
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    await emailInput.fill("partner@example.com");

    // Trigger blur
    await page.locator("body").click();
    await page.waitForTimeout(500);

    // Find the Save button near the partner email input
    const saveButton = page
      .locator('[data-testid="partner-email-input"]')
      .locator("xpath=ancestor::form | ancestor::section | ancestor::div[contains(@class, 'card') or contains(@class, 'Card')]")
      .locator("button", { hasText: /Save/i })
      .first();

    await expect(saveButton).toBeEnabled({ timeout: 3000 });
  });

  test("H159: Plus-addressing (partner+test@example.com) is accepted", async ({ page }) => {
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    await emailInput.fill("partner+test@example.com");

    // Trigger blur
    await page.locator("body").click();
    await page.waitForTimeout(500);

    // No error should appear — plus-addressing is valid
    const error = page.locator('[data-testid="partner-email-error"]');
    await expect(error).toBeHidden({ timeout: 3000 });
  });

  test("H160: Long email address is accepted", async ({ page }) => {
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible({ timeout: 5000 });

    // RFC 5321 allows local part up to 64 chars and domain up to 255 chars
    const longEmail =
      "abcdefghijklmnopqrstuvwxyz1234567890abcdefghij@example-long-domain.com";
    await emailInput.fill(longEmail);

    // Trigger blur
    await page.locator("body").click();
    await page.waitForTimeout(500);

    // No error — long but valid email should be accepted
    const error = page.locator('[data-testid="partner-email-error"]');
    await expect(error).toBeHidden({ timeout: 3000 });
  });
});
