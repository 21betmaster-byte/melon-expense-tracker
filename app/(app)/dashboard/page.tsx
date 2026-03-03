"use client";
import { useState, useEffect } from "react";
import { SettlementCard } from "@/components/dashboard/SettlementCard";
import { QuickStats } from "@/components/dashboard/QuickStats";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { incrementEvent } from "@/lib/milestones/tracker";

export default function DashboardPage() {
  const [addOpen, setAddOpen] = useState(false);
  const { activeGroup } = useAppStore();

  // Track dashboard visits for milestone feedback triggers
  // Delay slightly so FeedbackProvider's event listener is ready
  useEffect(() => {
    const timer = setTimeout(() => incrementEvent("visit_count"), 500);
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-5 pt-4">
      {/* Active Group Label */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-100">
          {activeGroup?.name ?? "Dashboard"}
        </h2>
        <Button
          size="sm"
          onClick={() => setAddOpen(true)}
          className="gap-1.5"
          data-testid="add-expense-btn"
        >
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Settlement */}
      <SettlementCard />

      {/* Quick Stats */}
      <QuickStats />

      {/* Recent Expenses */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
            Recent
          </h3>
          <Link
            href="/expenses"
            className="text-sm text-blue-400 hover:underline"
          >
            View all
          </Link>
        </div>
        <ExpenseList limit={5} />
      </section>

      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
