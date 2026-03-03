import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK — server-side only.
 *
 * Used by API routes (e.g. /api/notifications/send) that need privileged
 * access to Firestore and FCM.  The service-account JSON is stored as a
 * base64-encoded environment variable so it never touches the file-system.
 */

let _app: App | undefined;

function getAdminApp(): App {
  if (_app || getApps().length > 0) {
    return _app ?? getApps()[0];
  }

  const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountBase64) {
    throw new Error(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY is not set. " +
        "Generate a service-account key in Firebase Console → Project Settings → Service accounts, " +
        "base64-encode the JSON, and add it to .env.local."
    );
  }

  // Support both raw JSON string and base64-encoded JSON.
  // base64 is preferred (single-line, safe for .env files).
  let serviceAccount: Record<string, string>;
  try {
    // Try raw JSON first (starts with '{')
    const trimmed = serviceAccountBase64.trim();
    if (trimmed.startsWith("{")) {
      serviceAccount = JSON.parse(trimmed);
    } else {
      serviceAccount = JSON.parse(
        Buffer.from(trimmed, "base64").toString("utf-8")
      );
    }
  } catch (e) {
    throw new Error(
      "FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY is not valid JSON or base64. " +
        "Expected base64-encoded service-account JSON (single line)."
    );
  }

  _app = initializeApp({
    credential: cert(serviceAccount),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });

  return _app;
}

/** Firebase Admin Messaging — for sending push notifications. */
export function getAdminMessaging(): Messaging {
  return getMessaging(getAdminApp());
}

/** Firebase Admin Firestore — for server-side reads (e.g. partner FCM token). */
export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}
