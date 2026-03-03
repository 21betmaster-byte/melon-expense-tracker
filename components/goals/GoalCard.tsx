"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils/format";
import { useAppStore } from "@/store/useAppStore";
import type { Goal } from "@/types";

interface Props {
  goal: Goal;
}

export const GoalCard = ({ goal }: Props) => {
  const currency = useAppStore((s) => s.household?.currency ?? "INR");
  const percent = Math.min(
    Math.round((goal.current_amount / goal.target_amount) * 100),
    100
  );

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="text-slate-100 text-base">{goal.name}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={percent} className="h-2" />
        <div className="flex justify-between text-sm">
          <span className="text-slate-300">
            {formatCurrency(goal.current_amount, currency)}
          </span>
          <span className="text-slate-500">
            {percent}% of {formatCurrency(goal.target_amount, currency)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
