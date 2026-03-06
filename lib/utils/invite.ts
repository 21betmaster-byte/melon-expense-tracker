import { Timestamp } from "firebase/firestore";

/**
 * Invite Flow Utilities
 *
 * Shared helpers for invite link display, countdown, and sharing.
 * Used by both InvitePartner (settings) and CreateHouseholdCard (onboarding).
 */

export interface CountdownResult {
  text: string;
  isWarning: boolean;
  isExpired: boolean;
}

/**
 * Formats a Firebase Timestamp expiry into a human-readable countdown.
 *
 * - "> 24h"  → "Expires in Xd Yh"
 * - "1h–24h" → "Expires in Xh Ym"
 * - "< 1h"   → "Expires in Xm"
 * - "≤ 0"    → "Expired"
 * - "< 4h"   → isWarning: true (amber UI)
 */
export function formatCountdown(expiresAt: Timestamp): CountdownResult {
  const now = Date.now();
  const expiryMs = expiresAt.toMillis();
  const diffMs = expiryMs - now;

  if (diffMs <= 0) {
    return { text: "Expired", isWarning: false, isExpired: true };
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  let text: string;
  if (days > 0) {
    text = `Expires in ${days}d ${remainingHours}h`;
  } else if (hours > 0) {
    text = `Expires in ${hours}h ${minutes}m`;
  } else {
    text = `Expires in ${minutes}m`;
  }

  const isWarning = diffMs < 4 * 60 * 60 * 1000; // < 4 hours
  return { text, isWarning, isExpired: false };
}

/**
 * Builds the full invite URL from an invite code.
 * Centralizes the pattern used by InvitePartner + CreateHouseholdCard.
 *
 * Uses window.location.origin (the actual browser URL) as the primary
 * source — this automatically works in dev (localhost:3000) and production
 * (expensetracker-kappa-six.vercel.app) without any env var configuration.
 * Falls back to NEXT_PUBLIC_APP_URL for SSR contexts where window is unavailable.
 */
export function getInviteUrl(inviteCode: string): string {
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "https://expensetracker-kappa-six.vercel.app");
  return `${appUrl}/invite/${inviteCode}`;
}

/**
 * Shares an invite link via the Web Share API (mobile), or falls back
 * to clipboard copy (desktop / browsers without Web Share).
 *
 * Returns:
 * - "shared"  → native share dialog was used
 * - "copied"  → clipboard fallback was used
 * - "failed"  → both methods failed
 */
export async function shareInvite(
  url: string
): Promise<"shared" | "copied" | "failed"> {
  // Feature-detect Web Share API
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: "Join my household!",
        text: "Join my household on Melon! Use this invite link:",
        url,
      });
      return "shared";
    } catch (err) {
      // User cancelled (AbortError) → fall through to clipboard
      if (err instanceof Error && err.name === "AbortError") {
        return "failed"; // user intentionally cancelled, don't fallback
      }
      // Other errors → try clipboard fallback
    }
  }

  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
