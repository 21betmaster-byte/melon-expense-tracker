"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createHousehold } from "@/lib/firebase/firestore";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { Home, Copy, Check, Share2, ArrowRight } from "lucide-react";
import { getUserProfile } from "@/lib/firebase/firestore";
import { Timestamp } from "firebase/firestore";
import { formatCountdown, getInviteUrl, shareInvite } from "@/lib/utils/invite";
import type { CountdownResult } from "@/lib/utils/invite";

interface CreateHouseholdCardProps {
  onSuccess?: () => void;
}

export const CreateHouseholdCard = ({ onSuccess }: CreateHouseholdCardProps) => {
  const router = useRouter();
  const { firebaseUser, setUser } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Timestamp | null>(null);
  const [countdown, setCountdown] = useState<CountdownResult | null>(null);

  const updateCountdown = useCallback(() => {
    if (!expiresAt) return;
    setCountdown(formatCountdown(expiresAt));
  }, [expiresAt]);

  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 60_000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

  const handleCreate = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      const householdId = await createHousehold(firebaseUser.uid);

      // Fetch updated user profile with household_id
      const updatedProfile = await getUserProfile(firebaseUser.uid);
      if (updatedProfile) setUser(updatedProfile);

      const { getDoc, doc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase/config");
      const snap = await getDoc(doc(db, "households", householdId));
      const data = snap.data();
      const inviteCode = data?.invite_code;
      const inviteExpiry = data?.invite_expires_at as Timestamp | undefined;

      if (inviteExpiry) setExpiresAt(inviteExpiry);
      setInviteLink(getInviteUrl(inviteCode));

      toast.success("Household created! Invite your partner with the link below.");
    } catch {
      toast.error("Failed to create household. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Invite link copied!");
  };

  const handleShare = async () => {
    if (!inviteLink) return;
    const result = await shareInvite(inviteLink);
    if (result === "shared") {
      toast.success("Invite shared!");
    } else if (result === "copied") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Invite link copied!");
    } else {
      toast.error("Failed to share invite link.");
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2">
          <Home className="w-5 h-5 text-blue-400" />
          Create a Household
        </CardTitle>
        <CardDescription className="text-slate-400">
          Set up your shared expense tracker. Invite your partner after creation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!inviteLink ? (
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="w-full"
            data-testid="create-household-btn"
          >
            {loading ? "Creating…" : "Create Household"}
          </Button>
        ) : (
          <div className="space-y-4">
            {/* Step 1: Share the link */}
            <div className="space-y-2" data-testid="invite-step-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-xs font-bold">
                  1
                </span>
                <p className="text-sm text-slate-200 font-medium">
                  Share this link with your partner
                </p>
              </div>
              <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
                <p className="text-sm text-slate-300 break-all font-mono">
                  {inviteLink}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleShare}
                  className="flex-1 gap-2"
                  data-testid="create-share-invite-btn"
                >
                  <Share2 className="w-4 h-4" /> Share
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-1 gap-2"
                  data-testid="create-copy-invite-btn"
                >
                  {copied ? (
                    <><Check className="w-4 h-4" /> Copied!</>
                  ) : (
                    <><Copy className="w-4 h-4" /> Copy Link</>
                  )}
                </Button>
              </div>
              {countdown && (
                <p
                  className={`text-xs ${
                    countdown.isExpired
                      ? "text-red-400"
                      : countdown.isWarning
                      ? "text-amber-400"
                      : "text-slate-500"
                  }`}
                  data-testid="create-invite-countdown"
                >
                  {countdown.text}
                </p>
              )}
            </div>

            {/* Step 2: Partner joins */}
            <div className="flex items-center gap-2" data-testid="invite-step-2">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-700 text-slate-300 text-xs font-bold">
                2
              </span>
              <p className="text-sm text-slate-400">
                Your partner signs up and clicks the link to join
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => onSuccess ? onSuccess() : router.push("/dashboard")}
                className="flex-1 gap-1.5"
              >
                Go to Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => onSuccess ? onSuccess() : router.push("/dashboard")}
                className="flex-1"
                data-testid="skip-for-now-btn"
              >
                Skip for now
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
