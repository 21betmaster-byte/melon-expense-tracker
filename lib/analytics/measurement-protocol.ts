/**
 * GA4 Measurement Protocol — server-side event sender.
 *
 * Sends events to GA4 from API routes / server actions where the client-side
 * Firebase Analytics SDK is unavailable.
 *
 * Requires:
 *   - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID (GA4 measurement ID, e.g. G-XXXXXXXX)
 *   - GA4_API_SECRET (server-only, generate in GA4 Admin > Data Streams > Measurement Protocol API secrets)
 */

const GA4_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
const GA4_API_SECRET = process.env.GA4_API_SECRET;

interface MeasurementProtocolEvent {
  name: string;
  params?: Record<string, string | number>;
}

/**
 * Send one or more events to GA4 via Measurement Protocol.
 *
 * @param clientId Stable identifier (e.g. "server-cron" or hashed userId)
 * @param events   Array of events to send
 */
export async function sendServerEvent(
  clientId: string,
  events: MeasurementProtocolEvent[],
): Promise<void> {
  if (!GA4_MEASUREMENT_ID || !GA4_API_SECRET) {
    if (process.env.NODE_ENV === "development") {
      console.debug(
        "[MeasurementProtocol] Skipped — missing MEASUREMENT_ID or API_SECRET",
        { clientId, events },
      );
    }
    return;
  }

  try {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: clientId, events }),
      },
    );
  } catch {
    // Measurement Protocol failures must never affect the request
  }
}
