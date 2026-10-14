"use client";

import {
  onAuthStateChanged,
  signInAnonymously,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { auth, isFirebaseConfigured, requireAuth } from "./client";

type AuthContextValue = {
  /** The signed-in (anonymous) Firebase user, or `null`. */
  user: User | null;
  /** True until Firebase has restored (or ruled out) a persisted session. */
  loading: boolean;
  /** Starts a private anonymous sandbox session. */
  signIn: () => Promise<User>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // With no Firebase config there is no session to restore.
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    if (!auth) return;
    // Firebase persists the session in IndexedDB (browserLocalPersistence) by
    // default, so a returning visitor gets the same anonymous uid back.
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async () => {
    const firebaseAuth = requireAuth();
    // Wait for a persisted session to be restored first, so a returning
    // visitor keeps their sandbox instead of getting a new anonymous user.
    await firebaseAuth.authStateReady();
    if (firebaseAuth.currentUser) return firebaseAuth.currentUser;
    const credential = await signInAnonymously(firebaseAuth);
    return credential.user;
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(requireAuth());
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signOut }),
    [user, loading, signIn, signOut],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>.");
  return value;
}
