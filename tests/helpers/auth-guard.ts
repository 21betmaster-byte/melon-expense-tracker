import { type Page, test } from "@playwright/test";

/**
 * requireAuth
 *
 * Navigates to the given path and asserts the user is authenticated.
 * If the app redirects to /login the test FAILS with a clear, actionable message.
 *
 * Uses "domcontentloaded" rather than "networkidle" because Firestore's
 * real-time subscriptions keep the network permanently active, so "networkidle"
 * would never resolve.
 *
 * Usage:
 *   await requireAuth(page, "/dashboard");
 */
export async function requireAuth(page: Page, path = "/dashboard") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // Wait for the Next.js client-side router + Firebase auth state to settle
  await page.waitForTimeout(3000);

  // Check if we ended up on /login (unauthenticated redirect)
  if (page.url().includes("/login")) {
    throw new Error(
      "\n\n" +
        "╔══════════════════════════════════════════════════════════════╗\n" +
        "║  TEST FAILED — user is not authenticated                     ║\n" +
        "║                                                              ║\n" +
        "║  Create .env.test in the project root with:                  ║\n" +
        "║    TEST_USER_EMAIL=test@couples-tracker.dev                  ║\n" +
        "║    TEST_USER_PASSWORD=TestUserE2E2026                        ║\n" +
        "║                                                              ║\n" +
        "║  The test user must exist in your Firebase project.          ║\n" +
        "║  Then re-run: npx playwright test                            ║\n" +
        "╚══════════════════════════════════════════════════════════════╝\n"
    );
  }
}

/**
 * requireAuthOrSkip
 *
 * Like requireAuth but skips instead of failing.
 * Use for conditionally-visible UI (e.g. single vs two-member household).
 */
export async function requireAuthOrSkip(page: Page, path = "/dashboard") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  if (page.url().includes("/login")) {
    console.warn(
      "[requireAuthOrSkip] Not authenticated — skipping test. " +
        "Set TEST_USER_EMAIL + TEST_USER_PASSWORD in .env.test to run it."
    );
    test.skip();
  }
}
