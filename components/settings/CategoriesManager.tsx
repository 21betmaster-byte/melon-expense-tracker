"use client";
import { useState } from "react";
import { addCategory } from "@/lib/firebase/firestore";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export const CategoriesManager = () => {
  const { household, householdLoading, categories, activeGroup, addCategoryToStore } = useAppStore();
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (!household?.id) {
      toast.error("Still loading your data. Please wait a moment.");
      return;
    }
    if (!activeGroup) {
      toast.error("No expense group selected. Please create or select a group first.");
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A category with that name already exists.");
      return;
    }
    setLoading(true);
    try {
      const id = await addCategory(household.id, name, activeGroup.id);
      addCategoryToStore({ id, name, keywords: [], group_id: activeGroup.id });
      setNewName("");
      toast.success(`Category "${name}" added.`);
    } catch {
      toast.error("Failed to add category.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
          <Tag className="w-4 h-4 text-purple-400" />
          Categories
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Existing categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <span
              key={c.id}
              className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300"
            >
              {c.name}
            </span>
          ))}
        </div>

        {/* Loading state */}
        {householdLoading && (
          <p className="text-sm text-slate-500 animate-pulse">Loading categories…</p>
        )}

        {/* Active group hint */}
        {!householdLoading && !activeGroup && (
          <p className="text-sm text-amber-400/80">
            No expense group selected. Create a group first to add categories.
          </p>
        )}

        {/* Add new category */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={householdLoading ? "Loading…" : "New category name…"}
            maxLength={30}
            className="bg-slate-800 border-slate-700 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            disabled={householdLoading || !activeGroup}
            data-testid="new-category-input"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={loading || !newName.trim() || householdLoading || !activeGroup}
                  data-testid="add-category-btn"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new spending category</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
};
