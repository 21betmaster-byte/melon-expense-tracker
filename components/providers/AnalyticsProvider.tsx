"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  initAnalytics,
  trackEvent,
  setUserProps,
  setAnalyticsUserId,
  PAGE_VIEWED,
  SESSION_ENGAGED,
} from "@/lib/analytics";
import { initErrorTracking } from "@/lib/analytics/error-tracking";
import { initWebVitals } from "@/lib/analytics/web-vitals";
import { useAppStore } from "@/store/useAppStore";

export function AnalyticsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialized = useRef(false);

  const firebaseUser = useAppStore((s) => s.firebaseUser);
  const household = useAppStore((s) => s.household);

  // Initialize analytics, error tracking, and web vitals once
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    initAnalytics().then(() => {
      initWebVitals();
    });
    initErrorTracking();
  }, []);

  // Track page views on route change
  useEffect(() => {
    trackEvent(PAGE_VIEWED, {
      page_path: pathname,
      page_title: typeof document !== "undefined" ? document.title : "",
    });
  }, [pathname, searchParams]);

  // Fire session_engaged after 30s of active use (visibility-aware)
  useEffect(() => {
    let elapsed = 0;
    let interval: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      elapsed += 1;
      if (elapsed >= 30) {
        trackEvent(SESSION_ENGAGED, { duration_sec: elapsed });
        if (interval) clearInterval(interval);
      }
    };

    const start = () => {
      if (!interval) interval = setInterval(tick, 1000);
    };
    const pause = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };

    const onVisibility = () => {
      document.hidden ? pause() : start();
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      pause();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Set user ID and properties when auth state changes
  useEffect(() => {
    if (firebaseUser) {
      setAnalyticsUserId(firebaseUser.uid);
      setUserProps({
        account_type:
          firebaseUser.providerData?.[0]?.providerId ?? "unknown",
        household_id: household?.id ?? "none",
      });
    } else {
      setAnalyticsUserId(null);
    }
  }, [firebaseUser?.uid, household?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}
