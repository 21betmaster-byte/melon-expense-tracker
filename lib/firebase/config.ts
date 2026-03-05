import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentMultipleTabManager,
  persistentLocalCache,
} from "firebase/firestore";

// Trim all env vars defensively — copy-paste in Vercel dashboard
// can introduce trailing newlines (\n) which break URLs (e.g. authDomain).
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim(),
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim(),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim(),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim(),
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use localStorage persistence instead of IndexedDB (the default).
// This ensures Playwright's storageState can capture the auth token across
// test runs — Playwright captures localStorage but not IndexedDB.
// localStorage persistence is fully supported in all modern browsers.
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    // Silently ignore — fallback to default persistence if this fails
  });
}

// Use the modern cache API (replaces deprecated enableMultiTabIndexedDbPersistence).
// initializeFirestore must be called before any getFirestore() calls, so we
// guard against double-initialisation with getApps() check above.
// In SSR / Node environments we fall back to the default (memory) cache.
let db: ReturnType<typeof getFirestore>;
if (typeof window !== "undefined") {
  try {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch {
    // initializeFirestore throws if already initialised (hot-reload etc.)
    db = getFirestore(app);
  }
} else {
  db = getFirestore(app);
}

export { app, auth, db };
