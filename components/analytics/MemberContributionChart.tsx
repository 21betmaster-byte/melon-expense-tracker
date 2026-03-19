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
import type { MemberContribution } from "@/types";
import { formatCurrency, formatCompactCurrency } from "@/lib/utils/format";

const MEMBER_COLORS = ["#3b82f6", "#a855f7", "#22c55e", "#f59e0b", "#ef4444"];

interface Props {
  data: MemberContribution[];
  memberNames: Record<string, string>;
  currency?: string;
}

export const MemberContributionChart = ({
  data,
  memberNames,
  currency = "INR",
}: Props) => {
  const memberKeys = Object.keys(memberNames);

  if (data.length === 0 || memberKeys.length === 0) {
    return (
      <p className="text-slate-500 text-sm text-center py-8">
        No data available for member contributions.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={data}
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
            memberNames[name ?? ""] ?? name ?? "",
          ]}
        />
        <Legend
          wrapperStyle={{ color: "#94a3b8", fontSize: 12, paddingTop: 12 }}
          verticalAlign="bottom"
          formatter={(value: string) => memberNames[value] ?? value}
        />
        {memberKeys.map((key, idx) => (
          <Bar
            key={key}
            dataKey={key}
            name={key}
            stackId="members"
            fill={MEMBER_COLORS[idx % MEMBER_COLORS.length]}
            radius={idx === memberKeys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
