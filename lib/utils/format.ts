import { Timestamp } from "firebase/firestore";
import { format } from "date-fns";

/**
 * Safely convert any date-like value to a JS Date.
 * Handles: Timestamp, Date, serialized {__ts,_s,_ns}, plain {seconds,nanoseconds}, string/number.
 * This is needed because Zustand persist may produce non-Timestamp objects from localStorage.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeToDate(value: any): Date {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === "object" && value !== null) {
    // Zustand-persisted serialized Timestamp {__ts: true, _s, _ns}
    if (value.__ts === true && typeof value._s === "number") {
      return new Timestamp(value._s, value._ns ?? 0).toDate();
    }
    // Plain Timestamp-like {seconds, nanoseconds}
    if (typeof value.seconds === "number") {
      return new Timestamp(value.seconds, value.nanoseconds ?? 0).toDate();
    }
  }
  // Fallback: try to construct a date; return current date if invalid
  const d = new Date(value);
  return isNaN(d.getTime()) ? new Date() : d;
}

export const formatCurrency = (
  amount: number,
  currency: string = "INR"
): string => {
  const absAmount = Math.abs(amount);
  if (currency === "INR") {
    return `₹${absAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    })}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(absAmount);
};

export const formatDate = (date: Timestamp | Date): string => {
  return format(safeToDate(date), "d MMM yyyy");
};

export const formatMonth = (date: Date): string => {
  return format(date, "MMM yy");
};

/**
 * Compact currency format for chart axes/labels.
 * e.g. "₹50k", "$1.2k", "€800"
 */
export const formatCompactCurrency = (
  value: number,
  currency: string = "INR"
): string => {
  const absValue = Math.abs(value);
  const symbol =
    currency === "INR" ? "₹" :
    currency === "USD" ? "$" :
    currency === "EUR" ? "€" :
    currency === "GBP" ? "£" :
    currency + " ";

  if (absValue >= 100000) {
    // Indian L (lakh) for INR, otherwise K
    if (currency === "INR") {
      return `${symbol}${(absValue / 100000).toFixed(1).replace(/\.0$/, "")}L`;
    }
    return `${symbol}${(absValue / 1000).toFixed(0)}k`;
  }
  if (absValue >= 1000) {
    return `${symbol}${(absValue / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return `${symbol}${Math.round(absValue)}`;
};
