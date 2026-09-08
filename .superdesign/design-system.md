# Veld — Design System

Version 1.0, 2026-09-08. The single source of visual truth. Every colour, size and
component style used in the app must appear in this file. Nothing else is permitted.

---

## 1. Product context

**Veld** is an offline-first record-keeping PWA for one farmer running a mixed
crop-and-livestock operation. It replaces paper, WhatsApp messages and spreadsheets
with one place to log animals, fields, tasks and money.

**Jobs to be done**

- In the field, one-handed, often with gloves and no signal: log what just happened in under three taps
- At the kitchen table at day's end: review, correct and add what was missed
- At season end: find a past record faster than digging through paper

**Who it is not for.** Teams, compliance officers, agronomists. There are no user
accounts, no dashboards, no charts and no reporting. Simplicity is the product.

**Destinations** (five, fixed): Home, Livestock, Crops, Tasks, More (Financials, Settings).

---

## 2. Constraints that outrank aesthetics

These come from the product spec and are not negotiable for visual reasons.

1. **Direct sunlight.** Every text-on-background pair must clear 7:1. All pairs below are verified.
2. **Gloves.** Interactive targets are 44px minimum, 56px for primary actions. Nothing below 14px type.
3. **Three taps.** Any log entry completes in three taps from Home. Layout serves this above all else.
4. **Offline is normal.** No spinner, no network state, no sync language anywhere in the UI.
5. **No empty-state dead ends.** Every zero-data screen tells the farmer the one thing to do next.

---

## 3. Colour

Derived from the Nature Inspired forest-and-sage story, adapted for outdoor legibility.
Ratios are measured, not estimated.

### Light theme (default, the in-field theme)

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--bg` | `#FEFAE0` | Page background, cream | — |
| `--surface` | `#FFFFFF` | Cards, list rows, sheets | — |
| `--surface-sunk` | `#E9EDC9` | Selected rows, subtle fills, olive | — |
| `--border` | `#01472E` at 15% | Hairlines and dividers | — |
| `--text` | `#01472E` | Primary text, forest | 10.28:1 on bg |
| `--text-muted` | `#3D4A32` | Timestamps, secondary labels, bark | 8.98:1 on bg |
| `--primary` | `#01472E` | Primary buttons, active nav, forest | 10.28:1 with cream text |
| `--primary-text` | `#FEFAE0` | Text on primary | — |
| `--accent` | `#CCD5AE` | Selected state, sage | 7.05:1 with forest text |
| `--danger` | `#8C3D1E` | Costs, delete, clay | 7.13:1 on bg |

### Dark theme (the kitchen-table theme)

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `--bg` | `#12160E` | Page background, night | — |
| `--surface` | `#1C2116` | Cards, list rows, sheets | — |
| `--surface-sunk` | `#262C1F` | Selected rows, subtle fills | — |
| `--border` | `#3A4230` | Hairlines and dividers | — |
| `--text` | `#FEFAE0` | Primary text, cream | 17.41:1 on bg |
| `--text-muted` | `#A3B18A` | Timestamps, secondary labels, moss | 8.03:1 on bg |
| `--primary` | `#CCD5AE` | Primary buttons, active nav, sage | 11.94:1 on bg |
| `--primary-text` | `#01472E` | Text on primary | 7.05:1 |
| `--accent` | `#3A4230` | Selected state | — |
| `--danger` | `#E08C5A` | Costs, delete, ember | 7.04:1 on bg |

**Theme switching.** Tokens are defined on `:root` for light and redefined under
`@media (prefers-color-scheme: dark)` and `[data-theme="dark"]`. Never define a colour
only inside a dark block.

**Forbidden.** Purple in any role. Gradients. Glassmorphism and `backdrop-filter`.
Pure black `#000000` and pure `#FF0000`. Any colour not in these two tables.

---

## 4. Typography

**One family: Inter.** Variable weight, self-hosted rather than CDN so it works offline
on first load. No display face, no second family, no monospace.

| Role | Size | Weight | Line height |
|---|---|---|---|
| Display | 32px | 700 | 1.2 |
| Title | 24px | 600 | 1.3 |
| Heading | 20px | 600 | 1.3 |
| Body | 16px | 400 | 1.5 |
| Label | 14px | 600 | 1.4 |

**14px is the floor.** No 10px or 12px metadata anywhere, including timestamps.
Sentence case throughout. No all-caps labels, no letter-spacing tricks: both slow
down scanning, which is the opposite of what a farmer standing in a field needs.

---

## 5. Spacing

Scale: **4, 8, 12, 16, 24, 32, 48**. No other values.

- Screen padding: 16
- Gap between list rows: 1px hairline, no gap
- Card padding: 16
- Gap between sections: 24
- Space above a primary action: 32

---

## 6. Surfaces and shape

- **Radius:** 8px for cards, inputs and buttons. 16px for bottom sheets, top corners only. Nothing else.
- **Elevation:** none. No box-shadow anywhere. Separation comes from hairline borders and the sunk fill.
- **Borders:** 1px, `--border`.
- **Texture:** none. No noise overlay, no paper grain, no background pattern.

---

## 7. Components

**Button, primary.** 56px tall, full width on mobile, `--primary` fill, `--primary-text`
label at Label size, 8px radius. Active state darkens 8%. No hover-only affordances,
this is a touch device first.

**Button, secondary.** 44px tall, transparent fill, 1px `--border`, `--text` label.

**List row.** 64px minimum height, `--surface` fill, 1px bottom hairline, 16px horizontal
padding. Left: icon at 24px. Centre: title at Body, secondary line at Label in `--text-muted`.
Right: chevron or value. The whole row is the tap target.

**Input.** 56px tall, `--surface` fill, 1px `--border`, 8px radius, 16px padding,
Body size. Label sits above at Label size, never as placeholder text only.

**Bottom sheet.** Slides from the bottom, 16px top corners, `--surface` fill, full width.
Used for quick-add. Never stack sheets, never a modal on top of a sheet.

**Empty state.** Centred, 24px vertical rhythm: a 32px icon in `--text-muted`, one line of
Body text saying what is missing, and one primary button saying exactly what to do.
Never a bare "No data".

**Bottom tab bar.** 5 items, 56px tall plus safe-area inset, `--surface` fill, 1px top
hairline. Active item uses `--primary` for icon and label. Icon 24px, label 14px beneath.

**Sidebar (768px and up).** 240px wide, same five destinations as rows, 1px right hairline.
List and detail sit side by side in the remaining width.

---

## 8. Icons

Lucide, 24px, 1.5px stroke, `currentColor`. Icons always carry a text label. The spec's
"icons over text labels" is read as icons *with* short labels: an unlabelled icon is a
guessing game, and this farmer is using the app for the first time in a field.

---

## 9. Motion

Deliberately minimal. Motion costs battery and attention, and this app is used in bright
light where subtle animation is invisible anyway.

- Transitions: 150ms, `ease-out`. Nothing longer.
- Permitted: sheet slide-up, tab change, row press feedback.
- Forbidden: parallax, float, scroll-triggered reveals, staggered letter animation, skeleton shimmer.
- Respect `prefers-reduced-motion` by disabling all of it.

---

## 10. Layout

- **Mobile, below 768px:** single column, bottom tab bar, full-width bottom sheets.
- **Tablet and desktop, 768px and up:** left sidebar, list and detail side by side.
- No feature exists on one breakpoint and not the other. One responsive experience.
- Content max-width 720px in the detail pane so lines stay readable on a wide screen.

---

## 11. Voice

Plain farm language. "Log an event", not "Create record". "Cost", not "Expenditure".
No exclamation marks, no encouragement copy, no onboarding cheer. Every string tells
the farmer something or tells them what to do. No emojis anywhere in the interface.
