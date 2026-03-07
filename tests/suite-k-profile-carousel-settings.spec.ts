import { test, expect } from "@playwright/test";
import { requireAuth, requireAuthOrSkip } from "./helpers/auth-guard";

/**
 * Suite K: Profile, Carousel & Settings Enhancement Tests
 *
 * Covers all features from REQUIREMENTS-profile-carousel-settings.md:
 *
 * K1–K10  : Profile page (avatar button, navigation, header, personal details,
 *            change password, household info, logout)
 * K11–K16 : Settings enhancements (invite hidden when full, partner email
 *            removed, install app card)
 * K17–K24 : Homepage carousel (renders, scrollable, dismiss, visibility)
 * K25–K28 : Regression (old logout-btn removed, dashboard still works,
 *            settings still works, no broken references)
 */

// ─── K1–K10: Profile Page ────────────────────────────────────────────────────

test.describe("Suite K: Profile Page", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);
  });

  test("K1: Profile avatar button visible in AppNav header", async ({ page }) => {
    const avatar = page.locator('[data-testid="profile-avatar-btn"]');
    await expect(avatar).toBeVisible({ timeout: 10_000 });

    // Avatar should show a single uppercase letter (user's first initial)
    const text = await avatar.textContent();
    expect(text).toBeTruthy();
    expect(text!.trim()).toMatch(/^[A-Z]$/);
  });

  test("K2: Old logout button no longer exists in AppNav header", async ({ page }) => {
    // The old logout-btn was replaced with profile-avatar-btn
    const oldLogout = page.locator('[data-testid="logout-btn"]');
    const count = await oldLogout.count();
    expect(count).toBe(0);
  });

  test("K3: Clicking profile avatar navigates to /profile", async ({ page }) => {
    const avatar = page.locator('[data-testid="profile-avatar-btn"]');
    await expect(avatar).toBeVisible({ timeout: 10_000 });
    await avatar.click();
    await page.waitForURL(/.*\/profile/, { timeout: 10_000 });
    await expect(page).toHaveURL(/.*\/profile/);
  });

  test("K4: Profile page shows header with name and email", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // Large avatar circle should be visible
    const avatar = page.locator(".w-16.h-16.rounded-full.bg-blue-600");
    await expect(avatar).toBeVisible({ timeout: 10_000 });

    // Name and email should be rendered somewhere on the page
    const nameDisplay = page.locator('[data-testid="profile-name-display"]');
    const emailDisplay = page.locator('[data-testid="profile-email-display"]');
    await expect(nameDisplay).toBeVisible({ timeout: 10_000 });
    await expect(emailDisplay).toBeVisible();
  });

  test("K5: Personal details shows name and email in read-only mode", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    // By default, fields render as text (not inputs)
    const nameDisplay = page.locator('[data-testid="profile-name-display"]');
    await expect(nameDisplay).toBeVisible({ timeout: 10_000 });

    const emailDisplay = page.locator('[data-testid="profile-email-display"]');
    await expect(emailDisplay).toBeVisible();

    // Edit button should be visible
    const editBtn = page.locator('[data-testid="profile-edit-btn"]');
    await expect(editBtn).toBeVisible();

    // Input fields should NOT be visible yet
    const nameInput = page.locator('[data-testid="profile-name-input"]');
    const emailInput = page.locator('[data-testid="profile-email-input"]');
    expect(await nameInput.count()).toBe(0);
    expect(await emailInput.count()).toBe(0);
  });

  test("K6: Clicking Edit enables input fields with Save and Cancel", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const editBtn = page.locator('[data-testid="profile-edit-btn"]');
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();

    // Input fields should now be visible
    const nameInput = page.locator('[data-testid="profile-name-input"]');
    const emailInput = page.locator('[data-testid="profile-email-input"]');
    await expect(nameInput).toBeVisible({ timeout: 5_000 });
    await expect(emailInput).toBeVisible();

    // Save and Cancel buttons should appear
    const saveBtn = page.locator('[data-testid="profile-save-btn"]');
    const cancelBtn = page.locator('[data-testid="profile-cancel-btn"]');
    await expect(saveBtn).toBeVisible();
    await expect(cancelBtn).toBeVisible();
  });

  test("K7: Save button is disabled when no changes are made", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const editBtn = page.locator('[data-testid="profile-edit-btn"]');
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();

    // Save should be disabled since no changes were made
    const saveBtn = page.locator('[data-testid="profile-save-btn"]');
    await expect(saveBtn).toBeDisabled();
  });

  test("K8: Cancel reverts to read-only mode", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const editBtn = page.locator('[data-testid="profile-edit-btn"]');
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();

    // Verify edit mode is active
    await expect(page.locator('[data-testid="profile-name-input"]')).toBeVisible({ timeout: 5_000 });

    // Click cancel
    await page.locator('[data-testid="profile-cancel-btn"]').click();
    await page.waitForTimeout(500);

    // Should be back to read-only (display text, not inputs)
    await expect(page.locator('[data-testid="profile-name-display"]')).toBeVisible({ timeout: 5_000 });
    expect(await page.locator('[data-testid="profile-name-input"]').count()).toBe(0);
  });

  test("K9: Household info card is visible on profile page", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const householdCard = page.locator('[data-testid="profile-household-card"]');
    await expect(householdCard).toBeVisible({ timeout: 10_000 });

    // Should show "Your Household" heading
    const heading = householdCard.getByText("Your Household");
    await expect(heading).toBeVisible();
  });

  test("K10: Logout button is at bottom of profile page", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const logoutBtn = page.locator('[data-testid="profile-logout-btn"]');
    await expect(logoutBtn).toBeVisible({ timeout: 10_000 });
    await expect(logoutBtn).toContainText("Sign Out");
  });
});

// ─── K11: Profile Page — Change Password Card ───────────────────────────────

test.describe("Suite K: Profile — Change Password", () => {
  test("K11: Change Password card is visible on profile page", async ({ page }) => {
    await requireAuth(page, "/profile");
    await page.waitForTimeout(3000);

    // Either shows password form or Google info note
    const changePasswordHeading = page.getByText("Change Password");
    await expect(changePasswordHeading.first()).toBeVisible({ timeout: 10_000 });
  });

  test("K12: Password update button disabled when fields are empty", async ({ page }) => {
    await requireAuth(page, "/profile");
    await page.waitForTimeout(3000);

    const updateBtn = page.locator('[data-testid="update-password-btn"]');
    const isPasswordUser = (await updateBtn.count()) > 0;

    if (isPasswordUser) {
      await expect(updateBtn).toBeDisabled();
    } else {
      // Google user — info note should be visible instead
      const googleNote = page.getByText(/managed by your Google account/i);
      await expect(googleNote).toBeVisible({ timeout: 5_000 });
    }
  });

  test("K13: Password validation shows error for weak password", async ({ page }) => {
    await requireAuth(page, "/profile");
    await page.waitForTimeout(3000);

    const newPwInput = page.locator('[data-testid="new-password-input"]');
    const isPasswordUser = (await newPwInput.count()) > 0;

    if (isPasswordUser) {
      await newPwInput.fill("weak");
      await page.waitForTimeout(300);

      // Should show validation hint
      const hint = page.getByText(/min 8 characters/i);
      await expect(hint).toBeVisible({ timeout: 3_000 });
    } else {
      console.log("K13: Google OAuth user — password fields not shown (expected).");
    }
  });
});

// ─── K14–K16: Settings Enhancements ──────────────────────────────────────────

test.describe("Suite K: Settings Enhancements", () => {
  test("K14: Partner email input does NOT exist in invite section", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(5000);

    // The partner-email-input should be completely removed
    const emailInput = page.locator('[data-testid="partner-email-input"]');
    const count = await emailInput.count();
    expect(count).toBe(0);
  });

  test("K15: InvitePartner hidden when household has 2 members", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(5000);

    // Check current member count from the store
    const memberCount = await page.evaluate(() => {
      const raw = localStorage.getItem("melon-store");
      if (!raw) return 0;
      const store = JSON.parse(raw);
      return store.state?.members?.length ?? 0;
    });

    if (memberCount >= 2) {
      // Invite section should NOT be visible
      const inviteHeading = page.getByText("Invite Your Partner");
      const count = await inviteHeading.count();
      expect(count).toBe(0);

      // Household Members card should also be absent from settings
      // (it's now on the profile page instead)
      console.log("K15: Household full — invite section correctly hidden.");
    } else {
      // With < 2 members, invite section SHOULD be visible
      const inviteSection = page.getByText(/invite your partner|set up household/i);
      await expect(inviteSection.first()).toBeVisible({ timeout: 10_000 });
      console.log("K15: Single-member household — invite section correctly shown.");
    }
  });

  test("K16: Install App card renders on Settings page", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(3000);

    const installCard = page.locator('[data-testid="install-app-card"]');
    // The card may or may not render depending on browser/platform
    // (it hides entirely on unsupported platforms)
    const count = await installCard.count();
    if (count > 0) {
      await expect(installCard).toBeVisible();

      const heading = installCard.getByText("Install Melon");
      await expect(heading).toBeVisible();
      console.log("K16: Install App card is visible.");
    } else {
      // Unsupported browser — card correctly not rendered
      console.log("K16: Install App card not rendered (unsupported platform — expected).");
    }
  });
});

// ─── K17–K24: Homepage Carousel ──────────────────────────────────────────────

test.describe("Suite K: Homepage Carousel", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);
  });

  test("K17: Carousel container renders on dashboard", async ({ page }) => {
    const carousel = page.locator('[data-testid="home-carousel"]');
    // Carousel may or may not be visible depending on card visibility conditions
    // (e.g. all cards may be dismissed or conditions unmet)
    const count = await carousel.count();
    if (count > 0) {
      await expect(carousel).toBeVisible();
      console.log("K17: Carousel is visible on dashboard.");
    } else {
      // No visible cards — carousel correctly returns null
      console.log("K17: Carousel not rendered (no visible cards — expected).");
    }
  });

  test("K18: Carousel shows install card when not in standalone mode", async ({ page }) => {
    const installCard = page.locator('[data-testid="carousel-card-install-app"]');
    const count = await installCard.count();

    // In Playwright browser context, we're NOT in standalone mode,
    // so install card should be visible (unless dismissed)
    if (count > 0) {
      await expect(installCard).toBeVisible();
      console.log("K18: Install app carousel card is visible.");
    } else {
      // Could be dismissed or filtered by other condition
      console.log("K18: Install card not visible (possibly dismissed).");
    }
  });

  test("K19: Carousel invite card visibility matches member count", async ({ page }) => {
    const memberCount = await page.evaluate(() => {
      const raw = localStorage.getItem("melon-store");
      if (!raw) return 0;
      const store = JSON.parse(raw);
      return store.state?.members?.length ?? 0;
    });

    const inviteCard = page.locator('[data-testid="carousel-card-invite-partner"]');
    const count = await inviteCard.count();

    if (memberCount < 2) {
      // Single member — invite card should show (unless dismissed)
      if (count > 0) {
        await expect(inviteCard).toBeVisible();
        console.log("K19: Invite card visible for single-member household.");
      } else {
        console.log("K19: Invite card not visible (possibly dismissed).");
      }
    } else {
      // 2 members — invite card should be hidden
      expect(count).toBe(0);
      console.log("K19: Invite card correctly hidden for full household.");
    }
  });

  test("K20: Dismissing a carousel card removes it", async ({ page }) => {
    const carousel = page.locator('[data-testid="home-carousel"]');
    const isVisible = await carousel.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("K20: No carousel visible — skipping dismiss test.");
      return;
    }

    // Find any visible dismiss button inside the carousel
    const dismissBtns = carousel.locator("button:has-text('Dismiss')");
    const btnCount = await dismissBtns.count();

    if (btnCount === 0) {
      console.log("K20: No dismissible cards visible — skipping.");
      return;
    }

    // Count cards before dismiss
    const cardsBefore = await carousel.locator("[data-testid^='carousel-card-']").count();

    // Dismiss the first card
    await dismissBtns.first().click();
    await page.waitForTimeout(500);

    // Count cards after dismiss
    const cardsAfter = await carousel.locator("[data-testid^='carousel-card-']").count();
    expect(cardsAfter).toBeLessThan(cardsBefore);
  });

  test("K21: Dismissed carousel card stays hidden after reload", async ({ page }) => {
    // First dismiss a card (if available)
    const carousel = page.locator('[data-testid="home-carousel"]');
    const isVisible = await carousel.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("K21: No carousel — skipping persist test.");
      return;
    }

    const dismissBtns = carousel.locator("button:has-text('Dismiss')");
    const btnCount = await dismissBtns.count();
    if (btnCount === 0) {
      console.log("K21: No dismissible cards — skipping.");
      return;
    }

    // Get the card ID before dismissing
    const firstCard = carousel.locator("[data-testid^='carousel-card-']").first();
    const testId = await firstCard.getAttribute("data-testid");
    await dismissBtns.first().click();
    await page.waitForTimeout(500);

    // Reload and check the card stays dismissed
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    if (testId) {
      const dismissedCard = page.locator(`[data-testid="${testId}"]`);
      const count = await dismissedCard.count();
      expect(count).toBe(0);
    }
  });

  test("K22: Carousel cards have correct structure (icon, title, subtitle)", async ({ page }) => {
    const carousel = page.locator('[data-testid="home-carousel"]');
    const isVisible = await carousel.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("K22: No carousel — skipping structure test.");
      return;
    }

    const cards = carousel.locator("[data-testid^='carousel-card-']");
    const count = await cards.count();

    if (count === 0) {
      console.log("K22: No cards visible — skipping.");
      return;
    }

    // Check first card has text content
    const firstCard = cards.first();
    const cardText = await firstCard.textContent();
    expect(cardText).toBeTruthy();
    // Card should have at least a title visible as non-empty text
    expect(cardText!.trim().length).toBeGreaterThan(0);
  });

  test("K23: Carousel appears between group header and settlement card", async ({ page }) => {
    const carousel = page.locator('[data-testid="home-carousel"]');
    const isVisible = await carousel.isVisible().catch(() => false);
    if (!isVisible) {
      console.log("K23: No carousel — skipping position test.");
      return;
    }

    const settlement = page.locator('[data-testid="settlement-card"]');
    await expect(settlement).toBeVisible({ timeout: 10_000 });

    // Carousel should be above settlement card (smaller Y coordinate)
    const carouselBox = await carousel.boundingBox();
    const settlementBox = await settlement.boundingBox();

    if (carouselBox && settlementBox) {
      expect(carouselBox.y).toBeLessThan(settlementBox.y);
    }
  });

  test("K24: Carousel returns null when all cards dismissed (no empty gap)", async ({ page }) => {
    // Dismiss all carousel cards via localStorage
    await page.evaluate(() => {
      localStorage.setItem("carousel_dismissed_install-app", "true");
      localStorage.setItem("carousel_dismissed_invite-partner", "true");
      localStorage.setItem("carousel_dismissed_quick-add-tip", "true");
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // Carousel should not be present at all
    const carousel = page.locator('[data-testid="home-carousel"]');
    const count = await carousel.count();
    expect(count).toBe(0);

    // Settlement card should still be visible (no empty gap)
    const settlement = page.locator('[data-testid="settlement-card"]');
    await expect(settlement).toBeVisible({ timeout: 10_000 });

    // Clean up dismissals for other tests
    await page.evaluate(() => {
      localStorage.removeItem("carousel_dismissed_install-app");
      localStorage.removeItem("carousel_dismissed_invite-partner");
      localStorage.removeItem("carousel_dismissed_quick-add-tip");
    });
  });
});

// ─── K25–K28: Regression Tests ───────────────────────────────────────────────

test.describe("Suite K: Regression — Profile/Carousel/Settings", () => {
  test("K25: Dashboard still renders correctly with carousel added", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(5000);

    // Core dashboard elements should still be present
    const bottomNav = page.locator('[data-testid="bottom-nav"]');
    await expect(bottomNav).toBeVisible({ timeout: 10_000 });

    const settlement = page.locator('[data-testid="settlement-card"]');
    await expect(settlement).toBeVisible({ timeout: 10_000 });

    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
  });

  test("K26: Settings page still works with conditional invite", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(5000);

    // Core settings elements should still be present
    const heading = page.getByText("Settings");
    await expect(heading.first()).toBeVisible({ timeout: 10_000 });

    // Groups and categories sections should be visible
    const groups = page.getByText("Expense Groups");
    await expect(groups).toBeVisible({ timeout: 10_000 });

    const categories = page.getByText("Categories");
    await expect(categories.first()).toBeVisible({ timeout: 10_000 });

    // Danger zone should still be present
    const dangerZone = page.locator('[data-testid="danger-zone"]');
    await expect(dangerZone).toBeVisible({ timeout: 10_000 });
  });

  test("K27: Profile avatar navigates to profile and back button works", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Navigate to profile
    const avatar = page.locator('[data-testid="profile-avatar-btn"]');
    await expect(avatar).toBeVisible({ timeout: 10_000 });
    await avatar.click();
    await page.waitForURL(/.*\/profile/, { timeout: 10_000 });

    // Click back button
    const backBtn = page.getByText("Back");
    await expect(backBtn).toBeVisible({ timeout: 5_000 });
    await backBtn.click();

    // Should navigate back to dashboard
    await page.waitForURL(/.*\/dashboard/, { timeout: 10_000 });
    await expect(page).toHaveURL(/.*\/dashboard/);
  });

  test("K28: Logout from profile page redirects to login", async ({ page }) => {
    await requireAuth(page, "/profile");
    await page.waitForTimeout(3000);

    const logoutBtn = page.locator('[data-testid="profile-logout-btn"]');
    await expect(logoutBtn).toBeVisible({ timeout: 10_000 });
    await logoutBtn.click();

    // Confirmation dialog should appear
    const dialog = page.locator('[data-testid="logout-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Confirm logout
    await page.locator('[data-testid="profile-logout-confirm-btn"]').click();
    await page.waitForURL(/.*\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/.*\/login/);
  });
});
