import { EmailAuthProvider, reauthenticateWithCredential, signOut } from 'firebase/auth'
import { auth } from '@/core/firebase/client'

export class SessionError extends Error {
  constructor(message: string, public code: string) { super(message) }
}

export async function signOutEverywhere(): Promise<void> {
  await signOut(auth)
}

export async function reauthenticateWithPassword(password: string): Promise<void> {
  const user = auth.currentUser
  if (!user || !user.email) throw new SessionError('Not signed in', 'NO_USER')
  const cred = EmailAuthProvider.credential(user.email, password)
  await reauthenticateWithCredential(user, cred)
}
