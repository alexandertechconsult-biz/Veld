# E0-05 — Deploy to Vercel — verification

**Production URL:** https://veld-six.vercel.app/
**Verified:** 2026-09-08
**Method:** Playwright against the live deployment, not a local dev server.

## Command

```
E2E_PRODUCTION_URL="https://veld-six.vercel.app/" \
  bash .claude/skills/ralph-loop/scripts/record_e2e.sh E0-05 --ui
```

## Observed result

2 passed on both `mobile-android` (Pixel 5) and `desktop-chromium`. Trace and video
saved alongside this file at `e2e/recordings/E0-05/20260908T195625Z/`.

| Acceptance criterion | Evidence |
|---|---|
| Serves over HTTPS | `page.goto` returned 200, resolved URL protocol is `https:` |
| App shell renders | Navigation visible with all five destinations: Home, Livestock, Crops, Tasks, More |
| PWA manifest present | `link[rel="manifest"]` resolves, fetched 200, has a `name` field |
| Service worker present | `GET /sw.js` returned 200 |
| Design system survived build | Computed `body` background is `rgb(254, 250, 224)`, the `--bg` cream token |

## Not covered here

The Android Chrome install prompt is a browser-level behaviour that cannot be asserted
headlessly. It is part of GATE-0, to be confirmed by hand on a real device.

## Setup notes

Vercel project connected to `alexandertechconsult-biz/Veld` via the dashboard, building
`main` with the auto-detected Vite preset (`npm run build`, output `dist`). Branch pushes
produce preview deployments automatically.
