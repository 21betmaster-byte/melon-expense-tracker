"use client";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ExpenseList } from "@/components/expenses/ExpenseList";
import { RecurringList } from "@/components/expenses/RecurringList";
import { AddExpenseDialog } from "@/components/expenses/AddExpenseDialog";
import { AdvancedFilters, type AdvancedFilterValues } from "@/components/expenses/AdvancedFilters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, X, Download } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { exportExpensesToCSV } from "@/lib/utils/export";
import { calculateSettlement } from "@/lib/utils/settlement";
import { formatCurrency, formatMonth, safeToDate } from "@/lib/utils/format";
import { toast } from "sonner";
import type { Expense } from "@/types";

type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc" | "category-az";

const EMPTY_ADV_FILTERS: AdvancedFilterValues = {
  amountMin: "",
  amountMax: "",
  dateFrom: "",
  dateTo: "",
};

export default function ExpensesPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date-desc");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [paidByFilter, setPaidByFilter] = useState<string>("all");
  const [advFilters, setAdvFilters] = useState<AdvancedFilterValues>(EMPTY_ADV_FILTERS);
  const { activeGroup, expenses, categories, members, household, user } = useAppStore();
  const householdCurrency = household?.currency ?? "INR";

  // Count recurring expenses for the tab badge
  const recurringCount = useMemo(
    () => expenses.filter((e) => e.is_recurring).length,
    [expenses]
  );

  // Reset all filters when group changes
  const prevGroupId = useRef(activeGroup?.id);
  useEffect(() => {
    if (activeGroup?.id !== prevGroupId.current) {
      setSearchQuery("");
      setDebouncedQuery("");
      setSortKey("date-desc");
      setMonthFilter("all");
      setPaidByFilter("all");
      setAdvFilters(EMPTY_ADV_FILTERS);
      prevGroupId.current = activeGroup?.id;
    }
  }, [activeGroup?.id]);

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Generate month options (last 12 months + "All Months")
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [
      { value: "all", label: "All Months" },
    ];
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const label = formatMonth(d);
      opts.push({ value: label, label });
    }
    return opts;
  }, []);

  // Five-stage filter pipeline: month → paid-by → search → amount → date
  const filtered = useMemo(() => {
    let result = expenses;

    // Stage 1: Month filter
    if (monthFilter !== "all") {
      result = result.filter((exp) => {
        const d = safeToDate(exp.date);
        return formatMonth(d) === monthFilter;
      });
    }

    // Stage 2: Paid-by filter
    if (paidByFilter !== "all") {
      result = result.filter((exp) => exp.paid_by_user_id === paidByFilter);
    }

    // Stage 3: Search filter
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase().trim();
      result = result.filter((exp) => {
        const desc = (exp.description || "").toLowerCase();
        const catName = (categories.find((c) => c.id === exp.category_id)?.name || "").toLowerCase();
        const payerName = (members.find((m) => m.uid === exp.paid_by_user_id)?.name || "").toLowerCase();
        return desc.includes(q) || catName.includes(q) || payerName.includes(q);
      });
    }

    // Stage 4: Amount range filter
    const minAmt = advFilters.amountMin ? parseFloat(advFilters.amountMin) : null;
    const maxAmt = advFilters.amountMax ? parseFloat(advFilters.amountMax) : null;
    if (minAmt !== null && !isNaN(minAmt)) {
      result = result.filter((exp) => Math.abs(exp.amount) >= minAmt);
    }
    if (maxAmt !== null && !isNaN(maxAmt)) {
      result = result.filter((exp) => Math.abs(exp.amount) <= maxAmt);
    }

    // Stage 5: Date range filter
    if (advFilters.dateFrom) {
      const from = new Date(advFilters.dateFrom);
      from.setHours(0, 0, 0, 0);
      result = result.filter((exp) => {
        const d = safeToDate(exp.date);
        return d >= from;
      });
    }
    if (advFilters.dateTo) {
      const to = new Date(advFilters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((exp) => {
        const d = safeToDate(exp.date);
        return d <= to;
      });
    }

    return result;
  }, [expenses, monthFilter, paidByFilter, debouncedQuery, categories, members, advFilters]);

  // Sort filtered expenses
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const getTime = (exp: Expense) =>
      safeToDate(exp.date).getTime();

    switch (sortKey) {
      case "date-desc":
        return arr.sort((a, b) => getTime(b) - getTime(a));
      case "date-asc":
        return arr.sort((a, b) => getTime(a) - getTime(b));
      case "amount-desc":
        return arr.sort((a, b) => b.amount - a.amount);
      case "amount-asc":
        return arr.sort((a, b) => a.amount - b.amount);
      case "category-az": {
        const getCatName = (exp: Expense) =>
          (categories.find((c) => c.id === exp.category_id)?.name || "").toLowerCase();
        return arr.sort((a, b) => getCatName(a).localeCompare(getCatName(b)));
      }
      default:
        return arr;
    }
  }, [filtered, sortKey, categories]);

  // Total Spent (sum of absolute amounts for displayed expenses)
  const totalSpent = useMemo(() => {
    return sorted.reduce((sum, exp) => sum + Math.abs(exp.amount), 0);
  }, [sorted]);

  // Total Owed (settlement calculation on displayed expenses)
  const settlementResult = useMemo(() => {
    if (members.length < 2 || !user) {
      return { netBalance: 0, owedBy: null, owedTo: null, amount: 0, isSettled: true };
    }
    const userA = members.find((m) => m.uid === user.uid);
    const userB = members.find((m) => m.uid !== user.uid);
    if (!userA || !userB) {
      return { netBalance: 0, owedBy: null, owedTo: null, amount: 0, isSettled: true };
    }
    return calculateSettlement(sorted, userA, userB);
  }, [sorted, members, user]);

  const handleExport = useCallback(() => {
    if (sorted.length === 0) return;
    const count = exportExpensesToCSV(
      sorted,
      categories,
      members,
      householdCurrency
    );
    toast.success(`Exported ${count} expenses`);
  }, [sorted, categories, members, householdCurrency]);

  const advFilterActive =
    !!advFilters.amountMin || !!advFilters.amountMax || !!advFilters.dateFrom || !!advFilters.dateTo;

  const isFilterActive =
    debouncedQuery.trim().length > 0 ||
    monthFilter !== "all" ||
    paidByFilter !== "all" ||
    advFilterActive;

  const emptyMessage = isFilterActive
    ? "No expenses match your filters"
    : "No expenses yet. Add your first expense!";

  return (
    <div className="space-y-4 pt-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-100">All Expenses</h1>
          <p className="text-xs text-slate-500">
            {activeGroup?.name} · {sorted.length} transactions
            {isFilterActive && ` (filtered from ${expenses.length})`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-slate-300 border-slate-700"
            disabled={sorted.length === 0}
            onClick={handleExport}
            data-testid="export-csv-btn"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            className="gap-1.5"
            data-testid="add-expense-btn"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Tabs: All | Recurring */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="all" data-testid="expenses-tab-all">
            All
          </TabsTrigger>
          <TabsTrigger value="recurring" data-testid="expenses-tab-recurring">
            Recurring
            {recurringCount > 0 && (
              <span className="ml-1.5 text-[10px] bg-slate-600 text-slate-200 rounded-full px-1.5 py-0.5">
                {recurringCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── All Expenses Tab ── */}
        <TabsContent value="all" className="space-y-4 mt-3">
          {/* Summary Cards Row */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-3" data-testid="expenses-total-spent">
                <p className="text-xs text-slate-500 mb-0.5">Total Spent</p>
                <p className="text-lg font-semibold text-slate-100">
                  {formatCurrency(totalSpent, householdCurrency)}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-3" data-testid="expenses-total-owed">
                <p className="text-xs text-slate-500 mb-0.5">Total Owed</p>
                <p className="text-lg font-semibold text-slate-100">
                  {settlementResult.isSettled
                    ? formatCurrency(0, householdCurrency)
                    : formatCurrency(settlementResult.amount, householdCurrency)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter Row: Month + Paid By + Advanced Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger
                className="flex-1 min-w-0 h-9 bg-slate-900 border-slate-700 text-sm"
                data-testid="month-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paidByFilter} onValueChange={setPaidByFilter}>
              <SelectTrigger
                className={`flex-1 min-w-0 h-9 text-sm ${
                  paidByFilter !== "all"
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-300"
                    : "bg-slate-900 border-slate-700"
                }`}
                data-testid="paid-by-filter"
              >
                <SelectValue>
                  {paidByFilter === "all"
                    ? "Paid by: Everyone"
                    : `Paid by: ${members.find((m) => m.uid === paidByFilter)?.name ?? "?"}`}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everyone (All Members)</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.uid} value={m.uid}>
                    Paid by {m.name} {m.uid === user?.uid ? "(You)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AdvancedFilters
              filters={advFilters}
              onApply={setAdvFilters}
              onClear={() => setAdvFilters(EMPTY_ADV_FILTERS)}
            />
          </div>

          {/* Search + Sort Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search expenses..."
                className="pl-9 pr-8 h-9 bg-slate-900 border-slate-700 text-sm"
                data-testid="expense-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  data-testid="expense-search-clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger
                className="w-[180px] h-9 bg-slate-900 border-slate-700 text-sm"
                data-testid="expense-sort-select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-desc">Date (Newest)</SelectItem>
                <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="amount-desc">Amount (High→Low)</SelectItem>
                <SelectItem value="amount-asc">Amount (Low→High)</SelectItem>
                <SelectItem value="category-az">Category (A→Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ExpenseList
            filteredExpenses={sorted}
            emptyMessage={emptyMessage}
          />
        </TabsContent>

        {/* ── Recurring Expenses Tab ── */}
        <TabsContent value="recurring" className="mt-3">
          <RecurringList />
        </TabsContent>
      </Tabs>

      <AddExpenseDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
