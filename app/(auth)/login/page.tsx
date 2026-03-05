import { LoginForm } from "@/components/auth/LoginForm";
import { AuthRedirect } from "@/components/auth/AuthRedirect";
import { Wallet } from "lucide-react";

export default function LoginPage() {
  return (
    <AuthRedirect>
      <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-slate-950">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-500/10 p-3 rounded-2xl">
                <Wallet className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Welcome back</h1>
            <p className="text-slate-400 mt-1 text-sm">
              Sign in to your household account
            </p>
          </div>
          <LoginForm />
        </div>
      </main>
    </AuthRedirect>
  );
}
