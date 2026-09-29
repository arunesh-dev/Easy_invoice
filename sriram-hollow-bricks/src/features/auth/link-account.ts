import {
  EmailAuthProvider,
  linkWithCredential,
  signInWithCredential,
  type AuthCredential,
  type User,
} from 'firebase/auth'
import { auth } from '@/core/firebase/client'

export interface PendingLink {
  email: string
  /** Provider id of the existing account, e.g. 'password' or 'google.com' */
  existingProvider: string
  /** The credential the user was trying to use when the collision happened. */
  pendingCredential: AuthCredential
}

/**
 * Extracts a PendingLink from a Firebase error thrown by signInWithPopup or
 * signInWithEmailAndPassword. Returns null if the error is unrelated.
 */
export function extractPendingLink(err: unknown): PendingLink | null {
  const e = err as { code?: string; customData?: { email?: string }; credential?: AuthCredential }
  if (e?.code !== 'auth/account-exists-with-different-credential') return null
  if (!e.customData?.email || !e.credential) return null

  const existingProvider = e.credential.providerId === 'google.com' ? 'password' : 'google.com'
  return {
    email: e.customData.email,
    existingProvider,
    pendingCredential: e.credential,
  }
}

/**
 * After the user successfully signs in with their existing method, link the
 * pending credential to the current user. This makes both methods work.
 */
export async function completeLink(pending: PendingLink): Promise<User> {
  const user = auth.currentUser
  if (!user) throw new Error('No signed-in user to link to')

  await linkWithCredential(user, pending.pendingCredential)
  return user
}

/**
 * Verify a password for a signed-in user, then link the pending Google
 * credential. This is the flow when an email/password user tries to add
 * Google later.
 *
 * Note: Firebase does NOT let us verify a password without signing in.
 * The user must already be signed in (or we sign them in first via
 * signInWithEmailAndPassword).
 */
export async function linkGoogleToCurrentUser(pending: PendingLink): Promise<void> {
  await completeLink(pending)
}

/**
 * Reverse case: a user signed in with Google wants to add a password.
 * Useful before they lose access to the Google account.
 */
export async function addPasswordToCurrentUser(password: string): Promise<void> {
  const user = auth.currentUser
  if (!user || !user.email) throw new Error('No signed-in user')
  const cred = EmailAuthProvider.credential(user.email, password)
  await linkWithCredential(user, cred)
}

/**
 * Ensure a signed-in Google user's pending credential matches their
 * existing account. Called internally by the login flow.
 */
export async function signInWithGoogleCredential(credential: AuthCredential): Promise<User> {
  const result = await signInWithCredential(auth, credential)
  return result.user
}
