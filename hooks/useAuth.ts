"use client";
import { useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { getUserProfile, createHousehold } from "@/lib/firebase/firestore";
import { handleGoogleRedirectResult } from "@/lib/firebase/auth";
import { useAppStore } from "@/store/useAppStore";
import type { User } from "@/types";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const useAuth = () => {
  const { setFirebaseUser, setUser, setAuthLoading } = useAppStore();
  const householdPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const householdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Handle redirect result from signInWithRedirect (Google fallback).
    // This resolves before onAuthStateChanged, making the user available.
    handleGoogleRedirectResult().catch(() => {
      // Errors handled inside — ignore here
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up any previous household polling
      if (householdPollRef.current) {
        clearInterval(householdPollRef.current);
        householdPollRef.current = null;
      }
      if (householdTimeoutRef.current) {
        clearTimeout(householdTimeoutRef.current);
        householdTimeoutRef.current = null;
      }

      setFirebaseUser(firebaseUser);

      if (firebaseUser) {
        // ── Fetch user profile with retry ──────────────────────────────
        // During signup, onAuthStateChanged fires BEFORE the Firestore
        // profile doc is created. Retry a few times to handle this race.
        let profile = await getUserProfile(firebaseUser.uid);

        if (!profile) {
          for (let attempt = 0; attempt < 3 && !profile; attempt++) {
            await delay(1500);
            profile = await getUserProfile(firebaseUser.uid);
          }
        }

        // ── Self-heal: create profile if still missing ─────────────────
        if (!profile) {
          try {
            const newProfileData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              name: firebaseUser.displayName ?? "User",
              household_id: null,
              created_at: serverTimestamp(),
            };
            await setDoc(doc(db, "users", firebaseUser.uid), newProfileData);
            profile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email ?? "",
              name: firebaseUser.displayName ?? "User",
              household_id: null,
            } as User;
          } catch (err) {
            console.error("[useAuth] Failed to self-heal profile:", err);
          }
        }

        setUser(profile);
        setAuthLoading(false);

        // ── Self-heal: create household if missing ─────────────────────
        // The signup flow creates the household in the background.
        // Poll for it to appear, and create one if it doesn't after 5s.
        if (profile && !profile.household_id) {
          // Start polling for the household_id
          householdPollRef.current = setInterval(async () => {
            try {
              const updated = await getUserProfile(firebaseUser.uid);
              if (updated?.household_id) {
                setUser(updated);
                if (householdPollRef.current) {
                  clearInterval(householdPollRef.current);
                  householdPollRef.current = null;
                }
                if (householdTimeoutRef.current) {
                  clearTimeout(householdTimeoutRef.current);
                  householdTimeoutRef.current = null;
                }
              }
            } catch {
              // Ignore polling errors
            }
          }, 2000);

          // After 5 seconds, if still no household, try creating one
          householdTimeoutRef.current = setTimeout(async () => {
            try {
              const check = await getUserProfile(firebaseUser.uid);
              if (check && !check.household_id) {
                await createHousehold(firebaseUser.uid);
                const final = await getUserProfile(firebaseUser.uid);
                if (final) setUser(final);
              }
            } catch {
              console.warn("[useAuth] Self-heal household creation failed");
            }
            // Stop polling
            if (householdPollRef.current) {
              clearInterval(householdPollRef.current);
              householdPollRef.current = null;
            }
          }, 5_000);

          // Safety: stop all polling after 30 seconds
          setTimeout(() => {
            if (householdPollRef.current) {
              clearInterval(householdPollRef.current);
              householdPollRef.current = null;
            }
          }, 30_000);
        }
      } else {
        setUser(null);
        setAuthLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (householdPollRef.current) {
        clearInterval(householdPollRef.current);
        householdPollRef.current = null;
      }
      if (householdTimeoutRef.current) {
        clearTimeout(householdTimeoutRef.current);
        householdTimeoutRef.current = null;
      }
    };
  }, [setFirebaseUser, setUser, setAuthLoading]);
};
