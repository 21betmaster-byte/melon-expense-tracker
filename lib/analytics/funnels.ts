/**
 * GA4 Funnel Definitions for Melon Expense Tracker.
 *
 * These funnels are designed to be set up in GA4 Explore > Funnel Exploration.
 * Each funnel definition lists the sequential event steps.
 *
 * To create a funnel in GA4:
 *   1. Go to Explore > Funnel Exploration
 *   2. Add steps using the event names below
 *   3. Set "Open/Closed funnel" as noted per funnel
 *
 * All event names match the constants exported from ./events.ts
 */

// ─── Funnel 1: New User Activation ──────────────────────────────────────
// Measures: signup -> household setup -> first expense
// Drop-off here = users who sign up but never use the app
// Type: Closed funnel (must follow this order)
export const ACTIVATION_FUNNEL = {
  name: "New User Activation",
  steps: [
    { event: "auth_signed_up", label: "Signed Up" },
    { event: "household_created", label: "Household Created" },
    { event: "expense_created", label: "First Expense Added" },
  ],
} as const;

// ─── Funnel 2: Partner Onboarding ───────────────────────────────────────
// Measures: invite sent -> invite accepted -> partner's first expense
// Drop-off here = invites that don't convert to active couples
// Type: Closed funnel
export const PARTNER_ONBOARDING_FUNNEL = {
  name: "Partner Onboarding",
  steps: [
    { event: "invite_sent", label: "Invite Sent" },
    { event: "invite_accepted", label: "Invite Accepted" },
    { event: "expense_created", label: "Partner Adds Expense" },
  ],
} as const;

// ─── Funnel 3: Core Loop (Expense to Settlement) ────────────────────────
// Measures: expense added -> views settlement -> settles up
// This is the main value loop of the app
// Type: Open funnel (steps don't need to happen in one session)
export const CORE_LOOP_FUNNEL = {
  name: "Expense to Settlement",
  steps: [
    { event: "expense_created", label: "Expense Added" },
    { event: "settlement_viewed", label: "Viewed Settlement" },
    { event: "settled_up", label: "Settled Up" },
  ],
} as const;

// ─── Funnel 4: Feature Adoption ─────────────────────────────────────────
// Measures: expense added -> group/category customization -> analytics viewed
// Drop-off here = users who don't go beyond basic expense tracking
// Type: Open funnel
export const FEATURE_ADOPTION_FUNNEL = {
  name: "Feature Adoption",
  steps: [
    { event: "expense_created", label: "Expense Added" },
    { event: "group_created", label: "Created Custom Group" },
    { event: "category_created", label: "Created Custom Category" },
    { event: "page_viewed", label: "Viewed Analytics", params: { page_path: "/analytics" } },
  ],
} as const;

// ─── Funnel 5: Retention Signal ─────────────────────────────────────────
// Measures: sign-in -> expense added -> settlement or analytics
// Healthy retention = users completing this loop repeatedly
// Type: Open funnel (check with 7-day and 30-day windows)
export const RETENTION_FUNNEL = {
  name: "Returning User Engagement",
  steps: [
    { event: "auth_signed_in", label: "Signed In" },
    { event: "expense_created", label: "Added Expense" },
    { event: "settled_up", label: "Settled Up" },
  ],
} as const;

// ─── All funnels for reference ──────────────────────────────────────────
export const ALL_FUNNELS = [
  ACTIVATION_FUNNEL,
  PARTNER_ONBOARDING_FUNNEL,
  CORE_LOOP_FUNNEL,
  FEATURE_ADOPTION_FUNNEL,
  RETENTION_FUNNEL,
] as const;
