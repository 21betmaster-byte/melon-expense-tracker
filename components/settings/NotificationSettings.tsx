"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import {
  requestNotificationPermission,
  saveFCMToken,
  removeFCMToken,
} from "@/lib/firebase/messaging";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

type PermissionStatus = "default" | "granted" | "denied" | "unsupported";

export const NotificationSettings = () => {
  const { user } = useAppStore();
  const [enabled, setEnabled] = useState(false);
  const [permStatus, setPermStatus] = useState<PermissionStatus>("default");
  const [loading, setLoading] = useState(false);

  // Check current notification permission on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermStatus("unsupported");
      return;
    }
    setPermStatus(Notification.permission as PermissionStatus);
    // If permission is granted, assume they opted in
    if (Notification.permission === "granted") {
      setEnabled(true);
    }
  }, []);

  const handleToggle = async (checked: boolean) => {
    if (!user) return;

    if (checked) {
      // Enable notifications
      setLoading(true);
      try {
        const token = await requestNotificationPermission();
        if (token) {
          await saveFCMToken(user.uid, token);
          setEnabled(true);
          setPermStatus("granted");
          toast.success("Push notifications enabled!");
        } else {
          setPermStatus(
            typeof Notification !== "undefined"
              ? (Notification.permission as PermissionStatus)
              : "unsupported"
          );
          if (Notification.permission === "denied") {
            toast.error(
              "Notification permission was denied. Please enable it in your browser settings."
            );
          }
        }
      } catch {
        toast.error("Failed to enable notifications.");
      } finally {
        setLoading(false);
      }
    } else {
      // Disable notifications
      setLoading(true);
      try {
        await removeFCMToken(user.uid);
        setEnabled(false);
        toast.success("Push notifications disabled.");
      } catch {
        toast.error("Failed to disable notifications.");
      } finally {
        setLoading(false);
      }
    }
  };

  if (permStatus === "unsupported") {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <BellOff className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm text-slate-300">Push Notifications</p>
              <p className="text-xs text-slate-500">
                Your browser does not support push notifications.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800" data-testid="notification-settings">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-slate-400" />
            <div>
              <Label htmlFor="push-toggle" className="text-sm text-slate-100">
                Push Notifications
              </Label>
              <p className="text-xs text-slate-400 mt-0.5">
                {permStatus === "denied"
                  ? "Blocked in browser settings"
                  : enabled
                  ? "You'll receive reminders about expenses and settlements"
                  : "Get reminders to log expenses and settle up"}
              </p>
            </div>
          </div>
          <Switch
            id="push-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={loading || permStatus === "denied"}
            data-testid="push-notifications-toggle"
          />
        </div>
      </CardContent>
    </Card>
  );
};
