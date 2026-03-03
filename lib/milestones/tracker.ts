import { MILESTONE_DEFINITIONS } from "./definitions";
import type { MilestoneDefinition } from "@/types";

/**
 * Increment an event counter in localStorage and dispatch a custom event
 * so the FeedbackProvider can check for milestone triggers.
 */
export function incrementEvent(event: string): number {
  if (typeof window === "undefined") return 0;

  const key = `app_event_${event}`;
  const current = parseInt(localStorage.getItem(key) ?? "0", 10);
  const next = current + 1;
  localStorage.setItem(key, String(next));

  // Dispatch custom event for FeedbackProvider to react to
  window.dispatchEvent(
    new CustomEvent("app-milestone-check", {
      detail: { event, count: next },
    })
  );

  return next;
}

/**
 * Read the current count for an event from localStorage.
 */
export function getEventCount(event: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(`app_event_${event}`) ?? "0", 10);
}

/**
 * Check if the current count for an event matches any milestone definition
 * that has not been dismissed yet.
 */
export function checkMilestone(event: string): MilestoneDefinition | null {
  const count = getEventCount(event);
  return (
    MILESTONE_DEFINITIONS.find(
      (m) =>
        m.event === event &&
        m.threshold === count &&
        !isMilestoneDismissed(event, m.threshold)
    ) ?? null
  );
}

/**
 * Mark a specific milestone as dismissed so it won't trigger again.
 */
export function dismissMilestone(event: string, threshold: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `feedback_dismissed_${event}_${threshold}`,
    "true"
  );
}

/**
 * Check if a milestone has already been dismissed.
 */
function isMilestoneDismissed(event: string, threshold: number): boolean {
  if (typeof window === "undefined") return true;
  return (
    localStorage.getItem(`feedback_dismissed_${event}_${threshold}`) === "true"
  );
}
