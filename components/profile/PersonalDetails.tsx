"use client";
import { useState } from "react";
import { updateDoc, doc } from "firebase/firestore";
import { updateEmail } from "firebase/auth";
import { db, auth } from "@/lib/firebase/config";
import { useAppStore } from "@/store/useAppStore";
import { reauthenticateWithPassword, reauthenticateWithGoogle, getAuthProvider } from "@/lib/firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PersonalDetails = () => {
  const { user, setUser } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showReauth, setShowReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState("");
  const [reauthLoading, setReauthLoading] = useState(false);

  if (!user) return null;

  const originalName = user.name;
  const originalEmail = user.email;
  const hasChanges = name.trim() !== originalName || email.trim() !== originalEmail;

  const validateName = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return "Name is required";
    if (trimmed.length > 50) return "Name must be 50 characters or less";
    return null;
  };

  const validateEmail = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) return "Email is required";
    if (!EMAIL_REGEX.test(trimmed)) return "Invalid email format";
    return null;
  };

  const isValid = !validateName(name) && !validateEmail(email) && hasChanges;

  const handleEdit = () => {
    setName(user.name);
    setEmail(user.email);
    setNameError(null);
    setEmailError(null);
    setEditing(true);
  };

  const handleCancel = () => {
    setName(originalName);
    setEmail(originalEmail);
    setNameError(null);
    setEmailError(null);
    setEditing(false);
  };

  const handleSave = async () => {
    const nErr = validateName(name);
    const eErr = validateEmail(email);
    setNameError(nErr);
    setEmailError(eErr);
    if (nErr || eErr || !hasChanges) return;

    setSaving(true);
    try {
      // Update Firestore profile
      await updateDoc(doc(db, "users", user.uid), {
        name: name.trim(),
        email: email.trim(),
      });

      // Update Firebase Auth email if changed
      if (email.trim() !== originalEmail && auth.currentUser) {
        try {
          await updateEmail(auth.currentUser, email.trim());
        } catch (err: unknown) {
          const code = (err as { code?: string }).code;
          if (code === "auth/requires-recent-login") {
            setSaving(false);
            setShowReauth(true);
            return;
          }
          throw err;
        }
      }

      setUser({ ...user, name: name.trim(), email: email.trim() });
      toast.success("Profile updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleReauth = async () => {
    setReauthLoading(true);
    try {
      const provider = getAuthProvider();
      if (provider === "google.com") {
        await reauthenticateWithGoogle();
      } else {
        await reauthenticateWithPassword(reauthPassword);
      }
      setShowReauth(false);
      setReauthPassword("");
      // Retry the email update
      if (auth.currentUser) {
        await updateEmail(auth.currentUser, email.trim());
      }
      setUser({ ...user, name: name.trim(), email: email.trim() });
      toast.success("Profile updated");
      setEditing(false);
    } catch {
      toast.error("Re-authentication failed. Please try again.");
    } finally {
      setReauthLoading(false);
    }
  };

  return (
    <>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-100 text-base">Personal Details</CardTitle>
          {!editing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              className="gap-1.5 text-slate-400"
              data-testid="profile-edit-btn"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Name</label>
            {editing ? (
              <>
                <Input
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(validateName(e.target.value));
                  }}
                  className="bg-slate-800 border-slate-700 text-sm"
                  data-testid="profile-name-input"
                />
                {nameError && <p className="text-xs text-red-400">{nameError}</p>}
              </>
            ) : (
              <p className="text-sm text-slate-200" data-testid="profile-name-display">{user.name}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-slate-400">Email</label>
            {editing ? (
              <>
                <Input
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(validateEmail(e.target.value));
                  }}
                  type="email"
                  className="bg-slate-800 border-slate-700 text-sm"
                  data-testid="profile-email-input"
                />
                {emailError && <p className="text-xs text-red-400">{emailError}</p>}
              </>
            ) : (
              <p className="text-sm text-slate-200" data-testid="profile-email-display">{user.email}</p>
            )}
          </div>
          {editing && (
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!isValid || saving}
                data-testid="profile-save-btn"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                data-testid="profile-cancel-btn"
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Re-authentication dialog for email changes */}
      <AlertDialog open={showReauth} onOpenChange={setShowReauth}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Re-authentication Required</AlertDialogTitle>
            <AlertDialogDescription>
              Changing your email requires recent sign-in. Please verify your identity.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {getAuthProvider() === "password" ? (
            <Input
              type="password"
              placeholder="Enter your current password"
              value={reauthPassword}
              onChange={(e) => setReauthPassword(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          ) : (
            <p className="text-sm text-slate-400">Click confirm to re-authenticate with Google.</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReauth} disabled={reauthLoading}>
              {reauthLoading ? "Verifying..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
