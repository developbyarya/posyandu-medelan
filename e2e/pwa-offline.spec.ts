import { expect, test } from '@playwright/test'

test.describe('Sprint 1: PWA & offline', () => {
  test('beranda tampil dengan nama aplikasi dan identitas posyandu', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('POSYANDU MEDELAN')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('POSYANDU MEDELAN')
    await expect(page.getByText('Posyandu Padukuhan Medelan')).toBeVisible()
    await expect(page.getByText('Penyimpanan di HP siap')).toBeVisible()
  })

  test('manifest PWA valid dan bisa dipasang (installable)', async ({ page, request }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()

    const res = await request.get(href!)
    expect(res.ok()).toBe(true)
    const manifest = await res.json()
    expect(manifest.name).toBe('POSYANDU MEDELAN')
    expect(manifest.short_name).toBe('Posyandu Medelan')
    expect(manifest.display).toBe('standalone')
    expect(manifest.lang).toBe('id')
    const sizes = manifest.icons.map((i: { sizes: string; purpose: string }) => `${i.sizes}:${i.purpose}`)
    expect(sizes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']))

    for (const icon of manifest.icons) {
      expect((await request.get(icon.src)).ok(), icon.src).toBe(true)
    }
  })

  test('aplikasi + template PDF tetap berjalan setelah offline (mode pesawat)', async ({ page, context }) => {
    await page.goto('/')
    // Tunggu service worker aktif & precache selesai.
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      if (!reg.active) throw new Error('service worker belum aktif')
    })
    await expect
      .poll(async () => page.evaluate(async () => (await caches.keys()).length), { timeout: 15_000 })
      .toBeGreaterThan(0)

    await context.setOffline(true)

    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('POSYANDU MEDELAN')
    await expect(page.getByText('Tanpa internet (data tetap aman di HP)')).toBeVisible()

    // Rute SPA (navigateFallback) juga harus bisa dibuka offline.
    await page.goto('/rute-tidak-ada')
    await expect(page.getByRole('heading', { name: 'Halaman tidak ditemukan' })).toBeVisible()

    // Template PDF ter-cache oleh service worker.
    const pdfStatus = await page.evaluate(async () => {
      const r = await fetch('/pdf/template_kartu_balita.pdf')
      const bytes = new Uint8Array(await r.arrayBuffer())
      return { ok: r.ok, magic: String.fromCharCode(...bytes.slice(0, 4)), size: bytes.length }
    })
    expect(pdfStatus.ok).toBe(true)
    expect(pdfStatus.magic).toBe('%PDF')
    expect(pdfStatus.size).toBeGreaterThan(10_000)

    await context.setOffline(false)
  })

  test('IndexedDB tersedia dan data bertahan setelah reload', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Balita tersimpan:')).toBeVisible()
    const dbNames = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name))
    expect(dbNames).toContain('PosyanduMedelanDB')
  })
})
