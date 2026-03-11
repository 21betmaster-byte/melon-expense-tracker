import { Page, expect } from "@playwright/test";
import { getExpenseByDescription } from "./store-reader";

/**
 * Assert that an expense with the given description exists in the store
 * and optionally verify its fields.
 */
export async function expectExpenseInStore(
  page: Page,
  description: string,
  fields?: Record<string, any>
): Promise<void> {
  const expense = await getExpenseByDescription(page, description);
  expect(expense, `Expected expense "${description}" to exist in store`).not.toBeNull();

  if (fields) {
    for (const [key, value] of Object.entries(fields)) {
      expect(expense[key], `Expected expense.${key} to be ${value}`).toBe(value);
    }
  }
}

/**
 * Assert that an expense with the given description does NOT exist in the store.
 */
export async function expectExpenseNotInStore(
  page: Page,
  description: string
): Promise<void> {
  const expense = await getExpenseByDescription(page, description);
  expect(expense, `Expected expense "${description}" NOT to be in store`).toBeNull();
}

/**
 * Assert that a category with the given name exists in the store.
 */
export async function expectCategoryInStore(
  page: Page,
  name: string
): Promise<void> {
  const exists = await page.evaluate((catName) => {
    const store = (window as any).__zustand_store;
    if (!store) return false;
    return store.getState().categories.some((c: any) => c.name === catName);
  }, name);
  expect(exists, `Expected category "${name}" to exist in store`).toBe(true);
}

/**
 * Assert the active group name matches.
 */
export async function expectActiveGroup(
  page: Page,
  groupName: string
): Promise<void> {
  const actual = await page.evaluate(() => {
    const store = (window as any).__zustand_store;
    return store?.getState().activeGroup?.name ?? null;
  });
  expect(actual, `Expected active group to be "${groupName}"`).toBe(groupName);
}
