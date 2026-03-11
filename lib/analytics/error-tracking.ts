/**
 * Global error tracking → GA4 error_caught events.
 */
import { trackEvent } from "./tracker";
import { ERROR_CAUGHT } from "./events";

/** Register global error handlers. Call once from AnalyticsProvider. */
export function initErrorTracking(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (event) => {
    trackEvent(ERROR_CAUGHT, {
      error_message: (event.message ?? "unknown").substring(0, 100),
      error_source: `${event.filename ?? "unknown"}:${event.lineno ?? 0}:${event.colno ?? 0}`,
      fatal: true,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    trackEvent(ERROR_CAUGHT, {
      error_message: String(event.reason).substring(0, 100),
      error_source: "unhandled_rejection",
      fatal: true,
    });
  });
}

/** Manual error reporting from catch blocks. */
export function reportError(
  error: unknown,
  source: string,
  fatal = false,
): void {
  const message =
    error instanceof Error ? error.message : String(error);
  trackEvent(ERROR_CAUGHT, {
    error_message: message.substring(0, 100),
    error_source: source,
    fatal,
  });
}
