import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  type User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./config";

export const signUpWithEmail = async (
  email: string,
  password: string,
  name: string
): Promise<User> => {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });

  // Create user document in Firestore
  await setDoc(doc(db, "users", credential.user.uid), {
    uid: credential.user.uid,
    email,
    name,
    household_id: null,
    created_at: serverTimestamp(),
  });

  return credential.user;
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

export const signInWithGoogle = async (): Promise<User> => {
  const provider = new GoogleAuthProvider();
  const credential = await signInWithPopup(auth, provider);
  const user = credential.user;

  // Create user doc if it doesn't exist (first-time Google login)
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email ?? "",
      name: user.displayName ?? "User",
      household_id: null,
      created_at: serverTimestamp(),
    });
  }

  return user;
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
};

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
