import { Browser, BrowserContext, Page } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import { waitForStoreReady } from "./wait-strategies";

const USER_A_STATE = path.join(__dirname, "../../setup/.auth/user.json");
const PARTNER_STATE = path.join(__dirname, "../../setup/.auth/partner.json");

export interface TwoUserSetup {
  contextA: BrowserContext;
  contextB: BrowserContext;
  pageA: Page;
  pageB: Page;
}

/**
 * Create two independent browser contexts — one for each test user.
 * Both contexts are pre-authenticated via saved storage state.
 */
export async function createTwoUserSetup(
  browser: Browser
): Promise<TwoUserSetup> {
  for (const [label, file] of [
    ["User A", USER_A_STATE],
    ["Partner", PARTNER_STATE],
  ] as const) {
    if (!fs.existsSync(file)) {
      throw new Error(
        `${label} auth state not found at ${file}. Run auth setup first.`
      );
    }
  }

  const contextA = await browser.newContext({ storageState: USER_A_STATE });
  const contextB = await browser.newContext({ storageState: PARTNER_STATE });
  const pageA = await contextA.newPage();
  const pageB = await contextB.newPage();

  return { contextA, contextB, pageA, pageB };
}

/**
 * Tear down both browser contexts.
 */
export async function teardownTwoUserSetup(
  setup: TwoUserSetup
): Promise<void> {
  await setup.pageA.close().catch(() => {});
  await setup.pageB.close().catch(() => {});
  await setup.contextA.close().catch(() => {});
  await setup.contextB.close().catch(() => {});
}

/**
 * Ensure both users are in the same household.
 *
 * Detection priority:
 *   1. Compare household IDs from both stores — if same, already joined.
 *   2. Check if User A's store has ≥ 2 members — if yes, already joined.
 *   3. Otherwise, refresh the invite code (may be expired) and perform invite flow.
 *
 * If the household is already full with a DIFFERENT partner,
 * throws so the calling test can skip gracefully.
 */
export async function ensureSameHousehold(
  pageA: Page,
  pageB: Page
): Promise<{ alreadyJoined: boolean }> {
  // Navigate both to dashboard and wait for stores to load
  await pageA.goto("/dashboard", { waitUntil: "commit" });
  await pageB.goto("/dashboard", { waitUntil: "commit" });
  await Promise.all([waitForStoreReady(pageA), waitForStoreReady(pageB)]);

  // ── Quick check: same household ID means already joined ──────────────
  const [infoA, infoB] = await Promise.all([
    pageA.evaluate(() => {
      const store = (window as any).__zustand_store;
      if (!store) return null;
      const s = store.getState();
      return {
        householdId: s.household?.id ?? null,
        memberCount: s.members?.length ?? 0,
        userUid: s.user?.uid ?? null,
      };
    }),
    pageB.evaluate(() => {
      const store = (window as any).__zustand_store;
      if (!store) return null;
      const s = store.getState();
      return {
        householdId: s.household?.id ?? null,
        userUid: s.user?.uid ?? null,
      };
    }),
  ]);

  if (
    infoA?.householdId &&
    infoB?.householdId &&
    infoA.householdId === infoB.householdId
  ) {
    await alignActiveGroups(pageA, pageB);
    return { alreadyJoined: true };
  }

  // If User A already has 2 members but User B isn't one of them,
  // the household is full with a different partner — can't proceed.
  if ((infoA?.memberCount ?? 0) >= 2) {
    const memberUids: string[] = await pageA.evaluate(() => {
      const store = (window as any).__zustand_store;
      return (store?.getState()?.members ?? []).map((m: any) => m.uid);
    });
    if (memberUids.includes(infoB?.userUid ?? "")) {
      await alignActiveGroups(pageA, pageB);
      return { alreadyJoined: true };
    }
    throw new Error(
      "User A's household already has 2 members (different partner). " +
        "Cannot run two-user tests with this account."
    );
  }

  // ── Refresh the invite code (it may be expired) ──────────────────────
  await pageA.goto("/settings", { waitUntil: "commit" });
  await waitForStoreReady(pageA);

  // Record the old code so we can verify the refresh changed it
  const oldCode: string | null = await pageA.evaluate(() => {
    const store = (window as any).__zustand_store;
    return store?.getState()?.household?.invite_code ?? null;
  });

  // Click "Refresh now" (expired link) or the main "Refresh" button.
  // These are two separate elements — use specific selectors to avoid strict mode ambiguity.
  const expiredRefreshLink = pageA.locator(
    '[data-testid="invite-refresh-expired"]'
  );
  const mainRefreshBtn = pageA.locator("button").filter({ hasText: /^Refresh$/ });

  if (
    await expiredRefreshLink.isVisible({ timeout: 3_000 }).catch(() => false)
  ) {
    await expiredRefreshLink.click();
  } else if (
    await mainRefreshBtn.isVisible({ timeout: 3_000 }).catch(() => false)
  ) {
    await mainRefreshBtn.click();
  }

  // Wait for the refresh to complete — the invite code in the store should change
  await pageA.waitForFunction(
    (prev) => {
      const store = (window as any).__zustand_store;
      if (!store) return false;
      const current = store.getState().household?.invite_code;
      // Code changed OR it was null before and is now set
      return current && current !== prev;
    },
    oldCode,
    { timeout: 10_000 }
  ).catch(() => {
    // If code didn't change (e.g. refresh wasn't needed), proceed with what we have
  });

  // Read the (now fresh) invite code from the store
  const inviteCode: string | null = await pageA.evaluate(() => {
    const store = (window as any).__zustand_store;
    return store?.getState()?.household?.invite_code ?? null;
  });

  if (!inviteCode) {
    throw new Error(
      "User A has no invite code even after refresh. Household may not be set up."
    );
  }

  // ── User B visits the invite page ────────────────────────────────────
  await pageB.goto(`/invite/${inviteCode}`, { waitUntil: "commit" });

  // Wait for the page to settle — it may show Accept, error, or no-auth
  const acceptBtn = pageB.getByRole("button", { name: /accept invite/i });
  const errorEl = pageB.locator(
    '[data-testid="invite-error"], [data-testid="household-full-error"]'
  );

  const outcome = await Promise.race([
    acceptBtn
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => "accept" as const),
    errorEl
      .waitFor({ state: "visible", timeout: 20_000 })
      .then(() => "error" as const),
  ]).catch(() => "timeout" as const);

  if (outcome === "error") {
    const text = await errorEl.textContent();
    throw new Error(`Invite page error: ${text}`);
  }
  if (outcome === "timeout") {
    throw new Error(
      "Invite page did not show Accept button or error within 20s."
    );
  }

  // Click accept
  await acceptBtn.click();

  // Wait for redirect to dashboard (invite page does setTimeout 1.5s → router.push)
  await pageB.waitForURL("**/dashboard", {
    timeout: 30_000,
    waitUntil: "commit",
  });
  await waitForStoreReady(pageB);

  // Reload User A's page so they pick up the new member
  await pageA.goto("/dashboard", { waitUntil: "commit" });
  await waitForStoreReady(pageA);

  await alignActiveGroups(pageA, pageB);
  return { alreadyJoined: false };
}

/**
 * Ensure both users have the same activeGroup selected.
 *
 * Expense subscriptions are group-filtered (Firestore `where("group_id", "==", groupId)`),
 * so both users must view the same group for cross-user expense sync to work.
 */
export async function alignActiveGroups(
  pageA: Page,
  pageB: Page
): Promise<void> {
  const groupIdA = await pageA.evaluate(() => {
    const store = (window as any).__zustand_store;
    return store?.getState()?.activeGroup?.id ?? null;
  });

  if (!groupIdA) return;

  const groupIdB = await pageB.evaluate(() => {
    const store = (window as any).__zustand_store;
    return store?.getState()?.activeGroup?.id ?? null;
  });

  if (groupIdA === groupIdB) return;

  // Force User B to User A's group
  await pageB.evaluate((gid: string) => {
    const store = (window as any).__zustand_store;
    if (!store) return;
    const groups = store.getState().groups ?? [];
    const target = groups.find((g: any) => g.id === gid);
    if (target) {
      store.getState().setActiveGroup(target);
    }
  }, groupIdA);

  // Reload to re-subscribe to the correct group's expenses
  await pageB.reload({ waitUntil: "commit" });
  await waitForStoreReady(pageB);
}

/**
 * Clean up all E2E_TEST_ expenses from a page's store.
 */
export async function cleanupTestExpensesOnPage(page: Page): Promise<number> {
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
