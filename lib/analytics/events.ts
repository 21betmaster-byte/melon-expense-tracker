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

// ─── Expense Form (Progressive Disclosure) ────────────────────────────
export const EXPENSE_FORM_OPENED = "expense_form_opened";
export const EXPENSE_FORM_STAGE2_REACHED = "expense_form_stage2_reached";
export const EXPENSE_FORM_CANCELLED = "expense_form_cancelled";
export const EXPENSE_FORM_VALIDATION_ERROR = "expense_form_validation_error";
export const EXPENSE_FORM_FIELD_EDITED = "expense_form_field_edited";
export const EXPENSE_FORM_SAVE_FAILED = "expense_form_save_failed";
export const EXPENSE_FORM_FLOATING_SAVE_USED = "expense_form_floating_save_used";

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

export interface ExpenseFormOpenedParams {
  source: "dashboard" | "expenses_page";
  has_template: boolean;
}

export interface ExpenseFormCancelledParams {
  stage: 1 | 2;
}

export interface ExpenseFormValidationErrorParams {
  fields: string; // comma-separated field names that failed
}

export interface ExpenseFormFieldEditedParams {
  field_name: string;
}
