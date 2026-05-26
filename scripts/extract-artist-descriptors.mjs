#!/usr/bin/env node
/* eslint-env node */
/**
 * Distil each artist's Wikipedia summary into a one-line visual descriptor
 * that gpt-image-1 can use as a recognizability hint. Output is cached to
 * scripts/_artist_descriptor_cache.json keyed by artist name.
 *
 * Pipeline:
 *  1. Load scripts/_artist_image_cache.json (artist → { resolvedTitle, imageUrl }).
 *  2. For each artist with a resolvedTitle, fetch the Wikipedia REST summary
 *     to get the `extract` text (the prior cache only kept the image URL).
 *  3. Call gpt-4o-mini to distil the extract into a ≤ 25-word descriptor
 *     focused on visual cues (hair, build, signature accessories, instrument,
 *     active decade).
 *  4. Cache the descriptor.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/extract-artist-descriptors.mjs --dry-run
 *   OPENAI_API_KEY=sk-... node scripts/extract-artist-descriptors.mjs --only "Bruno Mars"
 *   OPENAI_API_KEY=sk-... node scripts/extract-artist-descriptors.mjs --refresh
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGE_CACHE_PATH = path.join(__dirname, '_artist_image_cache.json');
const DESCRIPTOR_CACHE_PATH = path.join(
  __dirname,
  '_artist_descriptor_cache.json',
);
const USER_AGENT =
  'MusicAtlas/1.0 (https://musicatlas.io; admin@musicatlas.io)';

const DRY_RUN = process.argv.includes('--dry-run');
const REFRESH = process.argv.includes('--refresh');
const ONLY = (() => {
  const i = process.argv.indexOf('--only');
  if (i < 0) return null;
  const raw = process.argv[i + 1] || '';
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
})();
const CONCURRENCY = 5;

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey && !DRY_RUN) {
  console.error(
    'Missing OPENAI_API_KEY. Pass --dry-run to preview without API calls.',
  );
  process.exit(1);
}

const SYSTEM_PROMPT = [
  'You write extremely concise visual descriptors for portrait illustrations.',
  'Given a Wikipedia extract about a musician (solo artist or band), output ONE descriptor of ≤ 25 words capturing only:',
  '- hair style/color (or "band of N members" for bands)',
  '- build / age signal',
  '- one or two signature accessories or outfit cues',
  '- primary instrument or vocal role',
  '- active decade (one decade tag, e.g. "1970s" or "2010s")',
  'No biography, no name, no quotes, no period at the end. Just the descriptor phrase.',
  'Example: "short black hair, slim build, fedora and patterned shirts, lead vocalist, 2010s pop"',
  'Example: "five-piece band, denim and leather, two guitarists and a drummer, 1980s arena rock"',
].join('\n');

async function fetchExtract(title) {
  const url =
    'https://en.wikipedia.org/api/rest_v1/page/summary/' +
    encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.extract || null;
}

async function distilDescriptor(extract) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: extract },
      ],
      temperature: 0.3,
      max_tokens: 60,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    return { error: body };
  }
  const json = await res.json();
  const descriptor = json.choices?.[0]?.message?.content?.trim();
  return descriptor ? { descriptor } : { error: 'empty response' };
}

async function processOne(artist, entry, descriptorCache) {
  if (!entry?.resolvedTitle) {
    return { artist, status: 'no-wiki' };
  }
  if (!REFRESH && descriptorCache[artist]?.descriptor) {
    return { artist, status: 'cached' };
  }
  if (DRY_RUN) {
    return { artist, status: 'dry' };
  }
  try {
    const extract = await fetchExtract(entry.resolvedTitle);
    if (!extract) return { artist, status: 'no-extract' };
    const result = await distilDescriptor(extract);
    if (result.error) {
      console.warn(`  ! ${artist}: ${result.error.slice(0, 120)}`);
      return { artist, status: 'error' };
    }
    descriptorCache[artist] = {
      descriptor: result.descriptor,
      from: entry.resolvedTitle,
      generatedAt: new Date().toISOString(),
    };
    return { artist, status: 'ok', descriptor: result.descriptor };
  } catch (err) {
    console.warn(`  ! ${artist}: ${err.message}`);
    return { artist, status: 'error' };
  }
}

async function processInBatches(items, fn, batchSize = CONCURRENCY) {
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const results = await Promise.all(slice.map(fn));
    out.push(...results);
    process.stdout.write(
      `  progress: ${Math.min(i + batchSize, items.length)} / ${items.length}\r`,
    );
  }
  process.stdout.write('\n');
  return out;
}

async function main() {
  console.log(
    `${DRY_RUN ? '[DRY RUN]' : '[APPLY]'} extract-artist-descriptors`,
  );

  let imageCache = {};
  try {
    imageCache = JSON.parse(await readFile(IMAGE_CACHE_PATH, 'utf8'));
  } catch {
    console.error(
      `Missing ${IMAGE_CACHE_PATH}. Run fetch-artist-images first.`,
    );
    process.exit(1);
  }
  console.log(`  image cache: ${Object.keys(imageCache).length} artists`);

  let descriptorCache = {};
  try {
    descriptorCache = JSON.parse(await readFile(DESCRIPTOR_CACHE_PATH, 'utf8'));
  } catch {
    descriptorCache = {};
  }
  console.log(`  descriptor cache: ${Object.keys(descriptorCache).length}`);

  const artists = Object.keys(imageCache)
    .filter((a) => !ONLY || ONLY.has(a))
    .sort();
  console.log(`  to process: ${artists.length}`);

  const results = await processInBatches(artists, (artist) =>
    processOne(artist, imageCache[artist], descriptorCache),
  );

  if (!DRY_RUN) {
    await writeFile(
      DESCRIPTOR_CACHE_PATH,
      JSON.stringify(descriptorCache, null, 2) + '\n',
      'utf8',
    );
  }

  const tally = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log('\nResults:', tally);

  if (!DRY_RUN) {
    const sample = Object.entries(descriptorCache).slice(0, 10);
    console.log('\nSample descriptors:');
    for (const [artist, entry] of sample) {
      console.log(`  ${artist}: ${entry.descriptor}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
