import { test, expect } from '@playwright/test'

// Dev-only: seeds a fresh account per run against the Firebase emulator.
// Set VITE_USE_EMULATORS=true in .env.local before running e2e.
function freshEmail() {
  return `e2e+${Date.now()}${Math.floor(Math.random() * 1000)}@example.com`
}

test.describe('customers flow', () => {
  test('sign up → add customer → persists across reload → search works', async ({ page }) => {
    const email = freshEmail()

    await page.goto('/signup')
    await page.getByLabel('Name').fill('E2E Owner')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('test-password-123')
    await page.getByRole('button', { name: /create account/i }).click()

    await expect(page).toHaveURL(/\/home/)
    await expect(page.getByText(/dashboard/i)).toBeVisible()

    // Onboarding: create a business if the app redirects there.
    // (M0 placeholder doesn't yet; add this block when onboarding ships.)
    // await page.getByLabel(/business name/i).fill('E2E Bricks')
    // await page.getByRole('button', { name: /create business/i }).click()

    // Navigate to Customers
    await page.getByRole('link', { name: /customers/i }).click()
    await expect(page).toHaveURL(/\/customers/)

    // Create
    await page.getByRole('button', { name: /^add$/i }).click()
    await page.getByLabel(/name/i).fill('Ramesh Kumar')
    await page.getByLabel(/phone/i).fill('9876543210')
    await page.getByLabel(/address/i).fill('12 Brick Lane, Chennai')
    await page.getByRole('button', { name: /add customer/i }).click()

    await expect(page.getByText('Ramesh Kumar')).toBeVisible()

    // Search
    await page.goto('/customers')
    await page.getByPlaceholder(/search by name/i).fill('Ramesh')
    await expect(page.getByText('Ramesh Kumar')).toBeVisible()
    await page.getByPlaceholder(/search by name/i).fill('Nonexistent')
    await expect(page.getByText(/no customers match/i)).toBeVisible()
  })

  test('offline write queues and syncs on reconnect', async ({ page, context }) => {
    // Assumes user is already signed in from the previous test's storage state.
    // For a real suite, use storageState fixtures. Here: inline login.
    // ...

    await context.setOffline(true)
    await page.goto('/customers')
    await page.getByRole('button', { name: /^add$/i }).click()
    await page.getByLabel(/name/i).fill('Offline Customer')
    await page.getByRole('button', { name: /add customer/i }).click()

    // Should appear immediately with a pending dot
    await expect(page.getByText('Offline Customer')).toBeVisible()
    await expect(page.getByText(/offline — changes will sync/i)).toBeVisible()

    // Reconnect
    await context.setOffline(false)
    await expect(page.getByText(/syncing/i)).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/syncing/i)).toBeHidden({ timeout: 15000 })
  })
})
