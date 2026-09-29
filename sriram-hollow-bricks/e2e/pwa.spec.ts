import { test, expect } from '@playwright/test'

test('PWA manifest is valid and installable', async ({ page, baseURL }) => {
  await page.goto('/')

  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute('href')
  expect(manifestHref).toBeTruthy()

  const manifestRes = await page.request.get(new URL(manifestHref!, baseURL).href)
  expect(manifestRes.ok()).toBe(true)

  const manifest = await manifestRes.json()
  expect(manifest.name).toBe('Sriram Hollow Bricks')
  expect(manifest.short_name).toBe('Sriram')
  expect(manifest.display).toBe('standalone')
  expect(manifest.start_url).toBe('/')
  expect(manifest.icons?.length).toBeGreaterThanOrEqual(2)
  expect(manifest.icons?.some((i: any) => i.purpose === 'maskable')).toBe(true)
})

test('service worker registers', async ({ page }) => {
  await page.goto('/')
  const ready = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return false
    const reg = await navigator.serviceWorker.ready.catch(() => null)
    return !!reg
  })
  expect(ready).toBe(true)
})
