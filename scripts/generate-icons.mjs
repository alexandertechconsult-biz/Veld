// Generates the PWA icons from code so the repo carries no unexplained binaries
// and the brand mark is reproducible. A cream "V" (for Veld) on the design-system
// green (#01472E on #FEFAE0, from .superdesign/design-system.md). Uses only Node
// built-ins (zlib) — no image dependency. Run: npm run icons
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const GREEN = [1, 71, 46]; // #01472E
const CREAM = [254, 250, 224]; // #FEFAE0

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

// Coverage in [0,1] with a half-pixel feather, so edges anti-alias instead of jag.
function coverage(distance, radius, feather) {
  return Math.max(0, Math.min(1, (radius - distance) / feather + 0.5));
}

function renderIcon(size, { rounded }) {
  const buf = Buffer.alloc(size * size * 4);
  const feather = 1.5 / size;
  const stroke = 0.075; // half-width of the V strokes, normalised
  const cornerRadius = 0.2; // rounded-square radius for the "any" icon
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size;
      const ny = (y + 0.5) / size;

      // Square alpha: full-bleed for maskable, rounded (transparent corners) for "any".
      let squareAlpha = 1;
      if (rounded) {
        const qx = Math.abs(nx - 0.5) - (0.5 - cornerRadius);
        const qy = Math.abs(ny - 0.5) - (0.5 - cornerRadius);
        const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - cornerRadius;
        squareAlpha = coverage(outside, 0, feather); // fades to 0 past the corner
      }

      // The V mark: two strokes meeting at a low apex, inside the maskable safe zone.
      const dV = Math.min(
        distanceToSegment(nx, ny, 0.3, 0.3, 0.5, 0.7),
        distanceToSegment(nx, ny, 0.7, 0.3, 0.5, 0.7),
      );
      const vCoverage = coverage(dV, stroke, feather);

      const r = GREEN[0] + (CREAM[0] - GREEN[0]) * vCoverage;
      const g = GREEN[1] + (CREAM[1] - GREEN[1]) * vCoverage;
      const b = GREEN[2] + (CREAM[2] - GREEN[2]) * vCoverage;

      const i = (y * size + x) * 4;
      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = Math.round(squareAlpha * 255);
    }
  }
  return buf;
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: 'pwa-192.png', size: 192, rounded: true },
  { file: 'pwa-512.png', size: 512, rounded: true },
  { file: 'maskable-512.png', size: 512, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, rounded: false },
];

for (const { file, size, rounded } of targets) {
  const png = encodePng(size, renderIcon(size, { rounded }));
  writeFileSync(join(OUT_DIR, file), png);
  console.log(`wrote public/${file} (${size}x${size}, ${png.length} bytes)`);
}
