import { Timestamp } from "firebase/firestore";

export interface User {
  uid: string;
  name: string;
  email: string;
  household_id: string | null;
  household_ids?: string[]; // all households user belongs to
  fcm_token?: string | null; // FCM push notification token
}

export interface Household {
  id: string;
  currency: string;
  created_at: Timestamp;
  members: string[];
  invite_code: string;
  invite_expires_at: Timestamp;
  default_split_ratio?: number; // 0-1 decimal, e.g. 0.7 = payer covers 70%
}

export interface ExpenseGroup {
  id: string;
  name: string;
  is_default: boolean;
  is_archived?: boolean;
}

export interface Category {
  id: string;
  name: string;
  keywords: string[];
  group_id?: string; // F-09: scope category to a group
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
}

export type ExpenseType = "solo" | "joint" | "settlement" | "paid_for_partner";
export type ExpenseSource = "manual" | "email" | "sms";

export interface Expense {
  id?: string;
  amount: number;
  description: string;
  group_id: string;
  category_id: string;
  expense_type: ExpenseType;
  paid_by_user_id: string;
  split_ratio: number;
  date: Timestamp;
  source: ExpenseSource;
  currency?: string; // Per-expense currency override (defaults to household currency)
  created_by?: string; // uid of user who created the expense
  notes?: string; // Optional notes (max 200 chars)
  // Recurring expense fields (F-03)
  is_recurring?: boolean;
  recurring_frequency?: "daily" | "weekly" | "monthly" | "yearly";
  recurrence_day?: number; // Day of month (1-31)
  recurring_parent_id?: string; // Links child occurrences to parent
  // Optimistic UI / offline fields
  _pending?: boolean;
  _local_id?: string;
}

export interface SettlementResult {
  netBalance: number;
  owedBy: string | null;
  owedTo: string | null;
  amount: number;
  isSettled: boolean;
}

export interface MonthlyData {
  month: string;
  total: number;
  userA: number;
  userB: number;
}

export interface CategoryMonthData {
  category: string;
  current: number;
  previous: number;
  projectedCurrent?: number;
}

export interface CategoryMemory {
  id: string;
  description: string; // normalized: lowercase, trimmed
  category_id: string;
}

export interface SettlementEvent {
  id?: string;
  amount: number;
  paid_by: string; // uid of person who paid
  paid_to: string; // uid of person who received
  settled_at: Timestamp;
  note?: string;
  group_id: string; // settlement is group-scoped
}

// ─── Quick-Add Templates ──────────────────────────────────────────────────

export interface ExpenseTemplate {
  description: string;
  amount: number;
  category_id: string;
  expense_type: ExpenseType;
  split_ratio: number;
}

// ─── Analytics Insights ───────────────────────────────────────────────────

export interface AnalyticsInsight {
  id: string;
  text: string;
  type: "increase" | "decrease" | "steady" | "top_spending" | "total_change";
  priority: number;
}

// ─── Enhanced Analytics (Phase 16) ──────────────────────────────────────

/** MoM trend data point with per-member breakdown */
export interface MoMDataPoint {
  month: string;
  total: number;
  [memberKey: string]: number | string; // dynamic member keys like "member_<uid>"
}

/** Member contribution data for stacked bar chart */
export interface MemberContribution {
  month: string;
  [memberKey: string]: number | string; // dynamic "member_<uid>" keys
}

// ─── Contact / Help (Phase 14) ─────────────────────────────────────────────

export type ContactSubject = "Bug Report" | "Feature Request" | "General" | "Other";

export interface ContactMessage {
  id?: string;
  user_id: string;
  user_email: string;
  household_id: string;
  subject: ContactSubject;
  message: string;
  created_at: Timestamp;
  status: "unread";
}

// ─── Feedback (Phase 14) ───────────────────────────────────────────────────

export interface FeedbackEntry {
  id?: string;
  user_id: string;
  user_email: string;
  household_id: string;
  rating: number; // 1-5
  comment?: string;
  trigger: string; // e.g. "expense_count_10"
  created_at: Timestamp;
}

// ─── Milestones (Phase 14) ─────────────────────────────────────────────────

export interface MilestoneDefinition {
  event: string; // "expense_count" | "visit_count"
  threshold: number; // 10, 25, 50, etc.
  feedbackPromptTitle: string;
  feedbackPromptDescription: string;
}
