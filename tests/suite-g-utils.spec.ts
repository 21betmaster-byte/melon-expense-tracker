import { test, expect } from "@playwright/test";
import { Timestamp } from "firebase/firestore";
import type { Expense, Category } from "../types";

// Pure utility imports — no browser needed
import { autoCategory } from "../lib/utils/categorization";
import { sanitizeText, sanitizeKeyword } from "../lib/utils/sanitize";
import { formatCurrency, formatDate, formatMonth } from "../lib/utils/format";
import { buildMonthlyTrend, buildCategoryMoM, generateInsights } from "../lib/utils/analytics";

/**
 * Suite G: Utility Unit Tests
 *
 * Pure function tests — no browser or Firebase required.
 * Covers:
 *  G1–G5  autoCategory (smart categorization engine)
 *  G6–G9  sanitizeText / sanitizeKeyword (XSS prevention)
 *  G10–G12 formatCurrency (multi-currency display)
 *  G13–G14 formatDate / formatMonth
 *  G15–G17 buildMonthlyTrend (analytics)
 *  G18–G19 buildCategoryMoM (month-over-month analytics)
 */

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeCategory = (id: string, name: string, keywords: string[]): Category => ({
  id, name, keywords,
});

const makeExpense = (
  overrides: Partial<Expense> & Pick<Expense, "amount" | "expense_type" | "paid_by_user_id">
): Expense => ({
  id: Math.random().toString(36),
  description: "test",
  group_id: "g1",
  category_id: "cat1",
  source: "manual",
  split_ratio: 0.5,
  date: Timestamp.now(),
  ...overrides,
});

// Back-date a timestamp by N months
const monthsAgo = (n: number): Timestamp => {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return Timestamp.fromDate(d);
};

// ─── G1–G5: autoCategory ─────────────────────────────────────────────────────

test.describe("Suite G: autoCategory", () => {
  const categories: Category[] = [
    makeCategory("food", "Food & Dining", ["swiggy", "zomato", "restaurant", "lunch", "dinner", "pizza"]),
    makeCategory("travel", "Travel", ["uber", "ola", "flight", "hotel", "taxi"]),
    makeCategory("grocery", "Groceries", ["bigbasket", "blinkit", "dmart", "zepto", "milk", "vegetables"]),
    makeCategory("util", "Utilities", ["electricity", "water bill", "wifi", "broadband"]),
  ];

  test("G1: Matches exact keyword in description", () => {
    expect(autoCategory("Swiggy order tonight", categories)).toBe("food");
  });

  test("G2: Case-insensitive match — uppercase input", () => {
    expect(autoCategory("ZOMATO LUNCH", categories)).toBe("food");
  });

  test("G3: Partial keyword match within description", () => {
    expect(autoCategory("Booked an uber for the airport", categories)).toBe("travel");
  });

  test("G4: Returns null when no keyword matches", () => {
    expect(autoCategory("Monthly gym membership", categories)).toBeNull();
  });

  test("G5: Empty description returns null", () => {
    expect(autoCategory("", categories)).toBeNull();
  });

  test("G6: Matches first category when multiple could match", () => {
    // "zomato pizza" — both food keywords; should still return "food"
    const result = autoCategory("zomato pizza delivery", categories);
    expect(result).toBe("food");
  });
});

// ─── G6–G9: sanitizeText / sanitizeKeyword ────────────────────────────────────

test.describe("Suite G: sanitizeText", () => {
  test("G7: Strips script tags from input", () => {
    const result = sanitizeText("<script>alert('xss')</script>");
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("</script>");
  });

  test("G8: Replaces < and > with HTML entities", () => {
    const result = sanitizeText("<b>bold</b>");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
    expect(result).not.toContain("<b>");
  });

  test("G9: Normal text passes through unchanged (after trim)", () => {
    const result = sanitizeText("  Swiggy dinner  ");
    expect(result).toBe("Swiggy dinner");
  });

  test("G10: sanitizeKeyword strips disallowed chars and lowercases", () => {
    const result = sanitizeKeyword("Swiggy<Food>");
    expect(result).toBe("swiggyfood");
    expect(result).not.toMatch(/[<>"'/]/);
  });

  test("G11: sanitizeKeyword handles empty string", () => {
    expect(sanitizeKeyword("")).toBe("");
  });
});

// ─── G10–G12: formatCurrency ─────────────────────────────────────────────────

test.describe("Suite G: formatCurrency", () => {
  test("G12: INR formats with ₹ symbol and Indian locale", () => {
    const result = formatCurrency(1234.5, "INR");
    expect(result).toContain("₹");
    expect(result).toContain("1,234.5");
  });

  test("G13: INR whole numbers have no unnecessary decimal", () => {
    const result = formatCurrency(500, "INR");
    expect(result).toBe("₹500");
  });

  test("G14: USD formats with $ symbol via Intl", () => {
    const result = formatCurrency(99.99, "USD");
    expect(result).toContain("$");
    expect(result).toContain("99.99");
  });

  test("G15: Negative amounts are treated as absolute (no sign)", () => {
    // formatCurrency uses Math.abs internally
    const pos = formatCurrency(500, "INR");
    const neg = formatCurrency(-500, "INR");
    expect(pos).toBe(neg);
  });

  test("G16: EUR formats with € symbol", () => {
    const result = formatCurrency(250, "EUR");
    expect(result).toContain("€");
  });
});

// ─── G13–G14: formatDate / formatMonth ───────────────────────────────────────

test.describe("Suite G: formatDate / formatMonth", () => {
  test("G17: formatDate returns human-readable string", () => {
    const ts = Timestamp.fromDate(new Date("2025-01-15"));
    const result = formatDate(ts);
    expect(result).toMatch(/15 Jan 2025/);
  });

  test("G18: formatDate accepts plain Date objects", () => {
    const result = formatDate(new Date("2024-06-01"));
    expect(result).toMatch(/1 Jun 2024/);
  });

  test("G19: formatMonth returns short month + year", () => {
    const result = formatMonth(new Date("2025-03-01"));
    expect(result).toMatch(/Mar 25/);
  });
});

// ─── G15–G17: buildMonthlyTrend ──────────────────────────────────────────────

test.describe("Suite G: buildMonthlyTrend", () => {
  const userA = "uid-a";
  const userB = "uid-b";

  test("G20: Returns exactly 6 months of data", () => {
    const result = buildMonthlyTrend([], userA, userB);
    expect(result).toHaveLength(6);
  });

  test("G21: Months are in chronological order (oldest first)", () => {
    const result = buildMonthlyTrend([], userA, userB);
    // Each month entry should be a valid string like "Jan 25"
    expect(result[0].month).toBeTruthy();
    expect(result[5].month).toBeTruthy();
    // Current month is last
    const now = new Date();
    const currentLabel = formatMonth(now);
    expect(result[result.length - 1].month).toBe(currentLabel);
  });

  test("G22: Joint expenses add to total but not per-user amounts", () => {
    const expenses: Expense[] = [
      makeExpense({ amount: 1000, expense_type: "joint", paid_by_user_id: userA, date: monthsAgo(0) }),
    ];
    const result = buildMonthlyTrend(expenses, userA, userB);
    const currentMonth = result[result.length - 1];
    expect(currentMonth.total).toBe(1000);
    // Joint expenses don't increment userA/userB individual totals
    expect(currentMonth.userA).toBe(0);
    expect(currentMonth.userB).toBe(0);
  });

  test("G23: Solo expenses add to both total and the correct user's amount", () => {
    const expenses: Expense[] = [
      makeExpense({ amount: 500, expense_type: "solo", paid_by_user_id: userA, date: monthsAgo(0) }),
      makeExpense({ amount: 300, expense_type: "solo", paid_by_user_id: userB, date: monthsAgo(0) }),
    ];
    const result = buildMonthlyTrend(expenses, userA, userB);
    const currentMonth = result[result.length - 1];
    expect(currentMonth.total).toBe(800);
    expect(currentMonth.userA).toBe(500);
    expect(currentMonth.userB).toBe(300);
  });

  test("G24: Settlement expenses are excluded from totals", () => {
    const expenses: Expense[] = [
      makeExpense({ amount: 1000, expense_type: "settlement", paid_by_user_id: userA, date: monthsAgo(0) }),
    ];
    const result = buildMonthlyTrend(expenses, userA, userB);
    const currentMonth = result[result.length - 1];
    expect(currentMonth.total).toBe(0);
  });

  test("G25: Expenses older than 6 months are excluded", () => {
    const expenses: Expense[] = [
      makeExpense({ amount: 9999, expense_type: "solo", paid_by_user_id: userA, date: monthsAgo(7) }),
    ];
    const result = buildMonthlyTrend(expenses, userA, userB);
    const totalAll = result.reduce((sum, m) => sum + m.total, 0);
    expect(totalAll).toBe(0);
  });
});

// ─── G18–G19: buildCategoryMoM ───────────────────────────────────────────────

test.describe("Suite G: buildCategoryMoM", () => {
  const categories: Category[] = [
    makeCategory("food", "Food & Dining", ["swiggy"]),
    makeCategory("travel", "Travel", ["uber"]),
  ];

  test("G26: Returns entries only for categories with non-zero spend", () => {
    const expenses: Expense[] = [
      makeExpense({
        amount: 800, expense_type: "joint", paid_by_user_id: "uid-a",
        category_id: "food", date: monthsAgo(0),
      }),
    ];
    const result = buildCategoryMoM(expenses, categories);
    // Only food has spend — travel should be filtered out
    expect(result.some((r) => r.category === "Food & Dining")).toBe(true);
    expect(result.some((r) => r.category === "Travel")).toBe(false);
  });

  test("G27: Current month spend goes into .current field", () => {
    const expenses: Expense[] = [
      makeExpense({
        amount: 600, expense_type: "joint", paid_by_user_id: "uid-a",
        category_id: "food", date: monthsAgo(0),
      }),
    ];
    const result = buildCategoryMoM(expenses, categories);
    const food = result.find((r) => r.category === "Food & Dining");
    expect(food?.current).toBe(600);
    expect(food?.previous).toBe(0);
  });

  test("G28: Previous month spend goes into .previous field", () => {
    const expenses: Expense[] = [
      makeExpense({
        amount: 400, expense_type: "joint", paid_by_user_id: "uid-a",
        category_id: "travel", date: monthsAgo(1),
      }),
    ];
    const result = buildCategoryMoM(expenses, categories);
    const travel = result.find((r) => r.category === "Travel");
    expect(travel?.previous).toBe(400);
    expect(travel?.current).toBe(0);
  });

  test("G29: Settlement expenses are excluded from MoM totals", () => {
    const expenses: Expense[] = [
      makeExpense({
        amount: 9999, expense_type: "settlement", paid_by_user_id: "uid-a",
        category_id: "food", date: monthsAgo(0),
      }),
    ];
    const result = buildCategoryMoM(expenses, categories);
    expect(result).toHaveLength(0);
  });

  test("G30: projectedCurrent field is returned for current month data", () => {
    const expenses: Expense[] = [
      makeExpense({
        amount: 600, expense_type: "joint", paid_by_user_id: "uid-a",
        category_id: "food", date: monthsAgo(0),
      }),
    ];
    const result = buildCategoryMoM(expenses, categories);
    const food = result.find((r) => r.category === "Food & Dining");
    expect(food).toBeDefined();
    expect(food?.projectedCurrent).toBeDefined();
    expect(typeof food?.projectedCurrent).toBe("number");
  });

  test("G31: projectedCurrent is >= current (projects partial month to full)", () => {
    const expenses: Expense[] = [
      makeExpense({
        amount: 1000, expense_type: "joint", paid_by_user_id: "uid-a",
        category_id: "food", date: monthsAgo(0),
      }),
    ];
    const result = buildCategoryMoM(expenses, categories);
    const food = result.find((r) => r.category === "Food & Dining");
    // Projected should always be >= actual current (since we're dividing by a fraction <= 1)
    expect(food!.projectedCurrent!).toBeGreaterThanOrEqual(food!.current);
  });

  test("G32: projectedCurrent equals current when only previous month has data", () => {
    const expenses: Expense[] = [
      makeExpense({
        amount: 500, expense_type: "joint", paid_by_user_id: "uid-a",
        category_id: "travel", date: monthsAgo(1),
      }),
    ];
    const result = buildCategoryMoM(expenses, categories);
    const travel = result.find((r) => r.category === "Travel");
    // current is 0, so projectedCurrent should also be 0
    expect(travel?.current).toBe(0);
    expect(travel?.projectedCurrent).toBe(0);
  });
});

// ─── G30–G34: generateInsights (normalized comparisons) ─────────────────────

test.describe("Suite G: generateInsights", () => {
  const categories: Category[] = [
    makeCategory("food", "Food & Dining", ["swiggy"]),
    makeCategory("travel", "Travel", ["uber"]),
    makeCategory("shop", "Shopping", ["amazon"]),
  ];
  const fmt = (n: number) => `₹${n}`;

  test("G33: Returns insights array (not empty) when data exists", () => {
    const catData = [
      { category: "Food & Dining", current: 500, previous: 1000, projectedCurrent: 2500 },
      { category: "Travel", current: 200, previous: 300, projectedCurrent: 1000 },
    ];
    const monthlyData = [
      { month: "Feb 26", total: 1300, userA: 0, userB: 0 },
      { month: "Mar 26", total: 700, userA: 0, userB: 0 },
    ];
    const expenses: Expense[] = [
      makeExpense({ amount: 500, expense_type: "joint", paid_by_user_id: "uid-a", category_id: "food", date: monthsAgo(0) }),
    ];
    const result = generateInsights(catData, monthlyData, expenses, categories, fmt);
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(4);
  });

  test("G34: Steady insight detects categories with similar current and previous spend", () => {
    // When current ≈ previous (within 10%), the steady insight should trigger.
    // Note: generateInsights internally computes projected values using the real date.
    // Early in the month (day <= 5), projected = current, so we test with close values.
    const catData = [
      { category: "Food & Dining", current: 950, previous: 1000, projectedCurrent: 950 },
      { category: "Travel", current: 500, previous: 100, projectedCurrent: 500 },
    ];
    const monthlyData = [
      { month: "Feb 26", total: 1100, userA: 0, userB: 0 },
      { month: "Mar 26", total: 1450, userA: 0, userB: 0 },
    ];
    const expenses: Expense[] = [
      makeExpense({ amount: 950, expense_type: "joint", paid_by_user_id: "uid-a", category_id: "food", date: monthsAgo(0) }),
      makeExpense({ amount: 1000, expense_type: "joint", paid_by_user_id: "uid-a", category_id: "food", date: monthsAgo(1) }),
      makeExpense({ amount: 500, expense_type: "joint", paid_by_user_id: "uid-a", category_id: "travel", date: monthsAgo(0) }),
    ];
    const result = generateInsights(catData, monthlyData, expenses, categories, fmt);
    const steadyInsight = result.find((i) => i.type === "steady");
    // Food is within 5% (950 vs 1000) — should be detected as steady
    expect(steadyInsight).toBeDefined();
    expect(steadyInsight?.text).toContain("steady");
    expect(steadyInsight?.text).toContain("Food & Dining");
  });

  test("G35: Returns empty array when no data provided", () => {
    const result = generateInsights([], [], [], categories, fmt);
    expect(result).toHaveLength(0);
  });

  test("G36: First month shows limited insights with encouraging message", () => {
    // No previous data — hasHistory is false
    const catData = [
      { category: "Food & Dining", current: 500, previous: 0, projectedCurrent: 2500 },
    ];
    const monthlyData = [
      { month: "Mar 26", total: 500, userA: 0, userB: 0 },
    ];
    const expenses: Expense[] = [
      makeExpense({ amount: 500, expense_type: "joint", paid_by_user_id: "uid-a", category_id: "food", date: monthsAgo(0) }),
    ];
    const result = generateInsights(catData, monthlyData, expenses, categories, fmt);
    const firstMonthInsight = result.find((i) => i.text.includes("first month"));
    expect(firstMonthInsight).toBeDefined();
  });
});

// ─── G37–G43: Push Notification Payload Builders ─────────────────────────────

import {
  buildExpenseCreatedPayload,
  buildExpenseUpdatedPayload,
  buildSettlementPayload,
} from "../lib/notifications/buildNotificationPayload";

test.describe("Suite G: Notification Payload Builders", () => {
  test("G37: buildExpenseCreatedPayload includes partner share for joint expense", () => {
    const result = buildExpenseCreatedPayload({
      senderName: "Shivam",
      description: "Swiggy dinner",
      amount: 500,
      currency: "INR",
      expenseType: "joint",
      splitRatio: 0.5,
    });
    expect(result.title).toBe("New Expense");
    expect(result.body).toContain("Shivam added: Swiggy dinner");
    expect(result.body).toContain("₹500");
    expect(result.body).toContain("Your share: ₹250");
    expect(result.body).toContain("Joint");
    expect(result.url).toBe("/expenses");
  });

  test("G38: buildExpenseCreatedPayload marks solo expense correctly", () => {
    const result = buildExpenseCreatedPayload({
      senderName: "Jhanvi",
      description: "Netflix",
      amount: 649,
      currency: "INR",
      expenseType: "solo",
      splitRatio: 1,
    });
    expect(result.body).toContain("Solo");
    expect(result.body).not.toContain("Your share");
  });

  test("G39: buildExpenseCreatedPayload handles non-equal split", () => {
    const result = buildExpenseCreatedPayload({
      senderName: "Shivam",
      description: "Groceries",
      amount: 1000,
      currency: "INR",
      expenseType: "joint",
      splitRatio: 0.7, // Shivam pays 70%, partner pays 30%
    });
    expect(result.body).toContain("Your share: ₹300");
  });

  test("G40: buildExpenseUpdatedPayload returns correct format", () => {
    const result = buildExpenseUpdatedPayload({
      senderName: "Shivam",
      description: "Swiggy dinner",
      amount: 600,
      currency: "INR",
      expenseType: "joint",
      splitRatio: 0.5,
    });
    expect(result.title).toBe("Expense Updated");
    expect(result.body).toContain("Shivam updated: Swiggy dinner");
    expect(result.body).toContain("₹600");
    expect(result.url).toBe("/expenses");
  });

  test("G41: buildSettlementPayload formats amount correctly", () => {
    const result = buildSettlementPayload({
      senderName: "Jhanvi",
      amount: 2500,
      currency: "INR",
    });
    expect(result.title).toBe("Settlement Recorded");
    expect(result.body).toContain("Jhanvi recorded a settlement of ₹2,500");
    expect(result.url).toBe("/dashboard");
  });

  test("G42: buildExpenseCreatedPayload works with USD currency", () => {
    const result = buildExpenseCreatedPayload({
      senderName: "Shivam",
      description: "Coffee",
      amount: 5.5,
      currency: "USD",
      expenseType: "joint",
      splitRatio: 0.5,
    });
    expect(result.body).toContain("$");
    expect(result.body).toContain("Shivam added: Coffee");
  });

  test("G43: buildSettlementPayload works with EUR currency", () => {
    const result = buildSettlementPayload({
      senderName: "Shivam",
      amount: 150,
      currency: "EUR",
    });
    expect(result.body).toContain("€");
    expect(result.body).toContain("150");
  });
});
