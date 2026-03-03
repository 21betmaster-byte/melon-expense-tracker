export interface QuickAddParsed {
  amount: number | null;
  description: string;
}

/**
 * Parse a quick-add input string like "450 Swiggy dinner" into amount + description.
 * Supports leading number (primary), strips currency symbols (₹, $, €, £).
 */
export function parseQuickAdd(input: string): QuickAddParsed {
  const trimmed = input.trim();
  if (!trimmed) return { amount: null, description: "" };

  // Strip common currency symbols
  const cleaned = trimmed.replace(/^[₹$€£]\s*/, "");

  // Primary pattern: leading number followed by description
  const leadingMatch = cleaned.match(/^(\d+(?:\.\d{1,2})?)\s+(.+)$/);
  if (leadingMatch) {
    return {
      amount: parseFloat(leadingMatch[1]),
      description: leadingMatch[2].trim(),
    };
  }

  // Check if input is just a number
  const numberOnly = cleaned.match(/^(\d+(?:\.\d{1,2})?)$/);
  if (numberOnly) {
    return { amount: parseFloat(numberOnly[1]), description: "" };
  }

  // No number found — treat entire input as description
  return { amount: null, description: trimmed };
}
