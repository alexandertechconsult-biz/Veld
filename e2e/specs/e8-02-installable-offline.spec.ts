import { test, expect } from '@playwright/test';

/**
 * E8-02 — installable PWA, one-tap demo, airplane-mode logging.
 *
 * Runs against the production build served by `vite preview` (not the dev
 * server), because only the built app ships the service worker that makes the
 * PWA installable and offline-capable. Point the harness at the preview build:
 *
 *   npm run build
 *   E2E_DEV_SERVER_COMMAND='npm run preview -- --port 4173 --strictPort' \
 *   E2E_BASE_URL='http://localhost:4173' \
 *   bash .claude/skills/ralph-loop/scripts/record_e2e.sh E8-02 --ui
 *
 * The test skips on the plain dev server (no service worker there) so it never
 * reports a false pass.
 */

test('installable PWA loads the demo in one tap, then logs offline in airplane mode', {
  tag: '@E8-02',
}, async ({ page, context, request, baseURL }) => {
  await page.goto('/');

  // A dev server ships no service worker, so this spec only means something
  // against the built preview. Detect an actually-registered worker (Chromium
  // always exposes navigator.serviceWorker, so a capability check is not enough)
  // and skip rather than hang or pretend offline was exercised.
  const serviceWorkerReady = await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3000)),
    ]),
  );
  test.skip(!serviceWorkerReady, 'no service worker registered — run against the preview build');

  // Installable: the manifest advertises the icons Android Chrome needs to offer
  // an install prompt (a 192 and a 512 "any" icon).
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(manifestHref).toBeTruthy();
  const manifest = await (await request.get(new URL(manifestHref!, baseURL!).href)).json();
  const sizes: string[] = (manifest.icons ?? []).map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');

  // The service worker (ready above) takes control of the page — that control is
  // what serves a cold, offline open from cache.
  await page.reload();
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  // One tap on first open loads the whole demo farm and hands off to the shell.
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Name your farm');
  await page.getByTestId('first-run-load-demo').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  const feed = page.getByRole('list', { name: 'Recent activity' });
  await expect(feed).toBeVisible();

  // Airplane mode: cut the network entirely, then log a live entry — the single
  // most convincing moment in the Section 12 demo. Local writes must still work.
  await context.setOffline(true);

  const trigger = page.getByTestId('quick-add-trigger');
  await trigger.click();
  const sheet = page.getByRole('dialog', { name: 'Log something' });
  await expect(sheet).toBeVisible();
  await sheet.getByRole('button', { name: 'Task' }).click();
  await sheet.getByTestId('quick-task-title-input').fill('Move cattle to the top camp');
  await sheet.getByRole('button', { name: 'Add task' }).click();
  await expect(sheet).toBeHidden();
  await expect(feed).toContainText('Move cattle to the top camp');

  // Reload while still offline: the installed shell loads from the service-worker
  // cache (no network), and the entry logged in airplane mode persisted.
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  await expect(page.getByRole('list', { name: 'Recent activity' })).toContainText(
    'Move cattle to the top camp',
  );

  await context.setOffline(false);
});
