"use client";
import { useState, useEffect } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Mail, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * Non-blocking banner that reminds email/password users to verify their email.
 * Does NOT block access to the app — just shows a dismissible reminder at the top.
 */
export const VerifyEmailBanner = () => {
  const { firebaseUser } = useAppStore();
  const [dismissed, setDismissed] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);

  // Check if this banner applies
  const isPasswordUser = firebaseUser?.providerData.some(
    (p) => p.providerId === "password"
  );
  const shouldShow =
    firebaseUser && isPasswordUser && !firebaseUser.emailVerified && !dismissed && !verified;

  // Poll for email verification in the background
  useEffect(() => {
    if (!firebaseUser || !isPasswordUser || firebaseUser.emailVerified) return;

    const interval = setInterval(async () => {
      try {
        await firebaseUser.reload();
        if (firebaseUser.emailVerified) {
          setVerified(true);
          toast.success("Email verified! You're all set.");
          clearInterval(interval);
        }
      } catch {
        // Ignore reload errors
      }
    }, 10_000); // Poll every 10s (less aggressive than before)

    return () => clearInterval(interval);
  }, [firebaseUser, isPasswordUser]);

  // Cooldown timer for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = async () => {
    if (!firebaseUser) return;
    setResending(true);
    try {
      await sendEmailVerification(firebaseUser);
      toast.success("Verification email sent! Check your inbox.");
      setCooldown(60);
    } catch {
      toast.error("Failed to resend email. Please try again later.");
    } finally {
      setResending(false);
    }
  };

  if (!shouldShow) return null;

  return (
    <div className="bg-amber-900/30 border-b border-amber-800/50 px-4 py-2.5">
      <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-200 truncate">
            Please verify your email ({firebaseUser?.email})
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2.5 text-xs text-amber-300 hover:text-amber-100 hover:bg-amber-800/40"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
          >
            {cooldown > 0 ? (
              `${cooldown}s`
            ) : resending ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              "Resend"
            )}
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-500 hover:text-amber-300 transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
