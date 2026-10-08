import { defineConfig, devices } from '@playwright/test'

/**
 * E2E berjalan terhadap build produksi (`vite preview`) karena service worker
 * hanya aktif pada build, bukan di `vite dev`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-mobile',
      // Emulasi HP Android (Pixel 7); service worker tetap didukung.
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
