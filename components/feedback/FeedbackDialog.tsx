"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "./StarRating";
import type { MilestoneDefinition } from "@/types";

interface FeedbackDialogProps {
  open: boolean;
  milestone: MilestoneDefinition;
  onSubmit: (rating: number, comment: string) => void;
  onDismiss: () => void;
}

export const FeedbackDialog = ({
  open,
  milestone,
  onSubmit,
  onDismiss,
}: FeedbackDialogProps) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await onSubmit(rating, comment.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onDismiss()}>
      <DialogContent
        className="sm:max-w-sm"
        data-testid="feedback-dialog"
      >
        <DialogHeader>
          <DialogTitle data-testid="feedback-title">
            {milestone.feedbackPromptTitle}
          </DialogTitle>
          <DialogDescription data-testid="feedback-description">
            {milestone.feedbackPromptDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Star rating */}
          <div className="flex justify-center">
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Optional comment */}
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            placeholder="Tell us more (optional)"
            className="min-h-[60px]"
            data-testid="feedback-comment-input"
          />

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-slate-500"
              data-testid="feedback-dismiss-btn"
            >
              Maybe later
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              data-testid="feedback-submit-btn"
            >
              {submitting ? "Sending…" : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
