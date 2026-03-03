"use client";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/config";
import { getUserProfile } from "@/lib/firebase/firestore";
import { useAppStore } from "@/store/useAppStore";

export const useAuth = () => {
  const { setFirebaseUser, setUser, setAuthLoading } = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      if (firebaseUser) {
        const profile = await getUserProfile(firebaseUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [setFirebaseUser, setUser, setAuthLoading]);
};
