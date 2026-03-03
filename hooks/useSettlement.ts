"use client";
import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { calculateSettlement } from "@/lib/utils/settlement";
import type { SettlementResult, SettlementEvent } from "@/types";

/**
 * Adjusts settlement result by subtracting already-settled amounts.
 * Each SettlementEvent records a payment from paid_by → paid_to.
 * We compute a net settlement flow and subtract it from the expense-based balance.
 */
const applySettlements = (
  baseResult: SettlementResult,
  settlements: SettlementEvent[],
  groupId: string | undefined
): SettlementResult => {
  if (settlements.length === 0 || baseResult.isSettled) return baseResult;

  // Filter settlements to only include ones for the active group
  const groupSettlements = groupId
    ? settlements.filter((s) => s.group_id === groupId)
    : settlements;

  if (groupSettlements.length === 0) return baseResult;

  // Calculate net settlement flow between the two people
  // Positive = net flow from owedBy → owedTo (reduces the debt)
  let settledAmount = 0;
  for (const s of groupSettlements) {
    if (s.paid_by === baseResult.owedBy && s.paid_to === baseResult.owedTo) {
      settledAmount += s.amount;
    } else if (s.paid_by === baseResult.owedTo && s.paid_to === baseResult.owedBy) {
      settledAmount -= s.amount;
    }
  }

  const newAmount = Math.round((baseResult.amount - settledAmount) * 100) / 100;

  if (Math.abs(newAmount) < 0.01) {
    return {
      netBalance: 0,
      owedBy: null,
      owedTo: null,
      amount: 0,
      isSettled: true,
    };
  }

  // If settled more than owed, direction flips
  if (newAmount < 0) {
    return {
      netBalance: -newAmount,
      owedBy: baseResult.owedTo,
      owedTo: baseResult.owedBy,
      amount: Math.abs(newAmount),
      isSettled: false,
    };
  }

  return {
    ...baseResult,
    netBalance: newAmount,
    amount: newAmount,
  };
};

export const useSettlement = (): SettlementResult => {
  const { expenses, members, user, settlements, activeGroup } = useAppStore();

  return useMemo(() => {
    if (members.length < 2 || !user) {
      return { netBalance: 0, owedBy: null, owedTo: null, amount: 0, isSettled: true };
    }

    const userA = members.find((m) => m.uid === user.uid)!;
    const userB = members.find((m) => m.uid !== user.uid)!;

    if (!userA || !userB) {
      return { netBalance: 0, owedBy: null, owedTo: null, amount: 0, isSettled: true };
    }

    const baseResult = calculateSettlement(expenses, userA, userB);
    return applySettlements(baseResult, settlements, activeGroup?.id);
  }, [expenses, members, user, settlements, activeGroup]);
};
