import type { Expense, Category, User } from "@/types";
import { safeToDate } from "./format";

/**
 * Escape a CSV field value: wrap in quotes if it contains comma, quote, or newline.
 */
function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export expenses to a CSV string and trigger a browser download.
 */
export function exportExpensesToCSV(
  expenses: Expense[],
  categories: Category[],
  members: User[],
  householdCurrency: string = "INR"
): number {
  const headers = [
    "Date",
    "Description",
    "Amount",
    "Currency",
    "Category",
    "Paid By",
    "Type",
    "Split Ratio",
    "Notes",
  ];

  const rows = expenses.map((exp) => {
    const date = exp.date
      ? safeToDate(exp.date).toISOString().split("T")[0]
      : "";
    const category = categories.find((c) => c.id === exp.category_id)?.name ?? "";
    const paidBy = members.find((m) => m.uid === exp.paid_by_user_id)?.name ?? "";
    const currency = exp.currency ?? householdCurrency;
    const splitPct = Math.round(exp.split_ratio * 100);

    return [
      date,
      escapeCSV(exp.description || ""),
      String(exp.amount),
      currency,
      escapeCSV(category),
      escapeCSV(paidBy),
      exp.expense_type,
      `${splitPct}%`,
      escapeCSV(exp.notes || ""),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  // Trigger browser download
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const today = new Date().toISOString().split("T")[0];
  a.href = url;
  a.download = `expenses-${today}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return expenses.length;
}
