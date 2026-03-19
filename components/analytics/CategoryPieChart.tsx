"use client";
import { useMemo, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildCategoryPieData } from "@/lib/utils/analytics";
import { formatMonth, formatCurrency, formatCompactCurrency, safeToDate } from "@/lib/utils/format";
import type { Expense, Category } from "@/types";

const COLORS = [
  "#3b82f6",
  "#a855f7",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

interface Props {
  expenses: Expense[];
  categories: Category[];
  currency?: string;
}

/** Build the list of 6 months: current month + last 5 */
const buildMonthOptions = (): {
  label: string;
  month: number;
  year: number;
}[] => {
  const options: { label: string; month: number; year: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    options.push({
      label: formatMonth(d),
      month: d.getMonth(),
      year: d.getFullYear(),
    });
  }
  return options;
};

export const CategoryPieChart = ({ expenses, categories, currency = "INR" }: Props) => {
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  // Default: current month (first option)
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].label);

  const pieData = useMemo(() => {
    const selected = monthOptions.find((o) => o.label === selectedMonth);
    if (!selected) return [];

    const filtered = expenses.filter((exp) => {
      const d = safeToDate(exp.date);
      return (
        d.getMonth() === selected.month &&
        d.getFullYear() === selected.year
      );
    });

    return buildCategoryPieData(filtered, categories);
  }, [expenses, categories, selectedMonth, monthOptions]);

  return (
    <div data-testid="category-pie-chart">
      {/* Month Selector */}
      <div className="mb-3">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger
            className="bg-slate-800 border-slate-700 w-[140px]"
            data-testid="pie-chart-month-selector"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.label} value={opt.label}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pie Chart or Empty State */}
      {pieData.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-8">
          No data for this month
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="category"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={(props: PieLabelRenderProps) => {
                const name = String(
                  (props as PieLabelRenderProps & { category?: string }).category ??
                    props.name ??
                    ""
                );
                const pct = props.percent ?? 0;
                const val = (props as PieLabelRenderProps & { value?: number }).value ?? 0;
                return `${name} ${formatCompactCurrency(val, currency)} (${(pct * 100).toFixed(0)}%)`;
              }}
            >
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 8,
                color: "#e2e8f0",
              }}
              itemStyle={{ color: "#e2e8f0" }}
              labelStyle={{ color: "#94a3b8" }}
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              formatter={(value: number | undefined) => [
                formatCurrency(value ?? 0, currency),
                "",
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};
