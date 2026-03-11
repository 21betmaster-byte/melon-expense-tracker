"use client";
import { useState, useEffect, useRef } from "react";
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
import { EXPENSE_CREATED, EXPENSE_UPDATED } from "@/lib/analytics/events";
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
import { Plus, Check, Repeat } from "lucide-react";
import type { Expense, ExpenseType } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  expense_type: z.enum(["solo", "joint", "settlement"]),
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
    addPendingExpense,
    resolvePendingExpense,
    updateExpenseInStore,
    addCategoryToStore,
    setCategoryMemory,
  } = useAppStore();

  const isEditMode = !!editExpense;

  const [suggestedCategoryId, setSuggestedCategoryId] = useState<string | null>(null);
  const [categorySource, setCategorySource] = useState<"memory" | "auto" | "manual" | null>(null);

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
    return {
      amount: "",
      description: "",
      expense_type: "joint",
      paid_by_user_id: user?.uid ?? "",
      split_pct: 50,
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
  const expenseType = form.watch("expense_type");
  const isRecurring = form.watch("is_recurring");
  const paidByUserId = form.watch("paid_by_user_id");
  const splitPct = form.watch("split_pct");
  const categoryIdValue = form.watch("category_id");

  // Apply initial values from template selection (only in create mode)
  useEffect(() => {
    if (isEditMode || !initialValues) return;
    form.reset({
      ...getDefaultValues(),
      ...initialValues,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValues]);

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
          userManuallyChangedCategory.current = false;
          return;
        }
      }

      // Fall back to keyword matching
      const catId = autoCategory(debouncedDesc, categories);
      if (catId) {
        setSuggestedCategoryId(catId);
        setCategorySource("auto");
        form.setValue("category_id", catId);
        userManuallyChangedCategory.current = false;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedDesc, categories, isEditMode]);

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

  // Split label: "Shivam pays 70% · Jhanvi pays 30%"
  const splitLabel = (() => {
    if (expenseType !== "joint") return null;
    const payerName = getName(paidByUserId);
    const partnerName = partner ? getName(partner.uid) : "Partner";
    const payerPct = splitPct;
    const partnerPct = 100 - splitPct;
    return `${payerName} covers ${payerPct}% · ${partnerName} covers ${partnerPct}%`;
  })();

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
    form.reset({
      amount: "",
      description: "",
      expense_type: "joint",
      paid_by_user_id: user?.uid ?? "",
      split_pct: 50,
      category_id: "",
      date: new Date().toISOString().split("T")[0],
      currency_override: currency,
      notes: "",
      is_recurring: false,
      recurring_frequency: "monthly",
    });
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
      toast.error("Failed to save expense. It will sync when you're back online.");
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-3"
        data-testid="expense-form"
      >
        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount ({currencySymbol})</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  data-testid="amount-input"
                />
              </FormControl>
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="e.g. Swiggy dinner"
                  maxLength={100}
                  data-testid="description-input"
                />
              </FormControl>
              <p className="text-xs text-slate-400 mt-1">Helps with auto-categorization next time</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Expense Type */}
        <FormField
          control={form.control}
          name="expense_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="expense-type-select">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="joint">Joint (shared)</SelectItem>
                  <SelectItem value="solo">Solo (personal)</SelectItem>
                  <SelectItem value="settlement">Settlement</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Paid By */}
        <FormField
          control={form.control}
          name="paid_by_user_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Paid By</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="paid-by-select">
                    <SelectValue placeholder="Who paid?" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.uid} value={m.uid}>
                      {m.name} {m.uid === user?.uid ? "(You)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Split % slider — only for joint expenses */}
        {expenseType === "joint" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <FormField
                  control={form.control}
                  name="split_pct"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Payer&apos;s Share</FormLabel>
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
              </TooltipTrigger>
              <TooltipContent>
                <p>Adjust how the expense is split between you and your partner</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Category */}
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Category
                {categorySource === "memory" && field.value === suggestedCategoryId && (
                  <span className="ml-2 text-xs text-purple-400">Remembered</span>
                )}
                {categorySource === "auto" && field.value === suggestedCategoryId && (
                  <span className="ml-2 text-xs text-green-400">Auto-detected</span>
                )}
              </FormLabel>
              <Select onValueChange={handleCategoryChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="category-select" disabled={householdLoading || !activeGroup}>
                    <SelectValue placeholder={
                      householdLoading
                        ? "Loading categories…"
                        : !activeGroup
                        ? "No group selected"
                        : categories.length === 0
                        ? "No categories — create one below"
                        : "Select category"
                    } />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Inline Category Creation */}
        {!showInlineCategory ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-0"
            onClick={() => setShowInlineCategory(true)}
            data-testid="inline-category-trigger"
          >
            <Plus className="w-3.5 h-3.5" />
            Create new category
          </Button>
        ) : (
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

        {/* Date + Currency — side by side */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
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
                <FormLabel>Currency</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="currency-override-select" className="h-9">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map((cur) => (
                      <SelectItem key={cur} value={cur}>
                        {cur}{cur === currency ? " (Default)" : ""}
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
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Switch
                    id="recurring-toggle"
                    checked={isRecurring ?? false}
                    onCheckedChange={(checked) => form.setValue("is_recurring", checked)}
                    data-testid="recurring-toggle"
                    aria-label="Mark as recurring expense"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mark this as a repeating expense</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Frequency selector — shown when recurring is ON */}
        {expenseType !== "settlement" && isRecurring && (
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
        )}

        {/* Notes — compact single line */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes <span className="text-xs text-slate-500 font-normal">(optional)</span></FormLabel>
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

        <Button
          type="submit"
          className="w-full"
          disabled={form.formState.isSubmitting}
          data-testid="submit-expense"
        >
          {form.formState.isSubmitting
            ? (isEditMode ? "Saving…" : "Saving…")
            : (isEditMode ? "Save Changes" : "Save Expense")}
        </Button>
      </form>
    </Form>
  );
};
