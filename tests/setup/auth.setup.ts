import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/user.json");

/**
 * Auth setup for Playwright.
 *
 * How it works
 * ──────────────
 * Signs in through the real /login UI so Firebase SDK writes auth tokens to
 * IndexedDB natively. Playwright's storageState then captures both cookies AND
 * IndexedDB, which is replayed in every subsequent test worker automatically.
 *
 * This is necessary because Firebase SDK v9+ stores auth state in IndexedDB,
 * not localStorage — so injecting localStorage tokens doesn't work.
 *
 * Setup (one-time per developer / CI secret)
 * ─────────────────────────────────────────
 * Copy .env.test.example → .env.test and fill in real values:
 *   TEST_USER_EMAIL=test@couples-tracker.dev
 *   TEST_USER_PASSWORD=TestUserE2E2026
 *
 * The test user must already exist in Firebase Authentication for your project.
 * To create one: Firebase Console → Authentication → Users → Add user.
 *
 * If the env vars are missing the setup writes an empty state and all
 * auth-gated tests will FAIL (not skip) — this surfaces the problem clearly.
 */
setup.setTimeout(120_000); // 2 min — covers sign-in + optional onboarding flow

setup("authenticate", async ({ page }) => {
  // Ensure the .auth directory exists
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  // ── Guard: require credentials ──────────────────────────────────────────────
  if (!email || !password) {
    console.error(
      "\n╔══════════════════════════════════════════════════════════════╗" +
      "\n║  AUTH SETUP SKIPPED — missing test credentials               ║" +
      "\n║                                                              ║" +
      "\n║  Create a .env.test file in the project root:               ║" +
      "\n║    TEST_USER_EMAIL=test@couples-tracker.dev                  ║" +
      "\n║    TEST_USER_PASSWORD=TestUserE2E2026                        ║" +
      "\n║                                                              ║" +
      "\n║  The test user must exist in your Firebase project.          ║" +
      "\n║  All auth-gated tests (B, C7, D, E, F4-F18) will FAIL.      ║" +
      "\n╚══════════════════════════════════════════════════════════════╝\n"
    );
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({ cookies: [], origins: [] }, null, 2)
    );
    return;
  }

  // ── Sign in through the real login UI ────────────────────────────────────────
  // Firebase SDK writes auth tokens to IndexedDB when the user logs in via the
  // app. Playwright's storageState captures IndexedDB so it is replayed in tests.
  console.log(`\n🔐  Signing in test user via UI: ${email}`);

  await page.goto("/login", { waitUntil: "domcontentloaded" });

  // Wait for React to hydrate the form before filling
  await page.locator('[data-testid="email-input"]').waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(1000); // Extra wait for React hydration / event binding

  // Fill credentials — use click first to focus, then type to ensure RHF picks up changes
  await page.locator('[data-testid="email-input"]').click();
  await page.locator('[data-testid="email-input"]').fill(email);
  await page.locator('[data-testid="password-input"]').click();
  await page.locator('[data-testid="password-input"]').fill(password);

  // Verify fills worked before submitting
  const emailVal = await page.locator('[data-testid="email-input"]').inputValue();
  const passVal = await page.locator('[data-testid="password-input"]').inputValue();
  console.log(`📝  Email filled: "${emailVal}", Password filled: ${passVal.length > 0 ? "yes" : "NO - EMPTY"}`);

  await page.locator('[data-testid="login-submit"]').click();

  // Wait for the app to redirect away from /login
  // It will go to /dashboard (existing household) or /onboarding (new user).
  // Use "commit" (not "load") because Firestore real-time subscriptions keep
  // the network permanently active so "load" / "networkidle" never fire.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
    waitUntil: "commit",
  });
  // Give the page a moment to hydrate after the URL change
  await page.waitForTimeout(2000);
  console.log(`➡️   Redirected to: ${page.url()}`);

  // ── Brand-new test user: complete onboarding to create a household ────────
  if (page.url().includes("/onboarding")) {
    console.log("🏗️  New user — completing onboarding to create household...");

    // Handle new stepper flow: click through Welcome → Choose Path → Create
    const skipBtn = page.locator('[data-testid="stepper-skip-btn"]');
    const createBtn = page.locator('[data-testid="create-household-btn"]');

    // Check if stepper is active (new flow) or direct (old flow)
    const firstVisible = skipBtn.or(createBtn);
    await firstVisible.waitFor({ state: "visible", timeout: 15_000 });

    if (await skipBtn.isVisible()) {
      // New stepper flow
      await skipBtn.click(); // Skip welcome → Step 2
      await page.waitForTimeout(500);
      const createPathBtn = page.locator('[data-testid="stepper-create-btn"]');
      await createPathBtn.waitFor({ state: "visible", timeout: 5000 });
      await createPathBtn.click(); // → Step 3 (CreateHouseholdCard)
      await page.waitForTimeout(500);
    }

    // Now CreateHouseholdCard is visible
    await createBtn.waitFor({ state: "visible", timeout: 15_000 });
    await createBtn.click();

    // After creation the card swaps to show "Go to Dashboard"
    // OR the onboarding page's useEffect auto-redirects. Handle both.
    const goToDashboard = page.getByRole("button", { name: /go to dashboard/i });
    try {
      await Promise.race([
        goToDashboard.waitFor({ state: "visible", timeout: 30_000 }).then(() => goToDashboard.click()),
        page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 30_000, waitUntil: "commit" }),
      ]);
    } catch {
      // If we're already on dashboard that's fine
    }

    if (!page.url().includes("/dashboard")) {
      await page.waitForURL("**/dashboard", { timeout: 15_000, waitUntil: "commit" });
    }

    // Dismiss feature tour if it auto-starts
    const tourSkip = page.locator('[data-testid="tour-skip-btn"]');
    if (await tourSkip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tourSkip.click();
      await page.waitForTimeout(500);
    }

    console.log("✅  Household created — now on dashboard");
  }

  console.log(`🏠  Landed on: ${page.url()}`);

  // ── Ensure the Firestore user profile exists ──────────────────────────────
  // If the test user was created via Firebase Console (Auth only), there's no
  // /users/{uid} document — which breaks the entire data loading chain
  // (useAuth → getUserProfile → user.household_id → useHousehold).
  // Fix: use Firestore REST API from the Node.js test context to check/create
  // the profile doc. We get the auth token from the browser to authenticate.
  console.log("🔍  Checking Firestore user profile...");

  // Get the current user's UID and ID token from the browser
  const authInfo = await page.evaluate(async () => {
    // Access the already-initialized Firebase Auth instance via localStorage
    // Firebase SDK stores the auth state in localStorage with browserLocalPersistence
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("firebase:authUser:")) {
        const data = JSON.parse(localStorage.getItem(key) ?? "{}");
        return {
          uid: data.uid as string,
          email: data.email as string,
          displayName: data.displayName as string | null,
          idToken: data.stsTokenManager?.accessToken as string,
        };
      }
    }
    return null;
  });

  if (authInfo?.uid && authInfo?.idToken) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;

    // Check if user profile doc exists
    const userDocUrl = `${baseUrl}/users/${authInfo.uid}`;
    const checkRes = await fetch(userDocUrl, {
      headers: { Authorization: `Bearer ${authInfo.idToken}` },
    });

    if (checkRes.status === 404) {
      console.log("📄  User profile missing — searching for linked household...");

      // Search for a household that has this UID as a member
      // Use Firestore REST structured query
      const queryUrl = `${baseUrl}:runQuery`;
      const queryRes = await fetch(queryUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authInfo.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: "households" }],
            where: {
              fieldFilter: {
                field: { fieldPath: "members" },
                op: "ARRAY_CONTAINS",
                value: { stringValue: authInfo.uid },
              },
            },
            limit: 1,
          },
        }),
      });

      let householdId: string | null = null;
      if (queryRes.ok) {
        const results = await queryRes.json();
        if (results[0]?.document?.name) {
          // Extract document ID from the full path
          const docPath: string = results[0].document.name;
          householdId = docPath.split("/").pop() ?? null;
          console.log(`🏠  Found linked household: ${householdId}`);
        }
      }

      // Create the user profile document
      const createRes = await fetch(`${userDocUrl}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authInfo.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            uid: { stringValue: authInfo.uid },
            email: { stringValue: authInfo.email ?? "" },
            name: { stringValue: authInfo.displayName ?? "Test User" },
            household_id: householdId
              ? { stringValue: householdId }
              : { nullValue: null },
            created_at: { timestampValue: new Date().toISOString() },
          },
        }),
      });

      if (createRes.ok) {
        console.log(`✅  Created user profile (household_id: ${householdId})`);

        // Reload so the app picks up the new profile and loads household data
        console.log("🔄  Reloading page so app picks up new user profile...");
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(3000);
        console.log(`🏠  After reload: ${page.url()}`);

        // If redirected to onboarding (no household_id), complete it
        if (page.url().includes("/onboarding")) {
          console.log("🏗️  Completing onboarding after profile creation...");

          // Handle new stepper flow: click through Welcome → Choose Path → Create
          const skipBtn = page.locator('[data-testid="stepper-skip-btn"]');
          const createBtn = page.locator('[data-testid="create-household-btn"]');
          const firstVisible = skipBtn.or(createBtn);
          await firstVisible.waitFor({ state: "visible", timeout: 15_000 });

          if (await skipBtn.isVisible()) {
            await skipBtn.click();
            await page.waitForTimeout(500);
            const createPathBtn = page.locator('[data-testid="stepper-create-btn"]');
            await createPathBtn.waitFor({ state: "visible", timeout: 5000 });
            await createPathBtn.click();
            await page.waitForTimeout(500);
          }

          await createBtn.waitFor({ state: "visible", timeout: 15_000 });
          await createBtn.click();

          // After household creation, the component shows "Go to Dashboard"
          // OR the useEffect auto-redirect kicks in first. Handle both.
          const goToDashboard = page.getByRole("button", { name: /go to dashboard/i });
          try {
            await Promise.race([
              goToDashboard.waitFor({ state: "visible", timeout: 30_000 }).then(() => goToDashboard.click()),
              page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 30_000, waitUntil: "commit" }),
            ]);
          } catch {
            // If we're already on dashboard that's fine
          }

          if (!page.url().includes("/dashboard")) {
            await page.waitForURL("**/dashboard", { timeout: 15_000, waitUntil: "commit" });
          }

          // Dismiss feature tour if it auto-starts
          const tourSkip2 = page.locator('[data-testid="tour-skip-btn"]');
          if (await tourSkip2.isVisible({ timeout: 3000 }).catch(() => false)) {
            await tourSkip2.click();
            await page.waitForTimeout(500);
          }

          console.log("✅  Household created via onboarding");
        }
      } else {
        console.error(`❌  Failed to create user profile: ${createRes.status} ${await createRes.text()}`);
      }
    } else if (checkRes.ok) {
      console.log("📄  User profile exists ✓");
    }
  } else {
    console.warn("⚠️  Could not get auth info from browser — skipping profile check");
  }

  // Give Firebase SDK a moment to finish writing auth tokens to IndexedDB
  await page.waitForTimeout(2000);

  // ── Save full browser storage (cookies + IndexedDB) ───────────────────────
  const state = await page.context().storageState({ path: AUTH_FILE });
  const originCount = state.origins?.length ?? 0;
  console.log(`💾  Auth state saved — ${originCount} origin(s) → ${AUTH_FILE}`);

  // Fallback: if storageState captured no origins (IndexedDB not picked up),
  // manually write localStorage snapshot so tests can at least load the page.
  if (originCount === 0) {
    console.warn("⚠️  storageState has no origins — falling back to localStorage snapshot");
    const lsSnapshot = await page.evaluate(() => {
      const out: Record<string, string> = {};
      for (const k of Object.keys(localStorage)) {
        out[k] = localStorage.getItem(k) ?? "";
      }
      return out;
    });
    const fallbackState = {
      cookies: [],
      origins: [
        {
          origin: "http://localhost:3000",
          localStorage: Object.entries(lsSnapshot).map(([name, value]) => ({ name, value })),
        },
      ],
    };
    fs.writeFileSync(AUTH_FILE, JSON.stringify(fallbackState, null, 2));
    console.log(`💾  Fallback: wrote ${Object.keys(lsSnapshot).length} localStorage key(s)\n`);
  } else {
    console.log("✅  IndexedDB captured in storageState\n");
  }
});
