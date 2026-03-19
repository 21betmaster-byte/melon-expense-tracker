"use client";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

interface StepWelcomeProps {
  onNext: () => void;
  onSkip: () => void;
}

export const StepWelcome = ({ onNext, onSkip }: StepWelcomeProps) => {
  return (
    <div className="text-center space-y-5 py-2" data-testid="stepper-welcome">
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center">
          <Home className="w-8 h-8 text-blue-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-100">Welcome!</h2>
        <p className="text-sm text-slate-400 max-w-xs mx-auto">
          Welcome to Melon! Let&apos;s set up your shared expense manager in
          seconds.
        </p>
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={onNext} data-testid="stepper-get-started-btn">
          Get Started
        </Button>
        <Button
          variant="ghost"
          onClick={onSkip}
          className="text-slate-400"
          data-testid="stepper-skip-btn"
        >
          Skip →
        </Button>
      </div>
    </div>
  );
};
