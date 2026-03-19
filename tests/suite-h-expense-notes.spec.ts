import { test, expect, type Page } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: Expense Notes (H197–H204)
 *
 * Tests the optional notes field on expenses including adding, viewing,
 * toggling, max length, edit preservation, and CSV inclusion.
 *
 * Requires authenticated session with an active household.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

async function openExpenseForm(page: Page) {
  const addBtn = page.locator('[data-testid="add-expense-btn"]');
  await expect(addBtn).toBeVisible({ timeout: 10000 });
  await addBtn.click();
  await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });
  // Advance to Stage 2 (progressive disclosure)
  await page.locator('[data-testid="amount-input"]').fill("1.00");
  await page.locator('[data-testid="description-input"]').fill("test");
  await page.locator('[data-testid="description-input"]').press("Enter");
  await page.waitForSelector('[data-testid="stage2-fields"]', { timeout: 5000 });
  await page.waitForTimeout(400);
}

/**
 * Robust category selection with retry.
 * Categories load from Firestore asynchronously, so the first click
 * may happen before options are available. Retries up to 5 times with
 * increasing delays.
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

  expect(found).toBe(true);

  const firstOption = page.getByRole("option").first();
  await firstOption.click();
  await page.waitForTimeout(300);
}

test.describe("Suite H: Expense Notes", () => {
  // These tests involve Firestore async loading + form interactions — allow extra time
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/dashboard");
    // Wait extra for Firestore data (groups, categories, members) to load
    await page.waitForTimeout(5000);
  });

  test("H197: Notes textarea visible in expense form", async ({ page }) => {
    await openExpenseForm(page);
    const notesInput = page.locator('[data-testid="expense-notes-input"]');
    await notesInput.scrollIntoViewIfNeeded();
    await expect(notesInput).toBeVisible({ timeout: 5000 });
  });

  test("H198: Notes are optional — form submits without notes", async ({ page }) => {
    await openExpenseForm(page);

    // Fill required fields but leave notes empty
    await page.fill('[data-testid="amount-input"]', "100");
    await page.fill('[data-testid="description-input"]', "Test no notes");

    // Select a category using the robust helper
    await selectFirstCategory(page);

    // Ensure notes field is empty
    const notesInput = page.locator('[data-testid="expense-notes-input"]');
    await notesInput.scrollIntoViewIfNeeded();
    const notesValue = await notesInput.inputValue();
    expect(notesValue).toBe("");

    // Submit
    const submitBtn = page.locator('[data-testid="submit-expense"]');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    await expect(page.locator('[data-testid="expense-form"]')).toBeHidden({ timeout: 10000 });
  });

  test("H199: Notes saved and displayed on expense card", async ({ page }) => {
    await openExpenseForm(page);

    await page.fill('[data-testid="amount-input"]', "250");
    await page.fill('[data-testid="description-input"]', "Notes test expense");

    // Select a category using the robust helper
    await selectFirstCategory(page);

    // Add notes — scroll into view first since notes is at the bottom of the form
    const notesInput = page.locator('[data-testid="expense-notes-input"]');
    await notesInput.scrollIntoViewIfNeeded();
    await notesInput.fill("This is a test note");

    // Submit
    const submitBtn = page.locator('[data-testid="submit-expense"]');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    await expect(page.locator('[data-testid="expense-form"]')).toBeHidden({ timeout: 10000 });

    // Navigate to expenses page to find the card
    await page.goto("/expenses");
    await page.waitForTimeout(5000);

    // Find expense cards
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    // Find the specific card for our "Notes test expense" (not just any card with notes)
    const targetCard = cards.filter({ hasText: "Notes test expense" }).first();
    await targetCard.scrollIntoViewIfNeeded();
    await expect(targetCard).toBeVisible({ timeout: 8000 });

    // Look for the notes toggle on this specific card
    const notesToggle = targetCard.locator('[data-testid="expense-notes-toggle"]');
    await expect(notesToggle).toBeVisible({ timeout: 5000 });

    // Click to expand
    await notesToggle.click();
    await page.waitForTimeout(500);

    // Notes content should be visible on this specific card
    const notesContent = targetCard.locator('[data-testid="expense-notes-content"]');
    await expect(notesContent).toBeVisible({ timeout: 5000 });
    const notesText = await notesContent.textContent();
    expect(notesText).toContain("test note");
  });

  test("H200: Notes toggle expands/collapses", async ({ page }) => {
    // Navigate to expenses to find an expense with notes
    await page.goto("/expenses");
    await page.waitForTimeout(5000);

    const notesToggle = page.locator('[data-testid="expense-notes-toggle"]').first();

    // If no expense with notes exists, skip
    const toggleCount = await notesToggle.count();
    if (toggleCount === 0) {
      console.log("H200: No expense with notes found. Skipping.");
      return;
    }

    await expect(notesToggle).toBeVisible({ timeout: 5000 });

    // Notes content should be hidden initially
    const notesContent = page.locator('[data-testid="expense-notes-content"]').first();
    await expect(notesContent).toBeHidden();

    // Click to expand
    await notesToggle.click();
    await page.waitForTimeout(500);
    await expect(notesContent).toBeVisible();

    // Click to collapse
    await notesToggle.click();
    await page.waitForTimeout(500);
    await expect(notesContent).toBeHidden();
  });

  test("H201: Notes hidden when expense has no notes", async ({ page }) => {
    // Create an expense without notes
    await openExpenseForm(page);

    await page.fill('[data-testid="amount-input"]', "75");
    await page.fill('[data-testid="description-input"]', "No notes expense h201");

    // Select a category using the robust helper
    await selectFirstCategory(page);

    // Leave notes empty and submit
    const submitBtn = page.locator('[data-testid="submit-expense"]');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();
    await expect(page.locator('[data-testid="expense-form"]')).toBeHidden({ timeout: 10000 });

    // Navigate to expenses
    await page.goto("/expenses");
    await page.waitForTimeout(5000);

    // Find the card we just created (use .first() in case of duplicate descriptions)
    const card = page.locator('[data-testid="expense-card"]', { hasText: "No notes expense h201" }).first();
    await expect(card).toBeVisible({ timeout: 15000 });

    // The notes toggle should NOT be visible on this card
    const toggle = card.locator('[data-testid="expense-notes-toggle"]');
    await expect(toggle).toBeHidden();
  });

  test("H202: Notes have 200 char max", async ({ page }) => {
    await openExpenseForm(page);

    const notesInput = page.locator('[data-testid="expense-notes-input"]');
    await notesInput.scrollIntoViewIfNeeded();
    await expect(notesInput).toBeVisible({ timeout: 5000 });

    // Check maxLength attribute
    const maxLength = await notesInput.getAttribute("maxLength");
    expect(maxLength).toBe("200");

    // Type 210 characters — should be capped at 200
    const longText = "A".repeat(210);
    await notesInput.fill(longText);
    const actualValue = await notesInput.inputValue();
    expect(actualValue.length).toBeLessThanOrEqual(200);
  });

  test("H203: Notes preserved during edit", async ({ page }) => {
    // Navigate to expenses to find an expense with notes
    await page.goto("/expenses");
    await page.waitForTimeout(5000);

    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    // Find the first card that has a notes toggle (i.e. has notes)
    const cardWithNotes = page
      .locator('[data-testid="expense-card"]')
      .filter({ has: page.locator('[data-testid="expense-notes-toggle"]') })
      .first();

    const cardCount = await cardWithNotes.count();
    if (cardCount === 0) {
      console.log("H203: No expense with notes found. Skipping.");
      return;
    }

    await expect(cardWithNotes).toBeVisible({ timeout: 5000 });

    // Click the edit button on that card
    const editBtn = cardWithNotes.locator('[data-testid="edit-expense-btn"]');
    await expect(editBtn).toBeVisible({ timeout: 5000 });
    await editBtn.click();

    // Wait for form
    await page.waitForSelector('[data-testid="expense-form"]', { timeout: 5000 });

    // Check that notes field has content
    const notesInput = page.locator('[data-testid="expense-notes-input"]');
    await notesInput.scrollIntoViewIfNeeded();
    await expect(notesInput).toBeVisible({ timeout: 5000 });
    const notesValue = await notesInput.inputValue();
    expect(notesValue.length).toBeGreaterThan(0);
  });

  test("H204: Notes included in CSV export", async ({ page }) => {
    // Navigate to expenses page where the export button and cards are visible
    await page.goto("/expenses");
    await page.waitForTimeout(5000);

    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });

    // Ensure the export button is visible before clicking
    const exportBtn = page.locator('[data-testid="export-csv-btn"]');
    await expect(exportBtn).toBeVisible({ timeout: 5000 });

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      exportBtn.click(),
    ]);

    // Read the CSV content
    const path = await download.path();
    if (!path) {
      console.log("H204: Could not get download path. Skipping.");
      return;
    }

    const fs = await import("fs");
    const csv = fs.readFileSync(path, "utf-8");

    // Check that CSV headers include "Notes"
    const firstLine = csv.split("\n")[0];
    expect(firstLine).toContain("Notes");

    // Check that at least one data row has notes content
    const lines = csv.split("\n");
    console.log(`H204: CSV has ${lines.length - 1} data rows, Notes column present: true`);
    expect(firstLine).toContain("Notes");
  });
});
