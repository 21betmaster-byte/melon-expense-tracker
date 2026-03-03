"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { checkMilestone, dismissMilestone } from "@/lib/milestones/tracker";
import { submitFeedback } from "@/lib/firebase/feedback";
import { useAppStore } from "@/store/useAppStore";
import { useTour } from "@/components/tour/TourProvider";
import { FeedbackDialog } from "./FeedbackDialog";
import { toast } from "sonner";
import type { MilestoneDefinition } from "@/types";

/* ─── Context ──────────────────────────────────────────────────────────── */

interface FeedbackContextValue {
  triggerCheck: (event: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue>({
  triggerCheck: () => {},
});

export const useFeedbackContext = () => useContext(FeedbackContext);

/* ─── Provider ─────────────────────────────────────────────────────────── */

export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAppStore();
  const { isTourActive } = useTour();
  const [activeMilestone, setActiveMilestone] =
    useState<MilestoneDefinition | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  /* ── Listen for custom events from incrementEvent() ────────────── */
  useEffect(() => {
    const handler = (e: Event) => {
      if (isTourActive) return; // suppress while tour is running
      const { event } = (e as CustomEvent).detail;
      const milestone = checkMilestone(event);
      if (milestone) {
        // Small delay so the triggering action's UI settles first
        setTimeout(() => {
          setActiveMilestone(milestone);
          setShowDialog(true);
        }, 1000);
      }
    };
    window.addEventListener("app-milestone-check", handler);
    return () => window.removeEventListener("app-milestone-check", handler);
  }, [isTourActive]);

  /* ── Manual trigger check ──────────────────────────────────────── */
  const triggerCheck = useCallback(
    (event: string) => {
      if (isTourActive) return;
      const milestone = checkMilestone(event);
      if (milestone) {
        setActiveMilestone(milestone);
        setShowDialog(true);
      }
    },
    [isTourActive]
  );

  /* ── Submit feedback ───────────────────────────────────────────── */
  const handleSubmit = useCallback(
    async (rating: number, comment: string) => {
      if (!activeMilestone || !user) return;
      try {
        await submitFeedback({
          user_id: user.uid,
          user_email: user.email,
          household_id: user.household_id ?? "",
          rating,
          comment: comment || undefined,
          trigger: `${activeMilestone.event}_${activeMilestone.threshold}`,
        });
        toast.success("Thanks for your feedback!");
      } catch {
        toast.error("Failed to submit feedback. Please try again.");
      }
      dismissMilestone(activeMilestone.event, activeMilestone.threshold);
      setShowDialog(false);
      setActiveMilestone(null);
    },
    [activeMilestone, user]
  );

  /* ── Dismiss without submitting ────────────────────────────────── */
  const handleDismiss = useCallback(() => {
    if (activeMilestone) {
      dismissMilestone(activeMilestone.event, activeMilestone.threshold);
    }
    setShowDialog(false);
    setActiveMilestone(null);
  }, [activeMilestone]);

  return (
    <FeedbackContext.Provider value={{ triggerCheck }}>
      {children}
      {showDialog && activeMilestone && (
        <FeedbackDialog
          open={showDialog}
          milestone={activeMilestone}
          onSubmit={handleSubmit}
          onDismiss={handleDismiss}
        />
      )}
    </FeedbackContext.Provider>
  );
};
