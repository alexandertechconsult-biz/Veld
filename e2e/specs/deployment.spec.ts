import { test, expect } from '@playwright/test';

/**
 * Verifies the deployed production build, not a local dev server: the app shell
 * renders over HTTPS, the PWA manifest and service worker are reachable, and the
 * design system's tokens survived the build. URL comes from the environment so no
 * deployment address is hardcoded.
 */
const productionUrl = process.env.E2E_PRODUCTION_URL;

test.describe('production deployment', () => {
  test.skip(!productionUrl, 'set E2E_PRODUCTION_URL to run deployment checks');

  test('serves the app shell, manifest and service worker over HTTPS', { tag: '@E0-05' }, async ({ page, request }) => {
    const response = await page.goto(productionUrl!, { waitUntil: 'networkidle' });

    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).protocol).toBe('https:');

    // A device that has never opened the app lands on the first-run flow; one that
    // has already been set up lands on the shell. Both are healthy deployments.
    const firstRun = page.getByRole('heading', { name: 'Name your farm' });
    const nav = page.getByRole('navigation');
    await expect(firstRun.or(nav).first()).toBeVisible();

    if (await nav.isVisible()) {
      for (const label of ['Home', 'Livestock', 'Crops', 'Tasks', 'More']) {
        await expect(nav.getByText(label, { exact: true })).toBeVisible();
      }
    }

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toBeTruthy();
    const manifest = await request.get(new URL(manifestHref!, productionUrl!).href);
    expect(manifest.status()).toBe(200);
    expect((await manifest.json()).name).toBeTruthy();

    const serviceWorker = await request.get(new URL('/sw.js', productionUrl!).href);
    expect(serviceWorker.status()).toBe(200);

    const background = await page.evaluate(
      () => getComputedStyle(document.body).backgroundColor,
    );
    expect(background).toBe('rgb(254, 250, 224)');
  });
});
