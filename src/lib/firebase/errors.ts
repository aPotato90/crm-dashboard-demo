import { FirebaseError } from "firebase/app";

/** Turns Firebase errors into short, actionable messages for the UI. */
export function describeFirebaseError(error: unknown): string {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/operation-not-allowed":
      case "auth/admin-restricted-operation":
        return "Anonymous sign-in is turned off for this Firebase project. Enable it under Authentication > Sign-in method.";
      case "auth/network-request-failed":
      case "unavailable":
        return "Could not reach Firebase. Check your connection and try again.";
      case "permission-denied":
        return "Firestore refused the request. Make sure the rules from firestore.rules are published.";
      case "auth/invalid-api-key":
      case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
        return "The Firebase API key is not valid. Check NEXT_PUBLIC_FIREBASE_API_KEY.";
      default:
        return `Firebase error (${error.code}). Please try again.`;
    }
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
