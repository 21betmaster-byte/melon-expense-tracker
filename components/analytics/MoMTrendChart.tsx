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
  Line,
  ComposedChart,
} from "recharts";
import type { MoMDataPoint } from "@/types";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

interface Props {
  data: MoMDataPoint[];
  currency?: string;
  chartType?: "bar" | "line";
}

export const MoMTrendChart = ({
  data,
  currency = "INR",
  chartType = "bar",
}: Props) => {
  if (data.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-8">
        No data yet. Add some expenses first.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart
        data={data}
        margin={{ top: 5, right: 5, left: 0, bottom: 25 }}
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
          formatter={(value: number | undefined) => [
            formatCurrency(value ?? 0, currency),
            "Total",
          ]}
        />
        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12, paddingTop: 12 }} verticalAlign="bottom" />
        {chartType === "bar" ? (
          <Bar
            dataKey="total"
            name="Total"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        ) : (
          <Line
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6" }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
};
