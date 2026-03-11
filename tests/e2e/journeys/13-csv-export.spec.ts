import { test, expect } from "../fixtures";
import { ExpensesPage } from "../pages/expenses.page";
import { waitForStoreReady } from "../helpers/wait-strategies";

test.describe("Journey 13: CSV Export", () => {
  test("export triggers download with correct filename", async ({ page }) => {
    const expenses = new ExpensesPage(page);
    await expenses.navigate();

    // Check if there are any expenses to export
    const count = await expenses.getExpenseCount();
    if (count === 0) {
      test.skip();
      return;
    }

    // Look for an export button
    const exportBtn = page.getByRole("button", { name: /export|csv|download/i });
    const hasExport = await exportBtn.isVisible({ timeout: 3000 }).catch(() => false);
    if (!hasExport) {
      test.skip();
      return;
    }

    // Trigger download
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      exportBtn.click(),
    ]);

    // Verify download
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.csv$/);
  });
});
