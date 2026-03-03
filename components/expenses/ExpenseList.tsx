"use client";
import { useAppStore } from "@/store/useAppStore";
import { ExpenseCard } from "./ExpenseCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Expense } from "@/types";

interface Props {
  limit?: number;
  filteredExpenses?: Expense[];
  emptyMessage?: string;
}

export const ExpenseList = ({ limit, filteredExpenses, emptyMessage }: Props) => {
  const { expenses, isLoading } = useAppStore();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl bg-slate-800" />
        ))}
      </div>
    );
  }

  // Use filteredExpenses if provided, otherwise fall back to store
  const source = filteredExpenses ?? expenses;
  const displayed = limit ? source.slice(0, limit) : source;

  if (displayed.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm" data-testid="expense-no-results">
          {emptyMessage || "No expenses yet. Add your first expense!"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {displayed.map((expense) => (
        <ExpenseCard
          key={expense.id ?? expense._local_id}
          expense={expense}
        />
      ))}
    </div>
  );
};
