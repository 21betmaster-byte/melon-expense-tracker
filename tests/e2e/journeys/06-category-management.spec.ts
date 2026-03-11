import { test, expect } from "../fixtures";
import { testExpenseData, testCategoryName } from "../helpers/test-data-factory";
import { waitForStoreReady, waitForExpenseByDescription } from "../helpers/wait-strategies";
import { expectCategoryInStore } from "../helpers/assertions";
import { getCategories } from "../helpers/store-reader";
import { DashboardPage } from "../pages/dashboard.page";
import { SettingsPage } from "../pages/settings.page";
import { cleanupAllTestData } from "../helpers/data-cleanup";

const NEW_CATEGORY = testCategoryName();

test.describe.serial("Journey 06: Category Management", () => {
  test.afterAll(async ({ page }) => {
    await cleanupAllTestData(page).catch(() => {});
  });

  test("Step 1: Create inline category via expense form", async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.navigate();

    await dashboard.openAddExpenseDialog();

    // Create inline category
    await dashboard.expenseForm.createInlineCategory(NEW_CATEGORY);

    // Category should now be selected — fill rest and submit
    const data = testExpenseData({ description: "E2E_TEST_cat_expense" });
    const amountInput = page.locator('[data-testid="amount-input"]');
    await amountInput.fill(data.amount);
    const descInput = page.locator('[data-testid="description-input"]');
    await descInput.fill(data.description);
    await dashboard.expenseForm.submit();

    await waitForExpenseByDescription(page, data.description);
  });

  test("Step 2: Verify category exists in store", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await waitForStoreReady(page);

    await expectCategoryInStore(page, NEW_CATEGORY);
  });

  test("Step 3: Verify category appears in settings", async ({ page }) => {
    const settings = new SettingsPage(page);
    await settings.navigate();

    // Categories section should contain the new category
    const pageText = await page.textContent("body");
    expect(pageText).toContain(NEW_CATEGORY);
  });

  test("Step 4: Verify category is group-scoped", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await waitForStoreReady(page);

    // Get categories for current group
    const categories = await getCategories(page);
    const found = categories.some((c: any) => c.name === NEW_CATEGORY);
    expect(found).toBe(true);
  });
});
