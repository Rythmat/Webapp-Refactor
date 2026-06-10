#!/usr/bin/env node
/* eslint-env node */
/**
 * Rasterize every SVG in public/artists/svg/ to a WebP sibling at 500×500 q85.
 * Each SVG actually wraps embedded base64-encoded raster data (verified during
 * the 4 Non Blondes blank-render debug), so vector quality is not lost.
 *
 * Pipeline: sharp(svg, density: 200) → resize 500×500 cover/attention → webp q85.
 * Matches the existing scripts/generate-artist-illustrations.mjs conventions.
 *
 * Usage: node scripts/rasterize-svg-artists.mjs
 */

import { readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.resolve(__dirname, '../public/artists/svg');
const SIZE = 500;
const QUALITY = 85;
const DENSITY = 200;

const files = (await readdir(DIR)).filter((f) => f.endsWith('.svg'));
console.log(
  `rasterizing ${files.length} SVGs at ${SIZE}×${SIZE} q${QUALITY} (density ${DENSITY})…\n`,
);

let totalBytes = 0;
let okCount = 0;
let errCount = 0;
for (const f of files) {
  const src = path.join(DIR, f);
  const dst = path.join(DIR, f.replace(/\.svg$/, '.webp'));
  try {
    const buf = await sharp(src, { density: DENSITY })
      .resize(SIZE, SIZE, { fit: 'cover', position: 'attention' })
      .webp({ quality: QUALITY })
      .toBuffer();
    await writeFile(dst, buf);
    totalBytes += buf.length;
    okCount++;
    const kb = (buf.length / 1024).toFixed(0);
    console.log(`  ✓ ${f.padEnd(34)} → ${kb.padStart(4)} KB`);
  } catch (e) {
    errCount++;
    console.error(`  ✗ ${f}: ${e.message}`);
  }
}

console.log(
  `\n${okCount} ok, ${errCount} errors. Total webp size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB.`,
);
