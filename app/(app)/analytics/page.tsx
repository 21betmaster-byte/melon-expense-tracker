"use client";
import { useState, useMemo, useEffect } from "react";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  buildMonthlyTrend,
  buildCategoryMoM,
  buildMoMTrend,
  buildCategoryMoMTrend,
  buildMemberContributions,
} from "@/lib/utils/analytics";
import { TrendLineChart } from "@/components/analytics/TrendLineChart";
import { CategoryBarChart } from "@/components/analytics/CategoryBarChart";
import { CategoryPieChart } from "@/components/analytics/CategoryPieChart";
import { AnalyticsInsights } from "@/components/analytics/AnalyticsInsights";
import { MoMTrendChart } from "@/components/analytics/MoMTrendChart";
import { CategoryMoMChart } from "@/components/analytics/CategoryMoMChart";
import { MemberContributionChart } from "@/components/analytics/MemberContributionChart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/useAppStore";

const TIME_PERIOD_OPTIONS = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "9", label: "9 months" },
  { value: "12", label: "12 months" },
];

export default function AnalyticsPage() {
  const { activeGroup, allCategories, household, members, user } = useAppStore();
  const defaultCurrency = household?.currency ?? "INR";

  // Always follow the global active group
  const selectedGroupId = activeGroup?.id ?? "all";

  // Currency filter — null means "use household default"
  const [currencyFilter, setCurrencyFilter] = useState<string | null>(null);
  const activeCurrency = currencyFilter ?? defaultCurrency;

  // Time period filter
  const [timePeriod, setTimePeriod] = useState<string>("6");
  const monthCount = parseInt(timePeriod, 10);

  // Category filter (multi-select via toggle chips)
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<Set<string>>(new Set());

  // Chart type for MoM trend
  const [momChartType, setMomChartType] = useState<"bar" | "line">("bar");

  // Chart-level category filter for MoM trend ("all" or a category ID)
  const [momCategoryFilter, setMomCategoryFilter] = useState<string>("all");

  // Reset chart-level category filter when group changes
  // (categories are group-specific so the old selection may be invalid)
  useEffect(() => {
    setMomCategoryFilter("all");
    setSelectedCategoryIds(new Set());
  }, [selectedGroupId]);

  // Pass the local filter to the hook
  const { monthlyData: rawMonthlyData, categoryData: rawCategoryData, allExpenses, loading } = useAnalytics({
    groupId: selectedGroupId,
  });

  // Discover available currencies from expenses
  const availableCurrencies = useMemo(() => {
    const set = new Set<string>();
    set.add(defaultCurrency);
    for (const exp of allExpenses) {
      set.add(exp.currency ?? defaultCurrency);
    }
    return Array.from(set).sort();
  }, [allExpenses, defaultCurrency]);

  const showCurrencyFilter = availableCurrencies.length > 1;

  // Filter expenses by currency and rebuild chart data when needed
  const filteredExpenses = useMemo(() => {
    if (!showCurrencyFilter) return allExpenses;
    return allExpenses.filter(
      (exp) => (exp.currency ?? defaultCurrency) === activeCurrency
    );
  }, [allExpenses, activeCurrency, defaultCurrency, showCurrencyFilter]);

  const monthlyData = useMemo(() => {
    if (!showCurrencyFilter) return rawMonthlyData;
    const userA = members.find((m) => m.uid === user?.uid);
    const userB = members.find((m) => m.uid !== user?.uid);
    return buildMonthlyTrend(
      filteredExpenses,
      userA?.uid ?? user?.uid ?? "",
      userB?.uid ?? ""
    );
  }, [filteredExpenses, showCurrencyFilter, rawMonthlyData, members, user]);

  const categoryData = useMemo(() => {
    if (!showCurrencyFilter) return rawCategoryData;
    const catsForMoM =
      selectedGroupId === "all"
        ? allCategories
        : allCategories.filter((c) => c.group_id === selectedGroupId);
    return buildCategoryMoM(filteredExpenses, catsForMoM);
  }, [filteredExpenses, showCurrencyFilter, rawCategoryData, selectedGroupId, allCategories]);

  // Categories for this group
  const pieCategories = useMemo(() => {
    if (selectedGroupId === "all") return allCategories;
    return allCategories.filter((c) => c.group_id === selectedGroupId);
  }, [selectedGroupId, allCategories]);

  // ─── New charts data ───────────────────────────────────────────────────

  // MoM Total Trend (with category filter)
  // Chart-level dropdown takes priority; falls back to page-level chips
  const effectiveMomCategoryFilter = useMemo(() => {
    if (momCategoryFilter !== "all") return new Set([momCategoryFilter]);
    if (selectedCategoryIds.size > 0) return selectedCategoryIds;
    return undefined;
  }, [momCategoryFilter, selectedCategoryIds]);

  const momTrendData = useMemo(() => {
    return buildMoMTrend(
      filteredExpenses,
      monthCount,
      effectiveMomCategoryFilter
    );
  }, [filteredExpenses, monthCount, effectiveMomCategoryFilter]);

  // Category-wise MoM trend
  const categoryMoMData = useMemo(() => {
    return buildCategoryMoMTrend(
      filteredExpenses,
      pieCategories,
      monthCount,
      selectedCategoryIds.size > 0 ? selectedCategoryIds : undefined
    );
  }, [filteredExpenses, pieCategories, monthCount, selectedCategoryIds]);

  // Member contributions (stacked bar)
  const memberContribData = useMemo(() => {
    return buildMemberContributions(
      filteredExpenses,
      members,
      monthCount,
      selectedCategoryIds.size > 0 ? selectedCategoryIds : undefined
    );
  }, [filteredExpenses, members, monthCount, selectedCategoryIds]);

  // Toggle category filter
  const toggleCategory = (catId: string) => {
    setSelectedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  const clearCategoryFilter = () => setSelectedCategoryIds(new Set());

  // Determine display name for the header
  const selectedGroupName = activeGroup?.name ?? "All Groups";

  return (
    <div className="space-y-8 pt-4">
      {/* Page Header with Group + Currency + Time Filter */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-lg font-semibold text-slate-100 min-w-0 truncate">
          Analytics — {selectedGroupName}
        </h1>

        <div className="flex items-center gap-2">
          {/* Time Period */}
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger
              className="bg-slate-800 border-slate-700 w-[110px] shrink-0"
              data-testid="analytics-time-period"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIOD_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Currency Filter (shown only when > 1 currency exists) */}
          {showCurrencyFilter && (
            <Select value={activeCurrency} onValueChange={setCurrencyFilter}>
              <SelectTrigger
                className="bg-slate-800 border-slate-700 w-[90px] shrink-0"
                data-testid="analytics-currency-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map((cur) => (
                  <SelectItem key={cur} value={cur}>
                    {cur}{cur === defaultCurrency ? " ✓" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="space-y-2" data-testid="category-filter-chips">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Filter by Category</p>
          {selectedCategoryIds.size > 0 && (
            <button
              type="button"
              onClick={clearCategoryFilter}
              className="text-xs text-blue-400 hover:text-blue-300"
              data-testid="clear-category-filter"
            >
              Clear ({selectedCategoryIds.size})
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pieCategories.map((cat) => {
            const isSelected = selectedCategoryIds.has(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                  isSelected
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                    : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                }`}
                data-testid={`category-chip-${cat.name.toLowerCase().replace(/\s+/g, "-")}`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Analytics Insights */}
      {loading ? (
        <Skeleton className="h-32 w-full rounded-xl bg-slate-800" />
      ) : (
        <AnalyticsInsights
          categoryData={categoryData}
          monthlyData={monthlyData}
          expenses={filteredExpenses}
          categories={pieCategories}
          currency={activeCurrency}
        />
      )}

      {/* MoM Total Expenses */}
      <section data-testid="mom-trend-chart">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">
            Total Expenses — Month on Month
          </h2>
          <div className="flex items-center gap-2">
            <Select value={momCategoryFilter} onValueChange={setMomCategoryFilter}>
              <SelectTrigger
                className="bg-slate-800 border-slate-700 w-[150px] h-7 text-xs"
                data-testid="mom-category-filter"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {pieCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={momChartType} onValueChange={(v) => setMomChartType(v as "bar" | "line")}>
              <SelectTrigger className="bg-slate-800 border-slate-700 w-[80px] h-7 text-xs" data-testid="mom-chart-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="line">Line</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-60 w-full rounded-xl bg-slate-800" />
        ) : (
          <MoMTrendChart data={momTrendData} currency={activeCurrency} chartType={momChartType} />
        )}
      </section>

      {/* Category-wise MoM */}
      <section data-testid="category-mom-trend-chart">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
          Category Breakdown — Month on Month
        </h2>
        {loading ? (
          <Skeleton className="h-72 w-full rounded-xl bg-slate-800" />
        ) : (
          <CategoryMoMChart
            months={categoryMoMData.months}
            data={categoryMoMData.data}
            currency={activeCurrency}
          />
        )}
      </section>

      {/* Member Contributions (Stacked Bar Chart) */}
      <section data-testid="member-contribution-chart">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
          Who Paid What
        </h2>
        {loading ? (
          <Skeleton className="h-72 w-full rounded-xl bg-slate-800" />
        ) : (
          <MemberContributionChart
            data={memberContribData.data}
            memberNames={memberContribData.memberNames}
            currency={activeCurrency}
          />
        )}
      </section>

      {/* Category Pie Chart */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
          Category Breakdown
        </h2>
        {loading ? (
          <Skeleton className="h-72 w-full rounded-xl bg-slate-800" />
        ) : (
          <CategoryPieChart
            expenses={filteredExpenses}
            categories={pieCategories}
            currency={activeCurrency}
          />
        )}
      </section>

      {/* Legacy: 6-Month Spending Trend */}
      <section data-testid="monthly-trend-chart">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
          Spending Trend (Per-Member Solo)
        </h2>
        {loading ? (
          <Skeleton className="h-60 w-full rounded-xl bg-slate-800" />
        ) : monthlyData.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            No data yet. Add some expenses first.
          </p>
        ) : (
          <TrendLineChart data={monthlyData} currency={activeCurrency} />
        )}
      </section>

      {/* Category MoM Bar Chart (legacy) */}
      <section data-testid="category-mom-chart">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
          Category — This vs Last Month
        </h2>
        {loading ? (
          <Skeleton className="h-72 w-full rounded-xl bg-slate-800" />
        ) : categoryData.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            Not enough data for comparison.
          </p>
        ) : (
          <CategoryBarChart data={categoryData} currency={activeCurrency} />
        )}
      </section>
    </div>
  );
}
