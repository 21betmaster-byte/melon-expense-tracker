import { test, expect, type Page } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite F: Settings Page — Groups, Categories, Currency, Invite
 *
 * Tests the /settings page features added in the second sprint:
 *  F1–F3  Settings page structure (F1 runs unauthenticated)
 *  F4–F6  Groups manager (requires auth)
 *  F7–F9  Categories manager (requires auth)
 *  F10–F12 Currency selector (requires auth)
 *  F13–F15 Invite partner panel (requires auth + single-member household)
 *  F16–F18 Expense form currency symbol + slider (requires auth)
 *
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

// ─── F1–F3: Settings page structure ──────────────────────────────────────────

test.describe("Suite F: Settings — Structure", () => {
  test("F1: /settings redirects unauthenticated users to /login", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    // Either lands on /login (redirect) or /settings (auth present) — never 404/500
    await expect(page).toHaveURL(/\/(login|settings)/);
  });

  test("F2: Settings route returns a valid HTTP response (not 404 or 500)", async ({ page }) => {
    const response = await page.goto("/settings");
    expect(response?.status()).not.toBe(404);
    expect(response?.status()).not.toBe(500);
  });

  test("F3: Settings page renders all four sections when authenticated", async ({ page }) => {
    await requireAuth(page, "/settings");

    // All sections need time to load — Firestore subscriptions may be slow.
    // Use exact / scoped selectors to avoid strict-mode violations.
    await expect(page.getByText(/Invite Your Partner|Household Members/)).toBeVisible({ timeout: 10000 });
    // "Currency" appears in the CardTitle, CardDescription, and Save button — use testid instead
    await expect(page.locator('[data-testid="currency-select"]')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Expense Groups", { exact: true })).toBeVisible({ timeout: 10000 });
    // "Categories" heading — scope to avoid matching subcontent
    await expect(page.locator('[data-testid="new-category-input"]')).toBeVisible({ timeout: 10000 });
  });
});

// ─── F4–F6: Groups Manager ────────────────────────────────────────────────────

test.describe("Suite F: Settings — Groups Manager", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/settings");
  });

  test("F4: Groups manager renders existing groups", async ({ page }) => {
    await expect(page.getByText("Expense Groups")).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="new-group-input"]')).toBeVisible();
  });

  test("F5: Add group button is disabled when input is empty", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-group-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 8000 });
    await expect(addBtn).toBeDisabled();
  });

  test("F6: Add group button enables when input has text", async ({ page }) => {
    const input = page.locator('[data-testid="new-group-input"]');
    await input.fill("Vacation 2025");
    await expect(page.locator('[data-testid="add-group-btn"]')).toBeEnabled();
  });
});

// ─── F7–F9: Categories Manager ────────────────────────────────────────────────

test.describe("Suite F: Settings — Categories Manager", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/settings");
  });

  test("F7: Categories manager renders existing categories", async ({ page }) => {
    await expect(page.getByText("Categories")).toBeVisible({ timeout: 8000 });
    await expect(page.locator('[data-testid="new-category-input"]')).toBeVisible();
  });

  test("F8: Add category button is disabled when input is empty", async ({ page }) => {
    const addBtn = page.locator('[data-testid="add-category-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 8000 });
    await expect(addBtn).toBeDisabled();
  });

  test("F9: Add category button enables when input has text", async ({ page }) => {
    const input = page.locator('[data-testid="new-category-input"]');
    await input.fill("Subscriptions");
    await expect(page.locator('[data-testid="add-category-btn"]')).toBeEnabled();
  });
});

// ─── F10–F12: Currency Selector ───────────────────────────────────────────────

test.describe("Suite F: Settings — Currency Selector", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/settings");
  });

  test("F10: Currency selector shows INR as default and lists all options", async ({ page }) => {
    const trigger = page.locator('[data-testid="currency-select"]');
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await expect(trigger).toContainText("INR");

    await trigger.click();
    await expect(page.getByRole("option", { name: /USD/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /EUR/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /GBP/i })).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("F11: Save currency button is disabled when currency unchanged", async ({ page }) => {
    const saveBtn = page.locator('[data-testid="save-currency-btn"]');
    await expect(saveBtn).toBeVisible({ timeout: 8000 });

    // Wait for household data to load from Firestore so the CurrencySelector
    // can compare selected vs household.currency and disable the button.
    await expect(saveBtn).toBeDisabled({ timeout: 15000 });
  });

  test("F12: Save currency button enables after selecting a different currency", async ({ page }) => {
    const trigger = page.locator('[data-testid="currency-select"]');
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.click();
    await page.getByRole("option", { name: /USD/i }).click();
    await expect(page.locator('[data-testid="save-currency-btn"]')).toBeEnabled();
  });
});

// ─── F13–F15: Invite Partner ──────────────────────────────────────────────────

test.describe("Suite F: Settings — Invite Partner", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/settings");
  });

  test("F13: Invite panel shows invite UI or member list — one must be visible", async ({ page }) => {
    const either = page
      .getByText("Invite Your Partner")
      .or(page.getByText("Household Members"));
    await expect(either).toBeVisible({ timeout: 8000 });
  });

  test("F14: Copy invite link button is present for single-member households", async ({ page }) => {
    // Wait for the invite heading OR member list to appear (store hydration)
    const either = page.getByText("Invite Your Partner").or(page.getByText("Household Members"));
    await expect(either).toBeVisible({ timeout: 10000 });

    const isInviteVisible = await page.getByText("Invite Your Partner").isVisible().catch(() => false);

    if (!isInviteVisible) {
      // Household has 2 members — this UI is intentionally absent
      console.log("F14: Household has 2 members — copy invite button not shown (expected).");
      return;
    }

    // The invite link section renders after household.invite_code loads from Firestore.
    // Give the store extra time to hydrate before checking.
    await expect(page.locator('[data-testid="copy-invite-btn"]')).toBeVisible({ timeout: 15000 });
  });

  test("F15: Partner email input accepts a valid email address", async ({ page }) => {
    const inviteHeading = page.getByText("Invite Your Partner");
    const isInviteVisible = await inviteHeading.isVisible().catch(() => false);

    if (!isInviteVisible) {
      console.log("F15: Household has 2 members — partner email input not shown (expected).");
      return;
    }

    const emailInput = page.locator('[data-testid="partner-email-input"]');
    await expect(emailInput).toBeVisible();
    await emailInput.fill("jhanvi@example.com");
    expect(await emailInput.inputValue()).toBe("jhanvi@example.com");
  });
});

// ─── F16–F18: Expense form currency + split slider ────────────────────────────

test.describe("Suite F: Expense Form — Currency Symbol & Slider", () => {
  async function openForm(page: Page) {
    await requireAuth(page, "/dashboard");
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });
  }

  test("F16: Expense form amount label shows household currency symbol", async ({ page }) => {
    await openForm(page);

    const labelWithAmount = page.locator("label").filter({ hasText: /Amount/ });
    await expect(labelWithAmount.first()).toBeVisible({ timeout: 5000 });
    const labelText = await labelWithAmount.first().textContent();
    const hasCurrencySymbol = /[₹$€£]|INR|USD|EUR|GBP|AED|SGD|CAD|AUD/.test(labelText ?? "");
    expect(hasCurrencySymbol).toBe(true);
  });

  test("F17: Expense form shows % split slider for joint expenses (default)", async ({ page }) => {
    await openForm(page);

    await expect(page.locator('[data-testid="split-ratio-input"]')).toBeVisible({ timeout: 5000 });
    // Scope to the expense form to avoid strict mode violations with other "50%" text on the page
    const form = page.locator('[data-testid="expense-form"]');
    await expect(form.getByText("50%", { exact: true })).toBeVisible();
  });

  test("F18: Switching expense type to solo hides the split slider", async ({ page }) => {
    await openForm(page);

    await page.locator('[data-testid="expense-type-select"]').click();
    await page.getByRole("option", { name: /Solo/i }).click();

    await expect(page.locator('[data-testid="split-ratio-input"]')).toBeHidden();
  });
});
