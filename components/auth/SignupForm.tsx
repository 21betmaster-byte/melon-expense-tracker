"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signUpWithEmail, signInWithGoogle } from "@/lib/firebase/auth";
import { signUpSchema, type SignUpValues } from "@/lib/utils/validation";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { toast } from "sonner";

export const SignupForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/dashboard";
  const [googleLoading, setGoogleLoading] = useState(false);

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const onSubmit = async (values: SignUpValues) => {
    try {
      toast.loading("Creating your account...", { id: "signup" });
      await signUpWithEmail(values.email, values.password, values.name);
      toast.success("Account created! Taking you to your dashboard.", { id: "signup" });
      router.push(redirectTo);
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      toast.error(
        code === "auth/email-already-in-use"
          ? "An account with this email already exists"
          : "Sign up failed. Please try again.",
        { id: "signup" }
      );
    }
  };

  const onInvalid = (_errors: FieldErrors<SignUpValues>) => {
    toast.error("Please fix the highlighted errors above.");
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      toast.loading("Signing in with Google...", { id: "google-signin" });
      await signInWithGoogle();
      toast.success("Signed in! Taking you to your dashboard.", { id: "google-signin" });
      router.push(redirectTo);
    } catch (error: unknown) {
      toast.dismiss("google-signin");
      const code = (error as { code?: string }).code;
      if (code === "auth/unauthorized-domain") {
        toast.error(
          "This domain is not authorized for Google Sign-In. Please contact the app administrator."
        );
      } else if (code === "auth/popup-closed-by-user") {
        toast.error("Sign-in popup was closed. Please try again.");
      } else if (code === "auth/popup-blocked") {
        toast.error(
          "Sign-in popup was blocked by your browser. Please allow popups and try again."
        );
      } else {
        console.error("[SignupForm] Google sign-in error:", error);
        toast.error("Google sign in failed. Please try again.");
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogle}
        disabled={googleLoading}
        data-testid="google-signup-btn"
      >
        {googleLoading ? "Signing in..." : "Continue with Google"}
      </Button>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-slate-500 text-sm">or</span>
        <Separator className="flex-1" />
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Your name"
                    data-testid="name-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    placeholder="you@example.com"
                    data-testid="email-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="password"
                    placeholder="••••••••"
                    data-testid="password-input"
                  />
                </FormControl>
                <p className="text-xs text-slate-500 mt-1">
                  At least 8 characters with 1 uppercase letter and 1 number.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting || googleLoading}
            data-testid="signup-submit"
          >
            {form.formState.isSubmitting ? "Creating account..." : "Create Account"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-slate-400 text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-400 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
};
