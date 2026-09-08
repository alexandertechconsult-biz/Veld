import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Enforces the design-system rule (design-system.md §3): every colour literal in
 * the CSS must be one of the two token tables. Component CSS references colours
 * only through var(--token), so the only literals live in tokens.css — which is
 * exactly what ends up in the built CSS. Scanning source is therefore equivalent
 * to scanning the bundle for colour literals, and far faster.
 */

// The two palettes from design-system.md §3, normalised to 6-hex uppercase.
const ALLOWED_HEX = new Set([
  // Light theme
  'FEFAE0',
  'FFFFFF',
  'E9EDC9',
  '01472E',
  '3D4A32',
  'CCD5AE',
  '8C3D1E',
  // Dark theme
  '12160E',
  '1C2116',
  '262C1F',
  '3A4230',
  'A3B18A',
  'E08C5A',
]);

// --border in the light theme is #01472E at 15%, expressed as rgba.
const ALLOWED_RGB = new Set(['1,71,46']);

function collectCssFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.css'))
    .map((e) => join(e.parentPath ?? dir, e.name));
}

function normaliseHex(raw: string): string {
  const hex = raw.replace('#', '').toUpperCase();
  if (hex.length === 3) {
    return hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  return hex.slice(0, 6); // drop any alpha channel
}

describe('CSS colour tokens', () => {
  const cssFiles = collectCssFiles('src');

  it('finds the stylesheet(s) to scan', () => {
    expect(cssFiles.length).toBeGreaterThan(0);
  });

  it('uses no colour outside the design-system token tables', () => {
    const offenders: string[] = [];

    for (const file of cssFiles) {
      const css = readFileSync(file, 'utf8');

      for (const match of css.matchAll(/#([0-9a-fA-F]{3,8})\b/g)) {
        const hex = normaliseHex(match[0]);
        if (!ALLOWED_HEX.has(hex)) {
          offenders.push(`${file}: #${match[1]}`);
        }
      }

      for (const match of css.matchAll(/rgba?\(([^)]+)\)/g)) {
        const triple = match[1]
          .split(',')
          .slice(0, 3)
          .map((n) => n.trim())
          .join(',');
        if (!ALLOWED_RGB.has(triple)) {
          offenders.push(`${file}: rgb(${match[1]})`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('defines every palette colour somewhere in the CSS', () => {
    const allCss = cssFiles.map((f) => readFileSync(f, 'utf8')).join('\n').toUpperCase();
    for (const hex of ALLOWED_HEX) {
      expect(allCss, `expected #${hex} to be defined`).toContain(`#${hex}`);
    }
  });
});
