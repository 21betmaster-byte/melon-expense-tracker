"use client";
import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { ExpenseCard } from "./ExpenseCard";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils/format";
import type { Expense } from "@/types";

interface Props {
  limit?: number;
  filteredExpenses?: Expense[];
  emptyMessage?: string;
}

export const ExpenseList = ({ limit, filteredExpenses, emptyMessage }: Props) => {
  const { expenses, isLoading } = useAppStore();

  // Group expenses by date (apply limit first, then group)
  const grouped = useMemo(() => {
    const source = filteredExpenses ?? expenses;
    const items = limit ? source.slice(0, limit) : source;
    const groups: { date: string; expenses: Expense[] }[] = [];
    for (const expense of items) {
      const dateStr = formatDate(expense.date);
      const last = groups[groups.length - 1];
      if (last && last.date === dateStr) {
        last.expenses.push(expense);
      } else {
        groups.push({ date: dateStr, expenses: [expense] });
      }
    }
    return groups;
  }, [filteredExpenses, expenses, limit]);

  const totalCount = grouped.reduce((sum, g) => sum + g.expenses.length, 0);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl bg-slate-800" />
        ))}
      </div>
    );
  }

  if (totalCount === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm" data-testid="expense-no-results">
          {emptyMessage || "No expenses yet. Add your first expense!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {grouped.map((group) => (
        <div key={group.date}>
          <p className="text-xs text-slate-500 font-medium mb-2 px-1">
            {group.date}
          </p>
          <div className="space-y-2">
            {group.expenses.map((expense) => (
              <ExpenseCard
                key={expense.id ?? expense._local_id}
                expense={expense}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
