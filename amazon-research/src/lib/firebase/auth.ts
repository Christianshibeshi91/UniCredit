/**
 * Firebase Auth client module.
 * Provides sign-up, sign-in, sign-out, Google OAuth, and auth state listener.
 */
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  onIdTokenChanged,
  type Auth,
  type User,
  type UserCredential,
} from "firebase/auth";
import { app } from "./client";

let _auth: Auth | null = null;

function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(app);
  }
  return _auth;
}

const googleProvider = new GoogleAuthProvider();

export async function signUp(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signIn(
  email: string,
  password: string
): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithPopup(auth, googleProvider);
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  return firebaseSignOut(auth);
}

export function onAuthStateChanged(
  callback: (user: User | null) => void
): () => void {
  const auth = getFirebaseAuth();
  return firebaseOnAuthStateChanged(auth, callback);
}

/**
 * Listen for ID token changes (including refresh).
 * Returns the current ID token string for use in API calls.
 */
export function onIdTokenChange(
  callback: (user: User | null) => void
): () => void {
  const auth = getFirebaseAuth();
  return onIdTokenChanged(auth, callback);
}

/**
 * Get the current user's ID token for API authorization headers.
 * Returns null if no user is signed in.
 */
export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export { getFirebaseAuth };
export type { User, UserCredential };
