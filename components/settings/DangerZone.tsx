"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { leaveHousehold, deleteUserProfile } from "@/lib/firebase/firestore";
import {
  deleteCurrentUser,
  reauthenticateWithPassword,
  reauthenticateWithGoogle,
  getAuthProvider,
  logOut,
} from "@/lib/firebase/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, LogOut, Trash2 } from "lucide-react";
import { toast } from "sonner";

type DeleteStep = "closed" | "warning" | "confirm" | "reauth";

export const DangerZone = () => {
  const router = useRouter();
  const { user, household, reset } = useAppStore();

  // Leave Household state
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);

  // Delete Account state
  const [deleteStep, setDeleteStep] = useState<DeleteStep>("closed");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [reauthPassword, setReauthPassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reauthError, setReauthError] = useState<string | null>(null);

  const authProvider = getAuthProvider();

  const resetDeleteState = () => {
    setDeleteStep("closed");
    setDeleteConfirmText("");
    setReauthPassword("");
    setReauthError(null);
    setDeleteLoading(false);
  };

  // ─── Leave Household ────────────────────────────────────────────────────────

  const handleLeaveHousehold = async () => {
    if (!user?.uid || !household?.id) return;
    setLeaveLoading(true);
    try {
      await leaveHousehold(household.id, user.uid);
      reset();
      toast.success("You've left the household");
      router.push("/onboarding");
    } catch {
      toast.error("Failed to leave household. Please try again.");
    } finally {
      setLeaveLoading(false);
      setShowLeaveDialog(false);
    }
  };

  // ─── Delete Account ─────────────────────────────────────────────────────────

  const handleDeleteAccount = async () => {
    if (!user?.uid) return;
    setDeleteLoading(true);
    setReauthError(null);

    try {
      // Step 1: Re-authenticate
      const provider = getAuthProvider();
      if (provider === "password") {
        await reauthenticateWithPassword(reauthPassword);
      } else {
        await reauthenticateWithGoogle();
      }

      // Step 2: Leave household (if in one)
      if (user.household_id) {
        await leaveHousehold(user.household_id, user.uid);
      }

      // Step 3: Delete Firestore user profile
      await deleteUserProfile(user.uid);

      // Step 4: Delete Firebase Auth account
      await deleteCurrentUser();

      // Step 5: Clear local state
      reset();

      // Step 6: Redirect
      toast.success("Your account has been deleted");
      router.push("/login");
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential"
      ) {
        setReauthError("Incorrect password. Please try again.");
      } else if (code === "auth/requires-recent-login") {
        setReauthError("Session expired. Please try again.");
      } else if (code === "auth/popup-closed-by-user") {
        setReauthError("Google sign-in was cancelled. Please try again.");
      } else {
        setReauthError("Something went wrong. Please try again.");
      }
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Card
        className="bg-slate-900 border-red-900/50"
        data-testid="danger-zone"
      >
        <CardHeader>
          <CardTitle className="text-red-400 flex items-center gap-2 text-base">
            <AlertTriangle className="w-4 h-4" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Irreversible actions for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Leave Household */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div>
              <p className="text-sm text-slate-200 font-medium">
                Leave Household
              </p>
              <p className="text-xs text-slate-500">
                Leave your current household. Your expenses stay.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLeaveDialog(true)}
              className="border-red-800 text-red-400 hover:bg-red-950 shrink-0"
              data-testid="leave-household-btn"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              Leave
            </Button>
          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-red-900/30">
            <div>
              <p className="text-sm text-slate-200 font-medium">
                Delete Account
              </p>
              <p className="text-xs text-slate-500">
                Permanently delete your account and data.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteStep("warning")}
              className="shrink-0"
              data-testid="delete-account-btn"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Leave Household Dialog ──────────────────────────────────────────── */}
      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent data-testid="leave-household-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Household?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <span className="block">
                  Your expenses will remain in the household for your
                  partner&apos;s records.
                </span>
                <span className="block">
                  You&apos;ll be redirected to create or join a new household.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-testid="leave-cancel-btn"
              disabled={leaveLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLeaveHousehold}
              data-testid="leave-confirm-btn"
              disabled={leaveLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leaveLoading ? "Leaving..." : "Leave Household"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Delete Account Dialog (multi-step) ──────────────────────────────── */}
      <AlertDialog
        open={deleteStep !== "closed"}
        onOpenChange={(open) => {
          if (!open) resetDeleteState();
        }}
      >
        {/* Step 1: Warning */}
        {deleteStep === "warning" && (
          <AlertDialogContent data-testid="delete-account-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Delete Account
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-left">
                  <span className="block font-semibold text-slate-200">
                    This action is permanent and cannot be undone.
                  </span>
                  <span className="block">This will:</span>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Remove you from your household</li>
                    <li>Delete your user profile</li>
                    <li>Delete your authentication account</li>
                    <li>
                      Shared expenses will remain for your partner&apos;s
                      records
                    </li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="delete-cancel-btn">
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={() => setDeleteStep("confirm")}
                data-testid="delete-continue-btn"
              >
                Continue
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}

        {/* Step 2: Type DELETE */}
        {deleteStep === "confirm" && (
          <AlertDialogContent data-testid="delete-account-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-400">
                Confirm Account Deletion
              </AlertDialogTitle>
              <AlertDialogDescription>
                Type{" "}
                <span className="font-mono font-bold text-slate-200">
                  DELETE
                </span>{" "}
                below to confirm.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder='Type "DELETE" to confirm'
              className="bg-slate-800 border-slate-700"
              data-testid="delete-confirm-input"
            />
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={resetDeleteState}
                data-testid="delete-cancel-btn"
              >
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== "DELETE"}
                onClick={() => setDeleteStep("reauth")}
                data-testid="delete-proceed-btn"
              >
                Proceed
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}

        {/* Step 3: Re-authentication */}
        {deleteStep === "reauth" && (
          <AlertDialogContent data-testid="delete-account-dialog">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-red-400">
                Verify Your Identity
              </AlertDialogTitle>
              <AlertDialogDescription>
                For security, please verify your identity before deleting your
                account.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {authProvider === "password" ? (
              <div className="space-y-2">
                <Input
                  type="password"
                  value={reauthPassword}
                  onChange={(e) => {
                    setReauthPassword(e.target.value);
                    setReauthError(null);
                  }}
                  placeholder="Enter your password"
                  className="bg-slate-800 border-slate-700"
                  data-testid="reauth-password-input"
                />
                {reauthError && (
                  <p
                    className="text-xs text-red-400"
                    data-testid="reauth-error"
                  >
                    {reauthError}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-slate-400">
                  Click below to verify with Google.
                </p>
                {reauthError && (
                  <p
                    className="text-xs text-red-400"
                    data-testid="reauth-error"
                  >
                    {reauthError}
                  </p>
                )}
              </div>
            )}

            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={resetDeleteState}
                data-testid="delete-cancel-btn"
                disabled={deleteLoading}
              >
                Cancel
              </AlertDialogCancel>
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={
                  deleteLoading ||
                  (authProvider === "password" && !reauthPassword)
                }
                data-testid="delete-final-btn"
              >
                {deleteLoading
                  ? "Deleting..."
                  : authProvider === "password"
                    ? "Delete My Account"
                    : "Verify & Delete"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </>
  );
};
