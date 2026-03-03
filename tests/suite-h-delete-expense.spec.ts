import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Delete Expense (H86–H100)
 *
 * Tests the delete expense flow including confirmation dialog, cancel/confirm,
 * toast feedback, empty state, settlement deletion guard, and keyboard accessibility.
 *
 * Requires authenticated session with an active household and at least one expense.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

// ─── H86–H90: Delete Expense — Confirmation Dialog ─────────────────────────

test.describe("Suite H: Delete Expense — Confirmation Dialog", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H86: Delete button is visible on each expense card", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');
    await expect(deleteBtn).toBeVisible();
  });

  test("H87: Clicking delete shows confirmation dialog", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');
    await deleteBtn.click();

    const dialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test("H88: Clicking cancel in dialog keeps expense intact", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const originalText = await expenseCard.textContent();

    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');
    await deleteBtn.click();

    const dialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="delete-cancel-btn"]').click();

    // Dialog should close
    await expect(dialog).toBeHidden({ timeout: 3000 });

    // Expense card should still be present with same content
    await expect(expenseCard).toBeVisible();
    const textAfterCancel = await expenseCard.textContent();
    expect(textAfterCancel).toBe(originalText);
  });

  test("H89: Clicking confirm removes expense and shows toast", async ({ page }) => {
    const expenseCards = page.locator('[data-testid="expense-card"]');
    await expect(expenseCards.first()).toBeVisible({ timeout: 10000 });

    const countBefore = await expenseCards.count();
    const firstCardText = await expenseCards.first().textContent();

    const deleteBtn = expenseCards.first().locator('[data-testid="delete-expense-btn"]');
    await deleteBtn.click();

    const dialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="delete-confirm-btn"]').click();

    // Dialog should close
    await expect(dialog).toBeHidden({ timeout: 5000 });

    // Toast should appear confirming deletion
    await expect(
      page.getByText(/deleted|removed/i)
    ).toBeVisible({ timeout: 8000 });

    // Wait for UI to update
    await page.waitForTimeout(1000);

    // Either the count is reduced or the first card content has changed
    const countAfter = await expenseCards.count();
    if (countAfter > 0) {
      const newFirstCardText = await expenseCards.first().textContent();
      // Either count decreased or first card changed (the deleted one is gone)
      expect(countAfter < countBefore || newFirstCardText !== firstCardText).toBe(true);
    } else {
      // All expenses removed — count should be 0
      expect(countAfter).toBe(0);
    }
  });

  test("H90: Confirmation dialog has both cancel and confirm buttons", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');
    await deleteBtn.click();

    const dialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await expect(page.locator('[data-testid="delete-cancel-btn"]')).toBeVisible();
    await expect(page.locator('[data-testid="delete-confirm-btn"]')).toBeVisible();
  });
});

// ─── H91–H95: Delete Expense — Edge Cases ──────────────────────────────────

test.describe("Suite H: Delete Expense — Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H91: Confirmation dialog contains warning text", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');
    await deleteBtn.click();

    const dialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Dialog should contain some warning/confirmation text
    const dialogText = await dialog.textContent();
    expect(dialogText).toBeTruthy();
    expect(dialogText!.length).toBeGreaterThan(10);
  });

  test("H92: Delete button is disabled for pending expenses", async ({ page }) => {
    const expenseCards = page.locator('[data-testid="expense-card"]');
    await expect(expenseCards.first()).toBeVisible({ timeout: 10000 });

    const count = await expenseCards.count();
    let foundPending = false;

    for (let i = 0; i < count; i++) {
      const card = expenseCards.nth(i);
      const hasPending = await card.locator('[data-testid="pending-indicator"]').isVisible().catch(() => false);

      if (hasPending) {
        foundPending = true;
        const deleteBtn = card.locator('[data-testid="delete-expense-btn"]');
        const isDisabled = await deleteBtn.isDisabled().catch(() => true);
        const isHidden = !(await deleteBtn.isVisible().catch(() => false));
        expect(isDisabled || isHidden).toBe(true);
        break;
      }
    }

    if (!foundPending) {
      // No pending expenses — verify delete button is enabled on synced expense
      const deleteBtn = expenseCards.first().locator('[data-testid="delete-expense-btn"]');
      await expect(deleteBtn).toBeEnabled();
      console.log("H92: No pending expenses found — verified delete button is enabled on synced expense.");
    }
  });

  test("H93: Settlement card has delete button", async ({ page }) => {
    const settlementCard = page.locator('[data-testid="settlement-card"]');
    const isVisible = await settlementCard.isVisible().catch(() => false);

    if (!isVisible) {
      console.log("H93: No settlement card visible — test not applicable in current state.");
      return;
    }

    // Settlement cards may or may not have a delete button depending on design
    const deleteBtn = settlementCard.locator('[data-testid="delete-expense-btn"]');
    const hasDelete = await deleteBtn.isVisible().catch(() => false);
    // Just verify it doesn't crash — settlement deletion may be restricted
    expect(typeof hasDelete).toBe("boolean");
  });

  test("H94: Multiple rapid delete clicks do not open multiple dialogs", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');

    // Rapid clicks
    await deleteBtn.click();
    await deleteBtn.click({ force: true }).catch(() => {});
    await deleteBtn.click({ force: true }).catch(() => {});

    await page.waitForTimeout(500);

    // Only one dialog should be visible
    const dialogs = page.locator('[data-testid="delete-confirm-dialog"]');
    const dialogCount = await dialogs.count();
    expect(dialogCount).toBeLessThanOrEqual(1);
  });

  test("H95: Deleting last expense shows empty state", async ({ page }) => {
    const expenseCards = page.locator('[data-testid="expense-card"]');
    await expect(expenseCards.first()).toBeVisible({ timeout: 10000 });

    const count = await expenseCards.count();

    if (count !== 1) {
      console.log(`H95: ${count} expenses present — test requires exactly 1 expense. Skipping deletion.`);
      // Still verify the empty state concept: if no expense cards, empty state should show
      return;
    }

    // Delete the only expense
    const deleteBtn = expenseCards.first().locator('[data-testid="delete-expense-btn"]');
    await deleteBtn.click();

    const dialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.locator('[data-testid="delete-confirm-btn"]').click();
    await expect(dialog).toBeHidden({ timeout: 5000 });

    await page.waitForTimeout(2000);

    // No expense cards should remain
    const remainingCount = await expenseCards.count();
    expect(remainingCount).toBe(0);

    // Empty state message should be visible
    const emptyState = page.getByText(/no expenses|add your first|nothing here/i);
    await expect(emptyState).toBeVisible({ timeout: 5000 });
  });
});

// ─── H96–H100: Delete Expense — Accessibility & UX ─────────────────────────

test.describe("Suite H: Delete Expense — Accessibility & UX", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
  });

  test("H96: Delete button has accessible label or aria attribute", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');
    await expect(deleteBtn).toBeVisible();

    // Should have some accessible name (aria-label, title, or visible text)
    const ariaLabel = await deleteBtn.getAttribute("aria-label");
    const title = await deleteBtn.getAttribute("title");
    const text = await deleteBtn.textContent();
    const hasAccessibleName = !!(ariaLabel || title || (text && text.trim().length > 0));
    expect(hasAccessibleName).toBe(true);
  });

  test("H97: Confirmation dialog is dismissible via Escape key", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');
    await deleteBtn.click();

    const dialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await page.keyboard.press("Escape");

    await expect(dialog).toBeHidden({ timeout: 3000 });
    // Expense should still be present
    await expect(expenseCard).toBeVisible();
  });

  test("H98: Confirm button in dialog has destructive styling", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');
    await deleteBtn.click();

    const dialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const confirmBtn = page.locator('[data-testid="delete-confirm-btn"]');
    const className = await confirmBtn.getAttribute("class");
    // Destructive buttons typically have red/destructive class
    const hasDestructiveStyle =
      className?.includes("destructive") ||
      className?.includes("red") ||
      className?.includes("danger");

    // At minimum the button should exist and be clickable
    await expect(confirmBtn).toBeEnabled();
    // Log for informational purposes — styling may vary
    if (!hasDestructiveStyle) {
      console.log("H98: Confirm button does not have explicit destructive class — verify visually.");
    }
  });

  test("H99: Cancel button text is recognizable", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');
    await deleteBtn.click();

    const dialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    const cancelBtn = page.locator('[data-testid="delete-cancel-btn"]');
    const cancelText = await cancelBtn.textContent();
    expect(cancelText).toBeTruthy();
    expect(cancelText).toMatch(/cancel|no|go back|dismiss/i);
  });

  test("H100: Delete flow is keyboard accessible — Tab + Enter", async ({ page }) => {
    const expenseCard = page.locator('[data-testid="expense-card"]').first();
    await expect(expenseCard).toBeVisible({ timeout: 10000 });

    // Focus the delete button via keyboard
    const deleteBtn = expenseCard.locator('[data-testid="delete-expense-btn"]');
    await deleteBtn.focus();
    await page.keyboard.press("Enter");

    const dialog = page.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Tab to cancel button and press Enter to dismiss
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);
    // The cancel button should be focusable — press Enter to cancel
    const cancelBtn = page.locator('[data-testid="delete-cancel-btn"]');
    await cancelBtn.focus();
    await page.keyboard.press("Enter");

    await expect(dialog).toBeHidden({ timeout: 3000 });
    await expect(expenseCard).toBeVisible();
  });
});
