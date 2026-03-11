import { test as setup } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const AUTH_FILE = path.join(__dirname, ".auth/partner.json");

/**
 * Auth setup for the PARTNER (second) test user.
 *
 * Identical flow to auth.setup.ts but uses TEST_PARTNER_EMAIL / TEST_PARTNER_PASSWORD
 * and saves state to tests/setup/.auth/partner.json.
 *
 * Setup:
 *   Add to .env.test:
 *     TEST_PARTNER_EMAIL=partner@couples-tracker.dev
 *     TEST_PARTNER_PASSWORD=PartnerUserE2E2026
 *
 *   The partner user must already exist in Firebase Authentication.
 */
setup.setTimeout(120_000);

setup("authenticate-partner", async ({ page }) => {
  const authDir = path.dirname(AUTH_FILE);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const email = process.env.TEST_PARTNER_EMAIL;
  const password = process.env.TEST_PARTNER_PASSWORD;

  if (!email || !password) {
    console.error(
      "\n╔══════════════════════════════════════════════════════════════╗" +
      "\n║  PARTNER AUTH SETUP SKIPPED — missing partner credentials    ║" +
      "\n║                                                              ║" +
      "\n║  Add to .env.test:                                          ║" +
      "\n║    TEST_PARTNER_EMAIL=partner@couples-tracker.dev            ║" +
      "\n║    TEST_PARTNER_PASSWORD=PartnerUserE2E2026                  ║" +
      "\n║                                                              ║" +
      "\n║  Two-user tests will be skipped.                             ║" +
      "\n╚══════════════════════════════════════════════════════════════╝\n"
    );
    fs.writeFileSync(
      AUTH_FILE,
      JSON.stringify({ cookies: [], origins: [] }, null, 2)
    );
    return;
  }

  console.log(`\n🔐  Signing in partner user via UI: ${email}`);

  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await page.locator('[data-testid="email-input"]').waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(1000);

  await page.locator('[data-testid="email-input"]').click();
  await page.locator('[data-testid="email-input"]').fill(email);
  await page.locator('[data-testid="password-input"]').click();
  await page.locator('[data-testid="password-input"]').fill(password);

  const emailVal = await page.locator('[data-testid="email-input"]').inputValue();
  const passVal = await page.locator('[data-testid="password-input"]').inputValue();
  console.log(`📝  Email filled: "${emailVal}", Password filled: ${passVal.length > 0 ? "yes" : "NO - EMPTY"}`);

  await page.locator('[data-testid="login-submit"]').click();

  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 30_000,
    waitUntil: "commit",
  });
  await page.waitForTimeout(2000);
  console.log(`➡️   Redirected to: ${page.url()}`);

  // Handle onboarding for new partner user
  if (page.url().includes("/onboarding")) {
    console.log("🏗️  New partner user — completing onboarding...");

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

    const goToDashboard = page.getByRole("button", { name: /go to dashboard/i });
    try {
      await Promise.race([
        goToDashboard.waitFor({ state: "visible", timeout: 30_000 }).then(() => goToDashboard.click()),
        page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 30_000, waitUntil: "commit" }),
      ]);
    } catch {
      // Already on dashboard
    }

    if (!page.url().includes("/dashboard")) {
      await page.waitForURL("**/dashboard", { timeout: 15_000, waitUntil: "commit" });
    }

    const tourSkip = page.locator('[data-testid="tour-skip-btn"]');
    if (await tourSkip.isVisible({ timeout: 3000 }).catch(() => false)) {
      await tourSkip.click();
      await page.waitForTimeout(500);
    }

    console.log("✅  Partner household created — now on dashboard");
  }

  console.log(`🏠  Partner landed on: ${page.url()}`);

  // Ensure Firestore profile exists for partner
  console.log("🔍  Checking partner Firestore profile...");

  const authInfo = await page.evaluate(async () => {
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
    const userDocUrl = `${baseUrl}/users/${authInfo.uid}`;
    const checkRes = await fetch(userDocUrl, {
      headers: { Authorization: `Bearer ${authInfo.idToken}` },
    });

    if (checkRes.status === 404) {
      console.log("📄  Partner profile missing — creating...");

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
          const docPath: string = results[0].document.name;
          householdId = docPath.split("/").pop() ?? null;
          console.log(`🏠  Found linked household: ${householdId}`);
        }
      }

      const createRes = await fetch(userDocUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authInfo.idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            uid: { stringValue: authInfo.uid },
            email: { stringValue: authInfo.email ?? "" },
            name: { stringValue: authInfo.displayName ?? "Partner User" },
            household_id: householdId
              ? { stringValue: householdId }
              : { nullValue: null },
            created_at: { timestampValue: new Date().toISOString() },
          },
        }),
      });

      if (createRes.ok) {
        console.log(`✅  Created partner profile (household_id: ${householdId})`);
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(3000);

        if (page.url().includes("/onboarding")) {
          console.log("🏗️  Completing onboarding after profile creation...");
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

          const goToDashboard = page.getByRole("button", { name: /go to dashboard/i });
          try {
            await Promise.race([
              goToDashboard.waitFor({ state: "visible", timeout: 30_000 }).then(() => goToDashboard.click()),
              page.waitForURL((url) => url.pathname === "/dashboard", { timeout: 30_000, waitUntil: "commit" }),
            ]);
          } catch {
            // Already on dashboard
          }

          if (!page.url().includes("/dashboard")) {
            await page.waitForURL("**/dashboard", { timeout: 15_000, waitUntil: "commit" });
          }

          const tourSkip2 = page.locator('[data-testid="tour-skip-btn"]');
          if (await tourSkip2.isVisible({ timeout: 3000 }).catch(() => false)) {
            await tourSkip2.click();
            await page.waitForTimeout(500);
          }

          console.log("✅  Partner household created via onboarding");
        }
      } else {
        console.error(`❌  Failed to create partner profile: ${checkRes.status}`);
      }
    } else if (checkRes.ok) {
      console.log("📄  Partner profile exists ✓");
    }
  }

  await page.evaluate(() => {
    localStorage.setItem("tour_completed", "true");
  });

  await page.waitForTimeout(2000);

  const state = await page.context().storageState({ path: AUTH_FILE });
  const originCount = state.origins?.length ?? 0;
  console.log(`💾  Partner auth state saved — ${originCount} origin(s) → ${AUTH_FILE}`);

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
    console.log("✅  Partner IndexedDB captured in storageState\n");
  }
});
