import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// vite-plugin-pwa emits the web app manifest and a Workbox service worker at build
// time, which is what makes the app installable and offline-capable per the spec.
// autoUpdate keeps a returning farmer on the latest shell without a manual reload.
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Veld',
        short_name: 'Veld',
        description:
          'Offline-first farm record-keeping for a single mixed crop-and-livestock operation.',
        start_url: '/',
        display: 'standalone',
        // Colours are taken from .superdesign/design-system.md (light palette).
        background_color: '#FEFAE0',
        theme_color: '#01472E',
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    // Unit tests live under src/. e2e/ is Playwright's territory and must not be
    // collected by Vitest, or its test() calls fail against the wrong runner.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
