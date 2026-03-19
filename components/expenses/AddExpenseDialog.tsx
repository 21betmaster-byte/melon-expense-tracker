"use client";
import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseForm } from "./ExpenseForm";
import { TemplateChips } from "./TemplateChips";
import { getRecentTemplates } from "@/lib/utils/expenseTemplates";
import { useAppStore } from "@/store/useAppStore";
import type { ExpenseTemplate } from "@/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddExpenseDialog = ({ open, onOpenChange }: Props) => {
  const { expenses, household } = useAppStore();
  const [selectedTemplate, setSelectedTemplate] = useState<ExpenseTemplate | null>(null);

  const templates = useMemo(
    () => getRecentTemplates(expenses, 5),
    [expenses]
  );

  const currency = household?.currency ?? "INR";

  const handleSelect = (template: ExpenseTemplate) => {
    setSelectedTemplate({ ...template });
  };

  const handleClose = () => {
    setSelectedTemplate(null);
    onOpenChange(false);
  };

  const formInitialValues = selectedTemplate
    ? {
        amount: String(selectedTemplate.amount),
        description: selectedTemplate.description,
        category_id: selectedTemplate.category_id,
        expense_type: selectedTemplate.expense_type,
        split_pct: Math.round(selectedTemplate.split_ratio * 100),
      }
    : undefined;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setSelectedTemplate(null);
        onOpenChange(v);
      }}
    >
      <DialogContent className="bg-slate-900 border-slate-800 max-h-[85vh] overflow-y-auto sm:max-w-md p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Add Expense</DialogTitle>
        </DialogHeader>
        {templates.length > 0 && (
          <TemplateChips
            templates={templates}
            onSelect={handleSelect}
          />
        )}
        <ExpenseForm
          onSuccess={handleClose}
          initialValues={formInitialValues}
        />
      </DialogContent>
    </Dialog>
  );
};
