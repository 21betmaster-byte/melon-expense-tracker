import { test, expect } from "@playwright/test";
import {
  createTwoUserSetup,
  teardownTwoUserSetup,
  type TwoUserSetup,
} from "../../helpers/two-user-context";
import { waitForStoreReady } from "../../helpers/wait-strategies";
import { getMembers, getGroups, getStoreState } from "../../helpers/store-reader";

/**
 * Journey 16: Partner Invite & Join
 *
 * Tests the full invite flow between two users:
 * 1. User A has a household with an invite code
 * 2. Refresh the code if expired, then User B accepts
 * 3. Both users see 2 household members
 * 4. Both users see the same expense groups (sync verification)
 *
 * Idempotent: if User B is already in User A's household, verifies state only.
 */

// Give these tests extra time — invite flow involves network ops
test.setTimeout(60_000);

test.describe.serial("Two-User: Partner Invite & Join", () => {
  let ctx: TwoUserSetup;
  let alreadyJoined = false;

  test.beforeAll(async ({ browser }) => {
    ctx = await createTwoUserSetup(browser);
  });

  test.afterAll(async () => {
    await teardownTwoUserSetup(ctx);
  });

  test("User A has a household with an invite code", async () => {
    await ctx.pageA.goto("/dashboard", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageA);

    const state = await getStoreState(ctx.pageA);
    expect(state.household).toBeTruthy();
    expect(state.household.invite_code).toBeTruthy();
  });

  test("User B joins User A's household via invite", async () => {
    // ── Check if already in the same household ──────────────────────────
    await ctx.pageB.goto("/dashboard", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageB);

    const [householdIdA, householdIdB] = await Promise.all([
      ctx.pageA.evaluate(() => {
        const store = (window as any).__zustand_store;
        return store?.getState()?.household?.id ?? null;
      }),
      ctx.pageB.evaluate(() => {
        const store = (window as any).__zustand_store;
        return store?.getState()?.household?.id ?? null;
      }),
    ]);

    if (householdIdA && householdIdB && householdIdA === householdIdB) {
      console.log("Partner already in same household — skipping invite");
      alreadyJoined = true;
      return;
    }

    // Also check members list
    const members = await getMembers(ctx.pageA);
    const userBUid = await ctx.pageB.evaluate(() => {
      const store = (window as any).__zustand_store;
      return store?.getState()?.user?.uid ?? null;
    });
    if (members.some((m: any) => m.uid === userBUid)) {
      console.log("Partner found in members list — skipping invite");
      alreadyJoined = true;
      return;
    }

    // ── Refresh invite code (may be expired) ────────────────────────────
    await ctx.pageA.goto("/settings", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageA);

    const oldCode = await ctx.pageA.evaluate(() => {
      const store = (window as any).__zustand_store;
      return store?.getState()?.household?.invite_code ?? null;
    });

    // Click "Refresh now" (expired) or "Refresh" button — separate selectors to avoid ambiguity
    const expiredRefreshLink = ctx.pageA.locator(
      '[data-testid="invite-refresh-expired"]'
    );
    const mainRefreshBtn = ctx.pageA
      .locator("button")
      .filter({ hasText: /^Refresh$/ });

    if (
      await expiredRefreshLink
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      await expiredRefreshLink.click();
    } else if (
      await mainRefreshBtn.isVisible({ timeout: 3_000 }).catch(() => false)
    ) {
      await mainRefreshBtn.click();
    }

    // Wait for the code to change in the store
    await ctx.pageA
      .waitForFunction(
        (prev) => {
          const store = (window as any).__zustand_store;
          if (!store) return false;
          const current = store.getState().household?.invite_code;
          return current && current !== prev;
        },
        oldCode,
        { timeout: 10_000 }
      )
      .catch(() => {});

    // Read fresh invite code
    const inviteCode = await ctx.pageA.evaluate(() => {
      const store = (window as any).__zustand_store;
      return store?.getState()?.household?.invite_code ?? null;
    });
    expect(inviteCode).toBeTruthy();

    // ── User B visits the invite page ───────────────────────────────────
    await ctx.pageB.goto(`/invite/${inviteCode}`, { waitUntil: "commit" });

    // Wait for "Accept Invite & Join" or an error
    const acceptBtn = ctx.pageB.getByRole("button", {
      name: /accept invite/i,
    });
    const errorEl = ctx.pageB.locator(
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
    expect(outcome).toBe("accept");

    await acceptBtn.click();

    // Should redirect to dashboard after join
    await ctx.pageB.waitForURL("**/dashboard", {
      timeout: 30_000,
      waitUntil: "commit",
    });
    await waitForStoreReady(ctx.pageB);

    // Reload User A to pick up the new member
    await ctx.pageA.goto("/dashboard", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageA);
  });

  test("Both users see 2 household members", async () => {
    // Reload both to ensure latest data
    if (!alreadyJoined) {
      await ctx.pageA.waitForTimeout(2000);
    }
    await ctx.pageB.goto("/dashboard", { waitUntil: "commit" });
    await Promise.all([
      waitForStoreReady(ctx.pageA),
      waitForStoreReady(ctx.pageB),
    ]);

    const membersA = await getMembers(ctx.pageA);
    const membersB = await getMembers(ctx.pageB);

    expect(membersA.length).toBe(2);
    expect(membersB.length).toBe(2);

    // Same member UIDs on both sides
    const uidsA = membersA.map((m: any) => m.uid).sort();
    const uidsB = membersB.map((m: any) => m.uid).sort();
    expect(uidsB).toEqual(uidsA);
  });

  test("Both users see the same expense groups", async () => {
    const groupsA = await getGroups(ctx.pageA);
    const groupsB = await getGroups(ctx.pageB);

    expect(groupsA.length).toBeGreaterThan(0);
    expect(groupsB.length).toBe(groupsA.length);

    const namesA = groupsA.map((g: any) => g.name).sort();
    const namesB = groupsB.map((g: any) => g.name).sort();
    expect(namesB).toEqual(namesA);
  });

  test("User A settings shows household members card", async () => {
    // Reload to dashboard first so useHousehold re-fetches members
    await ctx.pageA.goto("/dashboard", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageA);
    // Wait for members to load (might need a moment after the partner joined)
    await ctx.pageA.waitForFunction(
      () => {
        const store = (window as any).__zustand_store;
        return (store?.getState()?.members?.length ?? 0) >= 2;
      },
      { timeout: 15_000 }
    );

    await ctx.pageA.goto("/settings", { waitUntil: "commit" });
    await waitForStoreReady(ctx.pageA);

    // With 2 members, InvitePartner renders the "Household Members" card
    const membersCard = ctx.pageA.getByText("Household Members");
    await membersCard.waitFor({ state: "visible", timeout: 10_000 });

    const members = await getMembers(ctx.pageA);
    for (const member of members) {
      const nameEl = ctx.pageA.getByText(member.name);
      await expect(nameEl).toBeVisible();
    }
  });
});
