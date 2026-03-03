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
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-sm">
        <OnboardingStepper />
      </div>
    </div>
  );
}
