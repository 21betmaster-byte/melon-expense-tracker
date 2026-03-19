"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Timestamp } from "firebase/firestore";
import type {
  User,
  Household,
  ExpenseGroup,
  Category,
  Goal,
  Expense,
  CategoryMemory,
  SettlementEvent,
} from "@/types";

interface AppState {
  // Auth
  user: User | null;
  firebaseUser: import("firebase/auth").User | null;
  authLoading: boolean;

  // Household
  household: Household | null;
  householdLoading: boolean;
  members: User[];

  // Groups
  groups: ExpenseGroup[];
  activeGroup: ExpenseGroup | null;

  // Categories
  allCategories: Category[];  // All household categories (unfiltered)
  categories: Category[];     // Filtered for activeGroup

  // Expenses
  expenses: Expense[];
  isLoading: boolean;

  // Goals
  goals: Goal[];

  // Category Memory
  categoryMemory: CategoryMemory[];

  // Settlements
  settlements: SettlementEvent[];

  // Multi-household
  allHouseholds: Household[];

  // Hydration
  hasHydrated: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setFirebaseUser: (user: import("firebase/auth").User | null) => void;
  setAuthLoading: (loading: boolean) => void;
  setHousehold: (household: Household | null) => void;
  setHouseholdLoading: (loading: boolean) => void;
  setMembers: (members: User[]) => void;
  setGroups: (groups: ExpenseGroup[]) => void;
  setActiveGroup: (group: ExpenseGroup | null) => void;
  setCategories: (categories: Category[]) => void;
  setAllCategories: (categories: Category[]) => void;
  addCategoryToStore: (category: Category) => void;
  setExpenses: (expenses: Expense[]) => void;
  setIsLoading: (loading: boolean) => void;
  setGoals: (goals: Goal[]) => void;
  setCategoryMemory: (memory: CategoryMemory[]) => void;
  setSettlements: (settlements: SettlementEvent[]) => void;
  addSettlement: (settlement: SettlementEvent) => void;
  addPendingExpense: (expense: Expense) => void;
  resolvePendingExpense: (localId: string, realId: string) => void;
  removeExpense: (expenseId: string) => void;
  updateExpenseInStore: (expenseId: string, data: Partial<Expense>) => void;
  setAllHouseholds: (households: Household[]) => void;
  switchHousehold: (household: Household) => void;
  setHasHydrated: (hydrated: boolean) => void;
  reset: () => void;
}

// ─── Timestamp serialization helpers ─────────────────────────────────────────
// Firestore Timestamps don't survive JSON.stringify; convert to { _s, _ns } on
// write and back to Timestamp on read.

interface SerializedTimestamp {
  __ts: true;
  _s: number;
  _ns: number;
}

function isTimestamp(v: unknown): v is Timestamp {
  return v instanceof Timestamp;
}

function isSerializedTimestamp(v: unknown): v is SerializedTimestamp {
  return (
    typeof v === "object" &&
    v !== null &&
    "__ts" in v &&
    (v as SerializedTimestamp).__ts === true
  );
}

function serializeDeep(obj: unknown): unknown {
  if (isTimestamp(obj)) {
    return { __ts: true, _s: obj.seconds, _ns: obj.nanoseconds } as SerializedTimestamp;
  }
  if (Array.isArray(obj)) return obj.map(serializeDeep);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = serializeDeep(v);
    }
    return result;
  }
  return obj;
}

function deserializeDeep(obj: unknown): unknown {
  if (isSerializedTimestamp(obj)) {
    return new Timestamp(obj._s, obj._ns);
  }
  // Already a Timestamp (e.g. from an earlier reviver pass) — don't recurse into it
  if (isTimestamp(obj)) return obj;
  if (Array.isArray(obj)) return obj.map(deserializeDeep);
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = deserializeDeep(v);
    }
    return result;
  }
  return obj;
}

// ─── Custom storage with Timestamp serialization ─────────────────────────────

const timestampStorage = createJSONStorage(() => localStorage, {
  replacer: (_key: string, value: unknown) => serializeDeep(value),
  reviver: (_key: string, value: unknown) => deserializeDeep(value),
});

// ─── Initial state ───────────────────────────────────────────────────────────

const initialState = {
  user: null,
  firebaseUser: null,
  authLoading: true,
  household: null,
  householdLoading: true,
  members: [],
  groups: [],
  activeGroup: null as ExpenseGroup | null,
  allCategories: [],
  categories: [],
  expenses: [],
  isLoading: false,
  goals: [],
  categoryMemory: [] as CategoryMemory[],
  settlements: [] as SettlementEvent[],
  allHouseholds: [] as Household[],
  hasHydrated: false,
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) => set({ user }),
      setFirebaseUser: (firebaseUser) => set({ firebaseUser }),
      setAuthLoading: (authLoading) => set({ authLoading }),
      setHousehold: (household) => set({ household }),
      setHouseholdLoading: (householdLoading) => set({ householdLoading }),
      setMembers: (members) => set({ members }),
      setGroups: (groups) => set({ groups }),

      // Critical: clear expenses and re-filter categories when switching groups (F-09)
      setActiveGroup: (activeGroup) =>
        set((state) => ({
          activeGroup,
          expenses: [],
          isLoading: true,
          categories: activeGroup
            ? state.allCategories.filter((c) => c.group_id === activeGroup.id)
            : [],
        })),

      setCategories: (categories) => set({ categories }),

      setAllCategories: (allCategories) =>
        set((state) => {
          const activeGroupId = state.activeGroup?.id;
          const categories = activeGroupId
            ? allCategories.filter((c) => c.group_id === activeGroupId)
            : allCategories;
          return { allCategories, categories };
        }),

      addCategoryToStore: (category) =>
        set((state) => ({
          allCategories: [...state.allCategories, category],
          categories: category.group_id === state.activeGroup?.id
            ? [...state.categories, category]
            : state.categories,
        })),
      setExpenses: (expenses) => set({ expenses, isLoading: false }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setGoals: (goals) => set({ goals }),
      setCategoryMemory: (categoryMemory) => set({ categoryMemory }),
      setSettlements: (settlements) => set({ settlements }),
      addSettlement: (settlement) =>
        set((state) => ({ settlements: [settlement, ...state.settlements] })),

      addPendingExpense: (expense) =>
        set((state) => ({ expenses: [expense, ...state.expenses] })),

      resolvePendingExpense: (localId, realId) =>
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e._local_id === localId ? { ...e, id: realId, _pending: false, _local_id: undefined } : e
          ),
        })),

      removeExpense: (expenseId) =>
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== expenseId),
        })),

      updateExpenseInStore: (expenseId, data) =>
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id === expenseId ? { ...e, ...data } : e
          ),
        })),

      setAllHouseholds: (allHouseholds) => set({ allHouseholds }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),

      // Switch household: clear all scoped data so useHousehold reloads
      switchHousehold: (household) =>
        set({
          household,
          expenses: [],
          categories: [],
          allCategories: [],
          groups: [],
          activeGroup: null,
          settlements: [],
          categoryMemory: [],
          goals: [],
          members: [],
          isLoading: true,
        }),

      reset: () => {
        return set({
          ...initialState,
          activeGroup: null,
        });
      },
    }),
    {
      name: "melon-store",
      storage: timestampStorage,
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // Only persist data, skip transient auth / loading / firebaseUser state
      partialize: (state) => ({
        expenses: state.expenses,
        categories: state.categories,
        allCategories: state.allCategories,
        groups: state.groups,
        activeGroup: state.activeGroup,
        household: state.household,
        members: state.members,
        settlements: state.settlements,
        categoryMemory: state.categoryMemory,
        goals: state.goals,
        allHouseholds: state.allHouseholds,
      }),
    }
  )
);

// Expose store on window for E2E test access (Playwright)
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__zustand_store = useAppStore;
}
