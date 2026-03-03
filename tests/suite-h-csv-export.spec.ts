import { test, expect } from "@playwright/test";
import { requireAuth } from "./helpers/auth-guard";

/**
 * Suite H: CSV Export (H191–H196)
 *
 * Tests the CSV export functionality on the expenses page including
 * button visibility, disabled state, download trigger, headers, and toast.
 *
 * Requires authenticated session with an active household and at least one expense.
 * Create .env.test with TEST_USER_EMAIL + TEST_USER_PASSWORD (see README).
 */

test.describe("Suite H: CSV Export", () => {
  test.beforeEach(async ({ page }) => {
    await requireAuth(page, "/expenses");
    await page.waitForTimeout(2000);
  });

  test("H191: Export button visible on expenses page", async ({ page }) => {
    const exportBtn = page.locator('[data-testid="export-csv-btn"]');
    await expect(exportBtn).toBeVisible({ timeout: 10000 });
  });

  test("H192: Export button disabled when no expenses", async ({ page }) => {
    // Search for something that won't match to get 0 expenses
    await page.fill('[data-testid="expense-search-input"]', "zzzznonexistentzzzz");
    await page.waitForTimeout(500);

    const exportBtn = page.locator('[data-testid="export-csv-btn"]');
    await expect(exportBtn).toBeDisabled();
  });

  test("H193: Clicking export triggers file download", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Listen for download event
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 });

    const exportBtn = page.locator('[data-testid="export-csv-btn"]');
    await exportBtn.click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^expenses-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  test("H194: Exported CSV has correct headers", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    // Listen for download
    const downloadPromise = page.waitForEvent("download", { timeout: 10000 });

    const exportBtn = page.locator('[data-testid="export-csv-btn"]');
    await exportBtn.click();

    const download = await downloadPromise;

    // Read the downloaded file content
    const path = await download.path();
    expect(path).toBeTruthy();

    const fs = await import("fs");
    const content = fs.readFileSync(path!, "utf-8");
    const firstLine = content.split("\n")[0];

    // Verify expected headers
    expect(firstLine).toContain("Date");
    expect(firstLine).toContain("Description");
    expect(firstLine).toContain("Amount");
    expect(firstLine).toContain("Currency");
    expect(firstLine).toContain("Category");
    expect(firstLine).toContain("Paid By");
    expect(firstLine).toContain("Type");
    expect(firstLine).toContain("Split Ratio");
  });

  test("H195: Exported CSV respects current search filter", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    const totalCount = await cards.count();
    if (totalCount < 2) {
      console.log("H195: Need at least 2 expenses to test filtered export. Skipping.");
      return;
    }

    // Use a nonexistent search to get 0 results, then clear and export all
    // First, export all (unfiltered) to get a baseline
    const downloadAll = page.waitForEvent("download", { timeout: 10000 });
    await page.locator('[data-testid="export-csv-btn"]').click();
    const allDownload = await downloadAll;
    const allPath = await allDownload.path();
    const fs = await import("fs");
    const allContent = fs.readFileSync(allPath!, "utf-8");
    const allDataRows = allContent.trim().split("\n").length - 1;

    // Now filter with a search term that should match fewer
    // Search for a specific term — use "zzzzfiltertest" which won't match anything
    // to verify 0-row export. Then try a partial match.
    await page.fill('[data-testid="expense-search-input"]', "settlement");
    await page.waitForTimeout(500);

    const filteredCount = await cards.count();
    if (filteredCount === 0 || filteredCount === totalCount) {
      // If "settlement" doesn't filter, just verify the export button state
      console.log("H195: 'settlement' filter produced 0 or all results. Verifying export button state.");
      if (filteredCount === 0) {
        await expect(page.locator('[data-testid="export-csv-btn"]')).toBeDisabled();
      }
      return;
    }

    // Export filtered results
    const downloadFiltered = page.waitForEvent("download", { timeout: 10000 });
    await page.locator('[data-testid="export-csv-btn"]').click();
    const filteredDownload = await downloadFiltered;
    const filteredPath = await filteredDownload.path();
    const filteredContent = fs.readFileSync(filteredPath!, "utf-8");
    const filteredDataRows = filteredContent.trim().split("\n").length - 1;

    // Filtered CSV should have fewer rows than all
    expect(filteredDataRows).toBeLessThan(allDataRows);
    expect(filteredDataRows).toBe(filteredCount);
  });

  test("H196: Toast confirms export with count", async ({ page }) => {
    const cards = page.locator('[data-testid="expense-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });

    const exportBtn = page.locator('[data-testid="export-csv-btn"]');
    await exportBtn.click();

    // Toast should appear confirming export
    await expect(
      page.getByText(/exported \d+ expense/i)
    ).toBeVisible({ timeout: 8000 });
  });
});
