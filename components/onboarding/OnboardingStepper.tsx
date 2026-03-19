"use client";
import { useState } from "react";
import { StepWelcome } from "./StepWelcome";
import { StepSuccess } from "./StepSuccess";
import { CreateHouseholdCard } from "./CreateHouseholdCard";
import { JoinHouseholdCard } from "./JoinHouseholdCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Users } from "lucide-react";

type Step = 1 | 2 | 3 | 4;
type Path = "create" | "join" | null;
type Direction = "forward" | "back";

export const OnboardingStepper = () => {
  const [step, setStep] = useState<Step>(1);
  const [path, setPath] = useState<Path>(null);
  const [direction, setDirection] = useState<Direction>("forward");

  const goTo = (target: Step) => {
    setDirection("forward");
    setStep(target);
  };

  const goBack = (target: Step) => {
    setDirection("back");
    setStep(target);
  };

  return (
    <div className="space-y-3">
      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-4" data-testid="stepper-progress">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
              s === step
                ? "bg-blue-400"
                : s < step
                ? "bg-blue-600"
                : "bg-slate-700"
            }`}
          />
        ))}
      </div>

      {/* Step counter */}
      <p
        className="text-xs text-slate-500 text-center mb-3"
        data-testid="stepper-counter"
      >
        Step {step} of 4
      </p>

      {/* Step content with animation */}
      <div
        key={step}
        className={`animate-in fade-in duration-300 ${
          direction === "forward"
            ? "slide-in-from-right-5"
            : "slide-in-from-left-5"
        }`}
      >
        {step === 1 && (
          <StepWelcome onNext={() => goTo(2)} onSkip={() => goTo(2)} />
        )}

        {step === 2 && (
          <div className="space-y-6">
            {/* Back button */}
            <div className="flex items-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goBack(1)}
                className="text-slate-400 gap-1.5 -ml-2"
                data-testid="stepper-back-btn"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-slate-100">
                How would you like to start?
              </h2>
              <p className="text-sm text-slate-400">
                Create a new household or join your partner&apos;s
              </p>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => {
                  setPath("create");
                  goTo(3);
                }}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-blue-600 hover:bg-slate-800/50 transition-all text-left"
                data-testid="stepper-create-btn"
              >
                <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center flex-shrink-0">
                  <Home className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    Create a Household
                  </p>
                  <p className="text-xs text-slate-500">
                    Set up a new shared expense tracker
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  setPath("join");
                  goTo(3);
                }}
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900 hover:border-green-600 hover:bg-slate-800/50 transition-all text-left"
                data-testid="stepper-join-btn"
              >
                <div className="w-10 h-10 rounded-full bg-green-600/20 flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-100">
                    Join a Household
                  </p>
                  <p className="text-xs text-slate-500">
                    Use an invite link from your partner
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === 3 && path === "create" && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goBack(2)}
              className="text-slate-400 gap-1.5 -ml-2"
              data-testid="stepper-back-btn"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <CreateHouseholdCard onSuccess={() => goTo(4)} />
          </div>
        )}

        {step === 3 && path === "join" && (
          <div className="space-y-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goBack(2)}
              className="text-slate-400 gap-1.5 -ml-2"
              data-testid="stepper-back-btn"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            <JoinHouseholdCard onSuccess={() => goTo(4)} />
          </div>
        )}

        {step === 4 && <StepSuccess />}
      </div>
    </div>
  );
};
