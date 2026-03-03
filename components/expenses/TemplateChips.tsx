"use client";
import type { ExpenseTemplate } from "@/types";

interface Props {
  templates: ExpenseTemplate[];
  currency?: string;
  onSelect: (template: ExpenseTemplate) => void;
}

export const TemplateChips = ({ templates, onSelect }: Props) => {
  if (templates.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5" data-testid="template-chips">
      {templates.map((t) => (
        <button
          key={t.description}
          type="button"
          onClick={() => onSelect(t)}
          className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 hover:text-slate-100 transition-colors"
        >
          {t.amount} {t.description}
        </button>
      ))}
    </div>
  );
};
