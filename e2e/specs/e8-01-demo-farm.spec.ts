import { test, expect } from '@playwright/test';

/**
 * E8-01 — pre-populated demo farm. Drives the running app on both projects from a
 * fresh (empty) IndexedDB: on the first-run screen, "Load a demo farm" seeds a
 * whole mixed crop-and-livestock farm and hands off to the shell, so Barrett can
 * show the concept without the farmer's real data. Confirms the seeded animals,
 * fields and transactions actually appear across the modules, and that they
 * persist across a reload (a real restart) without re-showing onboarding.
 */

test('loads the demo farm from first run and shows seeded data across modules', {
  tag: '@E8-01',
}, async ({ page }) => {
  // First launch, no data yet: the guided flow takes over instead of the shell.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Name your farm');

  // Load the demo instead of manual setup — one tap hands off to the shell.
  await page.getByTestId('first-run-load-demo').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');

  // Home is no longer the empty state — the seeded activity feed is populated.
  await expect(
    page.getByText('No activity yet. Log an event, activity, task, or cost and it will show up here.'),
  ).toHaveCount(0);

  // Livestock shows the seeded animals — an individual and a group.
  await page.goto('/#/livestock');
  await expect(page.getByText('Cow 042')).toBeVisible();
  await expect(page.getByText('Dorper flock')).toBeVisible();

  // Crops shows the seeded fields.
  await page.goto('/#/crops');
  await expect(page.getByText('North Field')).toBeVisible();

  // Financials shows the seeded transactions — a farm-level cost and a sale.
  await page.goto('/#/financials');
  await expect(page.getByText('Diesel for the bakkie')).toBeVisible();
  await expect(page.getByText('Sold three weaners at the auction')).toBeVisible();

  // Reload — a genuine restart. The demo farm persisted, so onboarding must not
  // return and the seeded data is still there.
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Home');
  await expect(page.getByText('Name your farm')).toHaveCount(0);

  await page.goto('/#/livestock');
  await expect(page.getByText('Cow 042')).toBeVisible();

  // The farm name persisted too.
  await page.goto('/#/settings');
  await expect(page.getByTestId('farm-name-input')).toHaveValue('Rietvlei Mixed Farm');
});
