"use client";
import { useState, useEffect, useMemo } from "react";
import { X, Bell } from "lucide-react";
import { safeToDate } from "@/lib/utils/format";
import { checkReminders, markReminderShown, type Reminder } from "@/lib/reminders/reminders";
import { useAppStore } from "@/store/useAppStore";
import { useSettlement } from "@/hooks/useSettlement";

export const ReminderBanner = () => {
  const { expenses } = useAppStore();
  const settlement = useSettlement();
  const [dismissed, setDismissed] = useState(false);
  const [autoHidden, setAutoHidden] = useState(false);

  // Compute last expense date
  const lastExpenseDate = useMemo(() => {
    if (expenses.length === 0) return null;
    let latest: Date | null = null;
    for (const exp of expenses) {
      const d = exp.date ? safeToDate(exp.date) : null;
      if (d && (!latest || d > latest)) latest = d;
    }
    return latest;
  }, [expenses]);

  // Check reminders
  const reminder: Reminder | null = useMemo(() => {
    if (dismissed || autoHidden) return null;
    return checkReminders(
      lastExpenseDate,
      !settlement.isSettled,
      settlement.amount
    );
  }, [lastExpenseDate, settlement.isSettled, settlement.amount, dismissed, autoHidden]);

  // Auto-hide after 10 seconds
  useEffect(() => {
    if (!reminder) return;
    const timer = setTimeout(() => setAutoHidden(true), 10000);
    return () => clearTimeout(timer);
  }, [reminder]);

  const handleDismiss = () => {
    if (reminder) {
      markReminderShown(reminder.type);
    }
    setDismissed(true);
  };

  if (!reminder) return null;

  return (
    <div
      className="mx-auto max-w-md px-4 mb-2 animate-in fade-in slide-in-from-top-2 duration-300"
      data-testid="reminder-banner"
    >
      <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 px-4 py-2.5">
        <Bell className="w-4 h-4 text-blue-400 shrink-0" />
        <p className="text-sm text-blue-300 flex-1">{reminder.text}</p>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-blue-400 hover:text-blue-200 shrink-0"
          aria-label="Dismiss reminder"
          data-testid="reminder-dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
