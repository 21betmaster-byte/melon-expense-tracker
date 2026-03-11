/**
 * Core GA4 analytics singleton.
 *
 * SSR-safe — uses dynamic import() so firebase/analytics is never loaded on
 * the server.  Every public function is null-safe + try/catch guarded so
 * analytics can never crash the app.
 *
 * In headless browsers (Playwright) `isSupported()` returns false and all
 * calls silently no-op — zero test configuration needed.
 */

// Cached Firebase module references — populated by initAnalytics()
let _logEvent: typeof import("firebase/analytics").logEvent | null = null;
let _setUserProperties: typeof import("firebase/analytics").setUserProperties | null = null;
let _setUserId: typeof import("firebase/analytics").setUserId | null = null;
let _analytics: import("firebase/analytics").Analytics | null = null;
let _perf: import("firebase/performance").FirebasePerformance | null = null;
let _trace: typeof import("firebase/performance").trace | null = null;
let _initPromise: Promise<void> | null = null;
let _ready = false;

// Queue events fired before init completes — flushed once analytics is ready
const _pendingEvents: Array<{
  name: string;
  params?: Record<string, string | number | boolean>;
}> = [];

/**
 * Initialize Firebase Analytics + Performance.
 * Call once from AnalyticsProvider on mount.
 */
export async function initAnalytics(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      if (typeof window === "undefined") return;

      const analyticsModule = await import("firebase/analytics");
      const supported = await analyticsModule.isSupported();
      if (!supported) return;

      const { app } = await import("@/lib/firebase/config");

      try {
        _analytics = analyticsModule.initializeAnalytics(app, {
          config: {
            // Enable debug_mode in development so events appear in GA4 DebugView
            ...(process.env.NODE_ENV === "development" && { debug_mode: true }),
          },
        });
      } catch {
        // initializeAnalytics throws if already called (e.g. HMR) — fall back
        _analytics = analyticsModule.getAnalytics(app);
      }
      _logEvent = analyticsModule.logEvent;
      _setUserProperties = analyticsModule.setUserProperties;
      _setUserId = analyticsModule.setUserId;
      _ready = true;

      if (process.env.NODE_ENV === "development") {
        console.debug("[Analytics] Initialized", {
          measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
        });
      }

      // Flush any events that were queued before init completed
      for (const event of _pendingEvents) {
        _logEvent(_analytics, event.name as string, event.params);
      }
      _pendingEvents.length = 0;

      const perfModule = await import("firebase/performance");
      _perf = perfModule.getPerformance(app);
      _trace = perfModule.trace;
    } catch (err) {
      console.warn("[Analytics] Init failed:", err);
      _analytics = null;
      _perf = null;
      _pendingEvents.length = 0;
    }
  })();

  return _initPromise;
}

/** Log a custom GA4 event. Queues if init is still in progress. */
export function trackEvent(
  name: string,
  params?: Record<string, string | number | boolean>,
): void {
  try {
    if (process.env.NODE_ENV === "development") {
      console.debug("[Analytics]", name, params);
    }
    if (_ready && _analytics && _logEvent) {
      _logEvent(_analytics, name as string, params);
    } else if (_initPromise && !_ready) {
      _pendingEvents.push({ name, params });
    }
  } catch {
    // no-op
  }
}

/** Set GA4 user properties (merged, not replaced). */
export function setUserProps(
  properties: Record<string, string>,
): void {
  try {
    if (!_analytics || !_setUserProperties) return;
    _setUserProperties(_analytics, properties);
  } catch {
    // no-op
  }
}

/** Set (or clear) the GA4 user ID. */
export function setAnalyticsUserId(uid: string | null): void {
  try {
    if (!_analytics || !_setUserId) return;
    _setUserId(_analytics, uid ?? "");
  } catch {
    // no-op
  }
}

/** Start a Firebase Performance custom trace. Returns null if unavailable. */
export function startTrace(traceName: string) {
  try {
    if (!_perf || !_trace) return null;
    const t = _trace(_perf, traceName);
    t.start();
    return t;
  } catch {
    return null;
  }
}
