import type { Expense, SettlementResult, User } from "@/types";

/**
 * Calculates settlement based on the active expense group.
 *
 * Formula:
 * Net Balance (A) = Σ(Joint paid by A × partner's split ratio)
 *                 - Σ(Joint paid by B × A's split ratio)
 *
 * Where split_ratio is the PAYER'S share of the expense.
 * Partner's share = 1 - split_ratio.
 *
 * Positive net = B owes A
 * Negative net = A owes B
 *
 * Settlement-type expenses are included (they reduce the balance).
 */
export const calculateSettlement = (
  expenses: Expense[],
  userA: User,
  userB: User
): SettlementResult => {
  let netBalanceA = 0;

  for (const expense of expenses) {
    if (expense.expense_type === "solo") continue;

    const amount = Math.abs(expense.amount);
    const isRefund = expense.amount < 0;
    const sign = isRefund ? -1 : 1;

    if (expense.paid_by_user_id === userA.uid) {
      // A paid → partner (B) owes A their share = (1 - split_ratio) × amount
      netBalanceA += sign * amount * (1 - expense.split_ratio);
    } else if (expense.paid_by_user_id === userB.uid) {
      // B paid → A owes B their share = split_ratio × amount
      // (split_ratio here is the payer B's share, so A's share = 1 - split_ratio)
      netBalanceA -= sign * amount * (1 - expense.split_ratio);
    }
  }

  // Round to 2 decimal places to prevent floating-point drift
  netBalanceA = Math.round(netBalanceA * 100) / 100;

  if (Math.abs(netBalanceA) < 0.01) {
    return {
      netBalance: 0,
      owedBy: null,
      owedTo: null,
      amount: 0,
      isSettled: true,
    };
  }

  if (netBalanceA > 0) {
    return {
      netBalance: netBalanceA,
      owedBy: userB.uid,
      owedTo: userA.uid,
      amount: netBalanceA,
      isSettled: false,
    };
  } else {
    return {
      netBalance: netBalanceA,
      owedBy: userA.uid,
      owedTo: userB.uid,
      amount: Math.abs(netBalanceA),
      isSettled: false,
    };
  }
};
