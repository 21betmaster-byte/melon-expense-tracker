/**
 * Test data factory — all generated values use E2E_TEST_ prefix
 * for easy identification and cleanup.
 */

const timestamp = () => Date.now().toString(36);

export interface TestExpenseData {
  amount: string;
  description: string;
  type?: "solo" | "joint" | "settlement";
  notes?: string;
  recurring?: boolean;
  currency?: string;
}

/**
 * Generate test expense data with E2E_TEST_ prefix.
 */
export function testExpenseData(overrides: Partial<TestExpenseData> = {}): TestExpenseData {
  return {
    amount: "42.50",
    description: `E2E_TEST_expense_${timestamp()}`,
    type: "solo",
    ...overrides,
  };
}

/**
 * Generate a test group name with E2E_TEST_ prefix.
 */
export function testGroupName(): string {
  return `E2E_TEST_group_${timestamp()}`;
}

/**
 * Generate a test category name with E2E_TEST_ prefix.
 */
export function testCategoryName(): string {
  return `E2E_TEST_cat_${timestamp()}`;
}

/**
 * Generate a unique description for settlement tests.
 */
export function testSettlementDescription(): string {
  return `E2E_TEST_settle_${timestamp()}`;
}
