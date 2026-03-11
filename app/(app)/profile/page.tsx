"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ArrowLeft } from "lucide-react";
import { logOut } from "@/lib/firebase/auth";
import { trackEvent } from "@/lib/analytics";
import { AUTH_SIGNED_OUT } from "@/lib/analytics/events";
import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
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
import { PersonalDetails } from "@/components/profile/PersonalDetails";
import { ChangePassword } from "@/components/profile/ChangePassword";
import { HouseholdInfo } from "@/components/profile/HouseholdInfo";

export default function ProfilePage() {
  const router = useRouter();
  const { user, reset } = useAppStore();
  const [showLogout, setShowLogout] = useState(false);

  const handleLogout = async () => {
    trackEvent(AUTH_SIGNED_OUT);
    await logOut();
    reset();
    router.push("/login");
  };

  const initial = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="space-y-5 pt-4 pb-8">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Profile Header */}
      <div className="flex flex-col items-center gap-2 py-6">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
          {initial}
        </div>
        <h1 className="text-lg font-semibold text-slate-100">{user?.name}</h1>
        <p className="text-sm text-slate-400">{user?.email}</p>
      </div>

      {/* Personal Details */}
      <PersonalDetails />

      {/* Change Password */}
      <ChangePassword />

      {/* Household & Partner */}
      <HouseholdInfo />

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full text-red-400 border-red-400/30 hover:bg-red-400/10 gap-2"
        onClick={() => setShowLogout(true)}
        data-testid="profile-logout-btn"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </Button>

      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent data-testid="logout-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="profile-logout-cancel-btn">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              data-testid="profile-logout-confirm-btn"
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
