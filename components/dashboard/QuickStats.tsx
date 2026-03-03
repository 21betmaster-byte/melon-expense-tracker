"use client";
import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, safeToDate } from "@/lib/utils/format";

export const QuickStats = () => {
  const { expenses, household } = useAppStore();
  const currency = household?.currency ?? "INR";

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = expenses.filter((e) => {
      const d = safeToDate(e.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });

    const total = thisMonth.reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const joint = thisMonth
      .filter((e) => e.expense_type === "joint")
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    return { total, joint, count: thisMonth.length };
  }, [expenses]);

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "This Month", value: formatCurrency(stats.total, currency) },
        { label: "Joint", value: formatCurrency(stats.joint, currency) },
        { label: "Transactions", value: stats.count.toString() },
      ].map(({ label, value }) => (
        <Card key={label} className="bg-slate-900 border-slate-800">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className="font-semibold text-slate-100 text-sm truncate">
              {value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
