/**
 * Core Web Vitals → GA4 web_vitals events.
 *
 * Reports CLS, FCP, LCP, TTFB, INP via the `web-vitals` library.
 */
import { trackEvent } from "./tracker";
import { WEB_VITALS } from "./events";

interface WebVitalsMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
}

function reportMetric(metric: WebVitalsMetric): void {
  trackEvent(WEB_VITALS, {
    metric_name: metric.name,
    // CLS is a unitless fraction (e.g. 0.1); multiply by 1000 for GA4
    metric_value: Math.round(
      metric.name === "CLS" ? metric.value * 1000 : metric.value,
    ),
    metric_rating: metric.rating,
  });
}

/** Register all Web Vitals observers. Call once from AnalyticsProvider. */
export async function initWebVitals(): Promise<void> {
  try {
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import(
      "web-vitals"
    );
    onCLS(reportMetric);
    onFCP(reportMetric);
    onLCP(reportMetric);
    onTTFB(reportMetric);
    onINP(reportMetric);
  } catch {
    // web-vitals not available — no-op
  }
}
