import type { Category } from "@/types";

/**
 * Smart categorization engine.
 * Sanitizes input, then scans all category keyword arrays for a match.
 * Returns the matching category ID, or null if no match found.
 */
export const autoCategory = (
  description: string,
  categories: Category[]
): string | null => {
  const sanitized = description.toLowerCase().trim();
  if (!sanitized) return null;

  for (const category of categories) {
    for (const keyword of category.keywords) {
      const kw = keyword.toLowerCase().trim();
      if (kw && sanitized.includes(kw)) {
        return category.id;
      }
    }
  }

  return null;
};

/**
 * Description-to-category memory lookup.
 * Given a description and a memory map (lowercase description → category_id),
 * returns the category ID if a case-insensitive exact match exists.
 */
export const memoryCategory = (
  description: string,
  memory: Record<string, string>
): string | null => {
  const normalized = description.toLowerCase().trim();
  if (!normalized) return null;
  return memory[normalized] ?? null;
};
