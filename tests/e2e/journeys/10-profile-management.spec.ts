import { test, expect } from "../fixtures";
import { ProfilePage } from "../pages/profile.page";
import { waitForStoreReady } from "../helpers/wait-strategies";

test.describe("Journey 10: Profile Management", () => {
  test("profile page displays user details", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.navigate();

    // Email should be displayed
    const email = await profile.getEmail();
    expect(email.length).toBeGreaterThan(0);

    // Name should be displayed
    const name = await profile.getUserName();
    expect(name.length).toBeGreaterThan(0);
  });

  test("edit mode toggles correctly", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.navigate();

    // Enter edit mode
    await profile.startEditing();
    const isEditing = await profile.isEditing();
    expect(isEditing).toBe(true);

    // Cancel returns to view mode
    await profile.cancelEdit();
    const isStillEditing = await profile.isEditing();
    expect(isStillEditing).toBe(false);
  });

  test("household info card is visible", async ({ page }) => {
    const profile = new ProfilePage(page);
    await profile.navigate();

    const hasHousehold = await profile.hasHouseholdCard();
    expect(hasHousehold).toBe(true);
  });
});
