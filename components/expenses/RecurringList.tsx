"use client";
import { useState, useMemo, useCallback } from "react";
import { useAppStore } from "@/store/useAppStore";
import { updateExpense } from "@/lib/firebase/firestore";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Repeat, StopCircle } from "lucide-react";
import { toast } from "sonner";
import type { Expense } from "@/types";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const FREQUENCY_ORDER = ["daily", "weekly", "monthly", "yearly"];

export const RecurringList = () => {
  const { expenses, categories, household, user, updateExpenseInStore } = useAppStore();
  const currency = household?.currency ?? "INR";

  const [confirmStopId, setConfirmStopId] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  // Filter recurring expenses
  const recurringExpenses = useMemo(
    () => expenses.filter((e) => e.is_recurring),
    [expenses]
  );

  // Group by frequency
  const grouped = useMemo(() => {
    const map: Record<string, Expense[]> = {};
    for (const exp of recurringExpenses) {
      const freq = exp.recurring_frequency ?? "monthly";
      if (!map[freq]) map[freq] = [];
      map[freq].push(exp);
    }
    // Sort by frequency order
    const sorted: [string, Expense[]][] = [];
    for (const freq of FREQUENCY_ORDER) {
      if (map[freq]) sorted.push([freq, map[freq]]);
    }
    return sorted;
  }, [recurringExpenses]);

  const getCategoryName = useCallback(
    (categoryId: string) =>
      categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized",
    [categories]
  );

  const handleStopRecurring = async () => {
    if (!confirmStopId || !user?.household_id) return;
    setStopping(true);
    try {
      await updateExpense(user.household_id, confirmStopId, {
        is_recurring: false,
      });
      updateExpenseInStore(confirmStopId, { is_recurring: false });
      toast.success("Recurring expense stopped");
    } catch {
      toast.error("Failed to update. Try again.");
    } finally {
      setStopping(false);
      setConfirmStopId(null);
    }
  };

  if (recurringExpenses.length === 0) {
    return (
      <div className="text-center py-12">
        <Repeat className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">
          No recurring expenses yet.
        </p>
        <p className="text-slate-500 text-xs mt-1">
          Mark an expense as recurring when creating it.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-5">
        {grouped.map(([freq, exps]) => (
          <div key={freq}>
            <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              {FREQUENCY_LABELS[freq] ?? freq} ({exps.length})
            </h3>
            <div className="space-y-2">
              {exps.map((exp) => (
                <Card
                  key={exp.id ?? exp._local_id}
                  className="bg-slate-900 border-slate-800"
                >
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-100 truncate">
                          {exp.description || "Untitled"}
                        </p>
                        <Badge
                          variant="outline"
                          className="text-[10px] text-blue-400 border-blue-800 shrink-0"
                        >
                          {FREQUENCY_LABELS[exp.recurring_frequency ?? "monthly"]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">
                          {getCategoryName(exp.category_id)}
                        </span>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="text-xs text-slate-400">
                          Since {formatDate(exp.date)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-semibold text-slate-100">
                        {formatCurrency(exp.amount, currency)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                        onClick={() => setConfirmStopId(exp.id ?? null)}
                        title="Stop recurring"
                        data-testid="stop-recurring-btn"
                      >
                        <StopCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmStopId}
        onOpenChange={(open) => !open && setConfirmStopId(null)}
      >
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              Stop Recurring Expense
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              This will stop this expense from being tracked as recurring. Past
              entries will remain in your history.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={() => setConfirmStopId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleStopRecurring}
              disabled={stopping}
            >
              {stopping ? "Stopping..." : "Stop Recurring"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
