"use client";
import { useEffect, useState } from "react";
import {
  getExpensesForAnalytics,
  getAllExpensesForAnalytics,
} from "@/lib/firebase/firestore";
import { buildMonthlyTrend, buildCategoryMoM } from "@/lib/utils/analytics";
import { useAppStore } from "@/store/useAppStore";
import type { Expense, MonthlyData, CategoryMonthData } from "@/types";

interface UseAnalyticsOptions {
  groupId: string | "all";
}

export const useAnalytics = ({ groupId }: UseAnalyticsOptions) => {
  const { user, allCategories, members } = useAppStore();
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryMonthData[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.household_id) return;
    if (groupId !== "all" && !groupId) return;

    const load = async () => {
      setLoading(true);
      try {
        const expenses =
          groupId === "all"
            ? await getAllExpensesForAnalytics(user.household_id!)
            : await getExpensesForAnalytics(user.household_id!, groupId);

        setAllExpenses(expenses);

        // Build monthly trend (needs 2 members for per-user breakdown)
        const userA = members.find((m) => m.uid === user.uid);
        const userB = members.find((m) => m.uid !== user.uid);
        setMonthlyData(
          buildMonthlyTrend(
            expenses,
            userA?.uid ?? user.uid,
            userB?.uid ?? ""
          )
        );

        // Use correct categories for the selected group
        const catsForMoM =
          groupId === "all"
            ? allCategories
            : allCategories.filter((c) => c.group_id === groupId);
        setCategoryData(buildCategoryMoM(expenses, catsForMoM));
      } catch (err) {
        console.error("Analytics load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.household_id, groupId, allCategories, members, user]);

  return { monthlyData, categoryData, allExpenses, loading };
};
