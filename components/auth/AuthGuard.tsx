"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { useExpenses } from "@/hooks/useExpenses";
import { useForegroundNotifications } from "@/hooks/useForegroundNotifications";
import { MelonLoader } from "@/components/ui/MelonLoader";

export const AuthGuard = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { authLoading, firebaseUser, user } = useAppStore();

  // Initialize auth listener
  useAuth();

  // Load household data once auth is settled
  useHousehold();

  // Subscribe to expenses for active group
  useExpenses();

  // Listen for foreground push notifications → Sonner toast
  useForegroundNotifications();

  useEffect(() => {
    if (!authLoading && !firebaseUser) {
      router.push("/login");
    }
  }, [authLoading, firebaseUser, router]);

  useEffect(() => {
    // If logged in but no household, redirect to onboarding
    if (!authLoading && firebaseUser && user && !user.household_id) {
      const pathname = window.location.pathname;
      if (pathname !== "/onboarding") {
        router.push("/onboarding");
      }
    }
  }, [authLoading, firebaseUser, user, router]);

  if (authLoading) {
    return <MelonLoader message="Signing you in..." />;
  }

  if (!firebaseUser) return null;

  // Email verification is now handled by a non-blocking banner (VerifyEmailBanner)
  // in the app layout — users can access the app immediately after signup.

  return <>{children}</>;
};
