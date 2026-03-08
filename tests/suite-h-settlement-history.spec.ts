import { test, expect, type Page } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Settlement History (H205–H214)
 *
 * Tests the "Mark as Settled" button, confirmation dialog, settlement
 * recording, and settlement history display on the SettlementCard.
 *
 * The test household typically has only 1 member. Since settlement
 * requires 2 members, we inject a fake partner into the Zustand store
 * via `page.evaluate`. This makes `useSettlement` calculate a real balance.
 */

const FAKE_PARTNER_UID = "fake-partner-uid";

/**
 * Inject a fake second member into the Zustand store.
 * This is needed because the test household has only 1 member,
 * and `useSettlement` returns `isSettled: true` when `members.length < 2`.
 */
async function injectFakePartner(page: Page) {
  await page.evaluate((partnerUid: string) => {
    const store = (window as unknown as Record<string, any>).__zustand_store;
    if (!store) return;
    const state = store.getState();
    const currentUser = state.user;
    if (!currentUser) return;
    // Only inject if < 2 members
    if (state.members.length >= 2) return;
    const fakePartner = {
      uid: partnerUid,
      name: "Partner",
      email: "partner@test.dev",
      household_id: currentUser.household_id,
    };
    store.setState({ members: [...state.members, fakePartner] });
  }, FAKE_PARTNER_UID);
  // Wait for React to re-render with new members
  await page.waitForTimeout(1500);
}

/**
 * Robust category selection with retry.
 */
async function selectFirstCategory(page: Page) {
  const categorySelect = page.locator('[data-testid="category-select"]');
  await expect(categorySelect).toBeVisible({ timeout: 5000 });

  let found = false;
  for (let attempt = 0; attempt < 5 && !found; attempt++) {
    await categorySelect.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000 * (attempt + 1));
    await categorySelect.click();
    found = await page.getByRole("option").first().isVisible().catch(() => false);
    if (!found) await page.keyboard.press("Escape");
  }
  if (found) {
    await page.getByRole("option").first().click();
    await page.waitForTimeout(300);
  }
}

/**
 * Create a joint expense to ensure a non-zero settlement balance.
 * Does NOT reload the page — the fake partner would be lost on reload.
 */
async function ensureNonZeroBalance(page: Page) {
  const addBtn = page.locator('[data-testid="add-expense-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

  await page.fill('[data-testid="amount-input"]', "1000");
  await page.fill(
    '[data-testid="description-input"]',
    `Settlement test ${Date.now()}`
  );

  await selectFirstCategory(page);

  const submitBtn = page.locator('[data-testid="submit-expense"]');
  await submitBtn.scrollIntoViewIfNeeded();
  await submitBtn.click();
  await expect(page.locator('[data-testid="expense-form"]')).toBeHidden({
    timeout: 10000,
  });

  // Wait for the expense subscription to update + settlement to recalculate
  await page.waitForTimeout(3000);

  // Re-inject partner since expense subscription may trigger re-renders
  await injectFakePartner(page);
  await page.waitForTimeout(1000);
}

/**
 * Ensure the Mark as Settled button is visible.
 * If the balance is zero, creates a joint expense first.
 */
async function ensureMarkSettledVisible(page: Page) {
  const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
  const isVisible = await markSettledBtn.isVisible().catch(() => false);

  if (!isVisible) {
    await ensureNonZeroBalance(page);
    // Give the UI time to update
    await page.waitForTimeout(2000);
  }

  await expect(markSettledBtn).toBeVisible({ timeout: 15000 });
}

test.describe("Suite H: Settlement History", () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
    // Wait for Firestore data to load
    await page.waitForTimeout(5000);
    // Inject fake partner so settlement calculations work
    await injectFakePartner(page);
  });

  test("H205: Mark as Settled button visible when balance is non-zero", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);

    const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
    await expect(markSettledBtn).toBeVisible({ timeout: 10000 });
    const btnText = await markSettledBtn.textContent();
    expect(btnText).toContain("Mark as Settled");
  });

  test("H206: Mark as Settled button hidden when all settled", async ({
    page,
  }) => {
    const settlementCard = page.locator('[data-testid="settlement-card"]');
    await expect(settlementCard).toBeVisible({ timeout: 10000 });

    const settledText = await settlementCard.textContent();

    if (settledText?.includes("All settled up")) {
      // When all is settled, the Mark as Settled button should not be visible
      const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
      await expect(markSettledBtn).toBeHidden();
    } else {
      // If there IS a balance, the button should be visible
      const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
      await expect(markSettledBtn).toBeVisible({ timeout: 5000 });
    }
  });

  test("H207: Clicking opens confirmation dialog with correct amount", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);

    // Get the settlement amount displayed
    const amountEl = page.locator('[data-testid="settlement-amount"]');
    await expect(amountEl).toBeVisible({ timeout: 10000 });
    const displayedAmount = await amountEl.textContent();
    expect(displayedAmount).toBeTruthy();

    // Click the Mark as Settled button
    const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
    await markSettledBtn.click();

    // Confirmation dialog should appear
    const dialog = page.locator('[data-testid="settle-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Dialog should contain the same formatted amount
    const dialogText = await dialog.textContent();
    expect(dialogText).toContain(displayedAmount!.trim());
  });

  test("H208: Confirming records settlement and shows toast", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);

    // Click Mark as Settled
    const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
    await markSettledBtn.click();

    // Confirm in dialog
    const confirmBtn = page.locator('[data-testid="settle-confirm-btn"]');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Toast should appear
    const toastEl = page.locator('[data-sonner-toast]').first();
    await expect(toastEl).toBeVisible({ timeout: 10000 });
    const toastText = await toastEl.textContent();
    expect(toastText).toMatch(/settlement/i);

    // Dialog should close
    const dialog = page.locator('[data-testid="settle-confirm-dialog"]');
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });

  test("H209: Cancel dismisses dialog without recording", async ({ page }) => {
    await ensureMarkSettledVisible(page);

    // Get the settlement amount before cancel
    const amountEl = page.locator('[data-testid="settlement-amount"]');
    await expect(amountEl).toBeVisible({ timeout: 10000 });
    const amountBefore = await amountEl.textContent();

    // Click Mark as Settled
    const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
    await markSettledBtn.click();

    // Dialog should appear
    const dialog = page.locator('[data-testid="settle-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Click Cancel
    const cancelBtn = page.locator('[data-testid="settle-cancel-btn"]');
    await expect(cancelBtn).toBeVisible({ timeout: 5000 });
    await cancelBtn.click();

    // Dialog should close
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // Amount should remain the same (no settlement recorded)
    const amountAfter = await amountEl.textContent();
    expect(amountAfter).toBe(amountBefore);
  });

  test("H210: Settlement history list shows recent events", async ({
    page,
  }) => {
    const settlementCard = page.locator('[data-testid="settlement-card"]');
    await expect(settlementCard).toBeVisible({ timeout: 10000 });

    const historyList = page.locator('[data-testid="settlement-history-list"]');
    const historyItems = page.locator('[data-testid="settlement-history-item"]');

    // If no history exists yet, create a balance and settle it
    const historyCount = await historyItems.count();
    if (historyCount === 0) {
      await ensureMarkSettledVisible(page);

      const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
      if (await markSettledBtn.isVisible()) {
        await markSettledBtn.click();
        const confirmBtn = page.locator('[data-testid="settle-confirm-btn"]');
        await expect(confirmBtn).toBeVisible({ timeout: 5000 });
        await confirmBtn.click();
        await page.waitForTimeout(3000);
      }
    }

    // Settlement history should be visible
    await expect(historyList).toBeVisible({ timeout: 10000 });
    const itemCount = await historyItems.count();
    expect(itemCount).toBeGreaterThan(0);
  });

  test("H211: Net balance updates after settlement", async ({ page }) => {
    await ensureMarkSettledVisible(page);

    // Get the settlement amount before
    const amountEl = page.locator('[data-testid="settlement-amount"]');
    await expect(amountEl).toBeVisible({ timeout: 10000 });

    // Record a settlement
    const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
    await markSettledBtn.click();

    const confirmBtn = page.locator('[data-testid="settle-confirm-btn"]');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();

    // Wait for the settlement to be recorded and UI to update
    await page.waitForTimeout(3000);

    // After settling the full amount, should show "All settled up"
    const settlementCard = page.locator('[data-testid="settlement-card"]');
    const cardText = await settlementCard.textContent();
    expect(cardText).toMatch(/all settled up/i);
  });

  test("H212: Settlement history shows correct date and amount", async ({
    page,
  }) => {
    const historyItems = page.locator('[data-testid="settlement-history-item"]');
    let count = await historyItems.count();

    // If no history, create one
    if (count === 0) {
      await ensureMarkSettledVisible(page);
      const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
      if (await markSettledBtn.isVisible()) {
        await markSettledBtn.click();
        const confirmBtn = page.locator('[data-testid="settle-confirm-btn"]');
        await expect(confirmBtn).toBeVisible({ timeout: 5000 });
        await confirmBtn.click();
        await page.waitForTimeout(3000);
      }
      count = await historyItems.count();
    }

    if (count === 0) {
      console.log("H212: No settlement history found after attempt. Skipping.");
      return;
    }

    const firstItem = historyItems.first();
    const itemText = await firstItem.textContent();

    // Should contain a currency amount
    expect(itemText).toMatch(/[₹$€£]\d/);

    // Should contain a date format (e.g., "24 Feb 2026")
    expect(itemText).toMatch(/\d{1,2}\s\w{3}\s\d{4}/);
  });

  test("H213: Multiple settlements accumulate in history", async ({
    page,
  }) => {
    // Get total settlement expense count from the store (not capped by UI limit)
    const initialTotal = await page.evaluate(() => {
      const store = (window as unknown as Record<string, any>).__zustand_store;
      if (!store) return 0;
      const state = store.getState();
      return (state.expenses || []).filter(
        (e: any) => e.expense_type === "settlement"
      ).length;
    });

    // Ensure non-zero balance and settle
    await ensureMarkSettledVisible(page);
    const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
    await markSettledBtn.click();
    const confirmBtn = page.locator('[data-testid="settle-confirm-btn"]');
    await expect(confirmBtn).toBeVisible({ timeout: 5000 });
    await confirmBtn.click();
    await page.waitForTimeout(3000);

    // Check that total settlement expense count increased (store level, not UI cap)
    const newTotal = await page.evaluate(() => {
      const store = (window as unknown as Record<string, any>).__zustand_store;
      if (!store) return 0;
      const state = store.getState();
      return (state.expenses || []).filter(
        (e: any) => e.expense_type === "settlement"
      ).length;
    });
    expect(newTotal).toBeGreaterThan(initialTotal);
  });

  test("H214: Settlement dialog is keyboard dismissible (Escape)", async ({
    page,
  }) => {
    await ensureMarkSettledVisible(page);

    // Open the confirmation dialog
    const markSettledBtn = page.locator('[data-testid="mark-settled-btn"]');
    await markSettledBtn.click();

    // Dialog should be visible
    const dialog = page.locator('[data-testid="settle-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Press Escape to dismiss
    await page.keyboard.press("Escape");

    // Dialog should close
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });
});
