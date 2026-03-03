"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface AdvancedFilterValues {
  amountMin: string;
  amountMax: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: AdvancedFilterValues = {
  amountMin: "",
  amountMax: "",
  dateFrom: "",
  dateTo: "",
};

interface Props {
  filters: AdvancedFilterValues;
  onApply: (filters: AdvancedFilterValues) => void;
  onClear: () => void;
}

export const AdvancedFilters = ({ filters, onApply, onClear }: Props) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AdvancedFilterValues>(filters);

  // Count active filters
  const activeCount = [
    filters.amountMin,
    filters.amountMax,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setDraft(filters); // reset draft to current applied values
    }
    setOpen(isOpen);
  };

  const handleApply = () => {
    onApply(draft);
    setOpen(false);
  };

  const handleClear = () => {
    setDraft(EMPTY_FILTERS);
    onClear();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-slate-700 text-slate-300 hover:bg-slate-800 h-9 relative"
          data-testid="advanced-filters-btn"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {activeCount > 0 && (
            <Badge className="ml-1 h-4 min-w-[16px] px-1 text-[10px] bg-blue-500 text-white">
              {activeCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 bg-slate-900 border-slate-700 p-4"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-100">
              Advanced Filters
            </h4>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Amount Range */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Amount Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Min"
                value={draft.amountMin}
                onChange={(e) =>
                  setDraft({ ...draft, amountMin: e.target.value })
                }
                className="h-8 text-sm bg-slate-800 border-slate-700"
                data-testid="filter-amount-min"
              />
              <span className="text-slate-500 text-xs">—</span>
              <Input
                type="number"
                placeholder="Max"
                value={draft.amountMax}
                onChange={(e) =>
                  setDraft({ ...draft, amountMax: e.target.value })
                }
                className="h-8 text-sm bg-slate-800 border-slate-700"
                data-testid="filter-amount-max"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Date Range</Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={draft.dateFrom}
                onChange={(e) =>
                  setDraft({ ...draft, dateFrom: e.target.value })
                }
                className="h-8 text-sm bg-slate-800 border-slate-700"
                data-testid="filter-date-from"
              />
              <span className="text-slate-500 text-xs">—</span>
              <Input
                type="date"
                value={draft.dateTo}
                onChange={(e) =>
                  setDraft({ ...draft, dateTo: e.target.value })
                }
                className="h-8 text-sm bg-slate-800 border-slate-700"
                data-testid="filter-date-to"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleApply}
              className="flex-1"
              data-testid="filter-apply-btn"
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClear}
              className="flex-1 border-slate-700 text-slate-300"
              data-testid="filter-clear-btn"
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
