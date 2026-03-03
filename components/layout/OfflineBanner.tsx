"use client";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { WifiOff } from "lucide-react";

export const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-center gap-2 text-amber-400 text-sm"
      data-testid="offline-banner"
    >
      <WifiOff className="w-4 h-4" />
      <span>You&apos;re offline — expenses will sync when connected</span>
    </div>
  );
};
