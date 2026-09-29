import { describe, expect, it, vi } from 'vitest'
import { unlinkProvider } from './unlink'

function fakeUser(providers: string[]): any {
  return {
    providerData: providers.map((p) => ({ providerId: p })),
  }
}

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<any>('firebase/auth')
  return { ...actual, unlink: vi.fn(async () => {}) }
})

describe('unlinkProvider', () => {
  it('refuses to remove the last provider', async () => {
    const user = fakeUser(['google.com'])
    await expect(unlinkProvider(user, 'google.com')).rejects.toMatchObject({
      code: 'LAST_PROVIDER',
    })
  })

  it('refuses to remove a provider that is not linked', async () => {
    const user = fakeUser(['google.com', 'password'])
    await expect(unlinkProvider(user, 'phone')).rejects.toMatchObject({
      code: 'NOT_LINKED',
    })
  })

  it('allows removal when at least one other provider remains', async () => {
    const user = fakeUser(['google.com', 'password'])
    await expect(unlinkProvider(user, 'google.com')).resolves.toBeUndefined()
  })
})
