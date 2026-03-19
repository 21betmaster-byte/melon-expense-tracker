"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { requestNotificationPermission, saveFCMToken } from "@/lib/firebase/messaging";
import { useAppStore } from "@/store/useAppStore";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

/* ─── Tour Step Definitions ────────────────────────────────────────────── */

interface TourStep {
  target: string; // data-testid of the element to highlight
  title: string;
  description: string;
  placement: "top" | "bottom";
}

const TOUR_STEPS: TourStep[] = [
  {
    target: "add-expense-btn",
    title: "Add your first expense",
    description:
      "Tap here to log a new expense — solo or shared with your partner.",
    placement: "bottom",
  },
  {
    target: "settlement-card",
    title: "Track your balance",
    description: "See who owes whom and settle up with one tap.",
    placement: "bottom",
  },
  {
    target: "group-switcher",
    title: "Switch between groups",
    description:
      "Organize expenses into groups like 'Rent', 'Groceries', or 'Travel'.",
    placement: "bottom",
  },
  {
    target: "bottom-nav",
    title: "Explore your tabs",
    description:
      "Dashboard, Expenses, Analytics, and Settings — everything at your fingertips.",
    placement: "top",
  },
  {
    target: "tour-notifications", // virtual — centered card
    title: "Stay in the loop",
    description:
      "Enable push notifications so you and your partner always know when a new expense is logged or a settlement happens.",
    placement: "bottom",
  },
  {
    target: "tour-complete", // virtual — centered card
    title: "You're ready!",
    description:
      "Start adding expenses and tracking your shared spending.",
    placement: "bottom",
  },
];

/* ─── Context ──────────────────────────────────────────────────────────── */

interface TourContextValue {
  isTourActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTour: () => void;
  nextStep: () => void;
  skipTour: () => void;
}

const TourContext = createContext<TourContextValue>({
  isTourActive: false,
  currentStep: 0,
  totalSteps: TOUR_STEPS.length,
  startTour: () => {},
  nextStep: () => {},
  skipTour: () => {},
});

export const useTour = () => useContext(TourContext);

/* ─── Provider ─────────────────────────────────────────────────────────── */

export const TourProvider = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  /* ── Completion / skip ─────────────────────────────────────────── */
  const user = useAppStore((s) => s.user);

  const completeTour = useCallback(() => {
    localStorage.setItem("tour_completed", "true");
    setIsTourActive(false);
    setCurrentStep(0);

    // Persist to Firestore (fire-and-forget)
    if (user?.uid) {
      updateDoc(doc(db, "users", user.uid), {
        tour_completed: true,
        tour_completed_at: serverTimestamp(),
      }).catch(() => {});
    }
  }, [user?.uid]);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  /* ── Next step (gracefully skip missing targets) ───────────────── */
  const nextStep = useCallback(() => {
    let next = currentStep + 1;
    while (next < TOUR_STEPS.length) {
      const target = TOUR_STEPS[next].target;
      if (
        target === "tour-complete" ||
        target === "tour-notifications" ||
        document.querySelector(`[data-testid="${target}"]`)
      ) {
        break;
      }
      next++;
    }
    if (next >= TOUR_STEPS.length) {
      completeTour();
    } else {
      setCurrentStep(next);
    }
  }, [currentStep, completeTour]);

  /* ── Start ─────────────────────────────────────────────────────── */
  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsTourActive(true);
  }, []);

  /* ── Auto-trigger on first dashboard visit after onboarding ────── */
  useEffect(() => {
    if (localStorage.getItem("tour_completed") === "true") return;
    if (localStorage.getItem("onboarding_completed") !== "true") return;
    if (!pathname?.includes("/dashboard")) return;

    // Poll for the first tour target to exist before starting
    let cancelled = false;
    const pollInterval = setInterval(() => {
      if (cancelled) return;
      const target = document.querySelector(
        '[data-testid="add-expense-btn"]'
      );
      if (target) {
        clearInterval(pollInterval);
        startTour();
      }
    }, 500);

    // Safety timeout: if targets never appear after 10s, skip tour entirely
    const safetyTimeout = setTimeout(() => {
      cancelled = true;
      clearInterval(pollInterval);
      localStorage.setItem("tour_completed", "true");
    }, 10_000);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      clearTimeout(safetyTimeout);
      // If tour was started but user navigated away, mark it completed
      if (isTourActive) {
        localStorage.setItem("tour_completed", "true");
      }
    };
  }, [pathname, startTour, isTourActive]);

  /* ── Escape key ────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isTourActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipTour();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isTourActive, skipTour]);

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStep,
        totalSteps: TOUR_STEPS.length,
        startTour,
        nextStep,
        skipTour,
      }}
    >
      {children}
      {isTourActive && (
        <TourOverlay
          step={TOUR_STEPS[currentStep]}
          stepIndex={currentStep}
          totalSteps={TOUR_STEPS.length}
          onNext={nextStep}
          onSkip={skipTour}
        />
      )}
    </TourContext.Provider>
  );
};

/* ─── Overlay + Tooltip ────────────────────────────────────────────────── */

interface TourOverlayProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
}

const TourOverlay = ({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onSkip,
}: TourOverlayProps) => {
  const { user } = useAppStore();
  const [rect, setRect] = useState<DOMRect | null>(null);
  const isVirtual = step.target === "tour-complete" || step.target === "tour-notifications";
  const isLastStep = stepIndex === totalSteps - 1;

  const handleEnableNotifications = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token && user?.uid) {
        await saveFCMToken(user.uid, token);
      }
    } catch {
      // Ignore — user can enable later in settings
    }
    onNext();
  };

  /* ── Measure target element ────────────────────────────────────── */
  useEffect(() => {
    if (isVirtual) {
      setRect(null);
      return;
    }
    const el = document.querySelector(`[data-testid="${step.target}"]`) as HTMLElement | null;

    const measure = () => {
      if (el) {
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };

    // Scroll target into view before measuring
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // Wait for smooth scroll to settle, then measure
      const scrollTimer = setTimeout(measure, 350);

      // Re-measure on scroll/resize
      window.addEventListener("scroll", measure, true);
      window.addEventListener("resize", measure);

      // ResizeObserver to recalculate spotlight when element size changes
      const resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(el);

      return () => {
        clearTimeout(scrollTimer);
        window.removeEventListener("scroll", measure, true);
        window.removeEventListener("resize", measure);
        resizeObserver.disconnect();
      };
    } else {
      measure();
      return undefined;
    }
  }, [step.target, isVirtual]);

  /* ── Tooltip positioning ───────────────────────────────────────── */
  const getTooltipStyle = (): React.CSSProperties => {
    if (isVirtual || !rect) {
      // Centered card
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        maxWidth: 300,
      };
    }
    const padding = 12;
    if (step.placement === "bottom") {
      return {
        top: rect.bottom + padding,
        left: Math.max(16, Math.min(rect.left, window.innerWidth - 296)),
        maxWidth: 280,
      };
    }
    // placement === "top"
    return {
      bottom: window.innerHeight - rect.top + padding,
      left: Math.max(16, Math.min(rect.left, window.innerWidth - 296)),
      maxWidth: 280,
    };
  };

  // When target element is not found and step is not virtual, don't render
  // the overlay at all — prevents blocking the entire screen with an opaque wall
  if (!isVirtual && !rect) {
    return null;
  }

  /* ── Spotlight cutout box-shadow (creates a true visible hole in the overlay) */
  const spotlightPad = 8;
  const spotlightBoxShadow = rect
    ? `0 0 0 4px rgba(96,165,250,0.7), 0 0 0 9999px rgba(0,0,0,0.6)`
    : undefined;

  return (
    <>
      {/* Dimmed backdrop — for virtual steps only; real targets use spotlight box-shadow */}
      {isVirtual && (
        <div
          className="fixed inset-0 z-[60] transition-all duration-300"
          style={{
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
          onClick={onSkip}
          data-testid="tour-overlay"
        />
      )}

      {/* Spotlight cutout over target element — acts as both backdrop and highlight */}
      {rect && !isVirtual && (
        <div
          className="fixed inset-0 z-[60]"
          onClick={onSkip}
          data-testid="tour-overlay"
        >
          <div
            className="fixed z-[61] rounded-lg animate-pulse"
            style={{
              top: rect.top - spotlightPad,
              left: rect.left - spotlightPad,
              width: rect.width + spotlightPad * 2,
              height: rect.height + spotlightPad * 2,
              pointerEvents: "none",
              boxShadow: spotlightBoxShadow,
            }}
            data-testid="tour-spotlight"
          />
        </div>
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[62] animate-in fade-in slide-in-from-bottom-2 duration-200"
        style={getTooltipStyle()}
        data-testid="tour-tooltip"
      >
        <Card className="bg-slate-900 border-blue-800/50 shadow-xl">
          <CardContent className="px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-100">
                {step.title}
              </h3>
              <Badge
                variant="secondary"
                className="text-[10px] flex-shrink-0"
                data-testid="tour-step-counter"
              >
                {stepIndex + 1} of {totalSteps}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 leading-snug">{step.description}</p>
            <div className="flex justify-between pt-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={onSkip}
                data-testid="tour-skip-btn"
                className="text-slate-500 h-8"
              >
                Skip tour
              </Button>
              <div className="flex gap-2">
                {step.target === "tour-notifications" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleEnableNotifications}
                    data-testid="tour-enable-notifications-btn"
                    className="text-blue-400 border-blue-500/30 h-8"
                  >
                    Enable
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={onNext}
                  data-testid="tour-next-btn"
                  className="h-8"
                >
                  {isLastStep ? "Get started" : "Next"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
