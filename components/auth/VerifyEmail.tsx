"use client";
import { useState, useEffect } from "react";
import { sendEmailVerification } from "firebase/auth";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { logOut } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";

export const VerifyEmail = () => {
  const router = useRouter();
  const { firebaseUser } = useAppStore();
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Poll for email verification every 5 seconds
  useEffect(() => {
    if (!firebaseUser) return;

    const interval = setInterval(async () => {
      try {
        await firebaseUser.reload();
        if (firebaseUser.emailVerified) {
          // Force page reload to pick up the new state
          window.location.reload();
        }
      } catch {
        // Ignore reload errors
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [firebaseUser]);

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

  const handleSignOut = async () => {
    await logOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <Card className="max-w-md w-full bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center space-y-6">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-400" />
          </div>

          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-white">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              We&apos;ve sent a verification link to{" "}
              <span className="text-white font-medium">
                {firebaseUser?.email}
              </span>
              . Click the link to verify your account and start using Melon.
            </p>
          </div>

          {/* Auto-detect message */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Waiting for verification…
          </div>

          {/* Resend button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={resending || cooldown > 0}
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : resending
              ? "Sending…"
              : "Resend Verification Email"}
          </Button>

          {/* Sign out option */}
          <button
            onClick={handleSignOut}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Sign in with a different account
          </button>
        </CardContent>
      </Card>
    </div>
  );
};
