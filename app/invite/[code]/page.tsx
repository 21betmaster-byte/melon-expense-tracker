"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getHouseholdByInviteCode,
  joinHousehold,
  getUserProfile,
} from "@/lib/firebase/firestore";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, XCircle, CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";

type Status = "loading" | "ready" | "invalid" | "full" | "expired" | "success" | "no-auth";

export default function InvitePage() {
  const params = useParams<{ code: string }>();
  const code = params.code?.trim();
  const router = useRouter();
  const { firebaseUser, user, authLoading, setUser } = useAppStore();
  const [status, setStatus] = useState<Status>("loading");
  const [joining, setJoining] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useAuth();

  useEffect(() => {
    if (authLoading) return;

    // Always validate the invite code first — even for unauthenticated users.
    // This way we show "invalid code" immediately rather than asking to sign in
    // for a code that doesn't even exist (better UX + testable without auth).
    const validate = async () => {
      try {
        const household = await getHouseholdByInviteCode(code);
        if (!household) {
          setStatus("invalid");
          return;
        }
        setHouseholdId(household.id);
        // Code is valid — now check if user is logged in
        if (!firebaseUser) {
          setStatus("no-auth");
        } else {
          setStatus("ready");
        }
      } catch {
        setStatus("invalid");
      }
    };

    validate();
  }, [code, firebaseUser, authLoading]);

  const handleJoin = async () => {
    if (!firebaseUser || !householdId) return;
    setJoining(true);
    try {
      const result = await joinHousehold(householdId, firebaseUser.uid);
      if (result === "success") {
        const updatedProfile = await getUserProfile(firebaseUser.uid);
        if (updatedProfile) setUser(updatedProfile);
        setStatus("success");
        setTimeout(() => router.push("/dashboard"), 1500);
      } else if (result === "full") {
        setStatus("full");
      } else {
        setStatus("expired");
      }
    } catch {
      setStatus("invalid");
    } finally {
      setJoining(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case "loading":
        return (
          <div className="flex items-center justify-center gap-2 text-slate-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Validating invite…</span>
          </div>
        );

      case "no-auth":
        return (
          <div className="space-y-4 text-center">
            <p className="text-slate-400">
              You need to be signed in to join a household.
            </p>
            <div className="flex gap-3 justify-center">
              <Button asChild>
                <Link href={`/login?redirect=/invite/${code}`}>Sign In</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/signup?redirect=/invite/${code}`}>Sign Up</Link>
              </Button>
            </div>
          </div>
        );

      case "ready":
        return (
          <div className="space-y-4 text-center">
            <Users className="w-10 h-10 text-blue-400 mx-auto" />
            <p className="text-slate-300">
              You&apos;ve been invited to join a household!
            </p>
            <Button onClick={handleJoin} disabled={joining} className="w-full">
              {joining ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Joining…
                </>
              ) : (
                "Accept Invite & Join"
              )}
            </Button>
          </div>
        );

      case "success":
        return (
          <div className="flex flex-col items-center gap-3 py-4">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <p className="text-green-400 font-semibold">
              Successfully joined household!
            </p>
            <p className="text-slate-400 text-sm">Redirecting…</p>
          </div>
        );

      case "full":
        return (
          <div
            className="flex flex-col items-center gap-3 py-4 text-center"
            data-testid="household-full-error"
          >
            <XCircle className="w-12 h-12 text-red-400" />
            <p className="text-red-400 font-semibold">Household full</p>
            <p className="text-slate-400 text-sm">
              This household already has 2 members.
            </p>
          </div>
        );

      case "invalid":
      case "expired":
      default:
        return (
          <div
            className="flex flex-col items-center gap-3 py-4 text-center"
            data-testid="invite-error"
          >
            <XCircle className="w-12 h-12 text-red-400" />
            <p className="text-red-400 font-semibold">
              This invite link is invalid or expired
            </p>
            <p className="text-slate-400 text-sm">
              Ask your partner to generate a new invite link.
            </p>
          </div>
        );
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-slate-950">
      <div className="w-full max-w-sm">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 text-center">
              Household Invite
            </CardTitle>
          </CardHeader>
          <CardContent>{renderContent()}</CardContent>
        </Card>
      </div>
    </main>
  );
}
