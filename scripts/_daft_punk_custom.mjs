#!/usr/bin/env node
// One-off custom prompt for Daft Punk — bypasses the band-framing template
// that hardcodes "faces clearly visible" and forces chest-up bodies.
// Writes to public/artists/daft-punk.webp using the same sharp pipeline.

import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const REPO = '/Users/marfizo/Documents/Full App Code/Webapp-Refactor';
const OUT = `${REPO}/public/artists/daft-punk.webp`;
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY missing');
  process.exit(1);
}

const PROMPT = `A minimalist colored-pencil illustration of Daft Punk's two iconic motorcycle-style robot helmets shown in profile, overlapping side by side filling most of the frame — gold/copper helmet on the left with a dark amber visor, polished chrome silver helmet on the right with a cyan-tinted visor. NO bodies, NO necks, NO faces, NO suits — just the helmets and their reflective visors. Long flowing parallel pencil strokes that curve along the helmet contours, soft directional hatching, no geometric facets. A delicate pastel rainbow palette — peach, coral, cyan, turquoise, soft magenta, lavender — translucent strokes that overlap into gentle chromatic shifts. Plenty of warm cream paper showing through. Background: plain warm cream paper with faint pencil-sketch construction lines visible behind the helmets. Square aspect, no text, no signatures, no logos.`;

console.log('Calling OpenAI Image API…');
const res = await fetch('https://api.openai.com/v1/images/generations', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-image-1',
    prompt: PROMPT,
    size: '1024x1024',
    n: 1,
  }),
});

if (!res.ok) {
  console.error('API error:', res.status, await res.text());
  process.exit(1);
}

const json = await res.json();
const b64 = json.data?.[0]?.b64_json;
if (!b64) {
  console.error('No b64_json in response');
  process.exit(1);
}

const png = Buffer.from(b64, 'base64');
const webp = await sharp(png)
  .resize(320, 320, { fit: 'cover', position: 'attention' })
  .webp({ quality: 80 })
  .toBuffer();
await writeFile(OUT, webp);
console.log(`Wrote ${OUT} (${webp.length} bytes)`);
