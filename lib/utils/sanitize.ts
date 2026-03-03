/**
 * Strips HTML/JS injection attempts from a string.
 * React already escapes output by default, but we also sanitize
 * before writing to Firestore to prevent stored-XSS.
 */
export const sanitizeText = (input: string): string => {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
};

export const sanitizeKeyword = (input: string): string => {
  return input.toLowerCase().trim().replace(/[<>"'/]/g, "");
};
