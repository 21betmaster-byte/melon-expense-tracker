"use client";
import { useState } from "react";
import { addGroup } from "@/lib/firebase/firestore";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Layers } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { GROUP_CREATED } from "@/lib/analytics/events";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const GroupsManager = () => {
  const { household, householdLoading, groups, setGroups } = useAppStore();
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (!household?.id) {
      toast.error("Still loading your data. Please wait a moment.");
      return;
    }
    if (groups.some((g) => g.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A group with that name already exists.");
      return;
    }
    setLoading(true);
    try {
      const id = await addGroup(household.id, name);
      setGroups([...groups, { id, name, is_default: false }]);
      setNewName("");
      toast.success(`Group "${name}" added.`);
      trackEvent(GROUP_CREATED, { group_name: name });
    } catch {
      toast.error("Failed to add group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
          <Layers className="w-4 h-4 text-blue-400" />
          Expense Groups
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Existing groups */}
        <div className="space-y-1">
          {groups.map((g) => (
            <div
              key={g.id}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 text-sm text-slate-300"
            >
              <span>{g.name}</span>
              {g.is_default && (
                <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                  Default
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Loading state */}
        {householdLoading && (
          <p className="text-sm text-slate-500 animate-pulse">Loading groups…</p>
        )}

        {/* Add new group */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New group name…"
            maxLength={30}
            className="bg-slate-800 border-slate-700 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            disabled={householdLoading}
            data-testid="new-group-input"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={loading || !newName.trim() || householdLoading}
                  data-testid="add-group-btn"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new expense group</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};
