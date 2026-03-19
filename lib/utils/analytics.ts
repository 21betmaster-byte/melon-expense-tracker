import type { Expense, MonthlyData, CategoryMonthData, AnalyticsInsight, MoMDataPoint, MemberContribution } from "@/types";
import type { Category, User } from "@/types";
import { formatMonth, safeToDate } from "./format";

export const buildMonthlyTrend = (
  expenses: Expense[],
  userAId: string,
  userBId: string
): MonthlyData[] => {
  const map = new Map<string, { total: number; userA: number; userB: number }>();

  // Build last 6 months labels
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = formatMonth(d);
    map.set(key, { total: 0, userA: 0, userB: 0 });
  }

  for (const exp of expenses) {
    if (exp.expense_type === "settlement") continue;
    const d = safeToDate(exp.date);
    const key = formatMonth(d);
    if (!map.has(key)) continue;

    const amount = Math.abs(exp.amount);
    const entry = map.get(key)!;
    entry.total += amount;

    if (exp.expense_type === "solo") {
      if (exp.paid_by_user_id === userAId) entry.userA += amount;
      else if (exp.paid_by_user_id === userBId) entry.userB += amount;
    }
    map.set(key, entry);
  }

  return Array.from(map.entries()).map(([month, data]) => ({
    month,
    ...data,
  }));
};

export const buildCategoryMoM = (
  expenses: Expense[],
  categories: Category[]
): CategoryMonthData[] => {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const catMap = new Map<string, { current: number; previous: number }>();
  for (const cat of categories) {
    catMap.set(cat.id, { current: 0, previous: 0 });
  }

  for (const exp of expenses) {
    if (exp.expense_type === "settlement") continue;
    const d = safeToDate(exp.date);
    const m = d.getMonth();
    const y = d.getFullYear();
    const amount = Math.abs(exp.amount);
    const entry = catMap.get(exp.category_id);
    if (!entry) continue;

    if (m === currentMonth && y === currentYear) {
      entry.current += amount;
    } else if (
      (m === (currentMonth - 1 + 12) % 12 &&
        y === (currentMonth === 0 ? currentYear - 1 : currentYear))
    ) {
      entry.previous += amount;
    }
    catMap.set(exp.category_id, entry);
  }

  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthProgress = dayOfMonth / daysInMonth;
  const isEarlyInMonth = dayOfMonth <= 5;

  return Array.from(catMap.entries())
    .map(([catId, data]) => {
      const cat = categories.find((c) => c.id === catId);
      return {
        category: cat?.name ?? catId,
        ...data,
        projectedCurrent: isEarlyInMonth ? data.current : data.current / monthProgress,
      };
    })
    .filter((d) => d.current > 0 || d.previous > 0);
};

/**
 * Build pie chart data: sum expenses by category for a given set of expenses.
 * Caller is responsible for pre-filtering by month.
 * Excludes settlement-type expenses and categories with zero spend.
 */
export const buildCategoryPieData = (
  expenses: Expense[],
  categories: Category[]
): { category: string; value: number }[] => {
  const catMap = new Map<string, number>();

  for (const exp of expenses) {
    if (exp.expense_type === "settlement") continue;
    const amount = Math.abs(exp.amount);
    const current = catMap.get(exp.category_id) ?? 0;
    catMap.set(exp.category_id, current + amount);
  }

  return Array.from(catMap.entries())
    .map(([catId, value]) => {
      const cat = categories.find((c) => c.id === catId);
      return { category: cat?.name ?? catId, value };
    })
    .filter((d) => d.value > 0);
};

/**
 * Generate natural language insights from analytics data.
 * Returns up to 4 prioritized insights about spending trends.
 */
export const generateInsights = (
  categoryData: CategoryMonthData[],
  monthlyData: MonthlyData[],
  expenses: Expense[],
  categories: Category[],
  formatAmount: (amount: number) => string
): AnalyticsInsight[] => {
  const insights: AnalyticsInsight[] = [];

  if (categoryData.length === 0 && monthlyData.length === 0) return [];

  // Check if this is the first month (no previous data)
  const hasHistory = categoryData.some((c) => c.previous > 0);

  if (!hasHistory) {
    // First month — limited insights
    const top = [...categoryData].sort((a, b) => b.current - a.current)[0];
    if (top) {
      const count = countCurrentMonthExpensesByCategory(expenses, top.category, categories);
      const avg = count > 0 ? top.current / count : top.current;
      insights.push({
        id: "top_spending",
        text: `${top.category} is your top category at ${formatAmount(top.current)} across ${count} transaction${count !== 1 ? "s" : ""}${count > 1 ? ` (avg ${formatAmount(Math.round(avg))})` : ""}`,
        type: "top_spending",
        priority: 80,
      });
    }
    insights.push({
      id: "first_month",
      text: "This is your first month — keep tracking to see trends!",
      type: "total_change",
      priority: 60,
    });
    return insights.slice(0, 4);
  }

  // Compute month progress for normalizing partial-month comparisons
  const nowForProgress = new Date();
  const dayOfMonthCat = nowForProgress.getDate();
  const daysInMonth = new Date(nowForProgress.getFullYear(), nowForProgress.getMonth() + 1, 0).getDate();
  const monthProg = dayOfMonthCat / daysInMonth;
  const isEarlyInMonth = dayOfMonthCat <= 5;

  // Type 1: Biggest category increase (projected)
  // Use pre-computed projectedCurrent if available, otherwise compute from month progress
  const projectedCategoryData = categoryData.map((c) => ({
    ...c,
    projected: c.projectedCurrent != null
      ? c.projectedCurrent
      : isEarlyInMonth ? c.current : c.current / monthProg,
  }));

  const withIncrease = projectedCategoryData
    .filter((c) => c.previous > 0 && c.projected > c.previous)
    .sort((a, b) => (b.projected - b.previous) - (a.projected - a.previous));
  const biggestIncrease = withIncrease[0];
  if (biggestIncrease && !isEarlyInMonth) {
    const pct = Math.round(
      ((biggestIncrease.projected - biggestIncrease.previous) / biggestIncrease.previous) * 100
    );
    insights.push({
      id: "increase",
      text: `${biggestIncrease.category} is trending ${pct}% above last month (${formatAmount(biggestIncrease.current)} so far)`,
      type: "increase",
      priority: 90,
    });
  }

  // Also check new categories (previous=0, current>0)
  if (!biggestIncrease) {
    const newCat = categoryData
      .filter((c) => c.previous === 0 && c.current > 0)
      .sort((a, b) => b.current - a.current)[0];
    if (newCat) {
      insights.push({
        id: "increase",
        text: `${newCat.category} is new this month at ${formatAmount(newCat.current)}`,
        type: "increase",
        priority: 90,
      });
    }
  }

  // Type 2: Biggest category decrease (projected)
  const withDecrease = projectedCategoryData
    .filter((c) => c.previous > 0 && c.projected < c.previous)
    .sort((a, b) => (a.projected - a.previous) - (b.projected - b.previous));
  const biggestDecrease = withDecrease[0];
  if (biggestDecrease) {
    if (biggestDecrease.current === 0) {
      insights.push({
        id: "decrease",
        text: `${biggestDecrease.category} had no spending this month (was ${formatAmount(biggestDecrease.previous)} last month)`,
        type: "decrease",
        priority: 85,
      });
    } else if (!isEarlyInMonth) {
      const pct = Math.round(
        ((biggestDecrease.previous - biggestDecrease.projected) / biggestDecrease.previous) * 100
      );
      insights.push({
        id: "decrease",
        text: `${biggestDecrease.category} is trending ${pct}% below last month (${formatAmount(biggestDecrease.current)} so far)`,
        type: "decrease",
        priority: 85,
      });
    }
  }

  // Type 3: Top spending category with trip count (skip if same as biggest increase)
  const topSpending = [...categoryData].sort((a, b) => b.current - a.current)[0];
  if (topSpending && topSpending.category !== biggestIncrease?.category) {
    const count = countCurrentMonthExpensesByCategory(expenses, topSpending.category, categories);
    const avg = count > 0 ? topSpending.current / count : topSpending.current;
    insights.push({
      id: "top_spending",
      text: `You spent ${formatAmount(topSpending.current)} on ${topSpending.category} across ${count} transaction${count !== 1 ? "s" : ""}${count > 1 ? ` (avg ${formatAmount(Math.round(avg))})` : ""}`,
      type: "top_spending",
      priority: 80,
    });
  }

  // Type 4: Total month-over-month change (normalized for partial months)
  if (monthlyData.length >= 2) {
    const current = monthlyData[monthlyData.length - 1];
    const previous = monthlyData[monthlyData.length - 2];
    if (previous.total > 0) {
      const now = new Date();
      const dayOfMonth = now.getDate();
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const monthProgress = dayOfMonth / daysInCurrentMonth;

      // If we're in the first 5 days of the month, don't compare — too early
      if (dayOfMonth <= 5) {
        insights.push({
          id: "total_change",
          text: `${formatAmount(current.total)} spent so far this month — too early for comparison`,
          type: "total_change",
          priority: 70,
        });
      } else {
        // Project current spending to full month for fair comparison
        const projectedTotal = current.total / monthProgress;
        const delta = projectedTotal - previous.total;
        const pct = Math.round(Math.abs(delta / previous.total) * 100);
        const paceLabel = `On pace for ${formatAmount(Math.round(projectedTotal))} this month`;

        if (pct < 5) {
          insights.push({
            id: "total_change",
            text: `${paceLabel} — steady compared to last month`,
            type: "total_change",
            priority: 70,
          });
        } else if (delta > 0) {
          insights.push({
            id: "total_change",
            text: `${paceLabel} — trending ${pct}% above last month`,
            type: "total_change",
            priority: 70,
          });
        } else {
          insights.push({
            id: "total_change",
            text: `${paceLabel} — trending ${pct}% below last month`,
            type: "total_change",
            priority: 70,
          });
        }
      }
    }
  }

  // Type 5: Steady category (use projected data for fair comparison)
  const steady = projectedCategoryData
    .filter(
      (c) =>
        c.previous > 0 &&
        c.current > 0 &&
        Math.abs(c.projected - c.previous) / c.previous < 0.1
    )
    .sort((a, b) => b.current - a.current)[0];
  if (steady) {
    insights.push({
      id: "steady",
      text: `${steady.category} is steady at ${formatAmount(Math.round(steady.current))}`,
      type: "steady",
      priority: 50,
    });
  }

  // Sort by priority and return top 4
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 4);
};

/** Count current-month expenses matching a category name */
function countCurrentMonthExpensesByCategory(
  expenses: Expense[],
  categoryName: string,
  categories: Category[]
): number {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Resolve category name → ID(s)
  const matchingIds = new Set(
    categories.filter((c) => c.name === categoryName).map((c) => c.id)
  );

  let count = 0;
  for (const exp of expenses) {
    if (exp.expense_type === "settlement") continue;
    if (!matchingIds.has(exp.category_id)) continue;
    const d = safeToDate(exp.date);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      count++;
    }
  }
  return count;
}

// ─── Enhanced Analytics (Phase 16) ──────────────────────────────────────

/**
 * Build MoM total expense trend for a configurable number of months.
 * Optionally filters by selected category IDs.
 */
export const buildMoMTrend = (
  expenses: Expense[],
  monthCount: number = 6,
  categoryFilter?: Set<string>
): MoMDataPoint[] => {
  const map = new Map<string, number>();

  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    map.set(formatMonth(d), 0);
  }

  for (const exp of expenses) {
    if (exp.expense_type === "settlement") continue;
    if (categoryFilter && categoryFilter.size > 0 && !categoryFilter.has(exp.category_id)) continue;
    const d = safeToDate(exp.date);
    const key = formatMonth(d);
    if (!map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + Math.abs(exp.amount));
  }

  return Array.from(map.entries()).map(([month, total]) => ({ month, total }));
};

/**
 * Build category-wise MoM data for configurable months.
 * Returns an array of data points with each category as a key.
 */
export const buildCategoryMoMTrend = (
  expenses: Expense[],
  categories: Category[],
  monthCount: number = 6,
  categoryFilter?: Set<string>
): { months: string[]; data: Record<string, Record<string, number>> } => {
  const months: string[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(formatMonth(d));
  }

  // Initialize category → month → amount map
  const catMonthMap = new Map<string, Map<string, number>>();
  const filteredCats = categoryFilter && categoryFilter.size > 0
    ? categories.filter((c) => categoryFilter.has(c.id))
    : categories;

  for (const cat of filteredCats) {
    const monthMap = new Map<string, number>();
    for (const m of months) monthMap.set(m, 0);
    catMonthMap.set(cat.id, monthMap);
  }

  for (const exp of expenses) {
    if (exp.expense_type === "settlement") continue;
    const catMap = catMonthMap.get(exp.category_id);
    if (!catMap) continue;
    const d = safeToDate(exp.date);
    const key = formatMonth(d);
    if (!catMap.has(key)) continue;
    catMap.set(key, (catMap.get(key) ?? 0) + Math.abs(exp.amount));
  }

  // Transform to { categoryName: { month: amount } }
  const data: Record<string, Record<string, number>> = {};
  for (const [catId, monthMap] of catMonthMap.entries()) {
    const cat = filteredCats.find((c) => c.id === catId);
    const catName = cat?.name ?? catId;
    // Only include categories with at least some spending
    const hasSpending = Array.from(monthMap.values()).some((v) => v > 0);
    if (hasSpending) {
      data[catName] = Object.fromEntries(monthMap);
    }
  }

  return { months, data };
};

/**
 * Build per-member contribution data for stacked bar chart.
 * Shows how much each household member paid over time.
 */
export const buildMemberContributions = (
  expenses: Expense[],
  members: User[],
  monthCount: number = 6,
  categoryFilter?: Set<string>
): { data: MemberContribution[]; memberNames: Record<string, string> } => {
  const months: string[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(formatMonth(d));
  }

  // Member uid → display name
  const memberNames: Record<string, string> = {};
  for (const m of members) {
    memberNames[`member_${m.uid}`] = m.name;
  }

  // Initialize: month → { member_uid: amount }
  const monthMemberMap = new Map<string, Record<string, number>>();
  for (const m of months) {
    const memberInit: Record<string, number> = {};
    for (const mem of members) {
      memberInit[`member_${mem.uid}`] = 0;
    }
    monthMemberMap.set(m, memberInit);
  }

  for (const exp of expenses) {
    if (exp.expense_type === "settlement") continue;
    if (categoryFilter && categoryFilter.size > 0 && !categoryFilter.has(exp.category_id)) continue;
    const d = safeToDate(exp.date);
    const key = formatMonth(d);
    const entry = monthMemberMap.get(key);
    if (!entry) continue;
    const memberKey = `member_${exp.paid_by_user_id}`;
    if (memberKey in entry) {
      entry[memberKey] += Math.abs(exp.amount);
    }
  }

  const data: MemberContribution[] = months.map((month) => ({
    month,
    ...monthMemberMap.get(month)!,
  }));

  return { data, memberNames };
};
