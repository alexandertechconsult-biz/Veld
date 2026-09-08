import { test, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/**
 * E6-05 — export and import. Drives the running app on both projects: import a
 * crafted backup file through the Settings UI, then export it back and confirm
 * the downloaded file is a valid Veld backup carrying the same records. That is
 * a full round trip through IndexedDB, not a unit-level check.
 */

const FORMAT = 'veld-backup';
const VERSION = 1;

interface SeedRecord {
  id: string;
  createdAt: number;
  updatedAt: number;
  [key: string]: unknown;
}

/** Builds a valid backup file with one farm and one task and writes it to disk. */
function writeBackupFixture(name: string): { filePath: string; recordCount: number } {
  const farm: SeedRecord = { id: 'farm-1', createdAt: 1, updatedAt: 1, name: 'Rooikraal' };
  const task: SeedRecord = {
    id: 'task-1',
    createdAt: 2,
    updatedAt: 2,
    farmId: 'farm-1',
    title: 'Fix the north fence',
    status: 'open',
  };
  const backup = {
    format: FORMAT,
    version: VERSION,
    exportedAt: 1_700_000_000_000,
    data: {
      farms: [farm],
      enterprises: [],
      livestock: [],
      fields: [],
      events: [],
      activities: [],
      tasks: [task],
      transactions: [],
    },
  };
  const filePath = path.join(tmpdir(), name);
  writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf8');
  return { filePath, recordCount: 2 };
}

test('imports a backup then exports it back as a valid file', { tag: '@E6-05' }, async ({
  page,
}, testInfo) => {
  const { filePath, recordCount } = writeBackupFixture(
    `veld-e2e-${testInfo.project.name}-${testInfo.testId}.json`,
  );

  await page.goto('/#/settings');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Settings');

  // Import the crafted file through the hidden input the button drives.
  await page.getByTestId('import-input').setInputFiles(filePath);
  await expect(page.getByText(`Imported ${recordCount} records.`)).toBeVisible();

  // Export it back and inspect the downloaded file.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export data' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^veld-backup-\d{4}-\d{2}-\d{2}\.json$/);

  const savedPath = await download.path();
  const parsed = JSON.parse(readFileSync(savedPath, 'utf8'));
  expect(parsed.format).toBe(FORMAT);
  expect(parsed.version).toBe(VERSION);
  expect(parsed.data.farms).toHaveLength(1);
  expect(parsed.data.farms[0].name).toBe('Rooikraal');
  expect(parsed.data.tasks[0].title).toBe('Fix the north fence');

  await expect(page.getByText(`Exported ${recordCount} records.`)).toBeVisible();
});

test('shows an error when the file is not a Veld backup', { tag: '@E6-05' }, async ({
  page,
}, testInfo) => {
  const badPath = path.join(tmpdir(), `veld-e2e-bad-${testInfo.project.name}-${testInfo.testId}.txt`);
  writeFileSync(badPath, 'this is not a backup', 'utf8');

  await page.goto('/#/settings');
  await page.getByTestId('import-input').setInputFiles(badPath);

  await expect(page.getByRole('alert')).toContainText('not valid JSON');
});
