"use client";
import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { reauthenticateWithPassword, getAuthProvider } from "@/lib/firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Info } from "lucide-react";
import { toast } from "sonner";

export const ChangePassword = () => {
  const provider = getAuthProvider();
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [loading, setLoading] = useState(false);

  if (provider === "google.com") {
    return (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 text-base">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-2 text-slate-400">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-sm">
              Signed in with Google. Password is managed by your Google account.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pwValid = newPw.length >= 8 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw);
  const pwMatch = newPw === confirmPw;
  const canSubmit = currentPw.length > 0 && pwValid && pwMatch && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await reauthenticateWithPassword(currentPw);
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPw);
      }
      toast.success("Password updated");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        toast.error("Current password is incorrect");
      } else {
        toast.error("Failed to update password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle className="text-slate-100 text-base">Change Password</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">Current password</label>
          <Input
            type="password"
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            className="bg-slate-800 border-slate-700 text-sm"
            data-testid="current-password-input"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">New password</label>
          <Input
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className="bg-slate-800 border-slate-700 text-sm"
            data-testid="new-password-input"
          />
          {newPw && !pwValid && (
            <p className="text-xs text-red-400">
              Min 8 characters, 1 uppercase, 1 number
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400">Confirm new password</label>
          <Input
            type="password"
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            className="bg-slate-800 border-slate-700 text-sm"
            data-testid="confirm-password-input"
          />
          {confirmPw && !pwMatch && (
            <p className="text-xs text-red-400">Passwords do not match</p>
          )}
        </div>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          data-testid="update-password-btn"
        >
          {loading ? "Updating..." : "Update Password"}
        </Button>
      </CardContent>
    </Card>
  );
};
