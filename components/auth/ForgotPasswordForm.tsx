"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sendPasswordReset } from "@/lib/firebase/auth";
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
import Link from "next/link";
import { toast } from "sonner";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordForm = () => {
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    try {
      await sendPasswordReset(values.email);
      setSent(true);
      toast.success("Reset link sent! Check your inbox.");
    } catch (error: unknown) {
      const code = (error as { code?: string }).code;
      if (code === "auth/user-not-found") {
        // For security, still show success so attackers can't enumerate emails
        setSent(true);
        toast.success("Reset link sent! Check your inbox.");
      } else if (code === "auth/too-many-requests") {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center" data-testid="reset-success">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-green-400 text-sm">
            If an account exists with that email, you&apos;ll receive a password
            reset link shortly.
          </p>
        </div>
        <p className="text-slate-400 text-sm">
          Didn&apos;t receive an email? Check your spam folder or{" "}
          <button
            type="button"
            className="text-blue-400 hover:underline"
            onClick={() => {
              setSent(false);
              form.reset();
            }}
            data-testid="try-again-btn"
          >
            try again
          </button>
          .
        </p>
        <Link
          href="/login"
          className="block text-blue-400 hover:underline text-sm"
          data-testid="back-to-login"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    data-testid="forgot-email-input"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
            data-testid="forgot-submit"
          >
            {form.formState.isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>
      </Form>

      <p className="text-center text-slate-400 text-sm">
        Remember your password?{" "}
        <Link
          href="/login"
          className="text-blue-400 hover:underline"
          data-testid="back-to-login"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};
