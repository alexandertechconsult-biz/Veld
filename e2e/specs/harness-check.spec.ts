import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

/**
 * Verifies the recording harness itself: navigation, interaction, assertion, and
 * trace/video capture. It targets a static fixture, not application code, so it
 * stays green before the app exists and acts as the canary if the harness breaks.
 */
const fixtureUrl = pathToFileURL(
  path.join(process.cwd(), 'e2e/fixtures/harness-check.html'),
).href;

test('harness records a navigation, a click, and an assertion', { tag: '@E0-01' }, async ({ page }) => {
  await page.goto(fixtureUrl);

  await expect(page.locator('#heading')).toHaveText('E2E harness check');
  await expect(page.locator('#result')).toBeHidden();

  await page.locator('#record-action').click();

  await expect(page.locator('#result')).toBeVisible();
});
