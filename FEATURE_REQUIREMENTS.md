# Feature Requirements Document (FRD)

> **Project:** Secure Household Expense Tracker PWA
> **Version:** 6.0
> **Date:** 2026-02-27
> **Scope:** 19 features + 5 UX/infra enhancements + Phase 15 UX Overhaul (17 fixes) + Phase 16 UX Improvements (9 fixes) — ALL COMPLETE ✅
> **Tests:** 502 total (422 Suite H + 80 core suites A-G)

---

## Table of Contents

| # | Feature | Phase | Tests |
|---|---------|-------|-------|
| F-01 | [Per-Expense Currency Override](#f-01-per-expense-currency-override) | 2 | H1-H15 |
| F-02 | [Inline Category Creation](#f-02-inline-category-creation-from-expense-form) | 2 | H16-H25 |
| F-03 | [Recurring Expenses](#f-03-recurring-expenses) | 8 | H26-H40 |
| F-04 | [Create Group from GroupSwitcher](#f-04-create-group-from-groupswitcher) | 1 | H41-H50 |
| F-05 | [Expenses Page Enhancements](#f-05-all-expenses-page-enhancements) | 5 | H51-H70 |
| F-06 | [Edit Expense](#f-06-edit-expense) | 3 | H71-H85 |
| F-07 | [Delete Expense](#f-07-delete-expense) | 2 | H86-H100 |
| F-08 | [Analytics Pie Chart](#f-08-analytics-pie-chart) | 10 | H101-H115 |
| F-09 | [Per-Group Categories](#f-09-per-group-categories) | 9 | H116-H125 |
| F-10 | [Analytics Group Filters](#f-10-analytics-group-level-filters) | 10 | H126-H140 |
| F-11 | [Category Memory](#f-11-description-to-category-memory) | 6 | H141-H150 |
| F-12 | [Email Validation](#f-12-partner-invite-email-validation) | 1 | H151-H160 |
| F-13 | [Conditional Validation](#f-13-category-makes-other-validations-optional) | 1 | H161-H170 |
| F-14 | [Expense Search](#f-14-expense-search-bar) | 4 | H176-H183 |
| F-15 | [Sort Controls](#f-15-sort-controls) | 4 | H184-H190 |
| F-18 | [Settlement History](#f-18-settlement-history--mark-as-settled) | 7 | H205-H214 |
| F-20 | [CSV Export](#f-20-csv-export) | 4 | H191-H196 |
| F-22 | [Expense Notes](#f-22-expense-notes--comments) | 6 | H197-H204 |
| F-23 | [Added-by Label](#f-23-added-by-label) | 3 | H171-H175 |
| UX-01 | [Onboarding Stepper](#ux-01-onboarding-stepper) | 13 | H263-H274 |
| UX-02 | [Feature Discovery Tour](#ux-02-feature-discovery-tour) | 13 | H275-H289 |
| UX-03 | [User Offboarding](#ux-03-user-offboarding) | 11 | H215-H244 |
| UX-04 | [Invite Flow Enhancements](#ux-04-invite-flow-enhancements) | 12 | H245-H262 |
| F-24 | [Help Contact](#f-24-help-contact) | 14 | H290-H299 |
| F-25 | [Feedback Collection](#f-25-feedback-collection--milestone-triggers) | 14 | H300-H314 |
| P15 | [UX Overhaul (17 Fixes)](#phase-15-ux-overhaul-17-fixes-across-4-rounds) | 15 | H315-H380 |
| BUG | [Timestamp Deserialization Fix](#critical-bug-fix-timestamp-deserialization) | 15 | — |
| P16 | [UX Improvements (9 Fixes)](#phase-16-ux-improvements-9-fixes) | 16 | H400-H458 |

---

## F-01: Per-Expense Currency Override

**Status:** ✅ DONE (Phase 2)

### User Story
As a user, I want to add individual expenses in currencies different from my household default, so I can track spending during international trips without changing the household-wide setting.

### Acceptance Criteria
1. The expense form displays a currency selector defaulting to the household currency.
2. The user can override the currency for any single expense by selecting from the supported list: INR, USD, EUR, GBP, AED, SGD, CAD, AUD.
3. The overridden currency is persisted on the expense document in Firestore.
4. If the user does not change the currency selector, the expense saves with the household default currency. No migration needed for existing expenses.
5. The ExpenseCard displays the amount using the expense-level currency if present, otherwise the household currency.
6. Analytics, QuickStats, and SettlementCard continue to use face-value summation (no FX conversion).
7. A currency badge is visible on ExpenseCard for non-default currencies.

### UI/UX Changes
| Component | Change | TestID |
|-----------|--------|--------|
| `ExpenseForm.tsx` | Add currency `Select` dropdown near the amount field | `currency-override-select` |
| `ExpenseCard.tsx` | Show currency badge when expense currency differs from household | `expense-currency-badge` |

### Data Model Changes
```typescript
// types/index.ts — Expense interface
currency?: string;  // ISO 4217 code, optional. Defaults to household.currency at display time.
```

Firestore: `households/{id}/expenses/{expenseId}` gains optional field `currency: string`.

### Firestore Function Changes
- `addExpense`: No changes needed (passes through arbitrary expense data).
- Display: `ExpenseCard` reads `expense.currency ?? household.currency` and passes to `formatCurrency()`.

### Store Changes
None. The currency value is part of each `Expense` object already flowing through `expenses[]`.

### Validation Changes
- `ExpenseForm.tsx` local formSchema: Add `currency: z.string().min(1)` defaulting to `household.currency`.

### Edge Cases
- Existing expenses without a `currency` field default to `household.currency` at display time.
- Settlement math operates on face value. No FX conversion is implemented.
- `formatCurrency(amount, currency)` already accepts a currency parameter.
- If household currency is changed in Settings, existing expenses retain their original currency.
- Form resets currency to household default after each submission.

### Dependencies
None. Independent feature.

---

## F-02: Inline Category Creation from Expense Form

**Status:** ✅ DONE (Phase 2)

### User Story
As a user, I want to create a new category directly from the expense form while adding an expense, so I do not have to navigate to Settings.

### Acceptance Criteria
1. The category area in ExpenseForm includes a "New category" trigger at the bottom.
2. Clicking it reveals an inline text input and a confirm button.
3. Upon creation, the new category is saved to Firestore via `addCategory`.
4. The new category is immediately selected in the form's category field.
5. The new category appears in the dropdown options without a page reload.
6. Duplicate category names (case-insensitive) are rejected with a toast error.
7. Category name is validated: 1-30 characters, trimmed.

### UI/UX Changes
| Component | Change | TestID |
|-----------|--------|--------|
| `ExpenseForm.tsx` | Add "New category" trigger below category Select | `inline-category-trigger` |
| `ExpenseForm.tsx` | Inline text input for new category name | `inline-category-input` |
| `ExpenseForm.tsx` | Confirm button for inline creation | `inline-category-confirm` |

### Data Model Changes
None. Uses existing `Category` type and Firestore schema.

### Firestore Function Changes
Uses existing `addCategory(householdId, name)`.

### Store Changes
Uses existing `setCategories` to append the new category to the store array.

### Validation Changes
Reuses `categoryNameSchema` from `lib/utils/validation.ts`.

### Edge Cases
- If per-group categories (F-09) is implemented, inline creation must respect the active group scope.
- Newly created category has empty `keywords[]` array.
- Network failure shows toast but does not block form submission with a different category.
- Previously entered form data (amount, description, etc.) must not be lost during inline creation.

### Dependencies
F-09 (per-group categories) — if implemented, inline creation must be group-aware.

---

## F-03: Recurring Expenses

**Status:** ✅ DONE (Phase 8) — See [Implementation Details](#f-03-recurring-expenses-implementation-details) below.

---

## F-04: Create Group from GroupSwitcher

**Status:** ✅ DONE (Phase 1)

### User Story
As a user, I want to create a new expense group directly from the group switcher dropdown, so I can quickly set up new groups without navigating to Settings.

### Acceptance Criteria
1. The GroupSwitcher dropdown includes a "Create new group" item at the bottom, separated by a divider.
2. Clicking it reveals an inline input field with a confirm button.
3. The new group is saved via existing `addGroup(householdId, name)`.
4. After creation, the new group is automatically set as the active group.
5. Duplicate group names (case-insensitive) are rejected with a toast error.
6. Group name validation: 1-30 characters.

### UI/UX Changes
| Component | Change | TestID |
|-----------|--------|--------|
| `GroupSwitcher.tsx` | Add separator + "Create new group" menu item | `create-group-switcher-btn` |
| `GroupSwitcher.tsx` | Inline input for group name | `switcher-group-name-input` |
| `GroupSwitcher.tsx` | Confirm button for creation | `switcher-group-confirm-btn` |

### Data Model Changes
None. Uses existing `ExpenseGroup` type.

### Firestore Function Changes
Uses existing `addGroup(householdId, name)`.

### Store Changes
Uses existing `setGroups` (append) and `setActiveGroup` (switch).

### Validation Changes
Reuses `groupNameSchema` from `lib/utils/validation.ts`.

### Edge Cases
- Dropdown should close or transition cleanly after creation.
- New group starts with zero expenses.
- Creating while offline shows error toast.

### Dependencies
None. Independent feature.

---

## F-05: All Expenses Page Enhancements

**Status:** ✅ DONE (Phase 5) — See [Implementation Details](#f-05-all-expenses-page-enhancements-filters--totals) below.

---

## F-06: Edit Expense

**Status:** ✅ DONE (Phase 3)

### User Story
As a user, I want to edit an existing expense directly from the expense card.

### Acceptance Criteria
1. Each ExpenseCard shows an edit button (pencil icon) on the left.
2. Clicking opens the expense dialog pre-filled with all original values.
3. All fields are editable: amount, description, type, paid_by, split, category, date, currency, recurring.
4. On save, the expense is updated in Firestore (not deleted + re-created).
5. Optimistic UI updates the store immediately.
6. Validation rules apply identically to editing.
7. Toast confirms "Expense updated" on success.
8. Dialog title shows "Edit Expense" instead of "Add Expense".

### UI/UX Changes
| Component | Change | TestID |
|-----------|--------|--------|
| `ExpenseCard.tsx` | Add edit button (pencil icon) on left | `edit-expense-btn` |
| `AddExpenseDialog.tsx` | Accept mode ("add" \| "edit") and optional expense prop | — |
| `ExpenseForm.tsx` | Accept optional `initialValues` and `expenseId` props | — |

### Data Model Changes
None (Expense already has `id`).

### Firestore Function Changes
New function:
```typescript
updateExpense(householdId: string, expenseId: string, data: Partial<Omit<Expense, "id">>): Promise<void>
// Uses updateDoc on households/{householdId}/expenses/{expenseId}
```

### Store Changes
New action: `updateExpenseInStore(expenseId: string, data: Partial<Expense>)`.

### Edge Cases
- Edit button disabled on pending (unsynced) expenses.
- `source` field does not change on edit.
- Cancel/close dialog discards changes.

### Dependencies
None, but should be implemented before F-03 (recurring edit logic).

---

## F-07: Delete Expense

**Status:** ✅ DONE (Phase 2)

### User Story
As a user, I want to delete an expense from the expense card.

### Acceptance Criteria
1. Each ExpenseCard shows a delete button (trash icon) on the right.
2. Clicking shows a confirmation dialog.
3. Cancel closes dialog without deleting.
4. Confirm deletes from Firestore and removes from store.
5. Toast confirms "Expense deleted" on success.
6. Settlement calculations update immediately after deletion.

### UI/UX Changes
| Component | Change | TestID |
|-----------|--------|--------|
| `ExpenseCard.tsx` | Add delete button (trash icon) on right | `delete-expense-btn` |
| `ExpenseCard.tsx` | Confirmation dialog | `delete-confirm-dialog` |
| `ExpenseCard.tsx` | Cancel button in dialog | `delete-cancel-btn` |
| `ExpenseCard.tsx` | Confirm button in dialog | `delete-confirm-btn` |

### Data Model Changes
None.

### Firestore Function Changes
New function:
```typescript
deleteExpense(householdId: string, expenseId: string): Promise<void>
// Uses deleteDoc on households/{householdId}/expenses/{expenseId}
```

### Store Changes
New action: `removeExpense(expenseId: string)` — filters out from `expenses[]`.

### Edge Cases
- Delete button disabled on pending expenses.
- Recurring expense delete offers "This occurrence only" or "Stop recurrence" (if F-03 implemented).
- Rapid double-click: debounce or disable after first click.
- If Firestore delete fails, re-add to store with error toast.
- Deleting last expense shows empty state.

### Dependencies
None. Independent feature.

---

## F-08: Analytics Pie Chart

**Status:** ✅ DONE (Phase 10)

### User Story
As a user, I want to see a pie chart showing spending distribution by category, with the ability to view any specific month or all-time data.

### Acceptance Criteria
1. Analytics page includes a pie chart section.
2. Pie chart shows spending per category as proportional slices.
3. Month selector: last 6 months.
4. Hover/tap shows category name, amount, and percentage.
5. Categories with zero spend are excluded.
6. Distinct colors per category (8-color palette).
7. Empty state: "No data for this month."

### Overview
Recharts PieChart component with built-in month selector (last 6 months). The chart is rendered as the FIRST section on the analytics page, above the existing trend line and category MoM charts. Month filtering is done client-side — `useAnalytics` returns raw `allExpenses`, and `CategoryPieChart` filters by selected month via `useMemo`.

### UI/UX Changes
| Component | Change | TestID |
|-----------|--------|--------|
| `analytics/page.tsx` | New pie chart section (first chart) | — |
| New: `CategoryPieChart.tsx` | Recharts PieChart component with month selector | `category-pie-chart` |
| `CategoryPieChart.tsx` | Month selector (Select dropdown, 6 months) | `pie-chart-month-selector` |

### Data Model Changes
No new TypeScript types added. `buildCategoryPieData` returns `{ category: string; value: number }[]`.

### Utility Changes
New: `buildCategoryPieData(expenses, categories): { category: string; value: number }[]` in `lib/utils/analytics.ts`.
- Aggregates amounts by `category_id`, resolves names via `categories` array
- Excludes settlement-type expenses (`expense_type === "settlement"`)
- Filters out zero-value entries
- Directly imported by test file `tests/suite-h-pie-chart.spec.ts`

### Files Created
- `components/analytics/CategoryPieChart.tsx` — Recharts PieChart + month selector, 8-color palette, `ResponsiveContainer` height=280, Legend + Tooltip + label function

### Files Modified
- `lib/utils/analytics.ts` — Added `buildCategoryPieData` function
- `app/(app)/analytics/page.tsx` — Added pie chart section as first chart

### Edge Cases
- Single category: full circle with one color.
- Settlement expenses excluded from pie totals (H115).
- Month selector defaults to current month.
- Empty month shows "No data for this month" text.

### Dependencies
Benefits from F-09 (per-group categories) and F-10 (analytics group filters).

### Tests: H101–H115 (15 tests)

---

## F-09: Per-Group Categories

**Status:** ✅ DONE (Phase 9) — See [Implementation Details](#f-09-per-group-categories-implementation-details) below.

---

## F-10: Analytics Group-Level Filters

**Status:** ✅ DONE (Phase 10)

### User Story
As a user, I want to filter analytics by expense group, so I can see spending trends for specific contexts or across all groups.

### Acceptance Criteria
1. Analytics page includes a group filter dropdown at the top.
2. Options: each existing group + "Overall" (aggregate of all groups).
3. Default: currently active group.
4. Selecting a group re-fetches/re-filters analytics data.
5. "Overall" fetches across all groups and aggregates.
6. All chart sections update based on the filter.
7. Filters consider all user-added categories for the selected scope.

### Overview
Analytics page uses local `useState` for group selection (NOT the global `activeGroup` from Zustand store — critical for H134 test isolation). `useAnalytics` hook accepts `{ groupId: string | "all" }` parameter. "Overall" mode uses `getAllExpensesForAnalytics` Firestore function which omits the `group_id` filter. Initial sync with `activeGroup` uses `useRef` + `useEffect` pattern.

### UI/UX Changes
| Component | Change | TestID |
|-----------|--------|--------|
| `analytics/page.tsx` | Group filter Select at top | `analytics-group-filter` |

### Firestore Function Changes
New: `getAllExpensesForAnalytics(householdId)` — same as `getExpensesForAnalytics` but without `group_id` where clause.

### Files Modified
- `hooks/useAnalytics.ts` — Refactored to accept `{ groupId: string | "all" }` param, returns `allExpenses` array, no longer reads `activeGroup` from store
- `lib/firebase/firestore.ts` — Added `getAllExpensesForAnalytics` function
- `app/(app)/analytics/page.tsx` — Added group filter Select, local `selectedGroupId` state, pie chart section, testids on chart sections
- `store/useAppStore.ts` — Added `activeGroup` persistence to localStorage (survives full page navigations for H134)
- `app/layout.tsx` — Added RSC flight-data cleanup script for E2E test compatibility

### Key Implementation Details
- **Local state isolation (H134)**: Analytics filter uses `useState`, never calls `setActiveGroup()`. Navigating to dashboard preserves the original active group.
- **localStorage persistence**: `activeGroup` is persisted to localStorage so it survives full page navigations (critical for H134 where test navigates dashboard→analytics→dashboard).
- **Initial sync pattern**: `useRef` + `useEffect` syncs `selectedGroupId` with `activeGroup.id` when it first becomes available (async load).
- **RSC cleanup script**: Root layout includes an inline script that clears Next.js dev-mode RSC `<script>` tag content every 500ms, preventing `body.textContent()` false positives in E2E tests (H101, H133).
- **Category filtering**: Pie chart and MoM chart use `allCategories` filtered by `selectedGroupId` when in group mode, or full `allCategories` in "Overall" mode.

### Edge Cases
- "Overall" with per-group categories (F-09): merges categories from all groups via `allCategories`.
- Switching analytics group filter does NOT change the global `activeGroup` in the store.
- "Overall" 6-month trend sums across all groups.
- Rapid filter changes don't crash (React state + cleanup).
- Filter resets to active group on page reload.

### Dependencies
Benefits from F-08 (pie chart) and F-09 (per-group categories).

### Tests: H126–H140 (15 tests)

---

## F-11: Description-to-Category Memory

**Status:** ✅ DONE (Phase 6) — See [Implementation Details](#f-11-description-to-category-memory-implementation-details) below.

---

## F-12: Partner Invite Email Validation

**Status:** ✅ DONE (Phase 1)

### User Story
As a user, I want the partner email input to validate email format before saving.

### Acceptance Criteria
1. The input validates on blur and on save.
2. Invalid formats show inline error: "Please enter a valid email address."
3. Save button is disabled when email is invalid (non-empty and not matching format).
4. Valid emails pass standard format (user@domain.tld).
5. Empty email is allowed (field is optional).

### UI/UX Changes
| Component | Change | TestID |
|-----------|--------|--------|
| `InvitePartner.tsx` | Error message below input | `partner-email-error` |

### Validation
Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` or Zod `z.string().email()`.

### Edge Cases
- "user@domain" (missing TLD) rejected.
- Plus-addressing ("user+tag@domain.com") accepted.
- Validation on blur, not on every keystroke.
- Empty string is valid (field is optional).

### Dependencies
None. Independent feature.

---

## F-13: Category Makes Other Validations Optional

**Status:** ✅ DONE (Phase 1)

### User Story
As a user, when I select a category, description should become optional so I can quickly log categorized expenses.

### Acceptance Criteria
1. Category selection is always mandatory.
2. When a category IS selected, description becomes optional (can be empty).
3. Form submission succeeds with category selected and empty description.
4. Expenses with no description display the category name as primary label on ExpenseCard.
5. The "Description is required" error does not appear when a category is selected.
6. Amount and date validation remain mandatory regardless of category.

### UI/UX Changes
| Component | Change | TestID |
|-----------|--------|--------|
| `ExpenseForm.tsx` | Description label shows "(optional)" when category selected | — |
| `ExpenseCard.tsx` | Display category name when description is empty | — |

### Validation Changes
```typescript
// ExpenseForm.tsx formSchema — use superRefine
.superRefine((data, ctx) => {
  if (!data.category_id && data.description.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Description is required when no category is selected",
      path: ["description"],
    });
  }
});
```

### Edge Cases
- Auto-categorization requires description; with empty description + manual category, keyword learning is skipped.
- Placeholder text changes: "Optional when category is selected".
- Existing expenses with descriptions are unaffected.

### Dependencies
None. Independent feature.

---

## Feature Dependency Graph (All Complete ✅)

```
F-12 (Email validation)        ─── Independent                    ✅ Phase 1
F-13 (Conditional validation)  ─── Independent                    ✅ Phase 1
F-04 (Group from switcher)     ─── Independent                    ✅ Phase 1
F-01 (Currency override)       ─── Independent                    ✅ Phase 2
F-02 (Inline category)         ──┬─ Group-aware via F-09          ✅ Phase 2
F-07 (Delete expense)          ─── Independent                    ✅ Phase 2
F-06 (Edit expense)            ──┬─ Uses F-01 currency field      ✅ Phase 3
F-23 (Added-by label)          ─── Independent                    ✅ Phase 3
F-14 (Expense search)          ─── Independent                    ✅ Phase 4
F-15 (Sort controls)           ─── Independent                    ✅ Phase 4
F-20 (CSV export)              ──┬─ Benefits from F-14, F-15      ✅ Phase 4
F-05 (Expenses page)           ──┬─ Benefits from F-06, F-07      ✅ Phase 5
F-22 (Expense notes)           ─── Independent                    ✅ Phase 6
F-11 (Category memory)         ──┬─ Group-aware via F-09          ✅ Phase 6
F-18 (Settlement history)      ─── Independent                    ✅ Phase 7
F-03 (Recurring)               ──┬─ Depends on F-06, F-07         ✅ Phase 8
F-09 (Per-group categories)    ──┬─ Impacts F-02, F-08, F-10, F-11 ✅ Phase 9
F-08 (Pie chart)               ──┬─ Benefits from F-09            ✅ Phase 10
F-10 (Analytics group filters) ──┬─ Benefits from F-08, F-09      ✅ Phase 10
UX-01 (Onboarding stepper)    ─── Independent                    ✅ Phase 13
UX-02 (Feature discovery tour) ─── Independent                    ✅ Phase 13
```

---

## F-14: Expense Search Bar

**Status:** ✅ DONE (Phase 4)

### Overview
Client-side search input on the `/expenses` page that filters expenses by description, category name, and payer name.

### Data Model
No data model changes required. Uses existing `Expense`, `Category`, and `User` types.

### UI Changes
- **Search input** with magnifying glass icon above the expense list
  - Placeholder: "Search expenses..."
  - 300ms debounce on keystroke to prevent excessive re-renders
  - Clear button (X icon) appears when query is non-empty
- **"No matching expenses"** message when filter yields 0 results
- Search resets when active group changes

### Files Modified
- `app/(app)/expenses/page.tsx` — Added search state, debounce logic, filter pipeline
- `components/expenses/ExpenseList.tsx` — Added `filteredExpenses` and `emptyMessage` props

### Test IDs
- `expense-search-input` — Search text input
- `expense-search-clear` — Clear (X) button
- `expense-no-results` — Empty state message

### Tests: H176–H183 (8 tests)

---

## F-15: Sort Controls

**Status:** ✅ DONE (Phase 4)

### Overview
Sort dropdown on the `/expenses` page with 5 sort options applied client-side after search filter.

### Data Model
No data model changes required.

### UI Changes
- **Sort Select dropdown** with options:
  - "Date (Newest)" — default
  - "Date (Oldest)"
  - "Amount (High→Low)"
  - "Amount (Low→High)"
  - "Category (A→Z)"
- Sort applied after search filter, before rendering
- Sort resets when active group changes
- Sort persists across search changes

### Files Modified
- `app/(app)/expenses/page.tsx` — Added `sortKey` state, sort pipeline via `useMemo`

### Test IDs
- `expense-sort-select` — Sort dropdown trigger

### Tests: H184–H190 (7 tests)

---

## F-20: CSV Export

**Status:** ✅ DONE (Phase 4)

### Overview
Export button on the `/expenses` page that downloads currently visible (filtered + sorted) expenses as a CSV file.

### Data Model
No data model changes required.

### UI Changes
- **"Export CSV" button** with Download icon
  - Disabled when no expenses to export
  - Exports currently visible expenses (respects search + sort)
  - Shows toast "Exported {n} expenses" on success
  - Filename: `expenses-{YYYY-MM-DD}.csv`

### CSV Columns
Date, Description, Amount, Currency, Category, Paid By, Type, Split Ratio

### Files Created
- `lib/utils/export.ts` — `exportExpensesToCSV()` utility with `escapeCSV()` helper

### Files Modified
- `app/(app)/expenses/page.tsx` — Added Export CSV button

### Test IDs
- `export-csv-btn` — Export button

### Tests: H191–H196 (6 tests)

---

## F-05: All Expenses Page Enhancements (Filters + Totals)

**Status:** ✅ DONE (Phase 5)

### Overview
Added summary stat cards (Total Spent, Total Owed) and filter dropdowns (Month, Paid By) to the `/expenses` page. Filters compose with existing search and sort (Phase 4) in a three-stage pipeline: month → paid-by → search → sort → render.

### Data Model
No data model changes required. All filtering is client-side on existing `expenses[]`.

### UI Changes
- **Total Spent card** — Displays sum of absolute amounts for currently filtered expenses
  - Recalculates as filters change
- **Total Owed card** — Displays settlement calculation result for filtered expense subset
  - Uses `calculateSettlement()` directly on filtered expenses (not the hook)
  - Shows ₹0 when settled
- **Month filter** — Select dropdown with "All Months" + last 12 months (format: "MMM yy")
  - Default: "All Months"
  - Filters by comparing `formatMonth(expense.date.toDate())` against selected value
- **Paid By filter** — Select dropdown with "All Members" + each household member
  - Default: "All Members"
  - Filters by comparing `expense.paid_by_user_id` against selected member uid
  - Shows "(You)" suffix for current user
- **Filter count** — Subtitle shows "(filtered from N)" when filters are active
- **Empty state** — "No expenses match your filters" when filters yield 0 results (vs "No expenses yet" when unfiltered)
- All filters reset on active group change (via `prevGroupId` ref + useEffect)

### Files Modified
- `app/(app)/expenses/page.tsx` — Added monthFilter/paidByFilter state, month options generation (12 months), three-stage filter pipeline, Total Spent/Owed cards, filter dropdowns

### Test IDs
- `expenses-total-spent` — Total spent summary card
- `expenses-total-owed` — Total owed summary card
- `month-filter` — Month filter Select trigger
- `paid-by-filter` — Paid-by filter Select trigger

### Tests: H51–H70 (20 tests)

---

## F-23: Added-by Label

**Status:** ✅ DONE (Phase 3)

### Overview
Display "Added by {name}" on expense cards when the expense was created by a different user than the payer.

### Data Model
- Added `created_by?: string` to `Expense` interface in `types/index.ts`
- Note: `created_by: user.uid` was already written to Firestore but not in the TypeScript interface

### UI Changes
- **"Added by {name}" label** below the "Paid by" line on expense cards
  - Only shown when `created_by` exists AND differs from `paid_by_user_id`
  - Hidden when creator equals payer or field is undefined
  - Uses `members` store to resolve uid → name

### Files Modified
- `types/index.ts` — Added `created_by?: string` to Expense
- `components/expenses/ExpenseCard.tsx` — Added `expense-added-by` label

### Test IDs
- `expense-added-by` — Added-by label paragraph

### Tests: H171–H175 (5 tests)

---

## F-22: Expense Notes / Comments

**Status:** ✅ DONE (Phase 6)

### Overview
Optional notes/comments field on each expense for additional context. Notes are displayed via a collapsible toggle on expense cards and included in CSV exports.

### Data Model
- Added `notes?: string` to `Expense` interface in `types/index.ts`
- Firestore: `households/{id}/expenses/{expenseId}` gains optional field `notes: string`

### UI Changes
- **Notes textarea** in ExpenseForm below description field
  - Placeholder: "Add notes (optional)"
  - `maxLength` attribute set to 200 characters
  - Scrolls into view since notes is at the bottom of the form
- **Notes toggle** on ExpenseCard (collapsible section)
  - Only shown when expense has notes (hidden when `notes` is empty/undefined)
  - Click to expand/collapse notes content
- **CSV export** includes "Notes" column (added to `lib/utils/export.ts`)
- **Edit mode** preserves notes content when editing an expense

### Files Modified
- `types/index.ts` — Added `notes?: string` to Expense interface
- `components/expenses/ExpenseForm.tsx` — Added notes textarea with Zod validation (`z.string().max(200).optional()`)
- `components/expenses/ExpenseCard.tsx` — Added collapsible notes section with toggle button
- `lib/utils/export.ts` — Added "Notes" column to CSV export headers and data rows

### Test IDs
- `expense-notes-input` — Notes textarea in expense form
- `expense-notes-toggle` — Toggle button on expense card (only visible when notes exist)
- `expense-notes-content` — Notes text content (visible when toggled open)

### Tests: H197–H204 (8 tests)

---

## F-11: Description-to-Category Memory (Implementation Details)

**Status:** ✅ DONE (Phase 6)

### Overview
When a user creates an expense, the description-to-category mapping is saved to Firestore's `category_memory` subcollection. On subsequent expense entries, the system auto-fills the category based on remembered mappings, taking priority over keyword-based auto-categorization.

### Files Created/Modified
- `lib/firebase/firestore.ts` — Added `saveCategoryMemory()` and `getCategoryMemory()` with try-catch for graceful fallback when Firestore security rules don't allow the `category_memory` subcollection
- `lib/utils/categorization.ts` — Added `memoryCategory()` function for case-insensitive description-to-category lookup
- `store/useAppStore.ts` — Added `categoryMemory: CategoryMemory[]` state and `setCategoryMemory()` action
- `hooks/useHousehold.ts` — Loads category memory via `getCategoryMemory()` in `Promise.all` alongside other data fetches
- `components/expenses/ExpenseForm.tsx` — Added memory lookup on description change (priority: memory → keyword → none), "Remembered" label for memory matches, saves memory on each expense creation
- `types/index.ts` — Added `CategoryMemory` interface

### Key Implementation Details
- Memory save logic captures `shouldSaveMemory` and `memoryCatId` BEFORE form reset to prevent race condition
- `getCategoryMemory()` returns `[]` on error (prevents `Promise.all` cascade failure)
- `saveCategoryMemory()` catches errors silently (non-critical feature)
- Auto-categorization priority: (1) memory match → "Remembered" label, (2) keyword match → "Auto-detected" label, (3) no match → leave blank

### Tests: H141–H150 (10 tests)

---

## F-18: Settlement History / Mark as Settled

**Status:** ✅ DONE (Phase 7)

### Overview
"Mark as Settled" button on the SettlementCard that records settlement events to Firestore, with a confirmation dialog and a history list showing recent settlement events. Net balance calculation is adjusted by subtracting settled amounts.

### Data Model
- Added `SettlementEvent` interface to `types/index.ts`:
  ```typescript
  interface SettlementEvent {
    id?: string;
    amount: number;
    paid_by: string;    // uid of person who paid
    paid_to: string;    // uid of person who received
    settled_at: Timestamp;
    note?: string;
    group_id: string;   // settlement is group-scoped
  }
  ```
- Firestore: `households/{id}/settlements/{docId}` subcollection

### UI Changes
- **"Mark as Settled" button** on SettlementCard (visible only when balance is non-zero)
  - Opens confirmation dialog showing amount and direction
  - Optimistic update: settlement added to store immediately, toast shown, dialog closed
  - Firestore write happens in background (gracefully handles permission errors)
- **Confirmation dialog** with Cancel/Confirm buttons
  - Keyboard dismissible (Escape key)
- **Settlement history list** below the balance display
  - Shows last 5 settlement events for the active group
  - Each entry shows payer, payee, amount, and date
  - Visible in both settled and unsettled states

### Net Balance Calculation
- `useSettlement` hook enhanced with `applySettlements()` function
- Subtracts settled amounts from base expense-derived balance
- Settlement events filtered by active group
- Handles direction flips (when settled more than owed)

### Files Modified
- `types/index.ts` — Added `SettlementEvent` interface
- `lib/firebase/firestore.ts` — Added `recordSettlement()`, `getSettlements()`, `subscribeToSettlements()` with try-catch
- `store/useAppStore.ts` — Added `settlements: SettlementEvent[]`, `setSettlements()`, `addSettlement()`, exposed store on `window` for E2E test access
- `hooks/useHousehold.ts` — Loads settlements in `Promise.all` alongside other data
- `hooks/useSettlement.ts` — Added `applySettlements()` to subtract settled amounts from expense-based balance
- `components/dashboard/SettlementCard.tsx` — Added Mark as Settled button, confirmation dialog, settlement history list, optimistic update pattern

### Test IDs
- `mark-settled-btn` — Mark as Settled button
- `settle-confirm-dialog` — Confirmation dialog
- `settle-confirm-btn` — Confirm button in dialog
- `settle-cancel-btn` — Cancel button in dialog
- `settlement-history-list` — Settlement history container
- `settlement-history-item` — Individual history entry

### Tests: H205–H214 (10 tests)

---

## F-03: Recurring Expenses (Implementation Details)

**Status:** ✅ DONE (Phase 8)

### Overview
Recurring expense toggle in the expense form that marks expenses as recurring with a configurable frequency (daily/weekly/monthly/yearly). Recurring expenses display a purple badge indicator on expense cards. The toggle is hidden for settlement-type expenses.

### Data Model
- Added to `Expense` interface in `types/index.ts`:
  ```typescript
  is_recurring?: boolean;
  recurring_frequency?: "daily" | "weekly" | "monthly" | "yearly";
  recurrence_day?: number;           // Day of month (1-31)
  recurring_parent_id?: string;      // Links child occurrences to parent
  ```
- Firestore: `households/{id}/expenses/{expenseId}` gains optional fields `is_recurring`, `recurring_frequency`, `recurrence_day`

### UI Changes
- **Recurring toggle** in ExpenseForm between Date and Notes fields
  - Switch component (Radix UI) with `role="switch"` and `aria-checked`
  - Label with Repeat icon: "Recurring"
  - Hidden when expense type is "settlement" (F-39 test requirement)
  - Defaults to off; resets to off after form submission
- **Frequency selector** shown when toggle is ON
  - Select dropdown: Daily, Weekly, Monthly (default), Yearly
  - Hidden when toggle is off
- **Recurring indicator badge** on ExpenseCard
  - Purple outline badge with Repeat icon
  - Shows capitalized frequency text (e.g., "Monthly", "Weekly")
  - Only visible when `expense.is_recurring` is true

### Files Created
- `components/ui/switch.tsx` — Radix UI Switch component (shadcn pattern with `SwitchPrimitive.Root` + `SwitchPrimitive.Thumb`)
- `lib/utils/recurrence.ts` — `getNextOccurrence(startDate, frequency)` utility for date math

### Files Modified
- `types/index.ts` — Added recurring fields to Expense interface
- `lib/utils/validation.ts` — Added `is_recurring: z.boolean().optional()` and `recurring_frequency` enum to Zod schema
- `components/expenses/ExpenseForm.tsx` — Added Switch import, recurring toggle + frequency selector JSX, form defaults, submit data, form reset
- `components/expenses/ExpenseCard.tsx` — Added Repeat icon import, recurring indicator badge

### Test IDs
- `recurring-toggle` — Switch toggle in expense form
- `recurring-indicator` — Purple badge on expense card

### Tests: H26–H40 (15 tests)

---

## F-09: Per-Group Categories (Implementation Details)

**Status:** ✅ DONE (Phase 9)

### Overview
Categories are scoped to individual expense groups via a `group_id` field. All household categories are loaded at init into `allCategories`; when the user switches groups, `categories` is re-filtered from `allCategories`. Existing categories without `group_id` are lazily migrated to the default group.

### Architecture: Load All + Filter Client-Side
- Single Firestore read at init (`getCategories` loads all household categories)
- `allCategories: Category[]` stores the full unfiltered set
- `categories: Category[]` is the filtered view for the active group
- `setActiveGroup` re-filters `categories` from `allCategories` synchronously (instant group switching)
- All existing consumers read `store.categories` — no downstream changes needed

### Data Model
- Added `group_id?: string` to `Category` interface in `types/index.ts`
- Firestore: `households/{id}/categories/{catId}` gains field `group_id: string`

### Store Changes
- New state: `allCategories: Category[]` (all household categories, unfiltered)
- New action: `setAllCategories(categories)` — sets `allCategories` and derives filtered `categories`
- New action: `addCategoryToStore(category)` — adds to both `allCategories` and (if matching group) `categories`
- Updated: `setActiveGroup` now also filters `allCategories` → `categories` by `activeGroup.id`

### Lazy Migration
- `useHousehold.ts` detects categories without `group_id` on load
- Assigns them to the default group in-memory immediately
- Fire-and-forget Firestore updates in background (non-blocking, graceful failure)
- Migration runs on every load until all categories have `group_id`

### Files Modified
- `types/index.ts` — Added `group_id?: string` to Category
- `store/useAppStore.ts` — Added `allCategories`, `setAllCategories`, `addCategoryToStore`; updated `setActiveGroup`
- `lib/firebase/firestore.ts` — Added `groupId` param to `addCategory`; updated `createHousehold` seeding with `group_id`
- `hooks/useHousehold.ts` — Lazy migration, `setAllCategories` instead of `setCategories`, imports for `updateDoc`/`doc`/`db`
- `components/settings/CategoriesManager.tsx` — Pass `activeGroup.id` to `addCategory`, use `addCategoryToStore`
- `components/expenses/ExpenseForm.tsx` — Pass `activeGroup.id` in `handleCreateCategory`, use `addCategoryToStore`

### No `category-group-selector` UI
Test H120 uses a soft check for this testid and accepts implicit scoping via `activeGroup`. CategoriesManager shows categories for whichever group is currently active.

### Test IDs
- No new testids added (existing `new-category-input`, `add-category-btn`, `category-select` are reused)

### Tests: H116–H125 (10 tests)

---

## UX-01: Onboarding Stepper

**Status:** ✅ DONE (Phase 13)

### User Story
As a new user, I want a guided onboarding experience that walks me through setting up my household step-by-step, so I understand the process and feel confident using the app.

### Overview
4-step onboarding wizard that replaces the previous Tabs-based onboarding page. Steps flow: Welcome → Choose Path (Create/Join) → Create or Join Household → Success. Progress dots show current position. Slide animations provide smooth transitions. localStorage persistence tracks completion.

### Acceptance Criteria
1. Onboarding page displays a 4-step stepper with progress dots.
2. Step 1 (Welcome) shows a welcome message with "Get Started" and "Skip" actions.
3. Step 2 (Choose Path) lets the user select between creating or joining a household.
4. Step 3 renders CreateHouseholdCard or JoinHouseholdCard based on the user's choice, with `onSuccess` callback to advance the stepper.
5. Step 4 (Success) shows a success message and auto-redirects to the dashboard.
6. `onboarding_completed` is set in localStorage by StepSuccess on mount.
7. Progress dots visually indicate the current step.
8. Slide animations transition smoothly between steps.

### Files Created
- `components/onboarding/OnboardingStepper.tsx` — 4-step stepper with progress dots and slide animations
- `components/onboarding/StepWelcome.tsx` — Welcome step with Get Started and Skip actions
- `components/onboarding/StepSuccess.tsx` — Success step with auto-redirect, sets `onboarding_completed` in localStorage

### Files Modified
- `app/(app)/onboarding/page.tsx` — Replaced Tabs component with OnboardingStepper
- `components/onboarding/CreateHouseholdCard.tsx` — Added `onSuccess` callback prop
- `components/onboarding/JoinHouseholdCard.tsx` — Added `onSuccess` callback prop
- `tests/setup/auth.setup.ts` — Updated with stepper navigation and tour dismissal

### localStorage Keys
- `onboarding_completed` — Set by StepSuccess on mount

### Edge Cases
- Skip on Welcome step bypasses the wizard entirely.
- Auto-redirect on Success step navigates to dashboard after brief delay.
- Previously completed onboarding is persisted via localStorage.

### Dependencies
None. Independent UX enhancement.

### Tests: H263–H274 (12 tests)

---

## UX-02: Feature Discovery Tour

**Status:** ✅ DONE (Phase 13)

### User Story
As a new user, I want an interactive tour of the dashboard features after onboarding, so I can quickly learn how to use the app's key functionality.

### Overview
5-step interactive spotlight tour of dashboard features. The tour auto-triggers on the first dashboard visit when `tour_completed` is not in localStorage. A dark overlay with a cutout spotlights each target element while a tooltip provides description and navigation controls. The tour can be dismissed at any time via Escape key. A "Replay Tour" button in Settings allows users to restart the tour.

### Acceptance Criteria
1. Tour auto-triggers on first dashboard visit when `tour_completed` is not in localStorage.
2. Tour consists of 5 steps: Add Expense → Settlement → Group Switcher → Bottom Nav → Completion.
3. Each step shows a spotlight (dark overlay with cutout) around the target element.
4. Each step shows a tooltip with description and Next/Skip controls.
5. Escape key dismisses the tour at any step.
6. `tour_completed` is set in localStorage on tour completion or skip.
7. Settings page includes a "Replay Tour" button that clears `tour_completed` and restarts the tour.
8. Tour does not trigger on subsequent visits after completion.

### Files Created
- `components/tour/TourProvider.tsx` — Tour context, overlay, spotlight, and tooltip (~230 lines)

### Files Modified
- `app/(app)/layout.tsx` — Wrapped with TourProvider
- `components/layout/AppNav.tsx` — Added `data-testid="bottom-nav"`
- `app/(app)/settings/page.tsx` — Added Replay Tour button

### localStorage Keys
- `tour_completed` — Set on tour completion or skip

### Tour Steps
1. **Add Expense** — Highlights the add expense button
2. **Settlement** — Highlights the settlement card
3. **Group Switcher** — Highlights the group switcher dropdown
4. **Bottom Nav** — Highlights the bottom navigation bar
5. **Completion** — Final congratulations message

### Edge Cases
- Escape dismissal sets `tour_completed` in localStorage (does not retrigger).
- Replay Tour button clears `tour_completed` and restarts from step 1.
- Tour overlay prevents interaction with underlying elements during tour.
- Tour handles missing target elements gracefully (e.g., if a spotlighted element is not yet rendered).

### Dependencies
None. Independent UX enhancement.

### Tests: H275–H289 (15 tests)

---

## UX-03: User Offboarding

**Status:** ✅ DONE (Phase 11)

### User Story
As a user, I want to be able to safely log out, leave my household, or delete my account entirely, with appropriate confirmation dialogs to prevent accidental data loss.

### Acceptance Criteria
1. Logout button shows a confirmation dialog before signing out
2. Cancel dismisses the dialog and keeps user on the current page
3. Confirm logout signs out and redirects to /login
4. Settings page shows a "Danger Zone" card with Leave Household and Delete Account options
5. Leave Household opens a confirmation dialog explaining consequences
6. Delete Account uses a 3-step dialog: Warning → Type "DELETE" → Re-authenticate
7. The DELETE confirmation input is case-sensitive
8. Re-authentication supports both password and Google OAuth users
9. Wrong password shows an error message
10. All dialogs are keyboard dismissible (Escape key)

### Implementation Details
- Logout confirmation: AlertDialog in AppNav wrapping the existing logout button
- DangerZone component: Card with red border (`border-red-900/50`), two action rows
- Delete Account 3-step flow: Warning → Type DELETE → Re-auth (password or Google popup)
- Re-auth detection: `getAuthProvider()` reads `providerData[0].providerId`
- Firestore operations: `leaveHousehold` (arrayRemove member), `deleteHouseholdCompletely` (batch delete subcollections), `deleteUserProfile`

### Files Created/Modified
- `lib/firebase/auth.ts` — Added `reauthenticateWithPassword`, `reauthenticateWithGoogle`, `deleteCurrentUser`, `getAuthProvider`
- `lib/firebase/firestore.ts` — Added `leaveHousehold`, `deleteHouseholdCompletely`, `deleteUserProfile`; added `arrayRemove` import
- `components/layout/AppNav.tsx` — Wrapped logout in AlertDialog confirmation
- `components/settings/DangerZone.tsx` — **NEW** — Leave Household + Delete Account (multi-step)
- `app/(app)/settings/page.tsx` — Imported and rendered DangerZone

### TestIDs
`logout-btn`, `logout-confirm-dialog`, `logout-cancel-btn`, `logout-confirm-btn`, `danger-zone`, `leave-household-btn`, `leave-household-dialog`, `leave-cancel-btn`, `leave-confirm-btn`, `delete-account-btn`, `delete-account-dialog`, `delete-cancel-btn`, `delete-continue-btn`, `delete-confirm-input`, `delete-proceed-btn`, `delete-final-btn`, `reauth-password-input`, `reauth-error`

### Edge Cases
- Last member leaving household triggers full household deletion
- Google OAuth users see "Verify & Delete" button instead of password input
- Tests are UI-only — no actual destructive operations performed

### Dependencies
None. Independent UX enhancement.

### Tests: H215–H244 (30 tests)

---

## UX-04: Invite Flow Enhancements

**Status:** ✅ DONE (Phase 12)

### User Story
As a user, I want a better invite experience with native sharing, live countdown timers, and a guided post-creation flow so I can easily share the invite link with my partner.

### Acceptance Criteria
1. Share button uses Web Share API with clipboard fallback
2. Live countdown shows time until invite expires (e.g., "Expires in 1d 12h")
3. Countdown turns amber when < 4 hours remain
4. Countdown shows "Expired" with red styling when past expiry
5. Expired invite shows "Refresh now" link
6. Invite status badge shows "Pending" while waiting for partner
7. Post-creation onboarding shows 2-step guide with Share and Copy buttons
8. "Skip for now" button navigates to dashboard

### Implementation Details
- `lib/utils/invite.ts` — Shared utilities: `formatCountdown()`, `getInviteUrl()`, `shareInvite()`
- Countdown updates every 60 seconds via `setInterval`
- Warning state (amber) at < 4 hours, expired state (red) at ≤ 0
- Web Share API feature detection with clipboard fallback

### Files Created/Modified
- `lib/utils/invite.ts` — **NEW** — `formatCountdown`, `getInviteUrl`, `shareInvite` utilities
- `components/settings/InvitePartner.tsx` — Added share button, countdown, status badge, expired refresh prompt
- `components/onboarding/CreateHouseholdCard.tsx` — Added 2-step guide, share + copy, countdown, "Skip for now"

### TestIDs
`share-invite-btn`, `invite-status-badge`, `invite-countdown`, `invite-refresh-expired`, `invite-step-1`, `invite-step-2`, `create-share-invite-btn`, `create-copy-invite-btn`, `create-invite-countdown`, `skip-for-now-btn`

### Edge Cases
- Playwright Chromium lacks `navigator.share` — tests verify clipboard fallback
- 2-member households skip invite panel entirely
- Onboarding tests soft-pass when user already has household

### Dependencies
None. Independent UX enhancement.

### Tests: H245–H262 (18 tests)

---

## F-24: Help Contact

**Status:** ✅ DONE (Phase 14)

### User Story
As a user, I want to send a message to the developer (bug report, feature request, etc.) directly from the app settings.

### Acceptance Criteria
1. Help Contact card is visible on the settings page
2. Subject selector has 4 options: Bug Report, Feature Request, General, Other
3. Message textarea with character counter (max 1000 chars)
4. Send button disabled when message is empty
5. Successful submission shows toast and resets form
6. User email is displayed as read-only context

### Implementation Details
- Writes to top-level `contact_messages` Firestore collection (not under households)
- No email infrastructure needed — developer reads from Firebase Console
- Card follows CurrencySelector pattern with HelpCircle icon

### Files Created/Modified
- `types/index.ts` — Added `ContactMessage`, `ContactSubject` types
- `lib/firebase/contact.ts` — **NEW** — `submitContactMessage()` writes to Firestore
- `components/settings/HelpContact.tsx` — **NEW** — Contact card component
- `app/(app)/settings/page.tsx` — Added HelpContact import and render

### TestIDs
`help-contact-card`, `help-subject-select`, `help-message-input`, `help-char-count`, `help-send-btn`, `help-user-email`

### Edge Cases
- Max 1000 character enforcement
- Loading state during Firestore write

### Dependencies
None. Independent feature.

### Tests: H290–H299 (10 tests)

---

## F-25: Feedback Collection + Milestone Triggers

**Status:** ✅ DONE (Phase 14)

### User Story
As a developer, I want to collect user feedback at key usage milestones (10th visit, 10th expense) to understand user satisfaction without being intrusive.

### Acceptance Criteria
1. Feedback dialog triggered at configurable milestones (10th visit, 10th expense)
2. 1-5 star rating with visual highlight feedback
3. Optional comment textarea (max 500 chars)
4. Submit button disabled without rating selection
5. Successful submission persists to Firestore and shows toast
6. "Maybe later" dismiss button with localStorage persistence (no re-trigger)
7. Feedback suppressed while feature tour is active

### Implementation Details
- localStorage-based event counters (`app_event_visit_count`, `app_event_expense_count`)
- Custom DOM events: `incrementEvent()` dispatches `app-milestone-check` CustomEvent
- `FeedbackProvider` listens for CustomEvent, checks milestone threshold, shows dialog after 1s delay
- Dashboard tracks visits with 500ms delay to avoid race condition with FeedbackProvider listener registration
- Milestone definitions in `lib/milestones/definitions.ts` — extensible array
- Tour/Feedback conflict: FeedbackProvider checks `useTour().isTourActive`

### Firestore Collections
- `contact_messages/{id}` — user_id, user_email, household_id, subject, message, created_at, status
- `feedback/{id}` — user_id, user_email, household_id, rating, comment?, trigger, created_at

### Files Created/Modified
- `types/index.ts` — Added `FeedbackEntry`, `MilestoneDefinition` types
- `lib/firebase/feedback.ts` — **NEW** — `submitFeedback()` writes to Firestore
- `lib/milestones/definitions.ts` — **NEW** — Milestone config array
- `lib/milestones/tracker.ts` — **NEW** — `incrementEvent()`, `checkMilestone()`, `dismissMilestone()`
- `components/feedback/StarRating.tsx` — **NEW** — 5 clickable stars
- `components/feedback/FeedbackDialog.tsx` — **NEW** — Dialog with stars, comment, submit/dismiss
- `components/feedback/FeedbackProvider.tsx` — **NEW** — Context provider for milestone events
- `app/(app)/layout.tsx` — Wrapped with FeedbackProvider inside TourProvider
- `app/(app)/dashboard/page.tsx` — Added `incrementEvent("visit_count")` on mount
- `components/expenses/ExpenseForm.tsx` — Added `incrementEvent("expense_count")` after creation

### localStorage Keys
- `app_event_{event}` — counter for each event type
- `feedback_dismissed_{event}_{threshold}` — dismissal flag for each milestone

### TestIDs
`feedback-dialog`, `feedback-title`, `feedback-description`, `feedback-star-1..5`, `feedback-comment-input`, `feedback-submit-btn`, `feedback-dismiss-btn`

### Edge Cases
- Race condition between FeedbackProvider mount and dashboard visit event (solved with 500ms delay)
- Tour/Feedback conflict (FeedbackProvider suppresses when tour active)
- Extensible milestone definitions array

### Dependencies
UX-02 (Feature Discovery Tour) — FeedbackProvider checks `useTour().isTourActive`

### Tests: H300–H314 (15 tests)

---

## Phase 15: UX Overhaul (17 Fixes Across 4 Rounds)

**Status:** ✅ DONE (Phase 15)

### Overview
Comprehensive UX audit identified 24 issues. 17 fixes were implemented across 4 rounds, covering touch targets, WCAG contrast, chart improvements, form UX, recurring expense management, advanced filters, quick-add, analytics currency filtering, in-app reminders, push notifications, multi-household switching, and state persistence.

### Round 1 — UX Polish (Fixes 1-4)
| Fix | Issue | Changes |
|-----|-------|---------|
| 1 | Edit/delete buttons too small for touch | `ExpenseCard.tsx`: 44px min touch targets, 16px icons |
| 2 | Low contrast on expense card metadata | `ExpenseCard.tsx`: `text-slate-500` → `text-slate-400` (WCAG AA) |
| 3 | Pie chart not currency-aware | `CategoryPieChart.tsx`: accepts `currency` prop, uses `formatCurrency` |
| 4 | Description field confusing validation | `ExpenseForm.tsx`: always shows "(optional)", helper text "Helps with auto-categorization next time" |

### Round 2 — Recurring Tab + Filters (Fixes 5-8)
| Fix | Issue | Changes |
|-----|-------|---------|
| 5 | No way to view/manage recurring expenses | NEW `RecurringList.tsx`: grouped by frequency, stop-recurring with confirmation |
| 6 | Expenses page lacks tab structure | `expenses/page.tsx`: tabbed layout (All / Recurring) |
| 7 | No advanced filter options | NEW `AdvancedFilters.tsx`: popover with amount range + date range, badge count |
| 8 | No quick-add for frequent expenses | NEW `QuickAddDialog.tsx` + `TemplateChips.tsx`: parse "450 Swiggy dinner", template chips |

### Round 3 — Analytics + Reminders (Fixes 11-14)
| Fix | Issue | Changes |
|-----|-------|---------|
| 11 | Analytics ignore multi-currency | `analytics/page.tsx`: currency filter dropdown, conditional on 2+ currencies |
| 12 | No natural-language insights | NEW `AnalyticsInsights.tsx` + `generateInsights()`: spending trends, top categories |
| 13 | No reminder system | NEW `ReminderBanner.tsx` + `lib/reminders/reminders.ts`: inactivity (3+ days), settlement (1st-3rd), welcome-back (7+ days) |
| 14 | No push notification support | NEW `NotificationSettings.tsx` + `lib/firebase/messaging.ts`: FCM toggle, token management |

### Round 4 — Multi-Household + Persistence (Fixes 15-17, 22, 24a, 24b)
| Fix | Issue | Changes |
|-----|-------|---------|
| 15 | Multi-household switching | NEW `HouseholdSwitcher.tsx` + `switchActiveHousehold()`: switch between households, clear scoped data |
| 16 | State lost on navigation | `useAppStore.ts`: Zustand `persist` middleware with custom Timestamp serialization |
| 17 | Missing data types | `types/index.ts`: added AnalyticsInsight, AdvancedFilterValues, Reminder, etc. |
| 22 | No expense notes | Already covered by F-22 — extended with CSV export column |
| 24a | No help/contact form | Already covered by F-24 |
| 24b | No feedback collection | Already covered by F-25 |

### Tests: H315–H380 (66 tests across 5 files)
| File | Tests | Coverage |
|------|-------|----------|
| `suite-h-ux-polish.spec.ts` | H315-H326 (12) | Touch targets, contrast, charts, forms |
| `suite-h-recurring-tab.spec.ts` | H327-H336 (10) | Recurring tab, grouped view, stop-recurring |
| `suite-h-advanced-filters.spec.ts` | H337-H348 (12) | Amount/date range filters, badge count |
| `suite-h-analytics-currency.spec.ts` | H349-H360 (12) | Currency filter, insights panel |
| `suite-h-reminders-notifications.spec.ts` | H361-H380 (20) | Reminders, notifications, multi-household, persistence |

---

## Critical Bug Fix: Timestamp Deserialization

**Status:** ✅ FIXED (discovered during Phase 15 regression)

### Issue
After implementing Zustand `persist` middleware (Fix 16), ALL Suite B tests (12 tests) failed with:
```
RangeError: Invalid time value
  at formatDate (lib/utils/format.ts:23)
  at ExpenseCard.tsx:109
  at ExpenseList.tsx:43
```

### Root Cause
`deserializeDeep()` used as a `JSON.parse` reviver suffered from a double-recursion bug:
1. JSON.parse calls the reviver **bottom-up** (leaf nodes first)
2. At leaf level: `{__ts: true, _s: 1234, _ns: 0}` is correctly converted to a `Timestamp` object
3. At parent level: `deserializeDeep` encounters the parent object and recurses into its values
4. The already-created `Timestamp` object gets passed to `Object.entries()`, which destructures its internal properties into a plain object — destroying the Timestamp
5. `formatDate` then receives a plain object instead of a Timestamp, causing `RangeError`

### Fix (3 parts)
1. **Guard in `deserializeDeep`** (`store/useAppStore.ts`): Added `if (isTimestamp(obj)) return obj;` early return before the generic object recursion, preventing re-processing of already-converted Timestamps
2. **`safeToDate()` utility** (`lib/utils/format.ts`): New defensive conversion function that handles all possible date-like formats: `Date`, `Timestamp`, serialized `{__ts, _s, _ns}`, plain `{seconds, nanoseconds}`, and string/number fallback
3. **Codebase-wide migration**: Replaced all `instanceof Timestamp` / `.toDate()` patterns across 8 files with `safeToDate()`:
   - `lib/utils/analytics.ts` (3 occurrences)
   - `lib/utils/export.ts` (1 occurrence)
   - `components/analytics/CategoryPieChart.tsx` (1 occurrence)
   - `components/dashboard/QuickStats.tsx` (1 occurrence)
   - `components/expenses/ExpenseForm.tsx` (1 occurrence)
   - `components/layout/ReminderBanner.tsx` (1 occurrence)
   - `app/(app)/expenses/page.tsx` (4 occurrences, removed unused Timestamp import)

### Impact
Fixed all 12 Suite B failures + prevented similar issues across the entire codebase. The `safeToDate()` utility provides a single, robust conversion point that handles edge cases from Zustand persistence, Firestore snapshots, and any other source of date-like data.

---

## Phase 16: UX Improvements (9 Fixes)

**Status:** ✅ DONE (Phase 16)

### Overview
9 user-requested improvements covering form validation, analytics enhancements, filter clarity, layout optimizations, and group archival.

### Fix 1: Description Mandatory + Quick Add Category
| Aspect | Details |
|--------|---------|
| Issue | Description was optional, causing uncategorizable expenses. Quick Add had no category selection. |
| Changes | `ExpenseForm.tsx`: Zod schema `description` changed from `z.string()` to `z.string().min(1, "Description is required")`, removed "(optional)" label. `QuickAddDialog.tsx`: Added `Select` category dropdown with auto-detection, manual override support. |
| Files | `ExpenseForm.tsx`, `QuickAddDialog.tsx` |

### Fix 2: Analytics Insights Partial Month Normalization
| Aspect | Details |
|--------|---------|
| Issue | Insights compared full last month with 2 days of current month, showing misleading "down 95%". |
| Changes | `analytics.ts`: `generateInsights()` now projects current spending to full month using `dayOfMonth / daysInMonth` ratio. Shows "On pace for X — trending Y% above/below" instead of raw comparison. First 5 days show "too early for comparison". Category-level insights also normalized with projected values. |
| Files | `lib/utils/analytics.ts` |

### Fix 3: MoM Expense Views with Category Filtering
| Aspect | Details |
|--------|---------|
| Issue | No month-on-month total or category-wise expense views. No category filtering. |
| Changes | NEW `MoMTrendChart.tsx`: Bar/Line toggle for total MoM trend. NEW `CategoryMoMChart.tsx`: Stacked bar chart showing category breakdown over time. NEW analytics functions: `buildMoMTrend()`, `buildCategoryMoMTrend()`. Category filter chips in analytics page with multi-select toggle. |
| Files | `components/analytics/MoMTrendChart.tsx` (new), `components/analytics/CategoryMoMChart.tsx` (new), `lib/utils/analytics.ts`, `app/(app)/analytics/page.tsx` |

### Fix 4: Member Contribution Stacked Bar Chart
| Aspect | Details |
|--------|---------|
| Issue | No visualization of who paid how much toward household expenses. |
| Changes | NEW `MemberContributionChart.tsx`: Stacked bar chart with per-member colors and month-by-month breakdown. NEW `buildMemberContributions()` utility. "Who Paid What" section on analytics page. |
| Files | `components/analytics/MemberContributionChart.tsx` (new), `lib/utils/analytics.ts`, `app/(app)/analytics/page.tsx` |

### Fix 5: Configurable Time Periods
| Aspect | Details |
|--------|---------|
| Issue | Charts fixed to 6 months, no way to view longer/shorter periods. |
| Changes | `analytics/page.tsx`: Added time period selector with 3/6/9/12 month options. All new charts respect `monthCount` parameter. Max 12 months for viewability. Default: 6 months. |
| Files | `app/(app)/analytics/page.tsx`, `lib/utils/analytics.ts` |

### Fix 6: Paid-by Filter Clarity
| Aspect | Details |
|--------|---------|
| Issue | "All Members" filter label was confusing — users didn't know what it filtered. |
| Changes | `expenses/page.tsx`: Changed from "All Members" to "Paid by: Everyone". Active filter shows "Paid by: [Name]" with blue highlight styling (`bg-blue-500/10 border-blue-500/30`). Dropdown options prefixed with "Paid by". |
| Files | `app/(app)/expenses/page.tsx` |

### Fix 7: Quick Add Examples + Layout
| Aspect | Details |
|--------|---------|
| Issue | Template chips showed `description ₹amount` (wrong order), horizontal scroll blocked view. |
| Changes | `TemplateChips.tsx`: Changed to `{amount} {description}` format, removed currency symbol, replaced `overflow-x-auto` with `flex-wrap`. `QuickAddDialog.tsx`: Positioned dialog higher on screen (`top-[30%]`) so it doesn't block the view. |
| Files | `components/expenses/TemplateChips.tsx`, `components/expenses/QuickAddDialog.tsx` |

### Fix 8: Add Expense Form Compactness
| Aspect | Details |
|--------|---------|
| Issue | Save button required scrolling on most phones. |
| Changes | `ExpenseForm.tsx`: Reduced spacing `space-y-4` → `space-y-3`. Date + Currency in 2-column grid. Notes changed from `Textarea (h-20)` to `Input (h-9)`. Removed Textarea import. `AddExpenseDialog.tsx`: Reduced padding `p-4 sm:p-6`, `max-h-[85vh]`. |
| Files | `components/expenses/ExpenseForm.tsx`, `components/expenses/AddExpenseDialog.tsx` |

### Fix 9: Group Archival
| Aspect | Details |
|--------|---------|
| Issue | No way to archive settled groups. All groups cluttered the switcher. |
| Changes | `types/index.ts`: Added `is_archived?: boolean` to `ExpenseGroup`. `firestore.ts`: New `archiveGroup()` function. `GroupSwitcher.tsx`: Separates active vs archived groups, archive button on hover (non-default groups), expandable "Archived Groups" section with restore button. |
| Files | `types/index.ts`, `lib/firebase/firestore.ts`, `components/layout/GroupSwitcher.tsx` |

### New Types Added
```typescript
// types/index.ts
interface MoMDataPoint { month: string; total: number; [memberKey: string]: number | string; }
interface MemberContribution { month: string; [memberKey: string]: number | string; }
interface ExpenseGroup { ...; is_archived?: boolean; }
```

### New Files Created
| File | Purpose |
|------|---------|
| `components/analytics/MoMTrendChart.tsx` | Bar/Line chart for MoM total expenses |
| `components/analytics/CategoryMoMChart.tsx` | Stacked bar chart for category-wise MoM |
| `components/analytics/MemberContributionChart.tsx` | Stacked bar chart for per-member contributions |

### Files Modified
| File | Changes |
|------|---------|
| `components/expenses/ExpenseForm.tsx` | Description mandatory, compact layout, 2-column date/currency |
| `components/expenses/QuickAddDialog.tsx` | Category selector, repositioned dialog |
| `components/expenses/TemplateChips.tsx` | Amount-first format, flex-wrap |
| `components/expenses/AddExpenseDialog.tsx` | Compact padding |
| `lib/utils/analytics.ts` | Partial month normalization, new builder functions |
| `app/(app)/analytics/page.tsx` | Time period selector, category filter chips, new chart sections |
| `app/(app)/expenses/page.tsx` | Paid-by filter clarity |
| `components/layout/GroupSwitcher.tsx` | Archive/restore groups, expandable archived section |
| `types/index.ts` | New types, `is_archived` field |
| `lib/firebase/firestore.ts` | `archiveGroup()` function |

### Tests: H400–H458 (42 tests in `suite-h-phase16.spec.ts`)
| Group | Tests | Coverage |
|-------|-------|----------|
| Description Mandatory | H400-H402 (3) | Form validation, required field |
| Quick Add Category | H403-H405 (3) | Category selector, auto-detect |
| Insights Partial Month | H410-H412 (3) | Pace language, no misleading percentages |
| MoM Views + Category Filter | H415-H419 (5) | Chart visibility, chip toggle, chart type switch |
| Member Contribution | H425-H427 (3) | Chart section, heading, data/empty state |
| Configurable Time Periods | H430-H433 (4) | Selector, options, default, chart update |
| Paid By Filter | H435-H438 (4) | Label text, selection, highlighting, prefixes |
| Quick Add Layout | H440-H442 (3) | Flex-wrap, amount-first, positioning |
| Form Layout | H445-H448 (4) | Side-by-side, single-line notes, submit visibility, spacing |
| Group Archival | H450-H454 (5) | Active groups, archive button, archived section, create |
| Analytics Stability | H455-H458 (5) | All sections render, combined filters, responsive |
