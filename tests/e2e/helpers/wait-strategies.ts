import { Page, expect } from "@playwright/test";

/**
 * Wait for the Zustand store to be fully loaded (no loading states active).
 * Polls window.__zustand_store.getState() until all loading flags are false.
 */
export async function waitForStoreReady(page: Page, timeout = 15000): Promise<void> {
  await page.waitForFunction(
    () => {
      const store = (window as any).__zustand_store;
      if (!store) return false;
      const state = store.getState();
      return !state.householdLoading && !state.authLoading && !state.isLoading;
    },
    { timeout }
  );
}

/**
 * Wait for an expense with a specific description to appear in the store.
 */
export async function waitForExpenseByDescription(
  page: Page,
  description: string,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    (desc) => {
      const store = (window as any).__zustand_store;
      if (!store) return false;
      const state = store.getState();
      return state.expenses.some((e: any) => e.description === desc);
    },
    description,
    { timeout }
  );
}

/**
 * Wait for the expense count in the store to reach a specific number.
 */
export async function waitForExpenseCount(
  page: Page,
  count: number,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    (n) => {
      const store = (window as any).__zustand_store;
      if (!store) return false;
      return store.getState().expenses.length === n;
    },
    count,
    { timeout }
  );
}

/**
 * Wait for settlement state — "All settled up" (no outstanding balance).
 */
export async function waitForSettled(page: Page, timeout = 10000): Promise<void> {
  await page.waitForFunction(
    () => {
      const card = document.querySelector('[data-testid="settlement-card"]');
      if (!card) return false;
      return card.textContent?.includes("settled up") ?? false;
    },
    { timeout }
  );
}

/**
 * Wait for a toast notification matching the given pattern.
 */
export async function waitForToast(
  page: Page,
  pattern: string | RegExp,
  timeout = 5000
): Promise<void> {
  const regex = typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
  await page.waitForFunction(
    (pat) => {
      const toasts = document.querySelectorAll("[data-sonner-toast]");
      for (const t of toasts) {
        if (new RegExp(pat, "i").test(t.textContent ?? "")) return true;
      }
      return false;
    },
    regex.source,
    { timeout }
  );
}

/**
 * Wait for an expense with given description to disappear from the store.
 */
export async function waitForExpenseRemoved(
  page: Page,
  description: string,
  timeout = 10000
): Promise<void> {
  await page.waitForFunction(
    (desc) => {
      const store = (window as any).__zustand_store;
      if (!store) return false;
      const state = store.getState();
      return !state.expenses.some((e: any) => e.description === desc);
    },
    description,
    { timeout }
  );
}
