import { test, expect } from '@playwright/test'

test.describe('invoice PDF share', () => {
  test.skip(
    !process.env.VITE_USE_EMULATORS,
    'Requires Firebase emulators — set VITE_USE_EMULATORS=true'
  )

  test('generates a valid PDF and downloads when share is unavailable', async ({ page, context }) => {
    // Force the download fallback by removing navigator.share.
    await context.addInitScript(() => {
      // @ts-expect-error — intentionally removing for the test
      delete navigator.share
      // @ts-expect-error
      delete navigator.canShare
    })

    // --- Sign up and seed a business + invoice. ---
    // (Reuse your existing helpers; simplified here for illustration.)
    const email = `share+${Date.now()}@example.com`
    await page.goto('/signup')
    await page.getByLabel('Name').fill('PDF Tester')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('test-password-123')
    await page.getByRole('button', { name: /create account/i }).click()

    await page.getByLabel(/business name/i).fill('Test Bricks')
    await page.getByRole('button', { name: /create business/i }).click()

    await page.goto('/customers/new')
    await page.getByLabel('Name').fill('Ramesh')
    await page.getByRole('button', { name: /add customer/i }).click()

    await page.goto('/products/new')
    await page.getByLabel(/product name/i).fill('Brick A')
    await page.getByLabel(/price/i).fill('35.5')
    await page.getByRole('button', { name: /add product/i }).click()

    await page.goto('/invoices/new')
    await page.locator('select').first().selectOption({ label: 'Ramesh' })
    await page.getByRole('button', { name: /add item/i }).click()
    await page.getByRole('button', { name: /brick a/i }).click()
    await page.getByRole('button', { name: /create invoice/i }).click()

    // --- Trigger the share flow. ---
    const downloadPromise = page.waitForEvent('download')
    await page.getByLabel('Share PDF').click()
    const download = await downloadPromise

    // --- Assert the file is a valid PDF. ---
    expect(download.suggestedFilename()).toMatch(/^SRM-\d+\.pdf$/)

    const path = await download.path()
    expect(path).toBeTruthy()

    const fs = await import('node:fs/promises')
    const buf = await fs.readFile(path!)
    const header = buf.subarray(0, 5).toString('ascii')
    expect(header).toBe('%PDF-')
    expect(buf.length).toBeGreaterThan(1000)
  })
})
