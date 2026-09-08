import { defineConfig, devices } from '@playwright/test';

/**
 * The app is not built yet, so the dev server is opt-in via env var rather than
 * hardcoded to a framework's CLI. Set E2E_DEV_SERVER_COMMAND once the stack is
 * chosen (e.g. "npm run dev") and Playwright will boot it before the run.
 */
const devServerCommand = process.env.E2E_DEV_SERVER_COMMAND;
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
  webServer: devServerCommand
    ? {
        command: devServerCommand,
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
