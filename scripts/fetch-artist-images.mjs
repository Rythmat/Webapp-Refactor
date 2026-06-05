#!/usr/bin/env node
/* eslint-env node */
/**
 * Fetch royalty-free artist images from Wikipedia/Wikimedia Commons and bake
 * them into each song's `artistImageRef`. Replaces the hex-avatar + initials
 * placeholder shown on SongCard tiles.
 *
 * Pipeline:
 *  1. Walk src/curriculum/data/songs/*.ts, collect unique `artist` strings.
 *  2. For each artist, hit the Wikipedia REST `page/summary` endpoint.
 *     Filter for music-related pages (description keywords). Retry with
 *     ` (band)` / ` (musician)` suffixes for ambiguous titles.
 *  3. Cache the resolution in scripts/_artist_image_cache.json.
 *  4. Patch each song file in-place:
 *       artistImageSource: 'none', → artistImageSource: 'wikipedia',
 *                                    artistImageRef: '<url>',
 *
 * Usage:
 *   node scripts/fetch-artist-images.mjs            # apply
 *   node scripts/fetch-artist-images.mjs --dry-run  # show summary only
 *   node scripts/fetch-artist-images.mjs --refresh  # ignore cache
 */

import { glob, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SONGS_DIR = path.join(REPO, 'src/curriculum/data/songs');
const CACHE_PATH = path.join(__dirname, '_artist_image_cache.json');
const USER_AGENT =
  'MusicAtlas/1.0 (https://musicatlas.io; admin@musicatlas.io)';
const CONCURRENCY = 5;

const DRY_RUN = process.argv.includes('--dry-run');
const REFRESH = process.argv.includes('--refresh');

const MUSIC_KEYWORDS = [
  'musician',
  'singer',
  'band',
  'rapper',
  'songwriter',
  'group',
  'artist',
  'composer',
  'musical',
  'vocalist',
  'duo',
  'rock',
  'pop',
  'jazz',
  'hip hop',
  'hip-hop',
  'r&b',
  'soul',
  'country',
  'folk',
  'funk',
  'electronic',
  'guitarist',
  'pianist',
  'drummer',
  'bassist',
  'producer',
  ' dj',
  'djing',
  'song',
  'recording',
];

function isMusicSummary(summary) {
  if (!summary || summary.type !== 'standard') return false;
  const desc = (summary.description || '').toLowerCase();
  const extract = (summary.extract || '').toLowerCase();
  if (MUSIC_KEYWORDS.some((k) => desc.includes(k))) return true;
  // Description sometimes is "American singer-songwriter" or "English rock band" etc.
  // Fall back to extract first 200 chars.
  return MUSIC_KEYWORDS.some((k) => extract.slice(0, 200).includes(k));
}

async function fetchSummary(title) {
  const url =
    'https://en.wikipedia.org/api/rest_v1/page/summary/' +
    encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!res.ok) return null;
  return res.json();
}

async function resolveArtist(artist) {
  // Try the bare name, then disambiguated variants.
  const candidates = [
    artist,
    `${artist} (band)`,
    `${artist} (musician)`,
    `${artist} (singer)`,
    `${artist} (rapper)`,
  ];
  for (const title of candidates) {
    try {
      const summary = await fetchSummary(title);
      if (!summary) continue;
      if (!isMusicSummary(summary)) continue;
      const imageUrl =
        summary.thumbnail?.source || summary.originalimage?.source || null;
      if (!imageUrl) continue;
      return { imageUrl, resolvedTitle: summary.title || title };
    } catch (err) {
      console.warn(`  ! fetch error for "${title}":`, err.message);
    }
  }
  return { imageUrl: null, resolvedTitle: null };
}

async function loadCache() {
  if (REFRESH) return {};
  try {
    const text = await readFile(CACHE_PATH, 'utf8');
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function collectArtists() {
  const artists = new Set();
  for await (const entry of glob('*.ts', { cwd: SONGS_DIR })) {
    if (entry.startsWith('_') || entry === 'index.ts') continue;
    const text = await readFile(path.join(SONGS_DIR, entry), 'utf8');
    const m = text.match(/artist:\s*['"]([^'"]+)['"]/);
    if (m) artists.add(m[1]);
  }
  return Array.from(artists).sort();
}

async function processInBatches(items, fn, batchSize = CONCURRENCY) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const out = await Promise.all(slice.map(fn));
    results.push(...out);
    process.stdout.write(
      `  resolved ${Math.min(i + batchSize, items.length)} / ${items.length}\r`,
    );
  }
  process.stdout.write('\n');
  return results;
}

async function patchSongs(cache) {
  let updated = 0;
  let skippedNoUrl = 0;
  let skippedAlreadyHasRef = 0;
  for await (const entry of glob('*.ts', { cwd: SONGS_DIR })) {
    if (entry.startsWith('_') || entry === 'index.ts') continue;
    const filePath = path.join(SONGS_DIR, entry);
    const text = await readFile(filePath, 'utf8');
    const artistMatch = text.match(/artist:\s*['"]([^'"]+)['"]/);
    if (!artistMatch) continue;
    const artist = artistMatch[1];
    const cached = cache[artist];
    if (!cached || !cached.imageUrl) {
      skippedNoUrl++;
      continue;
    }
    if (/artistImageRef:\s*['"][^'"]+['"]/.test(text)) {
      // Already has an image — overwrite only when --refresh.
      if (!REFRESH) {
        skippedAlreadyHasRef++;
        continue;
      }
    }
    const newText = updateSongText(text, cached.imageUrl);
    if (newText === text) continue;
    if (!DRY_RUN) await writeFile(filePath, newText, 'utf8');
    updated++;
  }
  return { updated, skippedNoUrl, skippedAlreadyHasRef };
}

function updateSongText(text, imageUrl) {
  const escaped = imageUrl.replace(/'/g, "\\'");
  // If artistImageRef already exists, replace just its URL.
  if (/artistImageRef:\s*['"][^'"]*['"]/.test(text)) {
    let out = text.replace(
      /artistImageRef:\s*['"][^'"]*['"]/,
      `artistImageRef: '${escaped}'`,
    );
    out = out.replace(
      /artistImageSource:\s*['"][^'"]+['"]/,
      `artistImageSource: 'wikipedia'`,
    );
    return out;
  }
  // Otherwise, swap source + insert ref on the next line.
  return text.replace(
    /(\s*)artistImageSource:\s*['"][^'"]+['"],?/,
    (_match, indent) =>
      `${indent}artistImageSource: 'wikipedia',\n${indent}artistImageRef: '${escaped}',`,
  );
}

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN]' : '[APPLY]'} fetch-artist-images`);
  const cache = await loadCache();
  console.log(`  cache loaded: ${Object.keys(cache).length} entries`);

  const artists = await collectArtists();
  console.log(`  found ${artists.length} unique artists`);

  const todo = artists.filter((a) => !cache[a]);
  console.log(`  to resolve: ${todo.length}`);

  if (todo.length > 0) {
    await processInBatches(todo, async (artist) => {
      const result = await resolveArtist(artist);
      cache[artist] = result;
      return result;
    });
    if (!DRY_RUN) {
      await writeFile(
        CACHE_PATH,
        JSON.stringify(cache, null, 2) + '\n',
        'utf8',
      );
    }
  }

  const resolved = Object.values(cache).filter((v) => v && v.imageUrl).length;
  const unresolved = Object.values(cache).filter(
    (v) => v && !v.imageUrl,
  ).length;
  console.log(
    `\nCache summary: ${resolved} resolved, ${unresolved} unresolved`,
  );

  const { updated, skippedNoUrl, skippedAlreadyHasRef } =
    await patchSongs(cache);
  console.log(`\nFile patching:`);
  console.log(`  updated:                  ${updated}`);
  console.log(`  skipped (no URL):         ${skippedNoUrl}`);
  console.log(`  skipped (already has ref): ${skippedAlreadyHasRef}`);
  if (DRY_RUN) {
    console.log('\n(dry run; no files written)');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
