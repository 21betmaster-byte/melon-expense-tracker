"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

export const StepSuccess = () => {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(3);

  useEffect(() => {
    // Mark onboarding as completed for feature tour auto-trigger
    localStorage.setItem("onboarding_completed", "true");
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/dashboard");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [router]);

  return (
    <div
      className="text-center space-y-6 py-4 animate-in fade-in zoom-in-95 duration-500"
      data-testid="stepper-success"
    >
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-green-600/20 flex items-center justify-center animate-in zoom-in duration-500">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-100">
          You&apos;re all set!
        </h2>
        <p className="text-sm text-slate-400">
          Your household is ready. Start tracking your expenses!
        </p>
      </div>

      <Button
        onClick={() => router.push("/dashboard")}
        data-testid="stepper-go-dashboard-btn"
      >
        Go to Dashboard
      </Button>

      <p className="text-xs text-slate-600">
        Redirecting in {secondsLeft}s…
      </p>
    </div>
  );
};
