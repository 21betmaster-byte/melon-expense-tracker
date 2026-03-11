import { Page } from "@playwright/test";

/**
 * Delete all expenses whose description starts with E2E_TEST_ from the local store.
 * This removes them from the UI. Firestore cleanup happens via real-time listener
 * on next page load, or can be done separately via admin scripts.
 */
export async function cleanupTestExpenses(page: Page): Promise<number> {
  return page.evaluate(() => {
    const store = (window as any).__zustand_store;
    if (!store) return 0;

    const state = store.getState();
    const testExpenses = state.expenses.filter((e: any) =>
      e.description?.startsWith("E2E_TEST_")
    );

    let deleted = 0;
    for (const expense of testExpenses) {
      store.getState().removeExpense(expense.id);
      deleted++;
    }
    return deleted;
  });
}

/**
 * Clean up test groups from the local store.
 */
export async function cleanupTestGroups(page: Page): Promise<number> {
  return page.evaluate(() => {
    const store = (window as any).__zustand_store;
    if (!store) return 0;

    const state = store.getState();
    const testGroups = state.groups.filter((g: any) =>
      g.name?.startsWith("E2E_TEST_")
    );

    if (testGroups.length > 0) {
      const remaining = state.groups.filter(
        (g: any) => !g.name?.startsWith("E2E_TEST_")
      );
      store.setState({ groups: remaining });
    }
    return testGroups.length;
  });
}

/**
 * Run all cleanup routines.
 */
export async function cleanupAllTestData(page: Page): Promise<void> {
  const expenses = await cleanupTestExpenses(page);
  const groups = await cleanupTestGroups(page);
  if (expenses > 0 || groups > 0) {
    console.log(`Cleaned up ${expenses} test expenses, ${groups} test groups`);
  }
}
