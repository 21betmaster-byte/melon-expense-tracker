import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { MelonLoader } from "@/components/ui/MelonLoader";
import { Wallet } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<MelonLoader message="Loading..." />}>
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-950">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-500/10 p-3 rounded-2xl">
                <Wallet className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">
              Reset password
            </h1>
            <p className="text-slate-400 mt-1 text-sm">
              Enter your email and we&apos;ll send you a reset link
            </p>
          </div>
          <ForgotPasswordForm />
        </div>
      </main>
    </Suspense>
  );
}
