import type { NotificationContent } from "./buildNotificationPayload";

// ─── Types ──────────────────────────────────────────────────────────────────

type NotificationType =
  | "expense_created"
  | "expense_updated"
  | "settlement_recorded";

interface SendPushParams extends NotificationContent {
  householdId: string;
  senderUid: string;
  type: NotificationType;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fire-and-forget push notification sender.
 *
 * Calls the server-side API route which uses Firebase Admin SDK to deliver
 * the FCM message.  This function intentionally never throws — push
 * notifications are a best-effort feature and must never block the UI.
 */
export async function sendPushNotification(
  params: SendPushParams
): Promise<void> {
  try {
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        household_id: params.householdId,
        sender_uid: params.senderUid,
        type: params.type,
        title: params.title,
        body: params.body,
        url: params.url,
      }),
    });
    // We intentionally don't check the response — fire-and-forget
  } catch {
    // Notification sending is non-critical
    console.warn("Failed to send push notification (network error)");
  }
}
