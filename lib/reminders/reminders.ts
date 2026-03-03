export interface Reminder {
  id: string;
  text: string;
  type: "inactivity" | "settlement" | "welcome_back";
  priority: number;
}

const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

function getCooldownKey(type: string): string {
  return `reminder_last_shown_${type}`;
}

function isOnCooldown(type: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const lastShown = localStorage.getItem(getCooldownKey(type));
    if (!lastShown) return false;
    return Date.now() - parseInt(lastShown, 10) < COOLDOWN_MS;
  } catch {
    return false;
  }
}

export function markReminderShown(type: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(getCooldownKey(type), Date.now().toString());
  } catch {
    // ignore localStorage errors
  }
}

/**
 * Check if any reminders should be shown.
 * Returns the highest priority reminder that hasn't been shown recently,
 * or null if none apply.
 */
export function checkReminders(
  lastExpenseDate: Date | null,
  hasUnsettledBalance: boolean,
  unsettledAmount: number
): Reminder | null {
  const now = new Date();
  const candidates: Reminder[] = [];

  // 1. Inactivity: no expenses logged in 3+ days
  if (lastExpenseDate) {
    const daysSinceLastExpense = Math.floor(
      (now.getTime() - lastExpenseDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastExpense >= 3 && !isOnCooldown("inactivity")) {
      candidates.push({
        id: "inactivity",
        text: `You haven't logged any expenses in ${daysSinceLastExpense} days. Quick-add one now!`,
        type: "inactivity",
        priority: 90,
      });
    }
  }

  // 2. Monthly settlement reminder (1st-3rd of month + has unsettled balance)
  const dayOfMonth = now.getDate();
  if (
    dayOfMonth <= 3 &&
    hasUnsettledBalance &&
    unsettledAmount > 0 &&
    !isOnCooldown("settlement")
  ) {
    candidates.push({
      id: "settlement",
      text: "Start of the month! Time to settle up with your partner.",
      type: "settlement",
      priority: 85,
    });
  }

  // 3. Welcome back (7+ days since last visit)
  if (typeof window !== "undefined" && !isOnCooldown("welcome_back")) {
    try {
      const lastVisit = localStorage.getItem("last_visit_time");
      if (lastVisit) {
        const daysSinceVisit = Math.floor(
          (now.getTime() - parseInt(lastVisit, 10)) / (1000 * 60 * 60 * 24)
        );
        if (daysSinceVisit >= 7) {
          candidates.push({
            id: "welcome_back",
            text: "Welcome back! Let's catch up on any expenses you might have missed.",
            type: "welcome_back",
            priority: 70,
          });
        }
      }
    } catch {
      // ignore
    }
  }

  // Record this visit
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("last_visit_time", Date.now().toString());
    } catch {
      // ignore
    }
  }

  if (candidates.length === 0) return null;

  // Return highest priority
  candidates.sort((a, b) => b.priority - a.priority);
  return candidates[0];
}
