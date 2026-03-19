"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyData } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

interface Props {
  data: MonthlyData[];
  currency?: string;
}

export const TrendLineChart = ({ data, currency = "INR" }: Props) => {
  const { members, user } = useAppStore();
  const userA = members.find((m) => m.uid === user?.uid);
  const userB = members.find((m) => m.uid !== user?.uid);

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
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
          contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0" }}
          labelStyle={{ color: "#94a3b8" }}
          itemStyle={{ color: "#e2e8f0" }}
          formatter={(value: number | undefined) => [formatCurrency(value ?? 0, currency), ""]}
        />
        <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="total"
          name="Total"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: "#3b82f6" }}
        />
        <Line
          type="monotone"
          dataKey="userA"
          name={`${userA?.name ?? "You"} solo`}
          stroke="#a855f7"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="userB"
          name={`${userB?.name ?? "Partner"} solo`}
          stroke="#22c55e"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
