import { Page } from "@playwright/test";

/**
 * Read the full store state from the browser.
 */
export async function getStoreState(page: Page): Promise<any> {
  return page.evaluate(() => {
    const store = (window as any).__zustand_store;
    if (!store) return null;
    return JSON.parse(JSON.stringify(store.getState()));
  });
}

/**
 * Get all expenses from the store.
 */
export async function getExpenses(page: Page): Promise<any[]> {
  return page.evaluate(() => {
    const store = (window as any).__zustand_store;
    if (!store) return [];
    return JSON.parse(JSON.stringify(store.getState().expenses));
  });
}

/**
 * Get a single expense by description.
 */
export async function getExpenseByDescription(
  page: Page,
  description: string
): Promise<any | null> {
  return page.evaluate((desc) => {
    const store = (window as any).__zustand_store;
    if (!store) return null;
    const expense = store.getState().expenses.find((e: any) => e.description === desc);
    return expense ? JSON.parse(JSON.stringify(expense)) : null;
  }, description);
}

/**
 * Get the active group name.
 */
export async function getActiveGroupName(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const store = (window as any).__zustand_store;
    if (!store) return null;
    return store.getState().activeGroup?.name ?? null;
  });
}

/**
 * Get all categories from the store (filtered for active group).
 */
export async function getCategories(page: Page): Promise<any[]> {
  return page.evaluate(() => {
    const store = (window as any).__zustand_store;
    if (!store) return [];
    return JSON.parse(JSON.stringify(store.getState().categories));
  });
}

/**
 * Get all household members.
 */
export async function getMembers(page: Page): Promise<any[]> {
  return page.evaluate(() => {
    const store = (window as any).__zustand_store;
    if (!store) return [];
    return JSON.parse(JSON.stringify(store.getState().members));
  });
}

/**
 * Get the household's default currency.
 */
export async function getHouseholdCurrency(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const store = (window as any).__zustand_store;
    if (!store) return null;
    return store.getState().household?.currency ?? null;
  });
}

/**
 * Get all groups from the store.
 */
export async function getGroups(page: Page): Promise<any[]> {
  return page.evaluate(() => {
    const store = (window as any).__zustand_store;
    if (!store) return [];
    return JSON.parse(JSON.stringify(store.getState().groups));
  });
}

/**
 * Get settlements from the store.
 */
export async function getSettlements(page: Page): Promise<any[]> {
  return page.evaluate(() => {
    const store = (window as any).__zustand_store;
    if (!store) return [];
    return JSON.parse(JSON.stringify(store.getState().settlements));
  });
}
