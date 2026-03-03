"use client";
import { getMessaging, getToken, onMessage, type Messaging } from "firebase/messaging";
import { app } from "./config";
import { updateDoc, doc } from "firebase/firestore";
import { db } from "./config";

let messaging: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;
  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch {
      console.warn("Failed to initialize Firebase Messaging");
      return null;
    }
  }
  return messaging;
}

/**
 * Request notification permission and get FCM token.
 * Returns the token string or null if permission denied / unsupported.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (!("Notification" in window)) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const msg = getMessagingInstance();
  if (!msg) return null;

  try {
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    const token = await getToken(msg, {
      vapidKey,
      serviceWorkerRegistration: await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      ),
    });
    return token;
  } catch (err) {
    console.error("Failed to get FCM token:", err);
    return null;
  }
}

/**
 * Save FCM token to user's Firestore document.
 */
export async function saveFCMToken(uid: string, token: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    fcm_token: token,
  });
}

/**
 * Remove FCM token from user's Firestore document (opt out).
 */
export async function removeFCMToken(uid: string): Promise<void> {
  await updateDoc(doc(db, "users", uid), {
    fcm_token: null,
  });
}

/**
 * Listen for foreground push messages.
 * Returns an unsubscribe function.
 */
export function onForegroundMessage(
  callback: (payload: { title?: string; body?: string }) => void
): (() => void) | null {
  const msg = getMessagingInstance();
  if (!msg) return null;

  return onMessage(msg, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
    });
  });
}
