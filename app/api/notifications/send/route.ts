import { NextRequest, NextResponse } from "next/server";
import { getAdminMessaging, getAdminFirestore } from "@/lib/firebase/admin";

// ─── Request schema ─────────────────────────────────────────────────────────

interface NotificationPayload {
  household_id: string;
  sender_uid: string;
  type: "expense_created" | "expense_updated" | "settlement_recorded";
  title: string;
  body: string;
  url: string;
}

// ─── POST /api/notifications/send ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const payload: NotificationPayload = await request.json();

    // ── Validate required fields ────────────────────────────────────────
    if (
      !payload.household_id ||
      !payload.sender_uid ||
      !payload.title ||
      !payload.body
    ) {
      return NextResponse.json(
        { error: "Missing required fields: household_id, sender_uid, title, body" },
        { status: 400 }
      );
    }

    const adminDb = getAdminFirestore();
    const adminMessaging = getAdminMessaging();

    // ── 1. Look up household → find partner UID ─────────────────────────
    const householdSnap = await adminDb
      .collection("households")
      .doc(payload.household_id)
      .get();

    if (!householdSnap.exists) {
      return NextResponse.json(
        { error: "Household not found" },
        { status: 404 }
      );
    }

    const householdData = householdSnap.data();
    const members: string[] = householdData?.members ?? [];
    const partnerUids = members.filter((uid) => uid !== payload.sender_uid);

    if (partnerUids.length === 0) {
      // No partner has joined yet — not an error, just nothing to send
      return NextResponse.json(
        { message: "No partner in household" },
        { status: 200 }
      );
    }

    // ── 2. Fetch each partner's FCM token and send ──────────────────────
    const results = await Promise.allSettled(
      partnerUids.map(async (partnerUid) => {
        const partnerSnap = await adminDb
          .collection("users")
          .doc(partnerUid)
          .get();

        const partnerData = partnerSnap.data();
        const fcmToken: string | null = partnerData?.fcm_token ?? null;

        if (!fcmToken) {
          return { uid: partnerUid, sent: false, reason: "no_token" };
        }

        // ── 3. Build and send FCM message ─────────────────────────────
        await adminMessaging.send({
          token: fcmToken,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          data: {
            type: payload.type,
            url: payload.url ?? "/dashboard",
            household_id: payload.household_id,
          },
          webpush: {
            fcmOptions: {
              link: payload.url ?? "/dashboard",
            },
            notification: {
              icon: "/icons/icon-192x192.png",
              badge: "/icons/icon-72x72.png",
            },
          },
        });

        return { uid: partnerUid, sent: true };
      })
    );

    return NextResponse.json({ success: true, results }, { status: 200 });
  } catch (error: unknown) {
    // ── Handle expired / invalid FCM tokens gracefully ──────────────────
    const errCode = (error as { code?: string })?.code;
    if (
      errCode === "messaging/registration-token-not-registered" ||
      errCode === "messaging/invalid-registration-token"
    ) {
      return NextResponse.json(
        { message: "Partner FCM token expired or invalid" },
        { status: 200 }
      );
    }

    console.error("Push notification error:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
