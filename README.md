# Veld

Offline-first farm record-keeping PWA for a single mixed crop-and-livestock operation.
See [`BACKLOG.md`](./BACKLOG.md) for the product spec and [`PROGRESS.md`](./PROGRESS.md)
for build state.

## Stack

Vite + React + TypeScript, `vite-plugin-pwa` for the installable shell, Dexie over
IndexedDB for local storage (no server — local-only for MVP). Vitest for unit tests,
Playwright for E2E. Hosted on Vercel. Full rationale in `BACKLOG.md` Section 9.

## Setup

```sh
npm install
```

## Develop

```sh
npm run dev        # start the Vite dev server on http://localhost:5173
```

## Build

```sh
npm run build      # type-check, then emit the production build + PWA manifest and service worker
npm run preview    # serve the production build locally
```

`vite-plugin-pwa` writes the web app manifest and a Workbox service worker into
`dist/` on build, which is what makes the app installable and offline-capable.

## Test

```sh
npm test           # run the unit suite once (Vitest)
npm run test:watch # watch mode
npm run typecheck  # type-check without emitting
```

## End-to-end tests

E2E runs against a running app. The app command is **not** hardcoded in
`playwright.config.ts`; it is supplied through the `E2E_DEV_SERVER_COMMAND`
environment variable so the harness stays decoupled from the framework's CLI.
Playwright boots that command, waits for `E2E_BASE_URL` (default
`http://localhost:5173`), then runs the specs.

```sh
# Run the whole E2E suite against the dev server:
E2E_DEV_SERVER_COMMAND="npm run dev" npm run test:e2e

# Record durable evidence (trace + video) for one ticket, e.g. E0-02:
E2E_DEV_SERVER_COMMAND="npm run dev" npm run record:e2e E0-02 -- --ui
```

| Variable | Default | Purpose |
|---|---|---|
| `E2E_DEV_SERVER_COMMAND` | _unset_ | Command Playwright runs to boot the app before the suite. Leave unset only for specs that hit static fixtures (e.g. the E0-01 harness canary). |
| `E2E_BASE_URL` | `http://localhost:5173` | URL Playwright waits for and navigates against. |

Recordings are written under `e2e/recordings/<TICKET-ID>/`.
