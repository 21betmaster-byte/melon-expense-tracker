"use client";
import { useMemo, useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, safeToDate } from "@/lib/utils/format";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export const QuickStats = () => {
  const { expenses, household } = useAppStore();
  const currency = household?.currency ?? "INR";
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const stats = useMemo(() => {
    if (!now) return { total: 0, joint: 0, count: 0 };
    const thisMonth = expenses.filter((e) => {
      const d = safeToDate(e.date);
      return (
        d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      );
    });

    const total = thisMonth.reduce((sum, e) => sum + Math.abs(e.amount), 0);
    const joint = thisMonth
      .filter((e) => e.expense_type === "joint" || e.expense_type === "paid_for_partner")
      .reduce((sum, e) => sum + Math.abs(e.amount), 0);

    return { total, joint, count: thisMonth.length };
  }, [expenses, now]);

  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: "This Month", value: formatCurrency(stats.total, currency), tooltip: "Total amount spent this month across all expense types in this group." },
        { label: "Joint", value: formatCurrency(stats.joint, currency), tooltip: "Total joint (shared) expenses this month in this group." },
        { label: "Transactions", value: stats.count.toString(), tooltip: "Number of individual expenses recorded this month in this group." },
      ].map(({ label, value, tooltip }) => (
        <Card key={label} className="bg-slate-900 border-slate-800">
          <CardContent className="p-3 text-center">
            <p className="text-xs text-slate-400 mb-1 inline-flex items-center gap-1">
              {label}
              <InfoTooltip text={tooltip} />
            </p>
            <p className="font-semibold text-slate-100 text-sm truncate">
              {value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
