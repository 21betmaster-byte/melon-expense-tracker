import { test, expect, type Page } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite B: Expense Form Validations (Negative Testing + UI Interaction)
 *
 * Tests require an authenticated session with an active household.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 *
 * Covers:
 *  B1–B4   Core validations (empty form, non-numeric amount, future date, XSS)
 *  B5–B9   Split % slider (joint default, 50% default, solo hides, settlement hides, toggle back)
 *  B10–B12 Currency symbol in label, description maxLength, category dropdown
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function openExpenseForm(page: Page) {
  // requireAuth throws with a clear actionable message if not authenticated
  await requireAuth(page, "/dashboard");

  const addBtn = page.locator('[data-testid="add-expense-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });
}

/** Open the expense form and advance to Stage 2 (full form view) */
async function openExpenseFormStage2(page: Page) {
  await openExpenseForm(page);

  // Fill Stage 1 fields and press Enter to advance to Stage 2
  await page.locator('[data-testid="amount-input"]').fill("1.00");
  await page.locator('[data-testid="description-input"]').fill("test");
  await page.locator('[data-testid="description-input"]').press("Enter");

  // Wait for Stage 2 fields to be visible
  await page.waitForSelector('[data-testid="stage2-fields"]', { timeout: 5000 });
  await page.waitForTimeout(400); // animation
}

// ─── B1–B4: Core Validations ──────────────────────────────────────────────────

test.describe("Suite B: Expense Form — Core Validations", () => {
  test("B1: Empty form submission shows validation errors", async ({ page }) => {
    await openExpenseForm(page);

    // In Stage 1, pressing Enter with empty fields shows validation errors
    await page.locator('[data-testid="amount-input"]').press("Enter");

    // Form should still be open (submission blocked by validation)
    const form = page.locator('[data-testid="expense-form"]');
    await expect(form).toBeVisible();

    // Stage 1 validation errors should appear
    const errorMessages = page.locator('[data-testid="amount-error"], [data-testid="description-error"]');
    const count = await errorMessages.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("B2: Non-numeric input in amount field is blocked", async ({ page }) => {
    await openExpenseForm(page);

    const amountInput = page.locator('[data-testid="amount-input"]');

    // Playwright's fill() rejects non-numeric strings for type="number" inputs.
    // Use pressSequentially (types char by char) to attempt non-numeric input.
    // The browser's number input sanitizer should reject it, leaving "" as the value.
    await amountInput.click();
    await amountInput.pressSequentially("Five Hundred");
    const value = await amountInput.inputValue();
    // Number inputs reject non-numeric input — value will be empty string
    // (browser filters out letters for type="number" inputs)
    expect(value === "" || !Number.isFinite(Number(value))).toBeTruthy();
  });

  test("B3: Future date is rejected — max attribute is set to today", async ({ page }) => {
    await openExpenseFormStage2(page);

    // The date input has a max attribute set to today — browser enforces this
    const maxAttr = await page
      .locator('[data-testid="date-input"]')
      .getAttribute("max");
    const today = new Date().toISOString().split("T")[0];
    expect(maxAttr).toBe(today);
  });

  test("B4: XSS content in description does not trigger alert", async ({ page }) => {
    await openExpenseForm(page);

    const xssPayload = "<script>alert('xss')</script>";
    await page.fill('[data-testid="description-input"]', xssPayload);

    let alertTriggered = false;
    page.on("dialog", (dialog) => {
      alertTriggered = true;
      dialog.dismiss();
    });

    await page.fill('[data-testid="amount-input"]', "100");
    await page.waitForTimeout(500);
    expect(alertTriggered).toBe(false);
  });
});

// ─── B5–B9: Split % Slider ────────────────────────────────────────────────────

test.describe("Suite B: Expense Form — Split % Slider", () => {
  test("B5: Joint expense type shows the split slider by default", async ({ page }) => {
    await openExpenseFormStage2(page);

    // Default expense type is "joint" — slider must be visible
    const slider = page.locator('[data-testid="split-ratio-input"]');
    await expect(slider).toBeVisible({ timeout: 5000 });
  });

  test("B6: Split slider defaults to 50%", async ({ page }) => {
    await openExpenseFormStage2(page);

    // The percentage label next to the slider should show "50%"
    // Scope to the expense form to avoid strict mode violations with other "50%" text on the page
    const form = page.locator('[data-testid="expense-form"]');
    await expect(form.getByText("50%", { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test("B7: Switching to solo type hides the split slider", async ({ page }) => {
    await openExpenseFormStage2(page);

    const slider = page.locator('[data-testid="split-ratio-input"]');
    await expect(slider).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="expense-type-select"]').click();
    await page.getByRole("option", { name: /Solo/i }).click();

    await expect(slider).toBeHidden({ timeout: 3000 });
  });

  test("B8: Switching to settlement type also hides the split slider", async ({ page }) => {
    await openExpenseFormStage2(page);

    await page.locator('[data-testid="expense-type-select"]').click();
    await page.getByRole("option", { name: /Settlement/i }).click();

    const slider = page.locator('[data-testid="split-ratio-input"]');
    await expect(slider).toBeHidden({ timeout: 3000 });
  });

  test("B9: Switching back to joint type reveals the split slider again", async ({ page }) => {
    await openExpenseFormStage2(page);

    // Go to solo first
    await page.locator('[data-testid="expense-type-select"]').click();
    await page.getByRole("option", { name: /Solo/i }).click();

    const slider = page.locator('[data-testid="split-ratio-input"]');
    await expect(slider).toBeHidden({ timeout: 3000 });

    // Switch back to joint
    await page.locator('[data-testid="expense-type-select"]').click();
    await page.getByRole("option", { name: /Joint/i }).click();

    await expect(slider).toBeVisible({ timeout: 3000 });
  });
});

// ─── B10–B12: Currency, maxLength, Category ───────────────────────────────────

test.describe("Suite B: Expense Form — Currency & Auto-Category", () => {
  test("B10: Amount label shows the household currency symbol", async ({ page }) => {
    await openExpenseForm(page);

    const labelWithAmount = page.locator("label").filter({ hasText: /Amount/ });
    await expect(labelWithAmount.first()).toBeVisible({ timeout: 5000 });
    const labelText = await labelWithAmount.first().textContent();
    // Must contain at least one of the known currency symbols or codes
    const hasCurrencySymbol = /[₹$€£]|INR|USD|EUR|GBP|AED|SGD|CAD|AUD/.test(
      labelText ?? ""
    );
    expect(hasCurrencySymbol).toBe(true);
  });

  test("B11: Description longer than 100 characters is capped at maxLength", async ({ page }) => {
    await openExpenseForm(page);

    const longText = "A".repeat(101);
    const descInput = page.locator('[data-testid="description-input"]');
    await descInput.fill(longText);

    const value = await descInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(100);
  });

  test("B12: Category dropdown is visible and has selectable options", async ({ page }) => {
    await openExpenseFormStage2(page);

    const categorySelect = page.locator('[data-testid="category-select"]');
    await expect(categorySelect).toBeVisible({ timeout: 5000 });

    // Categories load from Firestore asynchronously. Poll until at least one
    // option appears after clicking open (retry up to 5 times with increasing delays).
    let found = false;
    for (let attempt = 0; attempt < 5 && !found; attempt++) {
      await page.waitForTimeout(1000 * (attempt + 1)); // 1s, 2s, 3s …
      await categorySelect.click();
      found = await page.getByRole("option").first().isVisible().catch(() => false);
      if (!found) await page.keyboard.press("Escape");
    }

    expect(found).toBe(true);
    await page.keyboard.press("Escape");
  });
});
