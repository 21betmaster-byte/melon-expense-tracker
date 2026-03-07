# Requirements: Profile Section, Homepage Carousel & Settings Enhancements

**Date**: 2026-03-07
**Status**: Draft - Pending Approval

---

## Table of Contents

1. [Feature A: Profile Section](#feature-a-profile-section)
2. [Feature B: Settings Enhancements](#feature-b-settings-enhancements)
3. [Feature C: Homepage Carousel](#feature-c-homepage-carousel)
4. [Data Model Changes](#data-model-changes)
5. [File Change Map](#file-change-map)
6. [Test Plan](#test-plan)

---

## Feature A: Profile Section

### A.1 Overview

Replace the current logout button (top-right of `AppNav` header bar) with a profile avatar that navigates to a new `/profile` page. The profile page consolidates personal account management into a single dedicated screen.

### A.2 Profile Avatar Button (AppNav Change)

**Current state**: Top-right of header shows a `LogOut` icon button with a confirmation dialog.

**New state**: Replace with a circular avatar button showing the user's first initial.

| Property | Value |
|----------|-------|
| Shape | Circle, `w-8 h-8 rounded-full` |
| Background | `bg-blue-600` |
| Text | First character of `user.name`, uppercase, white, `text-sm font-semibold` |
| Click action | `router.push("/profile")` |
| Test ID | `data-testid="profile-avatar-btn"` |
| Fallback | If `user.name` is empty, show `"U"` |

The logout confirmation dialog is removed from `AppNav` entirely (logout moves to the profile page).

### A.3 Profile Page (`/profile`)

New route: `app/(app)/profile/page.tsx`

The page renders as a vertically stacked set of cards, consistent with the existing settings page styling (`bg-slate-900 border-slate-800` cards, `text-slate-100` headings).

Layout (top to bottom):

```
1. Profile header (avatar + name + email — read-only summary)
2. Personal Details card (editable form)
3. Change Password card
4. Household & Partner card
5. Logout button (bottom of page)
```

Scrollable content area; no bottom nav changes needed.

---

### A.4 Profile Header

A non-editable summary shown at the top of the page.

| Element | Detail |
|---------|--------|
| Avatar | Large circle `w-16 h-16 rounded-full bg-blue-600`, first initial uppercase, `text-2xl font-bold text-white` |
| Name | `text-lg font-semibold text-slate-100` |
| Email | `text-sm text-slate-400` |
| Layout | Centered, `flex flex-col items-center gap-2 py-6` |

---

### A.5 Personal Details Card

**Card title**: "Personal Details"

An inline-editable form with Save/Cancel actions.

| Field | Type | Mandatory | Validation | Current Source |
|-------|------|-----------|------------|----------------|
| Name | Text input | Yes | 1-50 chars, non-empty after trim | `user.name` |
| Email | Text input | Yes | Valid email format (zod email) | `user.email` |

**Behavior**:

1. Fields render as **read-only styled text** by default (not disabled inputs — just text).
2. An "Edit" button (pencil icon + "Edit" label) toggles the card into **edit mode**.
3. In edit mode:
   - Fields become editable inputs (`bg-slate-800 border-slate-700`).
   - Two buttons appear at the bottom: "Save" (primary) and "Cancel" (outline).
4. **Save button is disabled** if:
   - Name is empty (after trim) or exceeds 50 chars.
   - Email is empty or fails email format validation.
   - No changes were made (values identical to original).
5. On save:
   - Call `updateDoc(doc(db, "users", user.uid), { name, email })`.
   - If email changed: call `updateEmail(firebaseUser, newEmail)` (Firebase Auth).
     - If this fails due to `auth/requires-recent-login`, show a re-auth dialog (same pattern as `DangerZone` delete flow).
   - Update store: `setUser({ ...user, name, email })`.
   - Show success toast: "Profile updated".
   - Exit edit mode.
6. On cancel: revert fields to original values, exit edit mode.
7. Validation errors show inline beneath each field (red text, `text-xs text-red-400`).
8. **Test IDs**: `profile-name-input`, `profile-email-input`, `profile-edit-btn`, `profile-save-btn`, `profile-cancel-btn`.

**Email change caveat**: Changing email in Firebase Auth requires recent authentication. If `updateEmail` throws `auth/requires-recent-login`, prompt the user to re-authenticate (password input for email/password users, Google button for Google users) before retrying. Use the same `reauthenticateWithPassword` / `reauthenticateWithGoogle` helpers from `lib/firebase/auth.ts`.

---

### A.6 Change Password Card

**Card title**: "Change Password"

Only visible for email/password users. Hidden for Google Sign-In users.

Detection: `getAuthProvider()` returns `"password"` vs `"google.com"`.

For Google users, show instead: a small info note — "Signed in with Google. Password is managed by your Google account."

| Field | Type | Validation |
|-------|------|------------|
| Current password | Password input | Required |
| New password | Password input | Min 8 chars, 1 uppercase, 1 number (same rules as signup) |
| Confirm new password | Password input | Must match new password |

**Behavior**:

1. All three fields shown in a form.
2. "Update Password" button at the bottom.
3. Button disabled if any field is empty or validation fails.
4. On submit:
   - Re-authenticate with current password (`reauthenticateWithPassword`).
   - If re-auth fails: show error toast "Current password is incorrect".
   - If re-auth succeeds: call `updatePassword(firebaseUser, newPassword)`.
   - On success: show toast "Password updated", clear all fields.
   - On error: show toast with Firebase error message.
5. **Test IDs**: `current-password-input`, `new-password-input`, `confirm-password-input`, `update-password-btn`.

---

### A.7 Household & Partner Card

**Card title**: "Your Household"

A read-only view of the current household and its members.

| Element | Detail |
|---------|--------|
| Currency | Badge showing household currency (e.g., "INR") |
| Members list | Same member display as current `InvitePartner` when `hasPartner = true` — avatar circle + name + email for each member |
| Empty state | If user has no household: "No household yet" with link to `/onboarding` |
| Single member | If only 1 member (self): Show self + "No partner yet. Invite from Settings." |

This card is purely informational. It does not duplicate invite functionality (that stays in Settings).

**Test ID**: `profile-household-card`

---

### A.8 Logout Button

Placed at the bottom of the profile page, full-width.

| Property | Value |
|----------|-------|
| Style | `variant="outline"` with red text (`text-red-400 border-red-400/30 hover:bg-red-400/10`) |
| Icon | `LogOut` icon from lucide-react |
| Label | "Sign Out" |
| Click | Shows confirmation dialog (same `AlertDialog` pattern as current AppNav logout) |
| On confirm | `logOut()` → `reset()` → `router.push("/login")` |
| Test IDs | `profile-logout-btn`, `profile-logout-confirm-btn`, `profile-logout-cancel-btn` |

---

## Feature B: Settings Enhancements

### B.1 Hide Invite Section When Household Full

**Current behavior**: The `InvitePartner` component always shows, either as "Invite Your Partner" (< 2 members) or "Household Members" (2 members).

**New behavior**:

- If `members.length >= 2` (household full): **Do not render the `InvitePartner` component at all** on the Settings page.
- The household/member information is now available on the Profile page (Feature A.7), so the Settings page no longer needs to show it when the household is full.
- If `members.length < 2`: Continue showing the invite flow as-is (no change).

**Implementation**: In `app/(app)/settings/page.tsx`, wrap `<InvitePartner />` in a conditional:
```tsx
{members.length < 2 && <InvitePartner />}
```

**Test ID**: Existing `invite-section` should not be visible when household has 2 members.

---

### B.2 Remove Partner Email Input from Invite Flow

**Current behavior**: The `InvitePartner` component has a "Partner's email" text input field. The email is saved to the `invite_email` field on the household document. It serves no functional purpose — it's not used for sending the invite, validation, or access control. It's labeled "just for your reference."

**New behavior**: Remove the partner email input entirely from the invite flow.

**Changes required**:

| File | Change |
|------|--------|
| `components/settings/InvitePartner.tsx` | Remove: `EMAIL_REGEX` constant, `email` state, `emailError` state, `validateEmail()` function, `isEmailInvalid` computed value, `handleSaveEmail()` function, and the entire email input UI section (input + save button + validation error + help text). Remove the `invite_email` read from `household?.invite_email`. |
| `types/index.ts` | Remove `invite_email?: string` from the `Household` interface |
| `tests/suite-h-email-validation.spec.ts` | Delete the entire file (tests H151-H160 test the partner email validation that no longer exists) |
| `tests/suite-f-settings.spec.ts` | Remove test F15 (partner email input acceptance) and any references to `partner-email-input` |

**Data cleanup**: The `invite_email` field may still exist on household documents in Firestore. No migration needed — the field is optional and harmless if present. It will simply be ignored.

---

### B.3 Add to Homescreen (Install App)

A new card in the Settings page that helps users install the app on their device.

**Card title**: "Install Melon"
**Position**: After `CurrencySelector`, before `GroupsManager`.

**How it works**:

The Web App Manifest is already configured (`public/manifest.json` with `display: standalone`). The browser provides a `beforeinstallprompt` event that we can capture and trigger later.

| Platform | Behavior |
|----------|----------|
| Android Chrome | Capture `beforeinstallprompt` event, show "Install" button that calls `prompt()` |
| iOS Safari | Show manual instructions: "Tap the Share button, then 'Add to Home Screen'" |
| Desktop Chrome/Edge | Same as Android — capture and trigger `beforeinstallprompt` |
| Already installed / unsupported | Show "Melon is installed" success state or hide the card entirely |

**Component**: `components/settings/InstallApp.tsx`

**States**:

1. **Installable** (beforeinstallprompt captured):
   - Show "Install" button (primary style).
   - Description: "Add Melon to your home screen for quick access."
   - On click: call `deferredPrompt.prompt()`, await `userChoice`, show toast on success.

2. **iOS** (detected via user agent: `/(iPhone|iPad|iPod)/` + not standalone):
   - Show manual instructions with icons:
     - Step 1: "Tap the Share button" (with share icon)
     - Step 2: "Select 'Add to Home Screen'" (with plus-square icon)
   - Description: "Install Melon for quick access from your home screen."

3. **Already installed** (`window.matchMedia('(display-mode: standalone)').matches` is true):
   - Show check icon + "Melon is installed on your device."
   - No action needed.

4. **Unsupported** (no `beforeinstallprompt` and not iOS and not standalone):
   - Hide the card entirely (don't render).

**Test IDs**: `install-app-card`, `install-app-btn`, `install-app-ios-instructions`.

**Hook**: Create `hooks/useInstallPrompt.ts` to manage the `beforeinstallprompt` event lifecycle:
- Listen for `beforeinstallprompt` on mount.
- Store the deferred prompt.
- Expose: `{ canInstall, isInstalled, isIOS, promptInstall }`.
- Clean up listener on unmount.

---

## Feature C: Homepage Carousel

### C.1 Overview

Add a horizontally scrollable carousel to the dashboard, positioned between the group label header and the SettlementCard. The carousel displays configurable content cards (promotions, feature announcements, tips, install prompts, etc.).

### C.2 Position on Dashboard

```
Dashboard page layout (updated):

1. Active Group Label + Add button
2. >>> Carousel (NEW) <<<
3. SettlementCard
4. QuickStats
5. Recent Expenses
```

### C.3 Carousel Component

**Component**: `components/dashboard/HomeCarousel.tsx`

**Scroll behavior**:

| Property | Value |
|----------|-------|
| Direction | Horizontal scroll |
| Scroll type | CSS snap scrolling (`scroll-snap-type: x mandatory`) |
| Card snap | Each card snaps to start (`scroll-snap-align: start`) |
| Overflow | `overflow-x: auto`, hidden scrollbar (`scrollbar-hide`) |
| Gap | `gap-3` between cards |
| Card width | `min-w-[280px]` or `w-[85vw] max-w-[320px]` (most of viewport, peeks next card) |

**Pagination dots**:
- Centered below the carousel.
- Small circles (`w-2 h-2 rounded-full`).
- Active: `bg-blue-400`, inactive: `bg-slate-700`.
- Track scroll position via `IntersectionObserver` on each card.

**Card styling**:
- Rounded corners: `rounded-xl`.
- Background: gradient or solid color (per card config).
- Padding: `p-4`.
- Height: Fixed `h-[140px]` for visual consistency.
- Content: Icon/emoji + title + subtitle + optional CTA button.

### C.4 Carousel Data Model

Cards are defined as a static array in the codebase (not from Firestore), making them easy for you to configure by editing a single file.

**Config file**: `lib/carousel/cards.ts`

```typescript
interface CarouselCard {
  id: string;                      // Unique identifier
  type: "install" | "promo" | "feature" | "tip";
  title: string;                   // Main heading (short)
  subtitle: string;                // Supporting text (1-2 lines)
  icon?: string;                   // Lucide icon name
  gradient?: string;               // Tailwind gradient classes
  bgColor?: string;                // Fallback solid color class
  ctaLabel?: string;               // Button text (optional)
  ctaAction?: "install" | "navigate" | "dismiss";
  ctaTarget?: string;              // URL path for "navigate" action
  dismissible?: boolean;           // Can the user dismiss this card?
  showCondition?: "always" | "not-installed" | "single-member" | "new-user";
}
```

### C.5 Initial Carousel Cards

**Card 1 — Add to Homescreen** (first/primary position):

| Property | Value |
|----------|-------|
| id | `"install-app"` |
| type | `"install"` |
| title | `"Add Melon to your homescreen"` |
| subtitle | `"Quick access — no app store needed"` |
| icon | `Smartphone` (lucide) |
| gradient | `from-blue-600/20 to-blue-500/5` |
| ctaLabel | `"Install"` (Android/Desktop) or `"Learn How"` (iOS) |
| ctaAction | `"install"` |
| dismissible | `true` |
| showCondition | `"not-installed"` |

Behavior:
- On Android/Desktop: Triggers `beforeinstallprompt` via `useInstallPrompt` hook (shared with Settings card).
- On iOS: Scrolls/navigates to Settings install section or shows a brief tooltip with instructions.
- Once installed (`display-mode: standalone`): Card is hidden.
- If dismissed: Store `carousel_install_dismissed` in localStorage, hide card.

**Card 2 — Invite Partner** (example promo):

| Property | Value |
|----------|-------|
| id | `"invite-partner"` |
| type | `"promo"` |
| title | `"Track expenses together"` |
| subtitle | `"Invite your partner to split expenses"` |
| icon | `Users` |
| gradient | `from-green-600/20 to-green-500/5` |
| ctaLabel | `"Invite"` |
| ctaAction | `"navigate"` |
| ctaTarget | `"/settings"` |
| dismissible | `true` |
| showCondition | `"single-member"` |

**Card 3 — Feature tip** (example):

| Property | Value |
|----------|-------|
| id | `"quick-add-tip"` |
| type | `"tip"` |
| title | `"Quick-add expenses"` |
| subtitle | `"Tap the + button to add expenses in seconds"` |
| icon | `Zap` |
| gradient | `from-purple-600/20 to-purple-500/5` |
| dismissible | `true` |
| showCondition | `"new-user"` |

### C.6 Card Visibility Logic

Each card's `showCondition` determines whether it renders:

| Condition | Logic |
|-----------|-------|
| `"always"` | Always show |
| `"not-installed"` | Show only when NOT in standalone mode (`!isInstalled` from `useInstallPrompt`) |
| `"single-member"` | Show only when `members.length < 2` |
| `"new-user"` | Show only when user signed up within last 7 days (compare `user.created_at` or fallback to `household.created_at`) |

Additionally, if a card has `dismissible: true` and the user dismissed it, check `localStorage.getItem(`carousel_dismissed_${card.id}`)`.

### C.7 Empty State

If no cards pass their visibility conditions, the carousel component renders nothing (returns `null`). No empty state UI needed — the dashboard simply shows SettlementCard directly after the header.

---

## Data Model Changes

### Firestore: `users/{uid}` Document

No new fields required. Profile editing uses existing `name` and `email` fields. Password changes go through Firebase Auth directly (not Firestore).

### LocalStorage Keys (New)

| Key | Purpose | Values |
|-----|---------|--------|
| `carousel_dismissed_{cardId}` | Track dismissed carousel cards | `"true"` |

### No Firestore Rule Changes

All operations use existing patterns:
- Profile update: `users/{uid}` — already allows `read, write: if isOwner(uid)`
- Household read: already covered by `isMember`
- No new collections or subcollections

---

## File Change Map

### New Files

| File | Purpose |
|------|---------|
| `app/(app)/profile/page.tsx` | Profile page route |
| `components/profile/PersonalDetails.tsx` | Editable name/email form |
| `components/profile/ChangePassword.tsx` | Password change form |
| `components/profile/HouseholdInfo.tsx` | Read-only household/partner view |
| `components/dashboard/HomeCarousel.tsx` | Carousel container with scroll + dots |
| `components/dashboard/CarouselCard.tsx` | Individual carousel card renderer |
| `components/settings/InstallApp.tsx` | Add-to-homescreen card for Settings |
| `hooks/useInstallPrompt.ts` | `beforeinstallprompt` event management |
| `lib/carousel/cards.ts` | Carousel card configuration array |

### Modified Files

| File | Change |
|------|--------|
| `components/layout/AppNav.tsx` | Replace logout button with profile avatar; remove logout dialog |
| `app/(app)/dashboard/page.tsx` | Add `<HomeCarousel />` between header and SettlementCard |
| `app/(app)/settings/page.tsx` | Conditionally hide `InvitePartner` when 2 members; add `<InstallApp />` card |
| `components/settings/InvitePartner.tsx` | Remove partner email input field, email state, validation, and save handler |
| `types/index.ts` | Remove `invite_email?: string` from `Household` interface |
| `lib/firebase/auth.ts` | Add `updateUserEmail(newEmail)` wrapper if not already exported |
| `tests/suite-i-bug-regression.spec.ts` | Update existing tests that reference logout button location |
| `tests/suite-f-settings.spec.ts` | Remove test F15 and partner-email-input references |

### Deleted Files

| File | Reason |
|------|--------|
| `tests/suite-h-email-validation.spec.ts` | Entire suite tested partner email validation which is being removed |

### Unchanged

- Firestore rules (`firestore.rules`) — no changes needed
- Store (`store/useAppStore.ts`) — no new state fields needed (profile edits use existing `setUser`)

---

## Test Plan

### Profile Page Tests

| ID | Test | Type |
|----|------|------|
| P1 | Profile avatar button visible in AppNav header (replaces logout icon) | E2E |
| P2 | Clicking profile avatar navigates to `/profile` | E2E |
| P3 | Profile header shows user name and email | E2E |
| P4 | Personal details card shows name and email in read-only mode by default | E2E |
| P5 | Clicking "Edit" enables input fields | E2E |
| P6 | Save button is disabled when name is empty | E2E |
| P7 | Save button is disabled when email is invalid | E2E |
| P8 | Save button is disabled when no changes made | E2E |
| P9 | Successful save shows toast and exits edit mode | E2E |
| P10 | Cancel reverts to original values | E2E |
| P11 | Change Password card visible for email/password users | E2E |
| P12 | Change Password card hidden for Google users (shows info note) | E2E |
| P13 | Password update button disabled when fields empty | E2E |
| P14 | Household card shows current members | E2E |
| P15 | Logout button at bottom of profile page works | E2E |
| P16 | Logout confirmation dialog appears on click | E2E |

### Settings Enhancement Tests

| ID | Test | Type |
|----|------|------|
| S1 | InvitePartner section hidden when household has 2 members | E2E |
| S2 | InvitePartner section visible when household has 1 member | E2E |
| S3 | Partner email input does NOT exist in invite section | E2E |
| S4 | Install App card renders on Settings page | E2E |
| S5 | Install App shows "installed" state when in standalone mode | E2E |
| S6 | Install App shows iOS instructions on iOS devices | E2E |

### Carousel Tests

| ID | Test | Type |
|----|------|------|
| C1 | Carousel renders on dashboard between header and SettlementCard | E2E |
| C2 | Carousel cards are horizontally scrollable | E2E |
| C3 | Pagination dots reflect current visible card | E2E |
| C4 | Install card hidden when app is already installed (standalone) | E2E |
| C5 | Invite card hidden when household has 2 members | E2E |
| C6 | Dismissing a card persists across page reload | E2E |
| C7 | Carousel returns null when no cards are visible (no empty gap) | E2E |

### Regression Tests (Existing Tests to Verify)

| ID | Concern |
|----|---------|
| R1 | Existing logout tests (I-series) updated to reflect new location on profile page |
| R2 | Dashboard tests still pass with carousel added above SettlementCard |
| R3 | Settings page tests still pass with InvitePartner conditionally hidden |
| R4 | Suite H (email validation) deleted — no broken imports or references remain |
| R5 | Suite F test F15 (partner email) removed — remaining F-series tests still pass |
