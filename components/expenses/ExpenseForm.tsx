"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Timestamp } from "firebase/firestore";
import { safeToDate } from "@/lib/utils/format";
import { addExpense, learnKeyword, addCategory, updateExpense, saveCategoryMemory } from "@/lib/firebase/firestore";
import { autoCategory, memoryCategory } from "@/lib/utils/categorization";
import { sanitizeText } from "@/lib/utils/sanitize";
import { useAppStore } from "@/store/useAppStore";
import { nanoid } from "nanoid";
import { incrementEvent } from "@/lib/milestones/tracker";
import { trackEvent } from "@/lib/analytics";
import {
  EXPENSE_CREATED,
  EXPENSE_UPDATED,
  EXPENSE_FORM_OPENED,
  EXPENSE_FORM_STAGE2_REACHED,
  EXPENSE_FORM_VALIDATION_ERROR,
  EXPENSE_FORM_FIELD_EDITED,
  EXPENSE_FORM_SAVE_FAILED,
} from "@/lib/analytics/events";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Check, Repeat, Loader2, CalendarClock } from "lucide-react";
import type { Expense, ExpenseType } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PillSelect, type PillOption } from "@/components/ui/pill-select";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { sendPushNotification } from "@/lib/notifications/sendPushNotification";
import {
  buildExpenseCreatedPayload,
  buildExpenseUpdatedPayload,
} from "@/lib/notifications/buildNotificationPayload";

const SUPPORTED_CURRENCIES = [
  "INR", "USD", "EUR", "GBP", "AED", "SGD", "CAD", "AUD",
] as const;

const formSchema = z.object({
  amount: z.string().min(1, "Amount is required"),
  description: z.string().min(1, "Description is required").max(100, "Max 100 characters"),
  expense_type: z.enum(["solo", "joint", "settlement", "paid_for_partner"]),
  paid_by_user_id: z.string().min(1, "Payer is required"),
  split_pct: z.number().min(0).max(100), // payer's share in %
  category_id: z.string().min(1, "Category is required"),
  date: z.string(),
  currency_override: z.string(),
  notes: z.string().max(200, "Max 200 characters").optional(),
  is_recurring: z.boolean().optional(),
  recurring_frequency: z.enum(["daily", "weekly", "monthly", "yearly"]).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Props {
  onSuccess?: () => void;
  editExpense?: Expense;
  initialValues?: Partial<FormValues>;
}

export const ExpenseForm = ({ onSuccess, editExpense, initialValues }: Props) => {
  const {
    user,
    household,
    members,
    categories,
    activeGroup,
    categoryMemory,
    expenses: storeExpenses,
    addPendingExpense,
    resolvePendingExpense,
    updateExpenseInStore,
    addCategoryToStore,
    setCategoryMemory,
  } = useAppStore();

  const isEditMode = !!editExpense;

  // ─── Progressive Disclosure State ─────────────────────────────────────
  // Edit mode always starts at Stage 2; create mode starts at Stage 1
  const [stage, setStage] = useState<1 | 2>(isEditMode ? 2 : 1);
  const [transitioning, setTransitioning] = useState(false);
  const [stage2Visible, setStage2Visible] = useState(isEditMode);
  const formOpenTracked = useRef(false);

  // Track form open once
  useEffect(() => {
    if (!formOpenTracked.current) {
      formOpenTracked.current = true;
      if (!isEditMode) {
        trackEvent(EXPENSE_FORM_OPENED, {
          source: window.location.pathname.includes("dashboard") ? "dashboard" : "expenses_page",
          has_template: !!initialValues,
        });
      }
    }
  }, [isEditMode, initialValues]);

  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null);
  const [categorySource, setCategorySource] = useState<"memory" | "auto" | "manual" | null>(null);

  // Stage 1 validation error state (separate from form-level errors for progressive disclosure)
  const [stage1Errors, setStage1Errors] = useState<{ amount?: string; description?: string }>({});

  // Inline category creation state
  const [showInlineCategory, setShowInlineCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [pendingCategorySelect, setPendingCategorySelect] = useState<string | null>(null);

  // Track if user manually changed category (to save memory mapping on submit)
  const userManuallyChangedCategory = useRef(false);

  const currency = household?.currency ?? "INR";
  const currencySymbol = currency === "INR" ? "₹" : currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;

  // Build memory lookup map: normalized description → category_id
  const memoryMap = (() => {
    const map: Record<string, string> = {};
    for (const m of categoryMemory) {
      map[m.description] = m.category_id;
    }
    return map;
  })();

  // Build default values — either from editExpense or fresh defaults
  const getDefaultValues = (): FormValues => {
    if (editExpense) {
      const expenseDate = editExpense.date
        ? safeToDate(editExpense.date).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      return {
        amount: String(editExpense.amount),
        description: editExpense.description ?? "",
        expense_type: editExpense.expense_type,
        paid_by_user_id: editExpense.paid_by_user_id,
        split_pct: Math.round(editExpense.split_ratio * 100),
        category_id: editExpense.category_id,
        date: expenseDate,
        currency_override: editExpense.currency ?? currency,
        notes: editExpense.notes ?? "",
        is_recurring: editExpense.is_recurring ?? false,
        recurring_frequency: editExpense.recurring_frequency ?? "monthly",
      };
    }
    const defaultSplit = household?.default_split_ratio != null
      ? Math.round(household.default_split_ratio * 100)
      : 50;
    return {
      amount: "",
      description: "",
      expense_type: "joint",
      paid_by_user_id: user?.uid ?? "",
      split_pct: defaultSplit,
      category_id: "",
      date: new Date().toISOString().split("T")[0],
      currency_override: currency,
      notes: "",
      is_recurring: false,
      recurring_frequency: "monthly",
    };
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(),
  });

  const descriptionValue = form.watch("description");
  const amountValue = form.watch("amount");
  const expenseType = form.watch("expense_type");
  const isRecurring = form.watch("is_recurring");
  const recurringFrequency = form.watch("recurring_frequency");
  const paidByUserId = form.watch("paid_by_user_id");
  const splitPct = form.watch("split_pct");
  const categoryIdValue = form.watch("category_id");
  const dateValue = form.watch("date");

  // When "Paid for Partner" is selected, auto-set split to 0%
  useEffect(() => {
    if (expenseType === "paid_for_partner") {
      form.setValue("split_pct", 0);
    }
  }, [expenseType, form]);

  // Apply initial values from template selection (only in create mode)
  useEffect(() => {
    if (isEditMode || !initialValues) return;
    form.reset({
      ...getDefaultValues(),
      ...initialValues,
    });
    // Auto-advance to Stage 2 if template fills both amount and description
    if (initialValues.amount && initialValues.description) {
      setStage(2);
      setStage2Visible(true);
      trackEvent(EXPENSE_FORM_STAGE2_REACHED, { trigger: "template" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

  // Clear stage 1 validation errors when user types
  useEffect(() => {
    if (stage1Errors.amount && amountValue) {
      setStage1Errors((prev) => ({ ...prev, amount: undefined }));
    }
  }, [amountValue, stage1Errors.amount]);

  useEffect(() => {
    if (stage1Errors.description && descriptionValue) {
      setStage1Errors((prev) => ({ ...prev, description: undefined }));
    }
  }, [descriptionValue, stage1Errors.description]);

  // Debounce description value for auto-categorization (300ms)
  const [debouncedDesc, setDebouncedDesc] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDesc(descriptionValue), 300);
    return () => clearTimeout(timer);
  }, [descriptionValue]);

  // Auto-categorize when debounced description changes (only in create mode)
  // Priority: (1) memory match, (2) keyword match, (3) leave blank
  useEffect(() => {
    if (isEditMode) return; // Don't auto-categorize in edit mode
    if (pendingCategorySelect) return; // Don't overwrite pending new category
    if (userManuallyChangedCategory.current) return; // Don't overwrite manual selection
    if (debouncedDesc.length > 2) {
      // First check memory
      const memoryCatId = memoryCategory(debouncedDesc, memoryMap);
      if (memoryCatId) {
        // Verify the category still exists
        const catExists = categories.some((c) => c.id === memoryCatId);
        if (catExists) {
          setSuggestedCategoryId(memoryCatId);
          setCategorySource("memory");
          form.setValue("category_id", memoryCatId);
          return;
        }
      }

      // Fall back to keyword matching
      const catId = autoCategory(debouncedDesc, categories);
      if (catId) {
        setSuggestedCategoryId(catId);
        setCategorySource("auto");
        form.setValue("category_id", catId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDesc, categories, isEditMode, pendingCategorySelect]);

  // Auto-select newly created category after store update
  useEffect(() => {
    if (pendingCategorySelect && categories.some((c) => c.id === pendingCategorySelect)) {
      form.setValue("category_id", pendingCategorySelect, { shouldValidate: true, shouldDirty: true });
      setPendingCategorySelect(null);
    }
  }, [pendingCategorySelect, categories, form]);

  // Helper: get display name for a uid
  const getName = (uid: string) => {
    const m = members.find((m) => m.uid === uid);
    if (!m) return "Partner";
    return m.uid === user?.uid ? "You" : m.name;
  };

  // The other member (partner)
  const partner = members.find((m) => m.uid !== user?.uid);

  // Category frequency: sort by usage count in current group
  const sortedCategoryPills = useMemo((): PillOption[] => {
    const freq: Record<string, number> = {};
    for (const exp of storeExpenses) {
      if (exp.category_id) {
        freq[exp.category_id] = (freq[exp.category_id] || 0) + 1;
      }
    }
    const sorted = [...categories].sort(
      (a, b) => (freq[b.id] || 0) - (freq[a.id] || 0)
    );
    return sorted.map((c) => ({ value: c.id, label: c.name }));
  }, [categories, storeExpenses]);

  // Type pills
  const typePills: PillOption[] = useMemo(() => [
    { value: "joint", label: "Joint" },
    { value: "solo", label: "Solo" },
    { value: "settlement", label: "Settlement" },
    { value: "paid_for_partner", label: "Paid for Partner" },
  ], []);

  // Paid By pills
  const paidByPills: PillOption[] = useMemo(() =>
    members.map((m) => ({
      value: m.uid,
      label: m.uid === user?.uid ? `${m.name} (You)` : m.name,
    })),
    [members, user?.uid]
  );

  // Split label: "Shivam pays 70% · Jhanvi pays 30%"
  const splitLabel = (() => {
    if (expenseType !== "joint") return null;
    const payerName = getName(paidByUserId);
    const partnerName = partner ? getName(partner.uid) : "Partner";
    const payerPct = splitPct;
    const partnerPct = 100 - splitPct;
    return `${payerName} covers ${payerPct}% · ${partnerName} covers ${partnerPct}%`;
  })();

  // ─── Stage 1 → Stage 2 Transition ──────────────────────────────────────
  const advanceToStage2 = useCallback(() => {
    const currentAmount = form.getValues("amount");
    const currentDesc = form.getValues("description");
    const errors: { amount?: string; description?: string } = {};

    if (!currentAmount || currentAmount.trim() === "") {
      errors.amount = "Amount is required";
    }
    if (!currentDesc || currentDesc.trim() === "") {
      errors.description = "Description is required";
    }

    if (errors.amount || errors.description) {
      setStage1Errors(errors);
      const errorFields = [errors.amount && "amount", errors.description && "description"].filter(Boolean).join(",");
      trackEvent(EXPENSE_FORM_VALIDATION_ERROR, { fields: errorFields });
      return;
    }

    setStage1Errors({});
    setTransitioning(true);
    trackEvent(EXPENSE_FORM_STAGE2_REACHED, { trigger: "enter_key" });

    // Brief loader then reveal fields
    setTimeout(() => {
      setStage(2);
      setTransitioning(false);
      // Trigger animation after a frame
      requestAnimationFrame(() => {
        setStage2Visible(true);
      });
    }, 400);
  }, [form]);

  // Handle Enter key in Stage 1 — validate and transition instead of submitting
  const handleStage1KeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (stage === 1 && e.key === "Enter") {
        e.preventDefault();
        advanceToStage2();
      }
    },
    [stage, advanceToStage2]
  );

  // Handle blur on Amount — format and maybe advance
  const handleAmountBlur = useCallback(() => {
    if (stage !== 1 || transitioning) return;
    const raw = form.getValues("amount");
    if (raw && raw.trim() !== "") {
      const num = parseFloat(raw);
      if (!isNaN(num) && num > 0) {
        form.setValue("amount", num.toFixed(2));
      }
      const desc = form.getValues("description");
      if (desc && desc.trim() !== "") {
        advanceToStage2();
      }
    }
  }, [stage, transitioning, form, advanceToStage2]);

  // Handle blur on Description — trim and maybe advance
  const handleDescriptionBlur = useCallback(() => {
    if (stage !== 1 || transitioning) return;
    const desc = form.getValues("description");
    if (desc && desc.trim() !== "") {
      form.setValue("description", desc.trim());
      const amount = form.getValues("amount");
      if (amount && amount.trim() !== "" && parseFloat(amount) > 0) {
        advanceToStage2();
      }
    }
  }, [stage, transitioning, form, advanceToStage2]);

  // Inline category creation handler
  const handleCreateCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || !user?.household_id) return;

    // Duplicate check (case-insensitive)
    const duplicate = categories.some(
      (c) => c.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      toast.error("A category with that name already exists.");
      return;
    }

    setCreatingCategory(true);
    try {
      const newId = await addCategory(user.household_id, trimmed, activeGroup?.id);
      const newCategory = { id: newId, name: trimmed, keywords: [], group_id: activeGroup?.id };
      setPendingCategorySelect(newId);
      addCategoryToStore(newCategory);
      setShowInlineCategory(false);
      setNewCategoryName("");
      toast.success(`Category "${trimmed}" created!`);
    } catch {
      toast.error("Failed to create category.");
    } finally {
      setCreatingCategory(false);
    }
  };

  // Track manual category changes
  const handleCategoryChange = (newCategoryId: string) => {
    form.setValue("category_id", newCategoryId, { shouldValidate: true });
    trackEvent(EXPENSE_FORM_FIELD_EDITED, { field_name: "category" });
    // If user changed category away from the suggested one, mark as manual
    if (newCategoryId !== suggestedCategoryId) {
      userManuallyChangedCategory.current = true;
      setCategorySource("manual");
    }
  };

  const { householdLoading } = useAppStore();

  const onSubmit = async (values: FormValues) => {
    if (!user?.household_id) {
      toast.error("Still loading your data. Please wait a moment.");
      return;
    }
    if (!activeGroup) {
      toast.error("No active expense group selected. Please go to Settings to create one.");
      return;
    }

    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount === 0) {
      form.setError("amount", { message: "Amount must be a valid non-zero number" });
      return;
    }
    if (Math.abs(amount) > 99_999_999) {
      form.setError("amount", { message: "Amount cannot exceed 9,99,99,999" });
      return;
    }

    const selectedDate = new Date(values.date);
    if (selectedDate > new Date()) {
      form.setError("date", { message: "Date cannot be in the future" });
      return;
    }

    // Convert % → ratio (0–1) stored in Firestore
    const split_ratio = values.split_pct / 100;
    const sanitizedDesc = sanitizeText(values.description);
    const sanitizedNotes = values.notes ? sanitizeText(values.notes) : undefined;

    // Only include currency if it differs from household default
    const expenseCurrency = values.currency_override !== currency
      ? values.currency_override
      : undefined;

    // ─── Edit Mode ──────────────────────────────────────────────────────
    if (isEditMode && editExpense?.id) {
      const updatedData: Partial<Omit<Expense, "id" | "_pending" | "_local_id">> = {
        amount,
        description: sanitizedDesc,
        category_id: values.category_id,
        expense_type: values.expense_type as ExpenseType,
        paid_by_user_id: values.paid_by_user_id,
        split_ratio,
        date: Timestamp.fromDate(selectedDate),
        ...(expenseCurrency ? { currency: expenseCurrency } : {}),
        ...(sanitizedNotes !== undefined ? { notes: sanitizedNotes } : {}),
        is_recurring: values.is_recurring ?? false,
        recurring_frequency: values.recurring_frequency ?? "monthly",
      };

      // Optimistic update in store
      updateExpenseInStore(editExpense.id, updatedData);
      onSuccess?.();
      toast.success("Expense updated.");
      trackEvent(EXPENSE_UPDATED, {
        expense_id: editExpense.id,
        fields_changed: Object.keys(updatedData).join(","),
      });

      try {
        await updateExpense(user.household_id, editExpense.id, updatedData);
        // Notify partner about the edit (fire-and-forget)
        sendPushNotification({
          householdId: user.household_id,
          senderUid: user.uid,
          type: "expense_updated",
          ...buildExpenseUpdatedPayload({
            senderName: user.name,
            description: sanitizedDesc,
            amount,
            currency: expenseCurrency ?? currency,
            expenseType: values.expense_type as ExpenseType,
            splitRatio: split_ratio,
          }),
        });
      } catch {
        toast.error("Failed to update expense.");
      }
      return;
    }

    // ─── Create Mode ────────────────────────────────────────────────────
    const localId = nanoid();

    const expenseData = {
      amount,
      description: sanitizedDesc,
      group_id: activeGroup.id,
      category_id: values.category_id,
      expense_type: values.expense_type as ExpenseType,
      paid_by_user_id: values.paid_by_user_id,
      split_ratio,
      date: Timestamp.fromDate(selectedDate),
      source: "manual" as const,
      created_by: user.uid, // required by security rules
      ...(expenseCurrency ? { currency: expenseCurrency } : {}),
      ...(sanitizedNotes ? { notes: sanitizedNotes } : {}),
      ...(values.is_recurring ? {
        is_recurring: true,
        recurring_frequency: values.recurring_frequency ?? "monthly",
        recurrence_day: selectedDate.getDate(),
      } : {}),
    };

    // Optimistic UI
    addPendingExpense({
      ...expenseData,
      _pending: true,
      _local_id: localId,
    });

    // Always save category memory when creating an expense with a description + category.
    // This ensures memory is built up over time regardless of whether auto-detect matched.
    const shouldSaveMemory = sanitizedDesc.length > 0 && !!values.category_id;
    const memoryCatId = values.category_id;

    onSuccess?.();
    const resetSplit = household?.default_split_ratio != null
      ? Math.round(household.default_split_ratio * 100)
      : 50;
    form.reset({
      amount: "",
      description: "",
      expense_type: "joint",
      paid_by_user_id: user?.uid ?? "",
      split_pct: resetSplit,
      category_id: "",
      date: new Date().toISOString().split("T")[0],
      currency_override: currency,
      notes: "",
      is_recurring: false,
      recurring_frequency: "monthly",
    });
    // Reset progressive disclosure state
    setStage(1);
    setStage2Visible(false);
    setSuggestedCategoryId(null);
    setCategorySource(null);
    userManuallyChangedCategory.current = false;

    try {

      if (shouldSaveMemory) {
        await saveCategoryMemory(
          user.household_id,
          sanitizedDesc,
          memoryCatId
        );
        // Update local memory store
        const normalized = sanitizedDesc.toLowerCase().trim();
        const existingIdx = categoryMemory.findIndex((m) => m.description === normalized);
        if (existingIdx >= 0) {
          const updated = [...categoryMemory];
          updated[existingIdx] = { ...updated[existingIdx], category_id: memoryCatId };
          setCategoryMemory(updated);
        } else {
          setCategoryMemory([...categoryMemory, { id: "", description: normalized, category_id: memoryCatId }]);
        }
      }

      // Learn keyword for manual category selection (skip if description is empty)
      if (!suggestedCategoryId && memoryCatId && sanitizedDesc.length > 0) {
        await learnKeyword(
          user.household_id,
          values.category_id,
          sanitizedDesc.toLowerCase()
        );
      }

      const realId = await addExpense(user.household_id, expenseData);
      resolvePendingExpense(localId, realId);
      incrementEvent("expense_count");
      trackEvent(EXPENSE_CREATED, {
        amount,
        currency: expenseCurrency ?? currency,
        category_id: values.category_id,
        group_id: activeGroup.id,
        split_type: values.expense_type,
      });
      // Notify partner about the new expense (fire-and-forget)
      sendPushNotification({
        householdId: user.household_id,
        senderUid: user.uid,
        type: "expense_created",
        ...buildExpenseCreatedPayload({
          senderName: user.name,
          description: sanitizedDesc,
          amount,
          currency: expenseCurrency ?? currency,
          expenseType: values.expense_type as ExpenseType,
          splitRatio: split_ratio,
        }),
      });
    } catch {
      trackEvent(EXPENSE_FORM_SAVE_FAILED, {});
      toast.error("Failed to save expense. It will sync when you're back online.");
    }
  };

  // Prevent form submission in Stage 1 (Enter key advances to Stage 2 instead)
  const handleFormSubmit = (e: React.FormEvent) => {
    if (stage === 1) {
      e.preventDefault();
      advanceToStage2();
      return;
    }
    form.handleSubmit(onSubmit)(e);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={handleFormSubmit}
        className="space-y-3"
        data-testid="expense-form"
        data-stage={stage}
      >
        {/* ─── Stage 1: Amount + Description ─────────────────────────── */}

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                    Amount ({currencySymbol})
                    <InfoTooltip text="Enter the total amount spent. This is the full expense amount before any split." />
                  </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  data-testid="amount-input"
                  onKeyDown={handleStage1KeyDown}
                  onBlur={(e) => { field.onBlur(); handleAmountBlur(); }}
                  autoFocus={!isEditMode}
                />
              </FormControl>
              {stage1Errors.amount && (
                <p className="text-sm font-medium text-destructive" data-testid="amount-error">
                  {stage1Errors.amount}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1.5">
                    Description
                    <InfoTooltip text="A short description helps you identify this expense later. It's also used for auto-categorization of future expenses." />
                  </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. Swiggy dinner"
                  maxLength={100}
                  data-testid="description-input"
                  onKeyDown={handleStage1KeyDown}
                  onBlur={(e) => { field.onBlur(); handleDescriptionBlur(); }}
                />
              </FormControl>
              <p className="text-xs text-slate-400 mt-1">Helps with auto-categorization next time</p>
              {stage1Errors.description && (
                <p className="text-sm font-medium text-destructive" data-testid="description-error">
                  {stage1Errors.description}
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Stage 1 hint */}
        {stage === 1 && !transitioning && (
          <p className="text-xs text-slate-500 text-center" data-testid="stage1-hint">
            Press Enter or tap outside to continue
          </p>
        )}

        {/* ─── Transition Loader ──────────────────────────────────────── */}
        {transitioning && (
          <div className="flex justify-center py-4" data-testid="stage-transition-loader">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        )}

        {/* ─── Stage 2: Remaining Fields (animated reveal) ───────────── */}
        {stage === 2 && (
          <div
            className={`space-y-3 transition-all duration-300 ease-out ${
              stage2Visible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-4"
            }`}
            data-testid="stage2-fields"
          >
            {/* Expense Type — pills */}
            <FormField
              control={form.control}
              name="expense_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    Type
                    <InfoTooltip text="Joint: Shared between you and your partner (split based on ratio). Solo: Only for you, not shared. Settlement: A payment to settle what's owed. Paid for Partner: You paid but your partner owes the full amount." />
                  </FormLabel>
                  <PillSelect
                    options={typePills}
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v as string);
                      trackEvent(EXPENSE_FORM_FIELD_EDITED, { field_name: "expense_type" });
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Paid By — pills */}
            <FormField
              control={form.control}
              name="paid_by_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    Paid By
                    <InfoTooltip text="Who actually paid for this expense? This affects the settlement calculation." />
                  </FormLabel>
                  <PillSelect
                    options={paidByPills}
                    value={field.value}
                    onChange={(v) => {
                      field.onChange(v as string);
                      trackEvent(EXPENSE_FORM_FIELD_EDITED, { field_name: "paid_by" });
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Split % slider — only for joint expenses (hidden for paid_for_partner) */}
            {expenseType === "joint" && (
              <FormField
                control={form.control}
                name="split_pct"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel className="flex items-center gap-1.5">
                        Payer&apos;s Share
                        <InfoTooltip text="Drag to set how this expense is split. Example: 70% means the payer covers 70% and the partner covers 30%." />
                      </FormLabel>
                      <span className="text-blue-400 font-semibold text-sm">
                        {field.value}%
                      </span>
                    </div>
                    <FormControl>
                      <Slider
                        min={0}
                        max={100}
                        step={5}
                        value={[field.value]}
                        onValueChange={([v]) => field.onChange(v)}
                        className="mt-1"
                        data-testid="split-ratio-input"
                      />
                    </FormControl>
                    {splitLabel && (
                      <p className="text-xs text-slate-400 mt-1">{splitLabel}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {expenseType === "paid_for_partner" && (
              <p className="text-xs text-orange-400">
                Partner owes the full amount
              </p>
            )}

            {/* Category — pills with show more/less and "+ New" */}
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    Category
                    <InfoTooltip text="Categorize your expense for better tracking and analytics. Categories are shared across your household." />
                  </FormLabel>
                  {householdLoading || !activeGroup ? (
                    <p className="text-xs text-slate-500">
                      {householdLoading ? "Loading categories…" : "No group selected"}
                    </p>
                  ) : (
                    <PillSelect
                      options={[
                        ...sortedCategoryPills,
                        { value: "__new__", label: "+ New", icon: <Plus className="w-3 h-3" /> },
                      ]}
                      value={field.value}
                      onChange={(v) => {
                        const val = v as string;
                        if (val === "__new__") {
                          setShowInlineCategory(true);
                          return;
                        }
                        handleCategoryChange(val);
                      }}
                      variant="purple"
                      maxRows={2}
                      showMoreThreshold={8}
                      autoIndicator={
                        categorySource === "memory" && field.value === suggestedCategoryId
                          ? { type: "memory", label: "Remembered" }
                          : categorySource === "auto" && field.value === suggestedCategoryId
                          ? { type: "auto", label: "Auto-detected" }
                          : null
                      }
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Inline Category Creation */}
            {showInlineCategory && (
              <div className="flex items-center gap-1.5">
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Category name"
                  className="h-8 text-xs"
                  maxLength={30}
                  autoFocus
                  data-testid="inline-category-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newCategoryName.trim()) {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                    if (e.key === "Escape") {
                      setShowInlineCategory(false);
                      setNewCategoryName("");
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 shrink-0"
                  disabled={!newCategoryName.trim() || creatingCategory}
                  onClick={handleCreateCategory}
                  data-testid="inline-category-confirm"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}

            {/* Date + Currency — stacked on mobile, side by side on sm+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      Date
                      <InfoTooltip text="When the expense occurred. Defaults to today. Cannot be a future date." />
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="date"
                        max={new Date().toISOString().split("T")[0]}
                        data-testid="date-input"
                        className="h-9"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency_override"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      Currency
                      <InfoTooltip text="The currency this expense was paid in. Defaults to your household's primary currency." />
                    </FormLabel>
                    <Select onValueChange={(v) => { field.onChange(v); trackEvent(EXPENSE_FORM_FIELD_EDITED, { field_name: "currency" }); }} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="currency-override-select" className="h-9">
                          <SelectValue placeholder="Select currency" className="truncate" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map((cur) => (
                          <SelectItem key={cur} value={cur}>
                            <span className="sm:hidden">{cur}</span>
                            <span className="hidden sm:inline">{cur}{cur === currency ? " (Default)" : ""}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Recurring Toggle — hidden for settlement type (F-03) */}
            {expenseType !== "settlement" && (
              <div className="flex items-center justify-between">
                <Label htmlFor="recurring-toggle" className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <Repeat className="w-4 h-4" />
                  Recurring
                  <InfoTooltip text="Mark this as a recurring expense (e.g., rent, subscriptions). Set the frequency to automatically remind you." />
                  <span className={`text-xs ${isRecurring ? "text-green-400" : "text-slate-500"}`}>
                    {isRecurring ? "On" : "Off"}
                  </span>
                </Label>
                <Switch
                  id="recurring-toggle"
                  checked={isRecurring ?? false}
                  onCheckedChange={(checked) => form.setValue("is_recurring", checked)}
                  data-testid="recurring-toggle"
                  aria-label="Mark as recurring expense"
                />
              </div>
            )}

            {/* Frequency selector — shown when recurring is ON */}
            {expenseType !== "settlement" && isRecurring && (
              <>
                <FormField
                  control={form.control}
                  name="recurring_frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value ?? "monthly"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Monthly" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                {/* Next occurrence date */}
                {(() => {
                  const dateVal = dateValue;
                  const freq = recurringFrequency ?? "monthly";
                  if (!dateVal) return null;
                  const base = new Date(dateVal);
                  if (isNaN(base.getTime())) return null;
                  let next: Date;
                  switch (freq) {
                    case "daily":
                      next = new Date(base);
                      next.setDate(next.getDate() + 1);
                      break;
                    case "weekly":
                      next = new Date(base);
                      next.setDate(next.getDate() + 7);
                      break;
                    case "monthly": {
                      next = new Date(base);
                      const day = next.getDate();
                      next.setMonth(next.getMonth() + 1);
                      if (next.getDate() !== day) next.setDate(0); // handle month-end
                      break;
                    }
                    case "yearly":
                      next = new Date(base);
                      next.setFullYear(next.getFullYear() + 1);
                      if (next.getMonth() !== base.getMonth()) next.setDate(0); // leap year
                      break;
                    default:
                      return null;
                  }
                  const isOverdue = next < new Date();
                  const formatted = next.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                  return (
                    <p className={`flex items-center gap-1 text-xs ${isOverdue ? "text-amber-400" : "text-blue-400/80"}`}>
                      <CalendarClock className="w-3 h-3" />
                      Next: {formatted}{isOverdue ? " (overdue)" : ""}
                    </p>
                  );
                })()}
              </>
            )}

            {/* Notes — compact single line */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1.5">
                    Notes <span className="text-xs text-slate-500 font-normal">(optional)</span>
                    <InfoTooltip text="Optional details about this expense. Only visible to you and your partner." />
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Add notes"
                      maxLength={200}
                      className="h-9"
                      data-testid="expense-notes-input"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Bottom padding so floating button doesn't overlap last field */}
            <div className="h-2" />
          </div>
        )}

        {/* ─── Action Buttons ─────────────────────────────────────────── */}
        {stage === 2 && (
          <div
            className="sticky bottom-0 z-10 border-t border-slate-800 bg-slate-900 pt-3 pb-1"
            data-testid="form-actions"
          >
            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
              data-testid="submit-expense"
            >
              {form.formState.isSubmitting
                ? "Saving…"
                : (isEditMode ? "Save Changes" : "Save Expense")}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
};
