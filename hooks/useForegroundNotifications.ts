"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { onForegroundMessage } from "@/lib/firebase/messaging";
import { toast } from "sonner";

/**
 * Listens for Firebase Cloud Messaging push notifications while the app
 * is in the foreground.  When a message arrives, it is shown as a Sonner
 * toast at the top of the screen.
 *
 * Mount this hook once inside AuthGuard so it activates for all
 * authenticated pages.
 */
export function useForegroundNotifications() {
  const { user } = useAppStore();

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onForegroundMessage((payload) => {
      toast(payload.title ?? "Melon", {
        description: payload.body ?? "You have a new notification.",
        duration: 5000,
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, [user]);
}
