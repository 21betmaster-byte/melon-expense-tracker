"use client";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateInsights } from "@/lib/utils/analytics";
import { formatCurrency } from "@/lib/utils/format";
import type { Expense, MonthlyData, CategoryMonthData, Category } from "@/types";

interface Props {
  categoryData: CategoryMonthData[];
  monthlyData: MonthlyData[];
  expenses: Expense[];
  categories: Category[];
  currency?: string;
}

export const AnalyticsInsights = ({
  categoryData,
  monthlyData,
  expenses,
  categories,
  currency = "INR",
}: Props) => {
  const insights = useMemo(
    () =>
      generateInsights(
        categoryData,
        monthlyData,
        expenses,
        categories,
        (amount) => formatCurrency(amount, currency)
      ),
    [categoryData, monthlyData, expenses, categories, currency]
  );

  if (insights.length === 0) return null;

  return (
    <Card className="bg-slate-900 border-slate-800" data-testid="analytics-insights">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-400 uppercase tracking-wide">
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {insights.map((insight) => (
            <li
              key={insight.id}
              className="text-sm text-slate-300 before:content-['–'] before:mr-2 before:text-slate-500"
            >
              {insight.text}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
