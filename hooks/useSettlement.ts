"use client";
import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { calculateSettlement } from "@/lib/utils/settlement";
import type { SettlementResult } from "@/types";

export const useSettlement = (): SettlementResult => {
  const { expenses, members, user } = useAppStore();

  return useMemo(() => {
    if (members.length < 2 || !user) {
      return { netBalance: 0, owedBy: null, owedTo: null, amount: 0, isSettled: true };
    }

    const userA = members.find((m) => m.uid === user.uid)!;
    const userB = members.find((m) => m.uid !== user.uid)!;

    if (!userA || !userB) {
      return { netBalance: 0, owedBy: null, owedTo: null, amount: 0, isSettled: true };
    }

    // Settlement-type expenses are included in the calculation and reduce the balance.
    // No separate applySettlements layer needed.
    return calculateSettlement(expenses, userA, userB);
  }, [expenses, members, user]);
};
