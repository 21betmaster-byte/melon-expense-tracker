import type { MilestoneDefinition } from "@/types";

export const MILESTONE_DEFINITIONS: MilestoneDefinition[] = [
  {
    event: "expense_count",
    threshold: 10,
    feedbackPromptTitle: "You're on a roll!",
    feedbackPromptDescription:
      "You've logged 10 expenses. How's your experience so far?",
  },
  {
    event: "visit_count",
    threshold: 10,
    feedbackPromptTitle: "Welcome back!",
    feedbackPromptDescription:
      "You've visited 10 times. We'd love to hear your thoughts.",
  },
];
