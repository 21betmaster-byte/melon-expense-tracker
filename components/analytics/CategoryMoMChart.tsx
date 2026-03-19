"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

const CATEGORY_COLORS = [
  "#3b82f6", "#a855f7", "#22c55e", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

interface Props {
  months: string[];
  data: Record<string, Record<string, number>>; // categoryName → { month → amount }
  currency?: string;
}

export const CategoryMoMChart = ({ months, data, currency = "INR" }: Props) => {
  const categoryNames = Object.keys(data);

  if (categoryNames.length === 0 || months.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-8">
        No category data for the selected period.
      </p>
    );
  }

  // Transform to chart-compatible format: [{ month, Cat1: x, Cat2: y, ... }]
  const chartData = months.map((month) => {
    const point: Record<string, number | string> = { month };
    for (const catName of categoryNames) {
      point[catName] = data[catName]?.[month] ?? 0;
    }
    return point;
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 5, left: 0, bottom: 25 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="month"
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={{ stroke: "#334155" }}
        />
        <YAxis
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          axisLine={{ stroke: "#334155" }}
          tickFormatter={(v: number) => formatCompactCurrency(v, currency)}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0f172a",
            border: "1px solid #334155",
            borderRadius: 8,
            color: "#e2e8f0",
          }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: "#e2e8f0" }}
          cursor={{ fill: "rgba(255,255,255,0.05)" }}
          formatter={(value: number | undefined, name?: string) => [
            formatCurrency(value ?? 0, currency),
            name ?? "",
          ]}
        />
        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 11, paddingTop: 12 }} verticalAlign="bottom" />
        {categoryNames.map((catName, idx) => (
          <Bar
            key={catName}
            dataKey={catName}
            stackId="categories"
            fill={CATEGORY_COLORS[idx % CATEGORY_COLORS.length]}
            radius={idx === categoryNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
