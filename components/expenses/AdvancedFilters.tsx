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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface MemberOption {
  uid: string;
  name: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface Props {
  filters: AdvancedFilterValues;
  onApply: (filters: AdvancedFilterValues) => void;
  onClear: () => void;
  // Inline filter props
  paidByFilter: string;
  onPaidByChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  categoryFilter: string[];
  onCategoryChange: (value: string[]) => void;
  currencyFilter: string;
  onCurrencyChange: (value: string) => void;
  members: MemberOption[];
  categories: CategoryOption[];
  currencies: string[];
  currentUserUid?: string;
}

export const AdvancedFilters = ({
  filters,
  onApply,
  onClear,
  paidByFilter,
  onPaidByChange,
  typeFilter,
  onTypeChange,
  categoryFilter,
  onCategoryChange,
  currencyFilter,
  onCurrencyChange,
  members,
  categories,
  currencies,
  currentUserUid,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AdvancedFilterValues>(filters);

  // Count ALL active filters (including inline ones now inside popover)
  const inlineCount = [
    paidByFilter !== "all" ? paidByFilter : "",
    typeFilter !== "all" ? typeFilter : "",
    currencyFilter !== "all" ? currencyFilter : "",
  ].filter(Boolean).length + (categoryFilter.length > 0 ? 1 : 0);

  const advCount = [
    filters.amountMin,
    filters.amountMax,
    filters.dateFrom,
    filters.dateTo,
  ].filter(Boolean).length;

  const activeCount = inlineCount + advCount;

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

  const handleClearAll = () => {
    setDraft(EMPTY_FILTERS);
    onClear();
    onPaidByChange("all");
    onTypeChange("all");
    onCategoryChange([]);
    onCurrencyChange("all");
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
        className="w-80 bg-slate-900 border-slate-700 p-4 max-h-[70vh] overflow-y-auto"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-100">Filters</h4>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear all
              </button>
            )}
          </div>

          {/* Paid By */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Paid By</Label>
            <Select value={paidByFilter} onValueChange={onPaidByChange}>
              <SelectTrigger className="h-8 text-sm bg-slate-800 border-slate-700" data-testid="filter-paid-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.uid} value={m.uid}>
                    {m.uid === currentUserUid ? `${m.name} (You)` : m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-400">Type</Label>
            <Select value={typeFilter} onValueChange={onTypeChange}>
              <SelectTrigger className="h-8 text-sm bg-slate-800 border-slate-700" data-testid="filter-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="joint">Joint</SelectItem>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="settlement">Settlement</SelectItem>
                <SelectItem value="paid_for_partner">Paid for Partner</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">
                Category{categoryFilter.length > 0 ? ` (${categoryFilter.length})` : ""}
              </Label>
              <Select
                value={categoryFilter.length === 1 ? categoryFilter[0] : categoryFilter.length === 0 ? "all" : "__multi__"}
                onValueChange={(v) => {
                  if (v === "all") {
                    onCategoryChange([]);
                  } else {
                    // Toggle category selection
                    if (categoryFilter.includes(v)) {
                      onCategoryChange(categoryFilter.filter((c) => c !== v));
                    } else {
                      onCategoryChange([...categoryFilter, v]);
                    }
                  }
                }}
              >
                <SelectTrigger className="h-8 text-sm bg-slate-800 border-slate-700" data-testid="filter-category">
                  <SelectValue>
                    {categoryFilter.length === 0
                      ? "All Categories"
                      : categoryFilter.length === 1
                      ? categories.find((c) => c.id === categoryFilter[0])?.name ?? "1 selected"
                      : `${categoryFilter.length} selected`}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {categoryFilter.includes(c.id) ? `✓ ${c.name}` : c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Currency */}
          {currencies.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">Currency</Label>
              <Select value={currencyFilter} onValueChange={onCurrencyChange}>
                <SelectTrigger className="h-8 text-sm bg-slate-800 border-slate-700" data-testid="filter-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Currencies</SelectItem>
                  {currencies.map((cur) => (
                    <SelectItem key={cur} value={cur}>
                      {cur}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Amount Range */}
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
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
              onClick={handleClearAll}
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
