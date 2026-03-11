"use client";
import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { deleteExpense } from "@/lib/firebase/firestore";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ExpenseForm } from "./ExpenseForm";
import type { Expense } from "@/types";
import { ChevronDown, ChevronUp, Clock, Pencil, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { EXPENSE_DELETED } from "@/lib/analytics/events";

interface Props {
  expense: Expense;
}

export const ExpenseCard = ({ expense }: Props) => {
  const { categories, members, household, user, removeExpense } = useAppStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const category = categories.find((c) => c.id === expense.category_id);
  const paidBy = members.find((m) => m.uid === expense.paid_by_user_id);
  const createdBy = expense.created_by
    ? members.find((m) => m.uid === expense.created_by)
    : null;
  const householdCurrency = household?.currency ?? "INR";

  // Use per-expense currency if set, otherwise fall back to household currency
  const displayCurrency = expense.currency ?? householdCurrency;
  const showCurrencyBadge = !!expense.currency && expense.currency !== householdCurrency;

  // Show "Added by" only when creator differs from payer and created_by exists
  const showAddedBy =
    !!expense.created_by &&
    expense.created_by !== expense.paid_by_user_id &&
    !!createdBy;

  const typeColorMap: Record<string, string> = {
    joint: "text-blue-400 border-blue-800",
    solo: "text-slate-400 border-slate-700",
    settlement: "text-green-400 border-green-800",
  };
  const typeColor = typeColorMap[expense.expense_type] ?? "";

  const handleDelete = async () => {
    if (!user?.household_id || !expense.id) return;

    setDeleting(true);
    try {
      // Optimistic removal from store
      removeExpense(expense.id);
      setShowDeleteDialog(false);
      toast.success("Expense deleted.");

      // Actual Firestore delete
      await deleteExpense(user.household_id, expense.id);
      trackEvent(EXPENSE_DELETED, { expense_id: expense.id });
    } catch {
      toast.error("Failed to delete expense.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Card
        className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors"
        data-testid="expense-card"
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-medium text-slate-100 truncate">
                  {expense.description || category?.name || "Expense"}
                </p>
                {expense._pending && (
                  <div
                    className="flex items-center gap-1 text-xs text-amber-400"
                    data-testid="pending-indicator"
                  >
                    <Clock className="w-3 h-3" />
                    <span>Pending Sync</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-slate-400">
                  {formatDate(expense.date)}
                </span>
                {category && (
                  <Badge
                    variant="outline"
                    className="text-xs text-slate-400 border-slate-700"
                  >
                    {category.name}
                  </Badge>
                )}
                <Badge
                  variant="outline"
                  className={`text-xs ${typeColor}`}
                >
                  {expense.expense_type}
                </Badge>
                {showCurrencyBadge && (
                  <Badge
                    variant="outline"
                    className="text-xs text-amber-400 border-amber-800"
                    data-testid="expense-currency-badge"
                  >
                    {expense.currency}
                  </Badge>
                )}
                {expense.is_recurring && (
                  <Badge
                    variant="outline"
                    className="text-xs text-purple-400 border-purple-800 gap-1"
                    data-testid="recurring-indicator"
                  >
                    <Repeat className="w-3 h-3" />
                    {expense.recurring_frequency
                      ? expense.recurring_frequency.charAt(0).toUpperCase() + expense.recurring_frequency.slice(1)
                      : "Monthly"}
                  </Badge>
                )}
              </div>
              {paidBy && expense.expense_type === "joint" && (() => {
                const payerPct = Math.round(expense.split_ratio * 100);
                const partnerPct = 100 - payerPct;
                const partner = members.find((m) => m.uid !== expense.paid_by_user_id);
                return (
                  <p className="text-xs text-slate-400 mt-1">
                    {paidBy.name} pays {payerPct}%
                    {partner ? ` · ${partner.name} pays ${partnerPct}%` : ""}
                  </p>
                );
              })()}
              {paidBy && expense.expense_type !== "joint" && (
                <p className="text-xs text-slate-400 mt-1">
                  Paid by {paidBy.name}
                </p>
              )}
              {showAddedBy && (
                <p
                  className="text-xs text-slate-400 mt-0.5"
                  data-testid="expense-added-by"
                >
                  Added by {createdBy!.name}
                </p>
              )}
              {expense.notes && (
                <button
                  type="button"
                  onClick={() => setShowNotes(!showNotes)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 mt-1"
                  data-testid="expense-notes-toggle"
                >
                  {showNotes ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Notes
                </button>
              )}
              {showNotes && expense.notes && (
                <p
                  className="text-xs text-slate-400 mt-1 bg-slate-800 rounded px-2 py-1"
                  data-testid="expense-notes-content"
                >
                  {expense.notes}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <p
                className={`font-semibold text-lg ${
                  expense.amount < 0 ? "text-amber-400" : "text-slate-100"
                }`}
              >
                {expense.amount < 0 ? "-" : ""}
                {formatCurrency(expense.amount, displayCurrency)}
              </p>
              {expense.amount < 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] text-amber-400 border-amber-800"
                >
                  Refund
                </Badge>
              )}
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 min-h-[44px] min-w-[44px] p-0 text-slate-400 hover:text-blue-400"
                  disabled={!!expense._pending}
                  onClick={() => setShowEditDialog(true)}
                  data-testid="edit-expense-btn"
                  aria-label="Edit expense"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-9 min-h-[44px] min-w-[44px] p-0 text-slate-400 hover:text-red-400"
                  disabled={!!expense._pending}
                  onClick={() => setShowDeleteDialog(true)}
                  data-testid="delete-expense-btn"
                  aria-label="Delete expense"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Expense Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-slate-900 border-slate-800 max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-100" data-testid="expense-form-title">
              Edit Expense
            </DialogTitle>
          </DialogHeader>
          <ExpenseForm
            onSuccess={() => setShowEditDialog(false)}
            editExpense={expense}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent data-testid="delete-confirm-dialog" className="bg-slate-900 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-100">
              Delete Expense
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this expense? This action cannot be undone
              and will update the settlement balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="delete-cancel-btn"
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="delete-confirm-btn"
              className="bg-red-600 text-white hover:bg-red-700 destructive"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
