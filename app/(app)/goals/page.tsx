"use client";
import { useState } from "react";
import { GoalCard } from "@/components/goals/GoalCard";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { addGoal } from "@/lib/firebase/firestore";
import { toast } from "sonner";
import { Plus, Target } from "lucide-react";

export default function GoalsPage() {
  const { goals, setGoals, user } = useAppStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!user?.household_id || !name.trim() || !target) return;
    const targetAmount = parseFloat(target);
    if (isNaN(targetAmount) || targetAmount <= 0) {
      toast.error("Please enter a valid target amount.");
      return;
    }
    setLoading(true);
    try {
      const id = await addGoal(user.household_id, {
        name: name.trim().slice(0, 30),
        target_amount: targetAmount,
        current_amount: 0,
      });
      setGoals([
        ...goals,
        { id, name: name.trim(), target_amount: targetAmount, current_amount: 0 },
      ]);
      toast.success("Goal added!");
      setName("");
      setTarget("");
      setOpen(false);
    } catch {
      toast.error("Failed to add goal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">Goals</h1>
        <Button size="sm" onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          Add Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No goals yet. Add your first savings goal!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Add Goal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Goal Name (max 30 chars)</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                placeholder="e.g. Vacation Fund"
                className="mt-1 bg-slate-800 border-slate-700"
              />
            </div>
            <div>
              <Label>Target Amount (₹)</Label>
              <Input
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                type="number"
                placeholder="50000"
                className="mt-1 bg-slate-800 border-slate-700"
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={loading || !name.trim() || !target}
              className="w-full"
            >
              {loading ? "Adding…" : "Add Goal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
