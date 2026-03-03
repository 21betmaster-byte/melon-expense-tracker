"use client";
import { useEffect } from "react";
import { subscribeToExpenses } from "@/lib/firebase/firestore";
import { useAppStore } from "@/store/useAppStore";

export const useExpenses = () => {
  const { user, activeGroup, setExpenses } = useAppStore();
  const householdId = user?.household_id;

  useEffect(() => {
    if (!householdId || !activeGroup?.id) return;

    const unsubscribe = subscribeToExpenses(
      householdId,
      activeGroup.id,
      (expenses) => {
        setExpenses(expenses);
      }
    );

    return () => unsubscribe();
  }, [householdId, activeGroup?.id, setExpenses]);
};
