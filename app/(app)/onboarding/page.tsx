"use client";
import { OnboardingStepper } from "@/components/onboarding/OnboardingStepper";
import { useAppStore } from "@/store/useAppStore";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const { user } = useAppStore();
  const router = useRouter();

  // If user already has a household, redirect
  useEffect(() => {
    if (user?.household_id) {
      router.push("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 pt-[env(safe-area-inset-top,16px)] pb-[env(safe-area-inset-bottom,16px)]">
      <div className="w-full max-w-sm">
        <OnboardingStepper />
      </div>
    </div>
  );
}
