import type { Expense, ExpenseTemplate } from "@/types";

/**
 * Derive recent unique expense templates for quick re-entry.
 * Deduplicates by description (case-insensitive), keeps most recent.
 * Filters out settlements and empty descriptions.
 */
export function getRecentTemplates(
  expenses: Expense[],
  limit: number = 5
): ExpenseTemplate[] {
  const seen = new Set<string>();
  const templates: ExpenseTemplate[] = [];

  for (const exp of expenses) {
    if (exp.expense_type === "settlement") continue;
    if (!exp.description || !exp.description.trim()) continue;

    const key = exp.description.toLowerCase().trim();
    if (seen.has(key)) continue;
    seen.add(key);

    templates.push({
      description: exp.description,
      amount: Math.abs(exp.amount),
      category_id: exp.category_id,
      expense_type: exp.expense_type,
      split_ratio: exp.split_ratio,
    });

    if (templates.length >= limit) break;
  }

  return templates;
}
