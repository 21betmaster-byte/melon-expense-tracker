"use client";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface PillOption {
  value: string;
  label: string;
  /** Optional icon or badge to render before the label */
  icon?: React.ReactNode;
}

interface PillSelectProps {
  options: PillOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  /** Allow multiple selections (default: false) */
  multiSelect?: boolean;
  /** Max rows to show before "Show more" (default: no limit) */
  maxRows?: number;
  /** Number of items that approximates one row for show-more logic */
  showMoreThreshold?: number;
  /** Active pill color variant */
  variant?: "blue" | "purple" | "green";
  /** Additional className for the container */
  className?: string;
  /** Optional auto-detect indicator */
  autoIndicator?: { type: "auto" | "memory"; label: string } | null;
}

const variantStyles = {
  blue: {
    active: "bg-blue-600 text-white border-blue-500",
    inactive: "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600",
  },
  purple: {
    active: "bg-purple-600/20 text-purple-300 border-purple-500",
    inactive: "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600",
  },
  green: {
    active: "bg-green-600/20 text-green-300 border-green-500",
    inactive: "bg-slate-800/50 text-slate-400 border-slate-700 hover:border-slate-600",
  },
};

export const PillSelect = ({
  options,
  value,
  onChange,
  multiSelect = false,
  maxRows,
  showMoreThreshold = 8,
  variant = "blue",
  className,
  autoIndicator,
}: PillSelectProps) => {
  const [expanded, setExpanded] = useState(false);

  const isSelected = useCallback(
    (optValue: string) => {
      if (multiSelect && Array.isArray(value)) {
        return value.includes(optValue);
      }
      return value === optValue;
    },
    [value, multiSelect]
  );

  const handleSelect = useCallback(
    (optValue: string) => {
      if (multiSelect && Array.isArray(value)) {
        const newValue = value.includes(optValue)
          ? value.filter((v) => v !== optValue)
          : [...value, optValue];
        onChange(newValue);
      } else {
        onChange(optValue);
      }
    },
    [value, onChange, multiSelect]
  );

  const visibleOptions =
    maxRows && !expanded ? options.slice(0, showMoreThreshold) : options;
  const hasMore = maxRows && options.length > showMoreThreshold;

  const styles = variantStyles[variant];

  return (
    <div className={cn("space-y-1.5", className)}>
      {autoIndicator && (
        <p
          className={cn(
            "text-xs",
            autoIndicator.type === "memory"
              ? "text-purple-400"
              : "text-green-400"
          )}
        >
          {autoIndicator.label}
        </p>
      )}
      <div
        className="flex flex-wrap gap-2"
        role={multiSelect ? "group" : "radiogroup"}
      >
        {visibleOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role={multiSelect ? "checkbox" : "radio"}
            aria-checked={isSelected(opt.value)}
            onClick={() => handleSelect(opt.value)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-full border transition-all min-h-[44px] flex items-center gap-1.5",
              "active:scale-95 select-none cursor-pointer",
              isSelected(opt.value) ? styles.active : styles.inactive
            )}
          >
            {opt.icon}
            <span className="truncate max-w-[120px]">{opt.label}</span>
          </button>
        ))}
      </div>
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {expanded ? "Show less" : `Show more (${options.length - showMoreThreshold})`}
        </button>
      )}
    </div>
  );
};
