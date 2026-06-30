#!/usr/bin/env node
// One-off custom prompt for Vulfpeck — keeps the pastel colored-pencil house
// style for grid consistency, but borrows the reference composition (profile
// row of figures, all facing right, overlapping, matching red caps).

import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const REPO = '/Users/marfizo/Documents/Full App Code/Webapp-Refactor';
const OUT = `${REPO}/public/artists/vulfpeck.webp`;
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('OPENAI_API_KEY missing');
  process.exit(1);
}

const PROMPT = `A minimalist colored-pencil illustration of the band Vulfpeck — 5 band members shown in strict profile, all facing the right side of the frame, overlapping in a tight horizontal row from foreground to background, each figure shown from the shoulders up. Every band member wears a matching bright red baseball cap as their signature accessory. Variety of facial features visible: full beards, scruffy stubble, eyeglasses, dark aviator sunglasses. Long, flowing parallel pencil strokes that curve along the contours of faces, beards, hair, and caps — soft, organic directional hatching, no geometric facets, no triangles, no angular polygons. A delicate pastel rainbow palette — peach, coral, pink, soft magenta, mint, sky-blue, lavender, gentle turquoise — translucent strokes that overlap into gentle chromatic shifts where they cross; not saturated, not neon. The red baseball caps are rendered as a warm coral-red that sits naturally within the same pastel palette. Minimalist and open — plenty of warm cream paper showing through; the drawing fades softly around the edges rather than filling the frame. Naturalistic proportions, expressive features. Background: plain warm cream / off-white paper, no scene, no shapes, no patterns; a few faint pencil-sketch construction lines may be visible in the negative space. Square aspect ratio, balanced composition, no text, no signatures, no logos, no brand marks, no copyrighted iconography.`;

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
