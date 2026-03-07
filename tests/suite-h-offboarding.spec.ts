import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: User Offboarding (H215–H244)
 *
 * H215–H219: Logout Confirmation Dialog
 * H220–H229: Leave Household + Danger Zone
 * H230–H244: Delete Account (multi-step dialogs)
 *
 * NOTE: Tests are UI-only (dialog interactions). No tests actually perform
 * destructive leave/delete operations to preserve the test user's household.
 */

// ─── H215–H219: Logout Confirmation (now on /profile page) ──────────────────

test.describe("Suite H: Offboarding — Logout Confirmation", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/profile");
  });

  test("H215: Logout button is visible on profile page", async ({ page }) => {
    await expect(
      page.locator('[data-testid="profile-logout-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("H216: Clicking logout opens confirmation dialog", async ({ page }) => {
    await page.locator('[data-testid="profile-logout-btn"]').click();
    await expect(
      page.locator('[data-testid="logout-confirm-dialog"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("H217: Cancel button dismisses logout dialog", async ({ page }) => {
    await page.locator('[data-testid="profile-logout-btn"]').click();
    const dialog = page.locator('[data-testid="logout-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="profile-logout-cancel-btn"]').click();
    await expect(dialog).toBeHidden({ timeout: 3000 });

    // Should still be on profile (not redirected)
    await expect(page).toHaveURL(/.*\/profile/);
  });

  test("H218: Confirm logout redirects to /login", async ({ page }) => {
    await page.locator('[data-testid="profile-logout-btn"]').click();
    await expect(
      page.locator('[data-testid="logout-confirm-dialog"]')
    ).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="profile-logout-confirm-btn"]').click();
    await page.waitForURL(/.*\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/.*\/login/);
  });

  test("H219: Escape key dismisses logout dialog", async ({ page }) => {
    await page.locator('[data-testid="profile-logout-btn"]').click();
    const dialog = page.locator('[data-testid="logout-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });
});

// ─── H220–H229: Leave Household + Danger Zone ──────────────────────────────

test.describe("Suite H: Offboarding — Leave Household", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/settings");
  });

  test("H220: Danger Zone section is visible on settings page", async ({ page }) => {
    await expect(
      page.locator('[data-testid="danger-zone"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("H221: Leave Household button is visible in Danger Zone", async ({ page }) => {
    await expect(
      page.locator('[data-testid="leave-household-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("H222: Clicking Leave Household opens confirmation dialog", async ({ page }) => {
    await page.locator('[data-testid="leave-household-btn"]').click();
    await expect(
      page.locator('[data-testid="leave-household-dialog"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("H223: Leave dialog contains consequence text", async ({ page }) => {
    await page.locator('[data-testid="leave-household-btn"]').click();
    const dialog = page.locator('[data-testid="leave-household-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const text = await dialog.textContent();
    expect(text).toMatch(/expenses will remain/i);
    expect(text).toMatch(/create or join/i);
  });

  test("H224: Cancel button dismisses leave dialog", async ({ page }) => {
    await page.locator('[data-testid="leave-household-btn"]').click();
    const dialog = page.locator('[data-testid="leave-household-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="leave-cancel-btn"]').click();
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("H225: Escape key dismisses leave dialog", async ({ page }) => {
    await page.locator('[data-testid="leave-household-btn"]').click();
    const dialog = page.locator('[data-testid="leave-household-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("H226: Leave dialog has both cancel and confirm buttons", async ({ page }) => {
    await page.locator('[data-testid="leave-household-btn"]').click();
    await expect(
      page.locator('[data-testid="leave-household-dialog"]')
    ).toBeVisible({ timeout: 5000 });

    await expect(page.locator('[data-testid="leave-cancel-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="leave-confirm-btn"]')).toBeVisible();
  });

  test("H227: Leave confirm button has destructive styling", async ({ page }) => {
    await page.locator('[data-testid="leave-household-btn"]').click();
    await expect(
      page.locator('[data-testid="leave-household-dialog"]')
    ).toBeVisible({ timeout: 5000 });

    const confirmBtn = page.locator('[data-testid="leave-confirm-btn"]');
    const className = await confirmBtn.getAttribute("class");
    expect(className).toMatch(/destructive|red|bg-destructive/i);
  });

  test("H228: Delete Account button is visible in Danger Zone", async ({ page }) => {
    await expect(
      page.locator('[data-testid="delete-account-btn"]')
    ).toBeVisible({ timeout: 10_000 });
  });

  test("H229: Danger Zone card has warning border styling", async ({ page }) => {
    const zone = page.locator('[data-testid="danger-zone"]');
    await expect(zone).toBeVisible({ timeout: 10_000 });
    const className = await zone.getAttribute("class");
    expect(className).toMatch(/red/i);
  });
});

// ─── H230–H244: Delete Account Dialogs ──────────────────────────────────────

test.describe("Suite H: Offboarding — Delete Account Dialogs", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/settings");
  });

  test("H230: Clicking Delete Account opens warning dialog (step 1)", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    await expect(
      page.locator('[data-testid="delete-account-dialog"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("H231: Warning dialog lists deletion consequences", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    const dialog = page.locator('[data-testid="delete-account-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const text = await dialog.textContent();
    expect(text).toMatch(/permanent|cannot be undone/i);
    expect(text).toMatch(/delete/i);
  });

  test("H232: Cancel on warning step closes dialog", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    const dialog = page.locator('[data-testid="delete-account-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="delete-cancel-btn"]').click();
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("H233: Continue button advances to type-DELETE step", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    await expect(
      page.locator('[data-testid="delete-account-dialog"]')
    ).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="delete-continue-btn"]').click();

    // The DELETE confirmation input should now be visible
    await expect(
      page.locator('[data-testid="delete-confirm-input"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("H234: Proceed button is disabled until 'DELETE' is typed", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    await expect(
      page.locator('[data-testid="delete-account-dialog"]')
    ).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="delete-continue-btn"]').click();

    const proceedBtn = page.locator('[data-testid="delete-proceed-btn"]');
    await expect(proceedBtn).toBeDisabled();
  });

  test("H235: Typing 'DELETE' enables proceed button", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    await expect(
      page.locator('[data-testid="delete-account-dialog"]')
    ).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="delete-continue-btn"]').click();

    await page.locator('[data-testid="delete-confirm-input"]').fill("DELETE");
    await expect(
      page.locator('[data-testid="delete-proceed-btn"]')
    ).toBeEnabled();
  });

  test("H236: Typing 'delete' (lowercase) does NOT enable proceed button", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    await expect(
      page.locator('[data-testid="delete-account-dialog"]')
    ).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="delete-continue-btn"]').click();

    await page.locator('[data-testid="delete-confirm-input"]').fill("delete");
    await expect(
      page.locator('[data-testid="delete-proceed-btn"]')
    ).toBeDisabled();
  });

  test("H237: Proceed advances to re-authentication step", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    await expect(
      page.locator('[data-testid="delete-account-dialog"]')
    ).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="delete-continue-btn"]').click();
    await page.locator('[data-testid="delete-confirm-input"]').fill("DELETE");
    await page.locator('[data-testid="delete-proceed-btn"]').click();

    // Re-auth step: the final delete button should be visible
    await expect(
      page.locator('[data-testid="delete-final-btn"]')
    ).toBeVisible({ timeout: 5000 });
  });

  test("H238: Cancel on re-auth step closes entire dialog", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    await expect(
      page.locator('[data-testid="delete-account-dialog"]')
    ).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="delete-continue-btn"]').click();
    await page.locator('[data-testid="delete-confirm-input"]').fill("DELETE");
    await page.locator('[data-testid="delete-proceed-btn"]').click();

    await page.locator('[data-testid="delete-cancel-btn"]').click();
    await expect(
      page.locator('[data-testid="delete-account-dialog"]')
    ).toBeHidden({ timeout: 3000 });
  });

  test("H239: Final delete button is disabled when password is empty (email users)", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    await expect(
      page.locator('[data-testid="delete-account-dialog"]')
    ).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="delete-continue-btn"]').click();
    await page.locator('[data-testid="delete-confirm-input"]').fill("DELETE");
    await page.locator('[data-testid="delete-proceed-btn"]').click();

    const passwordInput = page.locator('[data-testid="reauth-password-input"]');
    const isPasswordAuth = await passwordInput.isVisible().catch(() => false);

    if (isPasswordAuth) {
      const finalBtn = page.locator('[data-testid="delete-final-btn"]');
      await expect(finalBtn).toBeDisabled();
    } else {
      // Google OAuth user — password field not shown, test still passes
      console.log("H239: Google OAuth user — password field not shown (expected).");
    }
  });

  test("H240: Wrong password shows error message", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    await expect(
      page.locator('[data-testid="delete-account-dialog"]')
    ).toBeVisible({ timeout: 5000 });
    await page.locator('[data-testid="delete-continue-btn"]').click();
    await page.locator('[data-testid="delete-confirm-input"]').fill("DELETE");
    await page.locator('[data-testid="delete-proceed-btn"]').click();

    const passwordInput = page.locator('[data-testid="reauth-password-input"]');
    const isPasswordAuth = await passwordInput.isVisible().catch(() => false);

    if (isPasswordAuth) {
      await passwordInput.fill("WrongPassword123");
      await page.locator('[data-testid="delete-final-btn"]').click();

      await expect(
        page.locator('[data-testid="reauth-error"]')
      ).toBeVisible({ timeout: 8000 });
    } else {
      console.log("H240: Google OAuth user — skipping wrong password test.");
    }
  });

  test("H241: Delete dialog Escape key dismisses at any step", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    const dialog = page.locator('[data-testid="delete-account-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden({ timeout: 3000 });
  });

  test("H242: Delete account button has destructive variant", async ({ page }) => {
    const deleteBtn = page.locator('[data-testid="delete-account-btn"]');
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });

    const className = await deleteBtn.getAttribute("class");
    expect(className).toMatch(/destructive|red/i);
  });

  test("H243: Danger Zone shows both Leave and Delete options", async ({ page }) => {
    await expect(
      page.locator('[data-testid="leave-household-btn"]')
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.locator('[data-testid="delete-account-btn"]')
    ).toBeVisible();
  });

  test("H244: Delete dialog warning step mentions 'permanent'", async ({ page }) => {
    await page.locator('[data-testid="delete-account-btn"]').click();
    const dialog = page.locator('[data-testid="delete-account-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const text = await dialog.textContent();
    expect(text?.toLowerCase()).toContain("permanent");
  });
});
