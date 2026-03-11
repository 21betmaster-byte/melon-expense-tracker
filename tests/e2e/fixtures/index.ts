import { test as base } from "@playwright/test";
import { DashboardPage } from "../pages/dashboard.page";
import { ExpensesPage } from "../pages/expenses.page";
import { SettingsPage } from "../pages/settings.page";
import { ProfilePage } from "../pages/profile.page";
import { AnalyticsPage } from "../pages/analytics.page";
import { LoginPage } from "../pages/login.page";
import { NavComponent } from "../components/nav.component";
import { cleanupAllTestData } from "../helpers/data-cleanup";

/**
 * Custom Playwright fixtures for the journey tests.
 * Each page fixture navigates to its route and waits for ready.
 * Test data cleanup runs in fixture teardown.
 */

type Fixtures = {
  dashboardPage: DashboardPage;
  expensesPage: ExpensesPage;
  settingsPage: SettingsPage;
  profilePage: ProfilePage;
  analyticsPage: AnalyticsPage;
  loginPage: LoginPage;
  nav: NavComponent;
};

export const test = base.extend<Fixtures>({
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.navigate();
    await use(dashboardPage);
    // Teardown: clean up test data
    await cleanupAllTestData(page).catch(() => {});
  },

  expensesPage: async ({ page }, use) => {
    const expensesPage = new ExpensesPage(page);
    await expensesPage.navigate();
    await use(expensesPage);
    await cleanupAllTestData(page).catch(() => {});
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await settingsPage.navigate();
    await use(settingsPage);
    await cleanupAllTestData(page).catch(() => {});
  },

  profilePage: async ({ page }, use) => {
    const profilePage = new ProfilePage(page);
    await profilePage.navigate();
    await use(profilePage);
  },

  analyticsPage: async ({ page }, use) => {
    const analyticsPage = new AnalyticsPage(page);
    await analyticsPage.navigate();
    await use(analyticsPage);
  },

  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    // Don't navigate — login page is for unauthenticated tests
    await use(loginPage);
  },

  nav: async ({ page }, use) => {
    const nav = new NavComponent(page);
    await use(nav);
  },
});

export { expect } from "@playwright/test";
