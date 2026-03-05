"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { MelonLoader } from "@/components/ui/MelonLoader";

/**
 * AuthRedirect — wraps login/signup pages.
 *
 * Handles the signInWithRedirect fallback flow:
 * When a user completes Google sign-in via redirect (mobile/PWA),
 * the browser navigates back to the login page. This component
 * detects the redirect result and sends them to /dashboard.
 *
 * For normal visits to login/signup, the children render immediately.
 */
export const AuthRedirect = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if this page load is the result of a signInWithRedirect.
    // getRedirectResult returns null instantly if no redirect happened.
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          // User just completed a redirect sign-in — go to dashboard
          if (typeof window !== "undefined") {
            localStorage.setItem("onboarding_completed", "true");
          }
          router.replace("/dashboard");
        } else {
          // No redirect result — show the login/signup form normally
          setChecking(false);
        }
      })
      .catch(() => {
        // Error checking redirect result — show form anyway
        setChecking(false);
      });

    // Safety timeout: don't block the page for more than 2 seconds
    const timeout = setTimeout(() => setChecking(false), 2000);
    return () => clearTimeout(timeout);
  }, [router]);

  if (checking) {
    return <MelonLoader message="Loading..." />;
  }

  return <>{children}</>;
};
