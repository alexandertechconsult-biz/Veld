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
      // Non-manifest assets that must ship and precache so the installed app is
      // fully usable offline (E8-02). Icons in `icons` below are added automatically.
      includeAssets: ['apple-touch-icon.png'],
      // Precache the whole app shell — code, styles, fonts and icons — so a cold,
      // airplane-mode open still renders (E8-02). Fonts and PNGs are outside the
      // Workbox default (js/css/html), so name them explicitly.
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,webmanifest}'],
      },
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
        // Generated from code by scripts/generate-icons.mjs (npm run icons). Both a
        // 192 and a 512 "any" icon are required for an Android Chrome install prompt;
        // the maskable variant fills the OS icon shape without letterboxing.
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
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
