import { test, expect } from "@playwright/test";

test.describe("Journey 01: Auth Guard", () => {
  // These tests use a CLEAN browser context (no storageState)
  // to verify unauthenticated behavior
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/login", { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("login page renders email and password fields", async ({ page }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-submit"]')).toBeVisible();
  });

  test("protected routes all redirect to /login", async ({ page }) => {
    const protectedRoutes = ["/expenses", "/analytics", "/settings", "/profile"];
    for (const route of protectedRoutes) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForURL("**/login", { timeout: 10000 });
      expect(page.url()).toContain("/login");
    }
  });
});
