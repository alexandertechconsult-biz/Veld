import { test, expect } from '@playwright/test';

/**
 * Boots the real Vite dev server (via E2E_DEV_SERVER_COMMAND in playwright.config)
 * and confirms the React app mounts and renders its shell. This is the runtime
 * proof for E0-02: the scaffold actually serves and runs, not just builds.
 */
test('app scaffold boots and renders the shell', { tag: '@E0-02' }, async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('#root')).not.toBeEmpty();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veld');
});
