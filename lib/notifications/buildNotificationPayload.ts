import { formatCurrency } from "@/lib/utils/format";

// ─── Input Types ────────────────────────────────────────────────────────────

interface ExpenseNotificationInput {
  senderName: string;
  description: string;
  amount: number;
  currency: string;
  expenseType: "solo" | "joint" | "settlement";
  splitRatio: number; // payer's share (0–1)
}

interface SettlementNotificationInput {
  senderName: string;
  amount: number;
  currency: string;
}

// ─── Output Type ────────────────────────────────────────────────────────────

export interface NotificationContent {
  title: string;
  body: string;
  url: string;
}

// ─── Builders ───────────────────────────────────────────────────────────────

/**
 * Build notification payload for a newly created expense.
 *
 * Examples:
 *   "Shivam added: Swiggy dinner — ₹500 (Joint · Your share: ₹250)"
 *   "Shivam added: Netflix — ₹649 (Solo)"
 */
export function buildExpenseCreatedPayload(
  input: ExpenseNotificationInput
): NotificationContent {
  const formattedAmount = formatCurrency(input.amount, input.currency);
  let body = `${input.senderName} added: ${input.description} — ${formattedAmount}`;

  if (input.expenseType === "joint") {
    const partnerShare = input.amount * (1 - input.splitRatio);
    const formattedShare = formatCurrency(partnerShare, input.currency);
    body += ` (Joint · Your share: ${formattedShare})`;
  } else if (input.expenseType === "solo") {
    body += " (Solo)";
  }

  return { title: "New Expense", body, url: "/expenses" };
}

/**
 * Build notification payload for an updated expense.
 *
 * Example: "Shivam updated: Swiggy dinner — ₹600"
 */
export function buildExpenseUpdatedPayload(
  input: ExpenseNotificationInput
): NotificationContent {
  const formattedAmount = formatCurrency(input.amount, input.currency);
  return {
    title: "Expense Updated",
    body: `${input.senderName} updated: ${input.description} — ${formattedAmount}`,
    url: "/expenses",
  };
}

/**
 * Build notification payload for a recorded settlement.
 *
 * Example: "Shivam recorded a settlement of ₹2,500"
 */
export function buildSettlementPayload(
  input: SettlementNotificationInput
): NotificationContent {
  const formattedAmount = formatCurrency(input.amount, input.currency);
  return {
    title: "Settlement Recorded",
    body: `${input.senderName} recorded a settlement of ${formattedAmount}`,
    url: "/dashboard",
  };
}
