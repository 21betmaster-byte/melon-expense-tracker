"use client";
import { useState } from "react";
import { useSettlement } from "@/hooks/useSettlement";
import { useAppStore } from "@/store/useAppStore";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { recordSettlement } from "@/lib/firebase/firestore";
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
import { toast } from "sonner";
import { Timestamp } from "firebase/firestore";
import type { SettlementEvent } from "@/types";
import { sendPushNotification } from "@/lib/notifications/sendPushNotification";
import { buildSettlementPayload } from "@/lib/notifications/buildNotificationPayload";

export const SettlementCard = () => {
  const settlement = useSettlement();
  const { members, household, user, settlements, activeGroup, addSettlement } = useAppStore();
  const currency = household?.currency ?? "INR";
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const getDisplayName = (uid: string | null): string => {
    if (!uid) return "";
    const member = members.find((m) => m.uid === uid);
    return member ? (member.uid === user?.uid ? "You" : member.name) : "Partner";
  };

  // Filter settlements for the active group
  const groupSettlements = activeGroup
    ? settlements.filter((s) => s.group_id === activeGroup.id)
    : [];

  const [showAllHistory, setShowAllHistory] = useState(false);

  // Show only last 5 settlement events, or all if expanded
  const recentSettlements = showAllHistory
    ? groupSettlements
    : groupSettlements.slice(0, 5);

  const handleMarkSettled = async () => {
    if (!household || !settlement.owedBy || !settlement.owedTo || !activeGroup) return;

    setIsRecording(true);

    const event: Omit<SettlementEvent, "id"> = {
      amount: settlement.amount,
      paid_by: settlement.owedBy,
      paid_to: settlement.owedTo,
      settled_at: Timestamp.now(),
      group_id: activeGroup.id,
    };

    // Optimistic update: add to store immediately, close dialog, show toast
    const tempId = `temp-${Date.now()}`;
    addSettlement({ ...event, id: tempId });

    toast.success(
      `Settlement of ${formatCurrency(settlement.amount, currency)} recorded`
    );
    setConfirmOpen(false);
    setIsRecording(false);

    // Persist to Firestore in background (may fail if security rules not configured)
    try {
      await recordSettlement(household.id, event);
      // Notify partner about the settlement (fire-and-forget)
      if (user) {
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
      }
    } catch {
      // Firestore write failed (e.g., security rules not yet configured for settlements subcollection).
      // The optimistic update remains in the store for this session.
      console.warn("Failed to persist settlement to Firestore — optimistic update retained");
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
              <p className="font-semibold text-lg">All settled up</p>
              <p className="text-sm text-slate-400">No outstanding balance</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs text-slate-400 mb-2 uppercase tracking-wide">
              Settlement
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
              {recentSettlements.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between text-sm"
                  data-testid="settlement-history-item"
                >
                  <div className="flex items-center gap-2 text-slate-400">
                    <span>{getDisplayName(s.paid_by)}</span>
                    <ArrowRight className="w-3 h-3 text-slate-600" />
                    <span>{getDisplayName(s.paid_to)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-green-400 font-medium">
                      {formatCurrency(s.amount, currency)}
                    </span>
                    <span className="text-xs text-slate-600 ml-2">
                      {formatDate(s.settled_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {groupSettlements.length > 5 && (
              <button
                type="button"
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                data-testid="settlement-show-all-btn"
              >
                {showAllHistory ? "Show less" : `View all (${groupSettlements.length})`}
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
