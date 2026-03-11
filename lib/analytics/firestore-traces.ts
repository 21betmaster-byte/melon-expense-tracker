/**
 * Firestore operation wrapper that creates Firebase Performance custom traces.
 *
 * Traces appear in Firebase Console > Performance > Custom Traces with
 * duration histograms and success/error breakdowns.
 */
import { startTrace } from "./tracker";

/**
 * Wrap a Firestore operation with a Performance trace.
 *
 * @example
 * const expenses = await tracedFirestoreOp("get_expenses", () =>
 *   getDocs(query(collection(db, "households", hid, "expenses")))
 * );
 */
export async function tracedFirestoreOp<T>(
  operationName: string,
  operation: () => Promise<T>,
): Promise<T> {
  const trace = startTrace(`firestore_${operationName}`);
  try {
    const result = await operation();
    trace?.putAttribute("status", "success");
    trace?.stop();
    return result;
  } catch (err) {
    trace?.putAttribute("status", "error");
    trace?.putAttribute(
      "error",
      err instanceof Error ? err.message.substring(0, 100) : "unknown",
    );
    trace?.stop();
    throw err;
  }
}
