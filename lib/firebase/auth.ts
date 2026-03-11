import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  sendEmailVerification,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";
import { createHousehold } from "./firestore";
import { trackEvent } from "@/lib/analytics";
import { HOUSEHOLD_CREATED } from "@/lib/analytics/events";

// ─── Email Signup ─────────────────────────────────────────────────────────────
// Fast-return pattern: creates the Firebase Auth user + Firestore profile
// synchronously, then fires household creation + email verification in the
// background so the UI can navigate immediately.

export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string
): Promise<User> => {
  // 1. Create Firebase Auth user (required, network call)
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });

  // 2. Create Firestore user profile (fast — goes to local offline cache)
  await setDoc(doc(db, "users", credential.user.uid), {
    uid: credential.user.uid,
    email,
    name,
    household_id: null,
    created_at: serverTimestamp(),
  });

  // 3. Mark onboarding as completed BEFORE background tasks
  //    Prevents AuthGuard from redirecting to /onboarding while household
  //    is being created in the background.
  if (typeof window !== "undefined") {
    localStorage.setItem("onboarding_completed", "true");
  }

  // 4. Fire-and-forget: household creation + email verification
  //    These run independently — the signup flow returns immediately.
  //    useAuth will poll for the household_id to appear.
  createHousehold(credential.user.uid).then(() => {
    trackEvent(HOUSEHOLD_CREATED, { method: "email" });
  }).catch((err) => {
    console.error("[signUpWithEmail] Background household creation failed:", err);
  });

  sendEmailVerification(credential.user).catch(() => {
    console.warn("[signUpWithEmail] Email verification send failed");
  });

  return credential.user;
};

// ─── Email Login ──────────────────────────────────────────────────────────────

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

// ─── Google Sign-In ───────────────────────────────────────────────────────────
// Uses signInWithPopup with automatic signInWithRedirect fallback for
// mobile browsers and PWAs where popups are blocked.

export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();

  let user: User;
  try {
    const credential = await signInWithPopup(auth, provider);
    user = credential.user;
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;

    // If popup was blocked or cancelled, fall back to redirect flow.
    // signInWithRedirect navigates the page away — onAuthStateChanged
    // will fire when the page loads back, and useAuth handles the rest.
    if (
      code === "auth/popup-blocked" ||
      code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(auth, provider);
      // This line never executes — the browser navigates away
      throw error;
    }
    throw error;
  }

  // Pre-set onboarding flag
  if (typeof window !== "undefined") {
    localStorage.setItem("onboarding_completed", "true");
  }

  // Fire-and-forget: ensure profile + household exist
  ensureGoogleUserSetup(user);

  return user;
};

/**
 * Background setup for Google users.
 * Creates Firestore profile + household if they don't exist.
 * Runs as fire-and-forget — errors are logged but don't affect the user.
 */
function ensureGoogleUserSetup(user: User): void {
  (async () => {
    try {
      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        // First-time Google user: create profile
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email ?? "",
          name: user.displayName ?? "User",
          household_id: null,
          created_at: serverTimestamp(),
        });
        // Create household
        await createHousehold(user.uid);
        trackEvent(HOUSEHOLD_CREATED, { method: "google" });
      } else {
        // Returning user: check if they need a household
        const userData = snap.data();
        if (!userData?.household_id) {
          await createHousehold(user.uid);
          trackEvent(HOUSEHOLD_CREATED, { method: "google" });
        }
      }
    } catch (err) {
      console.error("[ensureGoogleUserSetup] Background setup failed:", err);
    }
  })();
}

/**
 * Handle the result of signInWithRedirect (called on page load).
 * Returns the user if a redirect sign-in just completed, null otherwise.
 */
export const handleGoogleRedirectResult = async (): Promise<User | null> => {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      // Pre-set onboarding flag
      if (typeof window !== "undefined") {
        localStorage.setItem("onboarding_completed", "true");
      }
      // Background setup
      ensureGoogleUserSetup(result.user);
      return result.user;
    }
  } catch (err) {
    console.error("[handleGoogleRedirectResult] Error:", err);
  }
  return null;
};

// ─── Password Reset ───────────────────────────────────────────────────────────

export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logOut = async (): Promise<void> => {
  await signOut(auth);
};

export const getCurrentUser = () => auth.currentUser;

// ─── Re-authentication (required before account deletion) ────────────────────

export const reauthenticateWithPassword = async (
  password: string
): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error("No authenticated user");
  const credential = EmailAuthProvider.credential(user.email, password);
  await reauthenticateWithCredential(user, credential);
};

export const reauthenticateWithGoogle = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential) throw new Error("Google re-authentication failed");
  await reauthenticateWithCredential(user, credential);
};

// ─── Account deletion ────────────────────────────────────────────────────────

export const deleteCurrentUser = async (): Promise<void> => {
  const user = auth.currentUser;
  if (!user) throw new Error("No authenticated user");
  await deleteUser(user);
};

export const getAuthProvider = (): "password" | "google.com" | null => {
  const user = auth.currentUser;
  if (!user || !user.providerData.length) return null;
  return user.providerData[0].providerId as "password" | "google.com";
};
