import { NextResponse } from "next/server";

/**
 * Email ingestion webhook — placeholder for Amazon SES integration.
 *
 * When SES receives an email at the configured address, it forwards the
 * parsed payload here. A real implementation would:
 * 1. Validate a shared secret header (X-SES-Webhook-Secret).
 * 2. Parse the email body/subject with a regex or LLM to extract amount + merchant.
 * 3. Run autoCategory() to assign a category.
 * 4. Write the expense to Firestore with source: "email".
 *
 * This stub returns 200 to avoid SES retry storms during development.
 */
export async function POST() {
  // TODO: Implement SES email parsing and Firestore write
  return NextResponse.json(
    { message: "Email ingestion endpoint — not yet implemented." },
    { status: 200 }
  );
}
