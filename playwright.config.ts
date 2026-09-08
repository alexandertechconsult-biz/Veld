import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright boots the app itself so a recording never fails on a server nobody
 * started. Override with E2E_DEV_SERVER_COMMAND, or set it empty to skip booting
 * one at all, which is what the production-deployment spec wants.
 */
const devServerCommand = process.env.E2E_DEV_SERVER_COMMAND ?? 'npm run dev';
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on',
    video: 'on',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'mobile-android',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: devServerCommand !== ''
    ? {
        command: devServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
