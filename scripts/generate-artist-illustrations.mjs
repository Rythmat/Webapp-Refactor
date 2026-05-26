#!/usr/bin/env node
/* eslint-env node */
/**
 * Generate stylized artist illustrations via OpenAI's Image API and bake
 * them into `public/artists/<slug>.webp`, then point each song file's
 * `artistImageRef` at the new local asset.
 *
 * Style target: flat color, bold shapes, mild characterization (NOT photo-real),
 * honeycomb hexagonal background — tying into the Music Atlas brand.
 *
 * Pipeline:
 *  1. Walk src/curriculum/data/songs/*.ts. Collect unique artists + a
 *     representative (genre, era) tuple per artist (modal genre, median year).
 *  2. For each artist not already in the illustration cache, build a prompt
 *     and POST to https://api.openai.com/v1/images/generations.
 *  3. Decode the b64 PNG → sharp().resize(320,320).webp({quality:80}) →
 *     public/artists/<slug>.webp.
 *  4. On a safety refusal, retry with a name-stripped fallback prompt.
 *  5. Cache the resolution in scripts/_artist_illustration_cache.json.
 *  6. After generation: patch every song file's artistImageSource +
 *     artistImageRef to point at the new local WebP.
 *
 * Usage:
 *   OPENAI_API_KEY=sk-... node scripts/generate-artist-illustrations.mjs --dry-run
 *   OPENAI_API_KEY=sk-... node scripts/generate-artist-illustrations.mjs --only "Bruno Mars,Journey"
 *   OPENAI_API_KEY=sk-... node scripts/generate-artist-illustrations.mjs           # full run
 *   OPENAI_API_KEY=sk-... node scripts/generate-artist-illustrations.mjs --refresh # ignore cache
 */

import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SONGS_DIR = path.join(REPO, 'src/curriculum/data/songs');
const PUBLIC_ARTISTS_DIR = path.join(REPO, 'public/artists');
const CACHE_PATH = path.join(__dirname, '_artist_illustration_cache.json');
const DESCRIPTOR_CACHE_PATH = path.join(
  __dirname,
  '_artist_descriptor_cache.json',
);
const API_URL = 'https://api.openai.com/v1/images/generations';
const MODEL = 'gpt-image-1';

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
const CONCURRENCY = (() => {
  const i = process.argv.indexOf('--concurrency');
  if (i < 0) return 3;
  return Math.max(1, parseInt(process.argv[i + 1] || '3', 10));
})();

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey && !DRY_RUN) {
  console.error(
    'Missing OPENAI_API_KEY env var. Pass --dry-run to preview prompts without calls.',
  );
  process.exit(1);
}

const SHARED_STYLE = [
  `Traditional colored-pencil portrait on warm cream / off-white paper.`,
  `The figure is rendered with long, flowing parallel pencil strokes that curve along the contours of the face, hair, neck, and clothing — soft, organic directional hatching, no geometric facets, no triangles, no angular polygons.`,
  `A delicate pastel rainbow palette — peach, coral, pink, soft magenta, mint, sky-blue, lavender, gentle turquoise.`,
  `Translucent strokes that overlap into gentle chromatic shifts where they cross; not saturated, not neon.`,
  `Minimalist and open — plenty of the warm cream paper shows through everywhere; the drawing does not fill the frame edge-to-edge.`,
  `Naturalistic facial proportions, expressive eyes, soft features. Stylized but recognizable, not a photograph.`,
  `Background: plain warm cream / off-white paper, no scene, no shapes, no patterns; a few faint pencil-sketch construction lines may be visible in the negative space behind the figure.`,
  `Square aspect ratio, no text, no signatures, no logos, no brand marks, no copyrighted iconography.`,
].join(' ');

const SOLO_FRAMING =
  'Centered shoulders-up portrait facing forward or in a soft three-quarter view; the rendering fades softly around the shoulders rather than filling the frame.';

function bandFraming(count) {
  return `${count} band members arranged in a tight lineup across the frame, each figure shown from the chest or shoulders up, faces clearly visible. Signature instruments suggested where natural (guitar headstocks, a microphone, drumsticks). Distinct individuals balanced as an ensemble. The rendering fades softly around the edges rather than filling the frame.`;
}

// Cap at 5 so faces stay readable at SongCard tile size; the prompt notes
// that this is the core lineup of a larger group.
const MAX_BAND_FIGURES = 5;

function bandSizeFromDescriptor(descriptor) {
  if (!descriptor) return null;
  const numWords = {
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const m = descriptor.match(
    /(\d+|two|three|four|five|six|seven|eight|nine|ten)[-\s](member|piece)\s+(band|group|ensemble)/i,
  );
  if (m) {
    const raw = m[1].toLowerCase();
    const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : numWords[raw];
    if (n) return Math.min(n, MAX_BAND_FIGURES);
  }
  // Fall back to generic "band of ..." / "... band, ..." cues without a number.
  if (/\bband\b/i.test(descriptor) || /\bgroup\b/i.test(descriptor)) {
    return 4;
  }
  return null;
}

/**
 * Builds the image prompt at a given fallback tier.
 *   tier 0 — name + descriptor (best recognizability)
 *   tier 1 — descriptor only (no name) for safety-refused names
 *   tier 2 — generic role + genre + era (no name, no descriptor)
 * If bandSize is set, swaps the framing to a group portrait.
 */
function buildPrompt({
  artist,
  descriptor,
  genre,
  eraHint,
  role,
  tier,
  bandSize,
}) {
  const framing = bandSize ? bandFraming(bandSize) : SOLO_FRAMING;
  if (tier === 0 && descriptor) {
    const lead = bandSize
      ? `A minimalist colored-pencil group portrait inspired by the band ${artist} — ${descriptor}.`
      : `A minimalist colored-pencil portrait inspired by the musician ${artist} — ${descriptor}.`;
    return `${lead} ${framing} ${SHARED_STYLE}`;
  }
  if (tier <= 1 && descriptor) {
    const lead = bandSize
      ? `A minimalist colored-pencil group portrait of a ${genre} band — ${descriptor}${eraHint}.`
      : `A minimalist colored-pencil portrait of a ${role} — ${descriptor}, ${genre} aesthetic${eraHint}.`;
    return `${lead} ${framing} ${SHARED_STYLE}`;
  }
  const lead = bandSize
    ? `A minimalist colored-pencil group portrait of a fictional ${genre} band${eraHint}.`
    : `A minimalist colored-pencil portrait of a fictional ${role} who plays ${genre} music${eraHint}.`;
  return `${lead} ${framing} ${SHARED_STYLE}`;
}

/** Coarse genre → role hint mapping. */
const ROLE_BY_GENRE = {
  pop: 'pop singer at a microphone',
  rock: 'rock guitarist or singer',
  'hip hop': 'rapper at a microphone',
  rnb: 'R&B singer at a microphone',
  jazz: 'jazz instrumentalist',
  blues: 'blues guitarist',
  folk: 'folk singer with an acoustic guitar',
  funk: 'funk bassist or singer',
  'neo-soul': 'neo-soul singer at a microphone',
  electronic: 'DJ or electronic producer at decks',
  latin: 'Latin music guitarist or percussionist',
  reggae: 'reggae singer or guitarist',
  'jam-band': 'jam-band guitarist',
  african: 'African percussionist or singer',
};

function eraHintFor(year) {
  if (!year || typeof year !== 'number') return '';
  const decade = Math.floor(year / 10) * 10;
  return `, set in the ${decade}s`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function loadCache() {
  let cache = {};
  try {
    cache = JSON.parse(await readFile(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
  if (!REFRESH) return cache;
  // --refresh: re-roll the named artists, keep everything else.
  // With no --only, drop all (full re-batch, matches the original behavior).
  if (!ONLY) return {};
  for (const name of ONLY) delete cache[name];
  return cache;
}

async function loadDescriptorCache() {
  try {
    const text = await readFile(DESCRIPTOR_CACHE_PATH, 'utf8');
    return JSON.parse(text);
  } catch {
    return {};
  }
}

async function saveCache(cache) {
  await writeFile(CACHE_PATH, JSON.stringify(cache, null, 2) + '\n', 'utf8');
}

async function collectArtists() {
  // Map of artist → { genres: Map<string, count>, years: number[] }.
  const acc = new Map();
  for await (const entry of glob('*.ts', { cwd: SONGS_DIR })) {
    if (entry.startsWith('_') || entry === 'index.ts') continue;
    const text = await readFile(path.join(SONGS_DIR, entry), 'utf8');
    const artistMatch = text.match(/artist:\s*['"]([^'"]+)['"]/);
    if (!artistMatch) continue;
    const artist = artistMatch[1];

    const genreMatch = text.match(/genreTags:\s*\[([^\]]*)\]/);
    const genres = genreMatch
      ? Array.from(genreMatch[1].matchAll(/'([^']+)'/g)).map((m) => m[1])
      : [];
    const yearMatch = text.match(/year:\s*(\d{4})/);
    const year = yearMatch ? parseInt(yearMatch[1], 10) : null;

    if (!acc.has(artist)) acc.set(artist, { genres: new Map(), years: [] });
    const slot = acc.get(artist);
    for (const g of genres) slot.genres.set(g, (slot.genres.get(g) ?? 0) + 1);
    if (year) slot.years.push(year);
  }
  // Reduce to { artist, primaryGenre, year }.
  const out = [];
  for (const [artist, { genres, years }] of acc) {
    let primaryGenre = 'pop';
    let bestCount = 0;
    for (const [g, n] of genres) {
      if (n > bestCount) {
        bestCount = n;
        primaryGenre = g;
      }
    }
    const medianYear =
      years.length === 0
        ? null
        : years.sort((a, b) => a - b)[Math.floor(years.length / 2)];
    out.push({ artist, primaryGenre, year: medianYear });
  }
  out.sort((a, b) => a.artist.localeCompare(b.artist));
  return out;
}

async function generateOne({ artist, primaryGenre, year, descriptor }, cache) {
  const role = ROLE_BY_GENRE[primaryGenre] ?? 'musician';
  const eraHint = eraHintFor(year);
  const bandSize = bandSizeFromDescriptor(descriptor);
  const slug = slugify(artist);
  const outPath = path.join(PUBLIC_ARTISTS_DIR, `${slug}.webp`);

  if (DRY_RUN) {
    const prompt = buildPrompt({
      artist,
      descriptor,
      genre: primaryGenre,
      eraHint,
      role,
      tier: descriptor ? 0 : 2,
      bandSize,
    });
    console.log(`\n[DRY] ${artist} → ${path.relative(REPO, outPath)}`);
    console.log(
      `        genre=${primaryGenre} year=${year ?? '—'} role=${role} band=${bandSize ?? 'solo'} descriptor=${descriptor ?? '(none)'}`,
    );
    console.log(`        prompt: ${prompt}`);
    return { slug, status: 'dry' };
  }

  let tier = descriptor ? 0 : 2;
  let response = await callOpenAI(
    buildPrompt({
      artist,
      descriptor,
      genre: primaryGenre,
      eraHint,
      role,
      tier,
      bandSize,
    }),
  );
  while (response.error && isSafetyRefusal(response.error) && tier < 2) {
    tier += 1;
    response = await callOpenAI(
      buildPrompt({
        artist,
        descriptor,
        genre: primaryGenre,
        eraHint,
        role,
        tier,
        bandSize,
      }),
    );
  }
  if (response.error) {
    console.warn(`  ! ${artist}: ${response.error.message ?? 'unknown'}`);
    return { slug, status: 'error', error: response.error };
  }

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    console.warn(`  ! ${artist}: missing b64_json in response`);
    return { slug, status: 'error', error: { message: 'no b64' } };
  }

  const png = Buffer.from(b64, 'base64');
  const webp = await sharp(png)
    .resize(320, 320, { fit: 'cover', position: 'attention' })
    .webp({ quality: 80 })
    .toBuffer();
  await writeFile(outPath, webp);

  cache[artist] = {
    slug,
    tier,
    generatedAt: new Date().toISOString(),
  };
  return { slug, status: tier === 0 ? 'ok' : `fallback-${tier}` };
}

async function callOpenAI(prompt, attempt = 0) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: '1024x1024',
      n: 1,
    }),
  });
  if (res.status === 429 && attempt < 4) {
    const body = await res.text();
    const m = body.match(/try again in (\d+)/i);
    const wait = (m ? parseInt(m[1], 10) : 15) * 1000 + 500;
    await new Promise((r) => setTimeout(r, wait));
    return callOpenAI(prompt, attempt + 1);
  }
  if (!res.ok) {
    const errorBody = await res.text();
    try {
      const parsed = JSON.parse(errorBody);
      return { error: parsed.error ?? { message: errorBody } };
    } catch {
      return { error: { message: errorBody } };
    }
  }
  return res.json();
}

function isSafetyRefusal(error) {
  const msg = (error?.message || '').toLowerCase();
  const code = (error?.code || '').toLowerCase();
  return (
    code.includes('safety') ||
    code.includes('moderation') ||
    msg.includes('safety') ||
    msg.includes('not allowed') ||
    msg.includes('public figure') ||
    msg.includes('person')
  );
}

async function processInBatches(items, fn, batchSize) {
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const slice = items.slice(i, i + batchSize);
    const results = await Promise.all(slice.map(fn));
    out.push(...results);
    if (!DRY_RUN) {
      process.stdout.write(
        `  progress: ${Math.min(i + batchSize, items.length)} / ${items.length}\r`,
      );
    }
  }
  if (!DRY_RUN) process.stdout.write('\n');
  return out;
}

async function patchSongs(cache) {
  let updated = 0;
  let skipped = 0;
  let manualOverride = 0;
  for await (const entry of glob('*.ts', { cwd: SONGS_DIR })) {
    if (entry.startsWith('_') || entry === 'index.ts') continue;
    const filePath = path.join(SONGS_DIR, entry);
    const text = await readFile(filePath, 'utf8');
    // Respect manual overrides — songs whose maintainer pinned a specific image
    // by setting artistImageSource: 'manual'. The patcher leaves them alone.
    if (/artistImageSource:\s*['"]manual['"]/.test(text)) {
      manualOverride++;
      continue;
    }
    const artistMatch = text.match(/artist:\s*['"]([^'"]+)['"]/);
    if (!artistMatch) continue;
    const artist = artistMatch[1];
    const entryCached = cache[artist];
    if (!entryCached) {
      skipped++;
      continue;
    }
    const newRef = `/artists/${entryCached.slug}.webp`;
    const escaped = newRef.replace(/'/g, "\\'");
    let next = text;
    if (/artistImageRef:\s*['"][^'"]*['"]/.test(next)) {
      next = next.replace(
        /artistImageRef:\s*['"][^'"]*['"]/,
        `artistImageRef: '${escaped}'`,
      );
    } else {
      next = next.replace(
        /(\s*)artistImageSource:\s*['"][^'"]+['"],?/,
        (_m, indent) =>
          `${indent}artistImageSource: 'commissioned',\n${indent}artistImageRef: '${escaped}',`,
      );
    }
    next = next.replace(
      /artistImageSource:\s*['"][^'"]+['"]/,
      `artistImageSource: 'commissioned'`,
    );
    if (next !== text) {
      if (!DRY_RUN) await writeFile(filePath, next, 'utf8');
      updated++;
    }
  }
  return { updated, skipped, manualOverride };
}

async function main() {
  console.log(
    `${DRY_RUN ? '[DRY RUN]' : '[APPLY]'} generate-artist-illustrations`,
  );
  if (!DRY_RUN) await mkdir(PUBLIC_ARTISTS_DIR, { recursive: true });

  const cache = await loadCache();
  const descriptors = await loadDescriptorCache();
  console.log(
    `  cache: ${Object.keys(cache).length} entries, descriptors: ${Object.keys(descriptors).length}`,
  );

  const all = (await collectArtists()).map((a) => ({
    ...a,
    descriptor: descriptors[a.artist]?.descriptor ?? null,
  }));
  console.log(`  artists found: ${all.length}`);

  const todo = all.filter((a) => {
    if (ONLY && !ONLY.has(a.artist)) return false;
    if (REFRESH) return true;
    return !cache[a.artist];
  });
  console.log(`  to generate: ${todo.length}`);

  if (todo.length === 0) {
    console.log('  nothing to do.');
  } else {
    const results = await processInBatches(
      todo,
      async (entry) => {
        const result = await generateOne(entry, cache);
        if (!DRY_RUN && result.status !== 'error') {
          // Periodically persist cache so a crash mid-run doesn't lose progress.
          await saveCache(cache);
        }
        return { artist: entry.artist, ...result };
      },
      CONCURRENCY,
    );

    if (!DRY_RUN) {
      const ok = results.filter((r) => r.status === 'ok').length;
      const fb1 = results.filter((r) => r.status === 'fallback-1').length;
      const fb2 = results.filter((r) => r.status === 'fallback-2').length;
      const er = results.filter((r) => r.status === 'error').length;
      console.log(
        `\nGenerated: ${ok} ok (name+descriptor), ${fb1} descriptor-only, ${fb2} generic, ${er} errors`,
      );
    }
  }

  // Always run the patcher so previous successes get reflected on disk.
  const { updated, skipped, manualOverride } = await patchSongs(cache);
  console.log(
    `\nSong files: ${updated} patched, ${skipped} skipped (no entry), ${manualOverride} skipped (manual override)`,
  );
  if (DRY_RUN) console.log('(dry run; no files written)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
