"use client";
import { useState, useEffect, useCallback } from "react";
import { refreshInviteCode } from "@/lib/firebase/firestore";
import { updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, RefreshCw, Mail, Users, Share2 } from "lucide-react";
import { toast } from "sonner";
import { formatCountdown, getInviteUrl, shareInvite } from "@/lib/utils/invite";
import type { CountdownResult } from "@/lib/utils/invite";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const InvitePartner = () => {
  const { household, members, setHousehold } = useAppStore();
  const [email, setEmail] = useState(household?.invite_email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState<CountdownResult | null>(null);

  const updateCountdown = useCallback(() => {
    if (!household?.invite_expires_at) return;
    setCountdown(formatCountdown(household.invite_expires_at));
  }, [household?.invite_expires_at]);

  useEffect(() => {
    updateCountdown();
    const interval = setInterval(updateCountdown, 60_000);
    return () => clearInterval(interval);
  }, [updateCountdown]);

  const validateEmail = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setEmailError(null);
      return;
    }
    if (!EMAIL_REGEX.test(trimmed)) {
      setEmailError("Please enter a valid email address");
    } else {
      setEmailError(null);
    }
  };

  const isEmailInvalid = !!emailError;

  const hasPartner = members.length >= 2;
  const inviteLink = household?.invite_code
    ? getInviteUrl(household.invite_code)
    : null;

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

  const handleSaveEmail = async () => {
    if (!household?.id) return;
    const trimmed = email.trim();
    try {
      await updateDoc(doc(db, "households", household.id), {
        invite_email: trimmed,
      });
      setHousehold({ ...household, invite_email: trimmed });
      toast.success("Partner's email saved.");
    } catch {
      toast.error("Failed to save email.");
    }
  };

  const handleRefresh = async () => {
    if (!household?.id) return;
    setRefreshing(true);
    try {
      const newCode = await refreshInviteCode(household.id);
      const newExpiry = Timestamp.fromDate(
        new Date(Date.now() + 48 * 60 * 60 * 1000)
      );
      setHousehold({ ...household, invite_code: newCode, invite_expires_at: newExpiry });
      toast.success("New invite link generated.");
    } catch {
      toast.error("Failed to refresh invite link.");
    } finally {
      setRefreshing(false);
    }
  };

  if (hasPartner) {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
            <Users className="w-4 h-4 text-green-400" />
            Household Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => (
            <div
              key={m.uid}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800"
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                {m.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm text-slate-200">{m.name}</p>
                <p className="text-xs text-slate-500">{m.email}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
          <Mail className="w-4 h-4 text-yellow-400" />
          Invite Your Partner
        </CardTitle>
        <CardDescription className="text-slate-400 text-xs">
          Share the link below. Your partner signs up and pastes it to join.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Partner email (optional, for reference) */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">Partner&apos;s email (optional)</label>
          <div className="flex gap-2">
            <Input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) validateEmail(e.target.value);
              }}
              onBlur={() => validateEmail(email)}
              type="email"
              placeholder="partner@example.com"
              className="bg-slate-800 border-slate-700 text-sm"
              data-testid="partner-email-input"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={handleSaveEmail}
              disabled={!email.trim() || isEmailInvalid}
            >
              Save
            </Button>
          </div>
          {emailError && (
            <p
              className="text-xs text-red-400"
              data-testid="partner-email-error"
            >
              {emailError}
            </p>
          )}
          <p className="text-xs text-slate-600">
            This is just for your reference — we don&apos;t send emails automatically.
          </p>
        </div>

        {/* Invite link */}
        {inviteLink && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Invite link</label>
              <Badge
                variant="secondary"
                className="text-[10px] bg-yellow-900/40 text-yellow-400 border-yellow-800"
                data-testid="invite-status-badge"
              >
                Pending
              </Badge>
            </div>
            <div className="p-3 bg-slate-800 rounded-lg border border-slate-700">
              <p className="text-xs text-slate-300 break-all font-mono leading-relaxed">
                {inviteLink}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleCopy}
                className="flex-1 gap-1.5"
                data-testid="copy-invite-btn"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy Link</>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleShare}
                className="flex-1 gap-1.5"
                data-testid="share-invite-btn"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-1.5"
                title="Generate new link (expires old one)"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            {countdown && (
              <p
                className={`text-xs ${
                  countdown.isExpired
                    ? "text-red-400 font-medium"
                    : countdown.isWarning
                    ? "text-amber-400"
                    : "text-slate-600"
                }`}
                data-testid="invite-countdown"
              >
                {countdown.text}
                {countdown.isExpired && (
                  <button
                    onClick={handleRefresh}
                    className="ml-2 underline hover:text-red-300"
                    data-testid="invite-refresh-expired"
                  >
                    Refresh now
                  </button>
                )}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
