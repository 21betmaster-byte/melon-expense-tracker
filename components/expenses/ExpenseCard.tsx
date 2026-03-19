"use client";
import { useState, useRef } from "react";
import { formatCurrency } from "@/lib/utils/format";
import { getCategoryColor, getCategoryIcon } from "@/lib/utils/categoryColors";
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
import { ChevronDown, ChevronUp, Clock, Repeat, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { EXPENSE_DELETED } from "@/lib/analytics/events";
import { motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";

interface Props {
  expense: Expense;
}

const TYPE_COLORS: Record<string, string> = {
  joint: "text-blue-400 border-blue-800",
  solo: "text-slate-400 border-slate-700",
  settlement: "text-green-400 border-green-800",
  paid_for_partner: "text-orange-400 border-orange-800",
};

const TYPE_LABELS: Record<string, string> = {
  joint: "Joint",
  solo: "Solo",
  settlement: "Settlement",
  paid_for_partner: "Paid for Partner",
};

export const ExpenseCard = ({ expense }: Props) => {
  const { categories, members, household, user, removeExpense } = useAppStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const category = categories.find((c) => c.id === expense.category_id);
  const paidBy = members.find((m) => m.uid === expense.paid_by_user_id);
  const householdCurrency = household?.currency ?? "INR";
  const displayCurrency = expense.currency ?? householdCurrency;
  const catName = category?.name ?? "";
  const CategoryIcon = getCategoryIcon(catName);
  const categoryColor = getCategoryColor(catName);
  const typeColor = TYPE_COLORS[expense.expense_type] ?? "";

  // Swipe-to-delete
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-150, -80, 0], [1, 1, 0]);
  const swipeRef = useRef(false);
  const SWIPE_THRESHOLD = 80;
  const AUTO_DELETE_THRESHOLD = 150;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -AUTO_DELETE_THRESHOLD) {
      swipeRef.current = true;
      setShowDeleteDialog(true);
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      // Snap to show delete button
    }
  };

  const handleCardClick = () => {
    if (swipeRef.current) {
      swipeRef.current = false;
      return;
    }
    if (expense._pending) return;
    setShowEditDialog(true);
  };

  const handleDelete = async () => {
    if (!user?.household_id || !expense.id) return;
    setDeleting(true);
    try {
      removeExpense(expense.id);
      setShowDeleteDialog(false);
      toast.success("Expense deleted.");
      await deleteExpense(user.household_id, expense.id);
      trackEvent(EXPENSE_DELETED, { expense_id: expense.id });
    } catch {
      toast.error("Failed to delete expense.");
    } finally {
      setDeleting(false);
    }
  };

  // Settlement display: show payer → payee
  const settlementLabel = (() => {
    if (expense.expense_type !== "settlement") return null;
    const isCurrentUser = paidBy?.uid === user?.uid;
    const otherMember = members.find((m) => m.uid !== expense.paid_by_user_id);
    const payerName = isCurrentUser ? "You" : (paidBy?.name ?? "Partner");
    const payeeName = isCurrentUser ? (otherMember?.name ?? "Partner") : "You";
    return `${payerName} → ${payeeName}`;
  })();

  return (
    <>
      <div className="relative overflow-hidden rounded-lg">
        {/* Delete button behind the card (swipe reveals) */}
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600 px-6"
          style={{ opacity: deleteOpacity }}
        >
          <Trash2 className="w-5 h-5 text-white" />
        </motion.div>

        <motion.div
          drag="x"
          dragConstraints={{ left: -150, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="relative"
        >
          <Card
            className="bg-slate-900 border-slate-800 cursor-pointer hover:bg-slate-800/50 transition-colors py-0 gap-0"
            data-testid="expense-card"
            onClick={handleCardClick}
          >
            <CardContent className="px-3 py-2">
              <div className="flex items-center gap-3">
                {/* Category icon */}
                <div className={`shrink-0 rounded-lg bg-slate-800 p-1.5 ${categoryColor.text}`}>
                  <CategoryIcon className="w-4 h-4" />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {/* Row 1: Description + Amount */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <p className="font-medium text-slate-100 truncate text-sm">
                        {settlementLabel ?? (expense.description || category?.name || "Expense")}
                      </p>
                      {expense._pending && (
                        <Clock
                          className="w-3 h-3 text-amber-400 shrink-0"
                          data-testid="pending-indicator"
                        />
                      )}
                    </div>
                    <p
                      className={`font-semibold text-base shrink-0 ${
                        expense.amount < 0 ? "text-amber-400" : "text-white"
                      }`}
                    >
                      {expense.amount < 0 ? "-" : ""}
                      {formatCurrency(expense.amount, displayCurrency)}
                    </p>
                  </div>

                  {/* Row 2: Metadata badges */}
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {category && (
                      <span className={`text-[11px] ${categoryColor.text}`}>
                        {category.name}
                      </span>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[11px] py-0 px-1.5 ${typeColor}`}
                    >
                      {TYPE_LABELS[expense.expense_type] ?? expense.expense_type}
                    </Badge>
                    {expense.is_recurring && (
                      <Repeat
                        className="w-3 h-3 text-purple-400"
                        data-testid="recurring-indicator"
                      />
                    )}
                    {expense.amount < 0 && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-400 border-amber-800 py-0 px-1"
                      >
                        Refund
                      </Badge>
                    )}
                    {expense.notes && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowNotes(!showNotes);
                        }}
                        className="flex items-center gap-0.5 text-[11px] text-slate-500 hover:text-slate-400"
                        data-testid="expense-notes-toggle"
                      >
                        Notes
                        {showNotes ? (
                          <ChevronUp className="w-2.5 h-2.5" />
                        ) : (
                          <ChevronDown className="w-2.5 h-2.5" />
                        )}
                      </button>
                    )}
                    {/* Desktop delete on hover */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-slate-600 hover:text-red-400 ml-auto hidden sm:flex opacity-0 group-hover:opacity-100 transition-opacity"
                      disabled={!!expense._pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteDialog(true);
                      }}
                      data-testid="delete-expense-btn"
                      aria-label="Delete expense"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Collapsible notes */}
                  {showNotes && expense.notes && (
                    <p
                      className="text-[11px] text-slate-400 mt-1.5 bg-slate-800 rounded px-2 py-1"
                      data-testid="expense-notes-content"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {expense.notes}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

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
