import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, firestore } from '@/core/firebase/client'

const googleProvider = new GoogleAuthProvider()
// Force account picker every time — otherwise Chrome silently uses the
// last Google account, which confuses shared devices.
googleProvider.setCustomParameters({ prompt: 'select_account' })

/** Ensure a users/{uid} doc exists. Called after every sign-in. */
async function ensureUserDoc(user: User) {
  const ref = doc(firestore, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return

  await setDoc(ref, {
    email: user.email,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    businessId: null,
    provider: user.providerData[0]?.providerId ?? 'unknown',
    createdAt: serverTimestamp(),
  })
}

// ---------- Email / Password ----------

export async function signUp(email: string, password: string, displayName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await updateProfile(cred.user, { displayName })
  await ensureUserDoc(cred.user)
  return cred.user
}

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password)

// ---------- Google ----------

export async function signInWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider)
  await ensureUserDoc(cred.user)
  return cred.user
}

// ---------- Sign out ----------

export const logOut = () => signOut(auth)
