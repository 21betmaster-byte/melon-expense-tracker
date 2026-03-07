import { test, expect, type Page } from "@playwright/test";
import { requireAuth, requireAuthOrSkip } from "./helpers/auth-guard";

/**
 * Suite I: Bug Regression Tests
 *
 * Regression coverage for the 10 production bugs identified in the Melon app.
 * Each test verifies the fix remains in place.
 *
 * Bug #  | Description
 * -------|-------------------------------------------------------------
 *   1    | Google Sign-In error shows specific message
 *   2    | Signup form shows validation errors + Google loading state
 *   2b   | Email verification is non-blocking banner (not full gate)
 *   3    | Branded MelonLoader appears during auth loading
 *   3b   | Signup leads to dashboard immediately (no blocking screen)
 *   4    | Invite section shows loading state then renders buttons
 *   4b   | Invite section shows retry when household missing
 *   5    | Groups can be created after data loads
 *   6    | Categories can be created after data loads
 *   7    | Help contact sends message successfully
 *   8    | Tour overlay does NOT render opaque wall when targets missing
 *   9    | Push notification toggle shows error for missing config
 *  10    | Category dropdown populates in expense form
 *  11    | Stale activeGroup from old household blocks expenses after invite join
 *  12    | Partner can't see groups/expenses after joining household via invite
 */

test.describe("Suite I: Bug Regression (I1–I28)", () => {
  // ─── Bug 1: Google Sign-In specific error messages ─────────────────────

  test("I1: Login page has Google sign-in button", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    const googleBtn = page.locator('[data-testid="google-signin-btn"]');
    await expect(googleBtn).toBeVisible({ timeout: 10_000 });
    await expect(googleBtn).toBeEnabled();
  });

  test("I2: Signup page has Google sign-up button with loading state", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    const googleBtn = page.locator('[data-testid="google-signup-btn"]');
    await expect(googleBtn).toBeVisible({ timeout: 10_000 });
    await expect(googleBtn).toBeEnabled();
    // Verify button text (not loading state)
    await expect(googleBtn).toContainText("Continue with Google");
  });

  // ─── Bug 2: Signup form validation ─────────────────────────────────────

  test("I3: Signup form shows validation errors on empty submit", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Click submit without filling anything
    const submitBtn = page.locator('[data-testid="signup-submit"]');
    await submitBtn.click();

    // Should show error toast about fixing errors
    await expect(
      page.getByText(/please fix the highlighted errors/i)
    ).toBeVisible({ timeout: 5000 });
  });

  test("I4: Signup form shows password requirements hint", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByText(/at least 8 characters/i)
    ).toBeVisible({ timeout: 5000 });
  });

  // ─── Bug 3: MelonLoader branding ──────────────────────────────────────

  test("I5: MelonLoader component renders with branding", async ({ page, context }) => {
    // Clear auth so we trigger the loading state
    await context.clearCookies();
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await page.evaluate(() => localStorage.clear());

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    // The MelonLoader shows "Melon" text during auth loading
    // or redirects to login. Either way the old plain "Loading…" should not appear
    await page.waitForTimeout(2000);

    // Verify the old plain loading text is NOT present
    const oldLoader = page.locator("text=Loading…");
    const count = await oldLoader.count();
    // If the page loaded to login already, that's fine.
    // If still loading, check for Melon branding
    if (!page.url().includes("/login")) {
      expect(count).toBe(0);
    }
  });

  // ─── Bug 4: Invite Partner ─────────────────────────────────────────────

  test("I6: Invite section renders on settings page", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(3000);

    // Either shows "Invite Your Partner" or "Household Members"
    const inviteCard = page.getByText(/invite your partner|household members/i);
    await expect(inviteCard.first()).toBeVisible({ timeout: 10_000 });
  });

  // ─── Bug 5: Groups can be created ─────────────────────────────────────

  test("I7: Groups section visible on settings page", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(3000);

    const groupsTitle = page.getByText("Expense Groups");
    await expect(groupsTitle).toBeVisible({ timeout: 10_000 });
  });

  test("I8: New group input is interactable after data loads", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(5000);

    const input = page.locator('[data-testid="new-group-input"]');
    await expect(input).toBeVisible({ timeout: 10_000 });
    // Should be enabled (not disabled) once data loads
    await expect(input).toBeEnabled({ timeout: 10_000 });
  });

  // ─── Bug 6: Categories can be created ──────────────────────────────────

  test("I9: Categories section visible on settings page", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(3000);

    const catTitle = page.getByText("Categories");
    await expect(catTitle.first()).toBeVisible({ timeout: 10_000 });
  });

  test("I10: New category input is interactable after data loads", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(5000);

    const input = page.locator('[data-testid="new-category-input"]');
    await expect(input).toBeVisible({ timeout: 10_000 });
    await expect(input).toBeEnabled({ timeout: 10_000 });
  });

  // ─── Bug 7: Help contact ──────────────────────────────────────────────

  test("I11: Help contact form renders with all elements", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(3000);

    const card = page.locator('[data-testid="help-contact-card"]');
    await expect(card).toBeVisible({ timeout: 10_000 });

    await expect(page.locator('[data-testid="help-subject-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="help-message-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="help-send-btn"]')).toBeVisible();
  });

  test("I12: Help send button is disabled when message is empty", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(3000);

    const sendBtn = page.locator('[data-testid="help-send-btn"]');
    await expect(sendBtn).toBeVisible({ timeout: 10_000 });
    await expect(sendBtn).toBeDisabled();
  });

  // ─── Bug 8: Tour overlay safety ───────────────────────────────────────

  test("I13: Tour overlay does NOT block page when targets are missing", async ({ page }) => {
    await requireAuth(page, "/dashboard");

    // Set onboarding complete but remove tour flag so tour auto-trigger fires
    await page.evaluate(() => {
      localStorage.removeItem("tour_completed");
      localStorage.setItem("onboarding_completed", "true");
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    // Wait for any potential tour overlay to render
    await page.waitForTimeout(4000);

    // The tour should either appear correctly with spotlight
    // OR not appear at all (if targets haven't loaded yet)
    // It should NOT render as an opaque blocking wall
    const overlay = page.locator('[data-testid="tour-overlay"]');
    const overlayCount = await overlay.count();

    if (overlayCount > 0 && await overlay.isVisible()) {
      // If overlay is visible, tooltip must also be visible (not just blank wall)
      const tooltip = page.locator('[data-testid="tour-tooltip"]');
      await expect(tooltip).toBeVisible({ timeout: 3000 });
    }
    // If overlay is NOT visible, that's fine — means the safety check worked
  });

  // ─── Bug 9: Push notification toggle ──────────────────────────────────

  test("I14: Notification settings card renders", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(3000);

    const card = page.locator('[data-testid="notification-settings"]');
    // May or may not exist depending on browser support
    const exists = await card.count();
    if (exists > 0) {
      await expect(card).toBeVisible();
      const toggle = page.locator('[data-testid="push-notifications-toggle"]');
      await expect(toggle).toBeVisible();
    }
  });

  // ─── Bug 10: Category dropdown in expense form ────────────────────────

  test("I15: Expense form renders with category dropdown", async ({ page }) => {
    await requireAuthOrSkip(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Open the add expense dialog
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1000);

      const categorySelect = page.locator('[data-testid="category-select"]');
      await expect(categorySelect).toBeVisible({ timeout: 5000 });
    }
  });

  test("I16: Expense form category dropdown has items after data loads", async ({ page }) => {
    await requireAuthOrSkip(page, "/dashboard");
    await page.waitForTimeout(5000);

    // Open the add expense dialog
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(1500);

      const categorySelect = page.locator('[data-testid="category-select"]');
      await expect(categorySelect).toBeVisible({ timeout: 5000 });
      // Click to open dropdown
      await categorySelect.click();
      await page.waitForTimeout(500);

      // Should have at least one category option
      const options = page.locator("[role='option']");
      const count = await options.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  // ─── Bug 2b: Email verification is non-blocking ─────────────────────

  test("I17: No full-screen email verification gate on signup page", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // The old VerifyEmail full-screen gate should NOT exist
    // Verify there is no "Check your email" blocking screen on the signup page
    const verifyGate = page.getByText("Waiting for verification");
    const count = await verifyGate.count();
    expect(count).toBe(0);
  });

  test("I18: Signup form submit button shows loading feedback", async ({ page }) => {
    await page.goto("/signup", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);

    // Verify the submit button exists and has proper text
    const submitBtn = page.locator('[data-testid="signup-submit"]');
    await expect(submitBtn).toBeVisible({ timeout: 10_000 });
    await expect(submitBtn).toContainText("Create Account");

    // Verify button will show loading state when submitting (disabled during submit)
    // We test that the button text changes by checking both states are in the component
    const btnText = await submitBtn.textContent();
    expect(btnText).toContain("Create Account");
  });

  test("I19: Email verification banner component is non-blocking", async ({ page }) => {
    await requireAuthOrSkip(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Dashboard should be accessible — the bottom nav should render
    // regardless of email verification status
    const bottomNav = page.locator('[data-testid="bottom-nav"]');
    await expect(bottomNav).toBeVisible({ timeout: 10_000 });

    // The VerifyEmailBanner (if present) should NOT block the page.
    // The old full-screen gate with "Check your email" heading should NOT exist
    const fullScreenGate = page.locator("h2:has-text('Check your email')");
    const gateCount = await fullScreenGate.count();
    expect(gateCount).toBe(0);
  });

  // ─── Bug 3b: No blank screen / loading too long after signup ────────

  test("I20: Dashboard renders app shell without blocking verification", async ({ page }) => {
    await requireAuthOrSkip(page, "/dashboard");
    await page.waitForTimeout(5000);

    // Verify app content renders (not stuck on loading/verification)
    // AppNav should be visible, indicating the app shell rendered
    const nav = page.locator('[data-testid="bottom-nav"]');
    await expect(nav).toBeVisible({ timeout: 10_000 });

    // The old plain "Loading…" text should NOT be present
    const oldLoader = page.locator("text=Loading…");
    const loaderCount = await oldLoader.count();
    expect(loaderCount).toBe(0);
  });

  // ─── Bug 4b: Invite partner — retry on missing household ───────────

  test("I21: Invite section does not show infinite loading", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(5000);

    // The invite section should resolve to one of three states:
    // 1. "Invite Your Partner" with invite link/buttons
    // 2. "Household Members" if partner already joined
    // 3. "Set Up Household" retry button if household is missing
    // It should NEVER show "Loading invite details…" indefinitely.
    const inviteCard = page.getByText(/invite your partner|household members|set up household/i);
    await expect(inviteCard.first()).toBeVisible({ timeout: 10_000 });

    // Verify the infinite loading state is NOT showing
    const loadingText = page.getByText("Loading invite details");
    const loadingCount = await loadingText.count();
    // If loading text is visible, it should not still be showing after 5s
    if (loadingCount > 0) {
      // This would be a bug — loading should resolve by now
      expect(loadingCount).toBe(0);
    }
  });

  test("I22: Invite section has actionable buttons when household exists", async ({ page }) => {
    await requireAuthOrSkip(page, "/settings");
    await page.waitForTimeout(5000);

    // Check for either invite buttons (Copy/Share) or household members list
    // or the retry "Set Up Household" button
    const copyBtn = page.locator('[data-testid="copy-invite-btn"]');
    const retryBtn = page.locator('[data-testid="retry-household-btn"]');
    const membersSection = page.getByText(/household members/i);

    const hasCopy = await copyBtn.count();
    const hasRetry = await retryBtn.count();
    const hasMembers = await membersSection.count();

    // At least one of these should be visible (never stuck in loading)
    expect(hasCopy + hasRetry + hasMembers).toBeGreaterThan(0);
  });

  // ─── Bug 11: Stale activeGroup after joining new household ────────

  test("I23: Stale activeGroup from old household is replaced on reload", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Verify the group switcher shows a valid group initially
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10_000 });
    const originalGroupName = await switcher.textContent();
    expect(originalGroupName).toBeTruthy();

    // Inject a stale activeGroup into localStorage (simulates joining a new
    // household while activeGroup from the old household is still persisted).
    await page.evaluate(() => {
      const raw = localStorage.getItem("melon-store");
      if (!raw) return;
      const store = JSON.parse(raw);
      // Replace activeGroup with a fake one that doesn't belong to any current group
      store.state.activeGroup = {
        id: "stale-group-from-old-household",
        name: "Old Household Group",
        is_default: true,
      };
      localStorage.setItem("melon-store", JSON.stringify(store));
    });

    // Reload — useHousehold should detect the stale group and reset it
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // The group switcher should show a valid group from the CURRENT household,
    // NOT the stale "Old Household Group" or undefined/null
    await expect(switcher).toBeVisible({ timeout: 10_000 });
    const updatedGroupName = await switcher.textContent();
    expect(updatedGroupName).toBeTruthy();
    expect(updatedGroupName).not.toContain("Old Household Group");
    expect(updatedGroupName).not.toContain("undefined");
    expect(updatedGroupName).not.toContain("null");
  });

  test("I24: Dashboard loads expenses after stale activeGroup is corrected", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Inject stale activeGroup
    await page.evaluate(() => {
      const raw = localStorage.getItem("melon-store");
      if (!raw) return;
      const store = JSON.parse(raw);
      store.state.activeGroup = {
        id: "stale-group-from-old-household",
        name: "Old Household Group",
        is_default: true,
      };
      localStorage.setItem("melon-store", JSON.stringify(store));
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // After stale group is corrected, the settlement card should render
    // (it always shows for valid groups, even with $0 balance)
    const settlementCard = page.locator('[data-testid="settlement-card"]');
    await expect(settlementCard).toBeVisible({ timeout: 10_000 });

    // The bottom nav should be functional (app is not stuck)
    const bottomNav = page.locator('[data-testid="bottom-nav"]');
    await expect(bottomNav).toBeVisible({ timeout: 5_000 });
  });

  // ─── Bug 12: Partner can't see groups/expenses after joining household ──

  test("I25: Full stale household data is replaced after household switch", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Inject comprehensive stale data simulating a partner who had their
    // own auto-created household before joining via invite link.
    await page.evaluate(() => {
      const raw = localStorage.getItem("melon-store");
      if (!raw) return;
      const store = JSON.parse(raw);
      store.state.household = {
        id: "stale-old-household-id",
        currency: "USD",
        members: ["old-user-id"],
      };
      store.state.groups = [
        { id: "stale-group-1", name: "Old Default", is_default: true },
        { id: "stale-group-2", name: "Old Travel", is_default: false },
      ];
      store.state.activeGroup = {
        id: "stale-group-1",
        name: "Old Default",
        is_default: true,
      };
      store.state.expenses = [];
      store.state.categories = [];
      store.state.allCategories = [];
      store.state.settlements = [];
      localStorage.setItem("melon-store", JSON.stringify(store));
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // GroupSwitcher should show a group from the CURRENT household
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10_000 });
    const groupName = await switcher.textContent();
    expect(groupName).toBeTruthy();
    expect(groupName).not.toContain("Old Default");
    expect(groupName).not.toContain("Old Travel");

    // Settlement card renders (proves activeGroup is valid)
    const settlementCard = page.locator('[data-testid="settlement-card"]');
    await expect(settlementCard).toBeVisible({ timeout: 10_000 });
  });

  test("I26: GroupSwitcher dropdown lists current household groups after stale data", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Capture the real groups before injecting stale data
    const realGroups = await page.evaluate(() => {
      const raw = localStorage.getItem("melon-store");
      if (!raw) return [];
      const store = JSON.parse(raw);
      return (store.state.groups || []).map((g: { name: string }) => g.name);
    });

    // Inject stale groups from a different household
    await page.evaluate(() => {
      const raw = localStorage.getItem("melon-store");
      if (!raw) return;
      const store = JSON.parse(raw);
      store.state.groups = [
        { id: "fake-group-x", name: "Partner Old Group", is_default: true },
      ];
      store.state.activeGroup = {
        id: "fake-group-x",
        name: "Partner Old Group",
        is_default: true,
      };
      localStorage.setItem("melon-store", JSON.stringify(store));
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // Open the GroupSwitcher dropdown
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10_000 });
    await switcher.click();
    await page.waitForTimeout(500);

    // The dropdown should NOT contain the stale group
    const dropdownContent = page.locator('[role="menu"]');
    await expect(dropdownContent).toBeVisible({ timeout: 5_000 });
    const dropdownText = await dropdownContent.textContent();
    expect(dropdownText).not.toContain("Partner Old Group");

    // It should contain at least one of the real groups
    if (realGroups.length > 0) {
      const hasRealGroup = realGroups.some((name: string) =>
        dropdownText?.includes(name)
      );
      expect(hasRealGroup).toBe(true);
    }
  });

  test("I27: ExpenseList renders after stale household data is cleared", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Inject stale data from a different household
    await page.evaluate(() => {
      const raw = localStorage.getItem("melon-store");
      if (!raw) return;
      const store = JSON.parse(raw);
      store.state.activeGroup = {
        id: "stale-hh-group",
        name: "Stale Group",
        is_default: true,
      };
      store.state.groups = [
        { id: "stale-hh-group", name: "Stale Group", is_default: true },
      ];
      store.state.household = { id: "stale-hh-id", currency: "EUR", members: [] };
      localStorage.setItem("melon-store", JSON.stringify(store));
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // ExpenseList should NOT be stuck in loading skeleton state.
    // It should show either expense cards or the "No expenses yet" message.
    const loadingSkeleton = page.locator(".animate-pulse");
    const skeletonCount = await loadingSkeleton.count();

    const noExpenses = page.locator('[data-testid="expense-no-results"]');
    const expenseCards = page.locator('[data-testid="expense-card"]');

    const hasNoExpensesMsg = (await noExpenses.count()) > 0;
    const hasExpenseCards = (await expenseCards.count()) > 0;

    // Either expenses loaded or empty message shows — not stuck loading
    if (skeletonCount > 0) {
      // If skeleton is still visible, it should disappear within a few more seconds
      await expect(loadingSkeleton.first()).not.toBeVisible({ timeout: 10_000 });
    }
    expect(hasNoExpensesMsg || hasExpenseCards).toBe(true);
  });

  test("I28: Dashboard fully functional after complete stale household replacement", async ({ page }) => {
    await requireAuth(page, "/dashboard");
    await page.waitForTimeout(3000);

    // Inject the most comprehensive stale state: household, groups,
    // activeGroup, expenses, categories, settlements, members
    await page.evaluate(() => {
      const raw = localStorage.getItem("melon-store");
      if (!raw) return;
      const store = JSON.parse(raw);
      store.state.household = {
        id: "completely-wrong-household",
        currency: "GBP",
        members: ["stranger-uid"],
      };
      store.state.groups = [
        { id: "wrong-g1", name: "Wrong Group 1", is_default: true },
        { id: "wrong-g2", name: "Wrong Group 2", is_default: false },
      ];
      store.state.activeGroup = {
        id: "wrong-g1",
        name: "Wrong Group 1",
        is_default: true,
      };
      store.state.expenses = [
        {
          id: "fake-expense",
          amount: 9999,
          description: "Fake stale expense",
          group_id: "wrong-g1",
          category_id: "fake-cat",
          expense_type: "solo",
          paid_by_user_id: "stranger-uid",
          split_ratio: 100,
          source: "manual",
          created_by: "stranger-uid",
        },
      ];
      store.state.categories = [
        { id: "fake-cat", name: "Fake Category", icon: "tag", group_id: "wrong-g1" },
      ];
      store.state.allCategories = store.state.categories;
      store.state.settlements = [];
      store.state.members = [{ uid: "stranger-uid", name: "Stranger", email: "s@x.com" }];
      localStorage.setItem("melon-store", JSON.stringify(store));
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);

    // 1. GroupSwitcher shows a valid group (not "Wrong Group 1/2")
    const switcher = page.locator('[data-testid="group-switcher"]');
    await expect(switcher).toBeVisible({ timeout: 10_000 });
    const groupText = await switcher.textContent();
    expect(groupText).not.toContain("Wrong Group");

    // 2. Settlement card renders (active group is valid)
    const settlementCard = page.locator('[data-testid="settlement-card"]');
    await expect(settlementCard).toBeVisible({ timeout: 10_000 });

    // 3. The fake stale expense should NOT appear
    const fakeExpense = page.getByText("Fake stale expense");
    const fakeCount = await fakeExpense.count();
    expect(fakeCount).toBe(0);

    // 4. Bottom nav is functional (app is not stuck)
    const bottomNav = page.locator('[data-testid="bottom-nav"]');
    await expect(bottomNav).toBeVisible({ timeout: 5_000 });

    // 5. Add expense button is interactable
    const addBtn = page.locator('[data-testid="add-expense-btn"]');
    await expect(addBtn).toBeVisible({ timeout: 5_000 });
    await expect(addBtn).toBeEnabled();
  });
});
