"use client";
import { useMemo } from "react";
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
import type { CategoryMonthData } from "@/types";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

interface Props {
  data: CategoryMonthData[];
  currency?: string;
}

export const CategoryBarChart = ({ data, currency = "INR" }: Props) => {
  // Use projected values for fair comparison, fall back to raw current
  const { chartData, isProjected } = useMemo(() => {
    const projected = data.some(
      (d) => d.projectedCurrent != null && d.projectedCurrent !== d.current
    );
    return {
      chartData: data.map((d) => ({
        ...d,
        displayCurrent: d.projectedCurrent ?? d.current,
      })),
      isProjected: projected,
    };
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 5, left: 0, bottom: 60 }}
        barCategoryGap="30%"
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          dataKey="category"
          tick={{ fill: "#94a3b8", fontSize: 9 }}
          axisLine={{ stroke: "#334155" }}
          angle={-40}
          textAnchor="end"
          interval={0}
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
          formatter={(value: number | undefined, name?: string, props?: { payload?: Record<string, number> }) => {
            if (isProjected && name?.includes("This Month")) {
              const actual = props?.payload?.current ?? value;
              return [
                `${formatCurrency(value ?? 0, currency)} (actual: ${formatCurrency(actual ?? 0, currency)})`,
                "",
              ];
            }
            return [formatCurrency(value ?? 0, currency), ""];
          }}
        />
        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12, paddingTop: 16 }} />
        <Bar
          dataKey="displayCurrent"
          name={isProjected ? "This Month (Projected)" : "This Month"}
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
        />
        <Bar dataKey="previous" name="Last Month" fill="#475569" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};
