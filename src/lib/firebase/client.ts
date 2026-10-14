/**
 * Firebase client SDK singletons. Import this only from Client Components or
 * from modules that only Client Components use.
 *
 * When the env vars are missing nothing is initialised: `auth` and `db` are
 * `null` and `isFirebaseConfigured` is `false`, so the UI can show a
 * "Firebase is not configured" screen instead of crashing.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

import { firebaseConfig, isFirebaseConfigured } from "./config";

export { isFirebaseConfigured, missingFirebaseEnvVars } from "./config";

function initApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null;
  // Reuse the existing app across Fast Refresh / module re-evaluation.
  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export const app: FirebaseApp | null = initApp();

/** Firebase Auth, or `null` when Firebase is not configured. */
export const auth: Auth | null = app ? getAuth(app) : null;

/** Firestore, or `null` when Firebase is not configured. */
export const db: Firestore | null = app ? getFirestore(app) : null;

// Local development against the Firebase Emulator Suite (`npm run
// emulators`). Opt-in only; production builds never set this.
const useEmulators = process.env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS === "true";
const globalForEmulators = globalThis as { __pipelinehqEmulators?: boolean };
if (useEmulators && auth && db && !globalForEmulators.__pipelinehqEmulators) {
  globalForEmulators.__pipelinehqEmulators = true;
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super(
      "Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables (see .env.example).",
    );
    this.name = "FirebaseNotConfiguredError";
  }
}

/** Returns Firestore or throws when Firebase is not configured. */
export function requireDb(): Firestore {
  if (!db) throw new FirebaseNotConfiguredError();
  return db;
}

/** Returns Auth or throws when Firebase is not configured. */
export function requireAuth(): Auth {
  if (!auth) throw new FirebaseNotConfiguredError();
  return auth;
}
