export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";

/**
 * Calculate the next occurrence date from a given start date and frequency.
 * Handles month-end clamping (e.g., Jan 31 → Feb 28).
 */
export function getNextOccurrence(
  startDate: Date,
  frequency: RecurringFrequency
): Date {
  const next = new Date(startDate);
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}
