/**
 * GA4 custom event names and parameter type definitions.
 *
 * Naming convention: snake_case <object>_<past_tense_action>
 * Follows Firebase recommended pattern.
 */

// ─── Auth ──────────────────────────────────────────────────────────────
export const AUTH_SIGNED_UP = "auth_signed_up";
export const AUTH_SIGNED_IN = "auth_signed_in";
export const AUTH_SIGNED_OUT = "auth_signed_out";

// ─── Household ─────────────────────────────────────────────────────────
export const HOUSEHOLD_CREATED = "household_created";
export const HOUSEHOLD_JOINED = "household_joined";
export const INVITE_SENT = "invite_sent";
export const INVITE_ACCEPTED = "invite_accepted";

// ─── Group ─────────────────────────────────────────────────────────────
export const GROUP_CREATED = "group_created";
export const GROUP_SWITCHED = "group_switched";
export const GROUP_DELETED = "group_deleted";

// ─── Expense ───────────────────────────────────────────────────────────
export const EXPENSE_CREATED = "expense_created";
export const EXPENSE_UPDATED = "expense_updated";
export const EXPENSE_DELETED = "expense_deleted";

// ─── Category ──────────────────────────────────────────────────────────
export const CATEGORY_CREATED = "category_created";
export const CATEGORY_UPDATED = "category_updated";

// ─── Settlement ───────────────────────────────────────────────────────
export const SETTLED_UP = "settled_up";

// ─── Data Export ──────────────────────────────────────────────────────
export const DATA_EXPORTED = "data_exported";

// ─── Filters / Engagement ─────────────────────────────────────────────
export const ANALYTICS_FILTER_APPLIED = "analytics_filter_applied";
export const EXPENSE_FILTER_APPLIED = "expense_filter_applied";

// ─── Session / Time ───────────────────────────────────────────────────
export const SESSION_ENGAGED = "session_engaged";

// ─── Navigation / Engagement ───────────────────────────────────────────
export const PAGE_VIEWED = "page_viewed";
export const SETTLEMENT_VIEWED = "settlement_viewed";

// ─── Performance / Errors ──────────────────────────────────────────────
export const WEB_VITALS = "web_vitals";
export const ERROR_CAUGHT = "error_caught";

// ─── Parameter types ───────────────────────────────────────────────────

export interface ExpenseCreatedParams {
  amount: number;
  currency: string;
  category_id: string;
  group_id: string;
  split_type: string;
}

export interface ExpenseUpdatedParams {
  expense_id: string;
  fields_changed: string; // comma-separated
}

export interface AuthEventParams {
  method: string; // "google" | "email"
}

export interface InviteSentParams {
  invite_method: string; // "link" | "email"
}

export interface GroupCreatedParams {
  group_name: string;
}

export interface WebVitalsParams {
  metric_name: string;
  metric_value: number;
  metric_rating: string;
}

export interface ErrorCaughtParams {
  error_message: string;
  error_source: string;
  fatal: boolean;
}
