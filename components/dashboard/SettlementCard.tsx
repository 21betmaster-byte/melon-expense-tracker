"use client";
import { useState } from "react";
import { useSettlement } from "@/hooks/useSettlement";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { addExpense } from "@/lib/firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle, ArrowRight, Handshake, History } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { SETTLEMENT_VIEWED, SETTLED_UP } from "@/lib/analytics/events";
import { Timestamp } from "firebase/firestore";
import type { Expense } from "@/types";
import { sendPushNotification } from "@/lib/notifications/sendPushNotification";
import { buildSettlementPayload } from "@/lib/notifications/buildNotificationPayload";

export const SettlementCard = () => {
  const settlement = useSettlement();
  const { members, household, user, expenses, activeGroup, addPendingExpense, resolvePendingExpense } = useAppStore();
  const currency = household?.currency ?? "INR";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const getDisplayName = (uid: string | null): string => {
    if (!uid) return "";
    const member = members.find((m) => m.uid === uid);
    return member ? (member.uid === user?.uid ? "You" : member.name) : "Partner";
  };

  // Settlement history: show settlement-type expenses for the active group
  const settlementExpenses = activeGroup
    ? expenses.filter((e) => e.expense_type === "settlement")
    : [];

  const [showAllHistory, setShowAllHistory] = useState(false);

  const recentSettlements = showAllHistory
    ? settlementExpenses
    : settlementExpenses.slice(0, 5);

  const handleMarkSettled = async () => {
    if (!household || !user || !settlement.owedBy || !settlement.owedTo || !activeGroup) return;

    setIsRecording(true);

    const now = Timestamp.now();
    const localId = `local-${Date.now()}`;

    // Build settlement as a real expense (split_ratio 0 = payer covers 0%, full amount reduces debt)
    const expenseData: Omit<Expense, "id" | "_pending" | "_local_id"> = {
      amount: settlement.amount,
      description: "Settlement",
      group_id: activeGroup.id,
      category_id: "",
      expense_type: "settlement",
      paid_by_user_id: settlement.owedBy,
      split_ratio: 0,
      date: now,
      source: "manual",
      created_by: user.uid,
    };

    // Optimistic update: add pending expense to store immediately
    addPendingExpense({
      ...expenseData,
      id: localId,
      _pending: true,
      _local_id: localId,
    });

    toast.success(
      `Settlement of ${formatCurrency(settlement.amount, currency)} recorded`
    );
    setConfirmOpen(false);
    setIsRecording(false);

    // Persist to Firestore
    try {
      const realId = await addExpense(household.id, expenseData);
      resolvePendingExpense(localId, realId);
      trackEvent(SETTLED_UP, { amount: settlement.amount, currency });

      // Notify partner about the settlement (fire-and-forget)
      sendPushNotification({
        householdId: household.id,
        senderUid: user.uid,
        type: "settlement_recorded",
        ...buildSettlementPayload({
          senderName: user.name,
          amount: settlement.amount,
          currency,
        }),
      });
    } catch (err) {
      console.error("Failed to persist settlement expense:", err);
      toast.error("Settlement failed to save. Please try again.");
    }
  };

  return (
    <Card
      className="bg-slate-900 border-slate-800"
      data-testid="settlement-card"
    >
      <CardContent className="p-5">
        {settlement.isSettled ? (
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle className="w-8 h-8" />
            <div>
              <p className="font-semibold text-lg inline-flex items-center gap-1">
                All settled up
                <InfoTooltip text="Shows the net amount one partner owes the other across all expenses in this group. Settle up by adding a Settlement type expense." />
              </p>
              <p className="text-sm text-slate-400">No outstanding balance</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide inline-flex items-center gap-1">
              Settlement
              <InfoTooltip text="Shows the net amount one partner owes the other across all expenses in this group. Settle up by adding a Settlement type expense." />
            </p>
            <div className="flex items-center gap-3">
              <span className="font-medium text-slate-300">
                {getDisplayName(settlement.owedBy)}
              </span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-300">
                {getDisplayName(settlement.owedTo)}
              </span>
            </div>
            <p
              className="text-3xl font-bold text-blue-400 mt-2"
              data-testid="settlement-amount"
            >
              {formatCurrency(settlement.amount, currency)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {getDisplayName(settlement.owedBy)} owes{" "}
              {getDisplayName(settlement.owedTo)}
            </p>

            {/* Mark as Settled button */}
            <Button
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5 border-slate-700 text-slate-300 hover:bg-slate-800"
              data-testid="mark-settled-btn"
              onClick={() => setConfirmOpen(true)}
            >
              <Handshake className="w-4 h-4" />
              Mark as Settled
            </Button>
          </div>
        )}

        {/* Settlement History */}
        {recentSettlements.length > 0 && (
          <div
            className="mt-4 pt-4 border-t border-slate-800"
            data-testid="settlement-history-list"
          >
            <div className="flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-slate-500" />
              <p className="text-xs text-slate-400 uppercase tracking-wide">
                Settlement History
              </p>
            </div>
            <div
              className={`space-y-2 ${showAllHistory ? "max-h-[300px] overflow-y-auto" : ""}`}
            >
              {recentSettlements.map((s) => {
                const paidByName = getDisplayName(s.paid_by_user_id);
                const paidToName = getDisplayName(
                  members.find((m) => m.uid !== s.paid_by_user_id)?.uid ?? null
                );
                return (
                  <div
                    key={s.id}
                    className="flex items-center justify-between text-sm"
                    data-testid="settlement-history-item"
                  >
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>{paidByName}</span>
                      <ArrowRight className="w-3 h-3 text-slate-600" />
                      <span>{paidToName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-green-400 font-medium">
                        {formatCurrency(s.amount, currency)}
                      </span>
                      <span className="text-xs text-slate-600 ml-2">
                        {formatDate(s.date)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
            {settlementExpenses.length > 5 && (
              <button
                type="button"
                onClick={() => {
                  if (!showAllHistory) trackEvent(SETTLEMENT_VIEWED, { count: settlementExpenses.length });
                  setShowAllHistory(!showAllHistory);
                }}
                className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                data-testid="settlement-show-all-btn"
              >
                {showAllHistory ? "Show less" : `View all (${settlementExpenses.length})`}
              </button>
            )}
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          className="bg-slate-900 border-slate-800"
          data-testid="settle-confirm-dialog"
        >
          <DialogHeader>
            <DialogTitle className="text-slate-100">Confirm Settlement</DialogTitle>
            <DialogDescription className="text-slate-400">
              Record that {getDisplayName(settlement.owedBy)} paid{" "}
              {getDisplayName(settlement.owedTo)}{" "}
              <span className="font-semibold text-blue-400">
                {formatCurrency(settlement.amount, currency)}
              </span>
              ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="border-slate-700 text-slate-300"
              onClick={() => setConfirmOpen(false)}
              data-testid="settle-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkSettled}
              disabled={isRecording}
              data-testid="settle-confirm-btn"
            >
              {isRecording ? "Recording..." : "Confirm Settlement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
