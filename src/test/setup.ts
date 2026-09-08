// Polyfills a real IndexedDB in the Node test environment so Dexie can open,
// read and write exactly as it would in a browser. Must load before any code
// that touches indexedDB.
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees between tests so one test's DOM never leaks into the next.
afterEach(() => {
  cleanup();
});
