"use client";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Timestamp } from "firebase/firestore";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { Expand } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TemplateChips } from "./TemplateChips";
import { parseQuickAdd } from "@/lib/utils/parseQuickAdd";
import { getRecentTemplates } from "@/lib/utils/expenseTemplates";
import { autoCategory, memoryCategory } from "@/lib/utils/categorization";
import { sanitizeText } from "@/lib/utils/sanitize";
import { formatCurrency } from "@/lib/utils/format";
import { addExpense, saveCategoryMemory } from "@/lib/firebase/firestore";
import { incrementEvent } from "@/lib/milestones/tracker";
import { trackEvent } from "@/lib/analytics";
import { EXPENSE_CREATED } from "@/lib/analytics/events";
import { useAppStore } from "@/store/useAppStore";
import type { ExpenseTemplate } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExpandToFullForm: () => void;
}

export const QuickAddDialog = ({ open, onOpenChange, onExpandToFullForm }: Props) => {
  const {
    user,
    household,
    expenses,
    categories,
    activeGroup,
    categoryMemory,
    addPendingExpense,
    resolvePendingExpense,
    setCategoryMemory,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [manualCategoryId, setManualCategoryId] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currency = household?.currency ?? "INR";

  // Build memory lookup map
  const memoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of categoryMemory) {
      map[m.description] = m.category_id;
    }
    return map;
  }, [categoryMemory]);

  // Recent templates
  const templates = useMemo(
    () => getRecentTemplates(expenses, 5),
    [expenses]
  );

  // Parse input in real-time
  const parsed = useMemo(() => parseQuickAdd(input), [input]);

  // Auto-detect category from description
  const detectedCategoryId = useMemo(() => {
    if (!parsed.description || parsed.description.length < 3) return null;
    const memoryCatId = memoryCategory(parsed.description, memoryMap);
    if (memoryCatId && categories.some((c) => c.id === memoryCatId)) {
      return memoryCatId;
    }
    return autoCategory(parsed.description, categories);
  }, [parsed.description, memoryMap, categories]);

  // Find miscellaneous fallback category
  const miscCategoryId = useMemo(() => {
    const misc = categories.find(
      (c) => c.name.toLowerCase() === "miscellaneous"
    );
    return misc?.id ?? categories[0]?.id ?? "";
  }, [categories]);

  // Manual override > auto-detected > misc fallback
  const resolvedCategoryId = manualCategoryId || detectedCategoryId || miscCategoryId;
  const categoryName =
    categories.find((c) => c.id === resolvedCategoryId)?.name ?? "Miscellaneous";

  // Preview line
  const groupName = activeGroup?.name ?? "Default";
  const preview =
    parsed.amount !== null
      ? `Joint · ${categoryName} · ${groupName} · You pay · 50/50`
      : null;

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setInput("");
      setManualCategoryId("");
    }
  }, [open]);

  const handleTemplateSelect = useCallback(
    (template: ExpenseTemplate) => {
      setInput(`${template.amount} ${template.description}`);
    },
    []
  );

  const handleSubmit = async () => {
    if (!user?.household_id || !activeGroup) {
      toast.error("No active group selected.");
      return;
    }
    if (parsed.amount === null || parsed.amount <= 0) {
      toast.error("Enter an amount, e.g. \"450 Swiggy dinner\"");
      return;
    }

    setSaving(true);
    const localId = nanoid();
    const sanitizedDesc = parsed.description ? sanitizeText(parsed.description) : "";

    const expenseData = {
      amount: parsed.amount,
      description: sanitizedDesc,
      group_id: activeGroup.id,
      category_id: resolvedCategoryId,
      expense_type: "joint" as const,
      paid_by_user_id: user.uid,
      split_ratio: 0.5,
      date: Timestamp.now(),
      source: "manual" as const,
      created_by: user.uid,
    };

    // Optimistic UI
    addPendingExpense({
      ...expenseData,
      _pending: true,
      _local_id: localId,
    });

    toast.success(
      `Added ${formatCurrency(parsed.amount, currency)}${sanitizedDesc ? ` — ${sanitizedDesc}` : ""}`
    );
    setInput("");
    onOpenChange(false);

    try {
      // Save category memory
      if (sanitizedDesc.length > 0 && resolvedCategoryId) {
        await saveCategoryMemory(
          user.household_id,
          sanitizedDesc,
          resolvedCategoryId
        );
        const normalized = sanitizedDesc.toLowerCase().trim();
        const existingIdx = categoryMemory.findIndex(
          (m) => m.description === normalized
        );
        if (existingIdx >= 0) {
          const updated = [...categoryMemory];
          updated[existingIdx] = {
            ...updated[existingIdx],
            category_id: resolvedCategoryId,
          };
          setCategoryMemory(updated);
        } else {
          setCategoryMemory([
            ...categoryMemory,
            { id: "", description: normalized, category_id: resolvedCategoryId },
          ]);
        }
      }

      const realId = await addExpense(user.household_id, expenseData);
      resolvePendingExpense(localId, realId);
      incrementEvent("expense_count");
      trackEvent(EXPENSE_CREATED, {
        amount: parsed.amount,
        currency,
        category_id: resolvedCategoryId,
        group_id: activeGroup.id,
        split_type: "joint",
      });
    } catch {
      toast.error("Failed to save. It will sync when you're back online.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !saving) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleExpand = () => {
    onOpenChange(false);
    onExpandToFullForm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 sm:max-w-md top-[30%] translate-y-0 sm:top-[50%] sm:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Quick Add</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Chips */}
          <TemplateChips
            templates={templates}
            currency={currency}
            onSelect={handleTemplateSelect}
          />

          {/* Quick-add input */}
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='e.g. "450 Swiggy dinner"'
            autoComplete="off"
            className="text-base"
            data-testid="quick-add-input"
          />

          {/* Category selector */}
          <Select
            value={manualCategoryId || (detectedCategoryId ?? "")}
            onValueChange={setManualCategoryId}
          >
            <SelectTrigger
              className="h-9 bg-slate-800 border-slate-700 text-sm"
              data-testid="quick-add-category"
            >
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {detectedCategoryId && !manualCategoryId && (
            <p className="text-[10px] text-green-400 -mt-2">Auto-detected category</p>
          )}

          {/* Preview line */}
          {preview && (
            <p className="text-xs text-slate-400" data-testid="quick-add-preview">
              {preview}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSubmit}
              disabled={parsed.amount === null || saving}
              className="flex-1"
              data-testid="quick-add-save"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleExpand}
              className="text-slate-400 hover:text-slate-200 gap-1.5"
            >
              <Expand className="w-4 h-4" />
              Full form
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
