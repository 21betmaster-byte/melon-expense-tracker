"use client";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center" data-testid="empty-state">
      <div className="mb-4 inline-flex rounded-full bg-slate-800/50 p-4">
        <Icon className="h-8 w-8 text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-300">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-slate-500">{description}</p>
      {actionLabel && onAction && (
        <Button
          size="sm"
          className="mt-6"
          onClick={onAction}
          data-testid="empty-state-action"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
