"use client";
import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { switchActiveHousehold } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Home, Users } from "lucide-react";
import { toast } from "sonner";
import type { Household } from "@/types";

export const HouseholdSwitcher = () => {
  const { user, household, allHouseholds, setUser, switchHousehold } = useAppStore();
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  // Only render when user has multiple households
  if (allHouseholds.length < 2) return null;

  const handleSwitch = async (target: Household) => {
    if (!user || target.id === household?.id) return;
    setSwitchingId(target.id);
    try {
      await switchActiveHousehold(user.uid, target.id);
      // Update user's active household_id in store
      setUser({ ...user, household_id: target.id });
      // Clear scoped data & trigger reload
      switchHousehold(target);
      toast.success(`Switched to household`);
    } catch {
      toast.error("Failed to switch household.");
    } finally {
      setSwitchingId(null);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800" data-testid="household-switcher">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Home className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-medium text-slate-100">Households</h3>
        </div>
        <p className="text-xs text-slate-400">
          You belong to {allHouseholds.length} households. Switch between them below.
        </p>
        <div className="space-y-2">
          {allHouseholds.map((h) => {
            const isActive = h.id === household?.id;
            return (
              <div
                key={h.id}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 ${
                  isActive
                    ? "border-blue-500/30 bg-blue-500/10"
                    : "border-slate-800 bg-slate-800/50"
                }`}
                data-testid={`household-item-${h.id}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isActive && (
                    <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm text-slate-100 truncate">
                      {h.currency} Household
                    </p>
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Users className="w-3 h-3" />
                      <span>{h.members.length} member{h.members.length !== 1 ? "s" : ""}</span>
                    </div>
                  </div>
                </div>
                {!isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-slate-700 text-slate-300 hover:bg-slate-700"
                    onClick={() => handleSwitch(h)}
                    disabled={!!switchingId}
                    data-testid={`switch-household-${h.id}`}
                  >
                    {switchingId === h.id ? "Switching..." : "Switch"}
                  </Button>
                )}
                {isActive && (
                  <span className="text-xs text-blue-400 font-medium">Active</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
