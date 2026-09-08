import { test, expect, type Page } from '@playwright/test';

/**
 * E0-04 — app shell and navigation. Runs on both the mobile-android and
 * desktop-chromium projects, so it also proves the responsive rule: bottom tab
 * bar below 768px, left sidebar at 768px and up.
 */

const MOBILE_BREAKPOINT = 768;

function visibleNav(page: Page) {
  const width = page.viewportSize()?.width ?? 0;
  return width < MOBILE_BREAKPOINT ? page.locator('.tab-bar') : page.locator('.sidebar');
}

test('shell shows the right nav surface for the viewport', { tag: '@E0-04' }, async ({ page }) => {
  await page.goto('/');
  const width = page.viewportSize()?.width ?? 0;

  if (width < MOBILE_BREAKPOINT) {
    await expect(page.locator('.tab-bar')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeHidden();
  } else {
    await expect(page.locator('.sidebar')).toBeVisible();
    await expect(page.locator('.tab-bar')).toBeHidden();
  }
});

test('navigates the five destinations with useful empty states', { tag: '@E0-04' }, async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  await expect(page.getByText('No activity yet. Set up your farm to start logging.')).toBeVisible();

  const nav = visibleNav(page);
  await nav.getByRole('button', { name: 'Livestock' }).click();
  await expect(page).toHaveURL(/#\/livestock$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Livestock');
  await expect(page.getByText('No animals or groups yet.', { exact: false })).toBeVisible();

  await nav.getByRole('button', { name: 'Crops' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Crops');

  await nav.getByRole('button', { name: 'Tasks' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tasks');
});

test('More menu reaches Financials and Settings', { tag: '@E0-04' }, async ({ page }) => {
  await page.goto('/');

  await visibleNav(page).getByRole('button', { name: 'More' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('More');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
  await expect(page.getByText('No farm set up yet.', { exact: false })).toBeVisible();

  // The primary nav keeps the More tab active for a secondary route.
  await expect(
    visibleNav(page).getByRole('button', { name: 'More' }),
  ).toHaveAttribute('aria-current', 'page');
});

test("empty-state CTA routes to farm setup", { tag: '@E0-04' }, async ({ page }) => {
  await page.goto('/#/livestock');
  await page.getByRole('button', { name: 'Set up your farm' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');
});
