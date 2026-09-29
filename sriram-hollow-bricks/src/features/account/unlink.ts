import { unlink, type User } from 'firebase/auth'

export class UnlinkError extends Error {
  constructor(message: string, public code: string) { super(message) }
}

export async function unlinkProvider(
  user: User,
  providerId: string
): Promise<void> {
  const providers = user.providerData.map((p) => p.providerId)

  if (providers.length <= 1) {
    throw new UnlinkError(
      'You cannot remove your only sign-in method. Add another first.',
      'LAST_PROVIDER'
    )
  }

  if (!providers.includes(providerId)) {
    throw new UnlinkError('That method is not linked to your account.', 'NOT_LINKED')
  }

  try {
    await unlink(user, providerId)
  } catch (err: any) {
    if (err?.code === 'auth/requires-recent-login') {
      throw new UnlinkError(
        'Please sign out and sign back in before removing a method.',
        'REQUIRES_REAUTH'
      )
    }
    throw err
  }
}
