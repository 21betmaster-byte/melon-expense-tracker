"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { useExpenses } from "@/hooks/useExpenses";
import { useForegroundNotifications } from "@/hooks/useForegroundNotifications";

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400 animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!firebaseUser) return null;

  return <>{children}</>;
};
