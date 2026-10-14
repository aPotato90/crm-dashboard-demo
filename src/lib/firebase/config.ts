/**
 * Public Firebase web config, read from NEXT_PUBLIC_FIREBASE_* env vars.
 *
 * These values identify the Firebase project and are inlined into the client
 * bundle at build time. They are not secrets: access is enforced by Firebase
 * Auth and `firestore.rules`. This module has no Firebase imports, so Server
 * Components can import it to decide what to render.
 *
 * Each variable is read with a static `process.env.NAME` expression because
 * Next.js only inlines static references.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
} as const;

/** Env var name for each config key, used to explain what is missing. */
const ENV_NAMES: Record<keyof typeof firebaseConfig, string> = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
};

/** Names of the NEXT_PUBLIC_FIREBASE_* variables that are not set. */
export const missingFirebaseEnvVars: readonly string[] = (
  Object.keys(firebaseConfig) as (keyof typeof firebaseConfig)[]
)
  .filter((key) => firebaseConfig[key].trim() === "")
  .map((key) => ENV_NAMES[key]);

/** True when every NEXT_PUBLIC_FIREBASE_* variable has a value. */
export const isFirebaseConfigured = missingFirebaseEnvVars.length === 0;
