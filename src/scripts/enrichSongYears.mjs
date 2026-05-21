/**
 * Enrich Song Years from MusicBrainz
 *
 * For each song .ts file with `year: undefined`, queries MusicBrainz for the
 * earliest release year by the matched artist, then rewrites the source file
 * in place. The year is the source-of-truth for buildGlobeData.mjs, which
 * regenerates songLibrary.ts from these files.
 *
 * Usage:
 *   node src/scripts/enrichSongYears.mjs              # all 662 songs
 *   node src/scripts/enrichSongYears.mjs --pilot      # pilot list only
 *   node src/scripts/enrichSongYears.mjs --dry-run    # don't write back
 *   node src/scripts/enrichSongYears.mjs --force      # re-query even cached
 *
 * Outputs:
 *   src/scripts/enrichment/_mb_cache.json    — query cache (re-used across runs)
 *   src/scripts/enrichment/_year_audit.json  — per-song decision log
 *   src/scripts/enrichment/_year_review.json — medium-confidence cases for human review
 *   src/scripts/enrichment/_year_misses.json — songs MusicBrainz couldn't resolve
 */

import fs from 'fs';
import path from 'path';

const SONGS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';
const ENRICH_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/scripts/enrichment';
const PILOT_PATH = path.join(ENRICH_DIR, 'pilotSongs.json');
const OVERRIDES_PATH = path.join(ENRICH_DIR, 'yearOverrides.json');
const CACHE_PATH = path.join(ENRICH_DIR, '_mb_cache.json');
const AUDIT_PATH = path.join(ENRICH_DIR, '_year_audit.json');
const REVIEW_PATH = path.join(ENRICH_DIR, '_year_review.json');
const MISSES_PATH = path.join(ENRICH_DIR, '_year_misses.json');

const args = process.argv.slice(2);
const PILOT = args.includes('--pilot');
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

const USER_AGENT = 'MusicAtlas/1.0 (aaron@musicatlas.io)';
const MB_RATE_MS = 1100; // hard limit: 1 req/sec

// ── Load existing artifacts ─────────────────────────────────────────────
const cache = fs.existsSync(CACHE_PATH)
  ? JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'))
  : {};
const overrides = fs.existsSync(OVERRIDES_PATH)
  ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf-8')).overrides || {}
  : {};
const audit = [];
const review = [];
const misses = [];

// ── Pick songs to process ───────────────────────────────────────────────
const allSlugs = fs
  .readdirSync(SONGS_DIR)
  .filter(
    (f) => f.endsWith('.ts') && !f.startsWith('_') && !f.startsWith('index'),
  )
  .map((f) => f.replace('.ts', ''));

let slugs;
if (PILOT) {
  const pilot = JSON.parse(fs.readFileSync(PILOT_PATH, 'utf-8'));
  slugs = pilot.slugs.filter((s) => allSlugs.includes(s));
  if (slugs.length !== pilot.slugs.length) {
    const missing = pilot.slugs.filter((s) => !allSlugs.includes(s));
    console.warn(`Pilot list has ${missing.length} unknown slugs:`, missing);
  }
} else {
  slugs = allSlugs;
}
console.log(
  `Processing ${slugs.length} songs (pilot=${PILOT}, dry-run=${DRY_RUN}, force=${FORCE})`,
);

// ── Helpers ─────────────────────────────────────────────────────────────
function extractStringField(content, fieldName) {
  const undefRe = new RegExp(`\\b${fieldName}:\\s*undefined`);
  if (undefRe.test(content)) return undefined;
  const patterns = [
    new RegExp(`\\b${fieldName}:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's'),
    new RegExp(`\\b${fieldName}:\\s*'((?:[^'\\\\]|\\\\.)*)'`, 's'),
    new RegExp(`\\b${fieldName}:\\s*\`((?:[^\`\\\\]|\\\\.)*)\``, 's'),
  ];
  for (const pat of patterns) {
    const m = content.match(pat);
    if (m)
      return m[1]
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\`/g, '`')
        .replace(/\\\\/g, '\\');
  }
  return undefined;
}

function getYear(content) {
  if (/\byear:\s*undefined/.test(content)) return undefined;
  const m = content.match(/\byear:\s*(\d+)/);
  return m ? parseInt(m[1]) : undefined;
}

function normalize(s) {
  return s
    .toLowerCase()
    .replace(/['''`ʼ‘’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function artistMatch(candidate, target) {
  const c = normalize(candidate);
  const t = normalize(target);
  if (c === t) return 1;
  if (c.includes(t) || t.includes(c)) return 0.9;
  // Token overlap
  const cTokens = new Set(c.split(/\s+/));
  const tTokens = new Set(t.split(/\s+/));
  const overlap = [...tTokens].filter((x) => cTokens.has(x)).length;
  if (tTokens.size === 0) return 0;
  return overlap / tTokens.size;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mbFetch(entity, query) {
  const url = `https://musicbrainz.org/ws/2/${entity}/?query=${encodeURIComponent(query)}&fmt=json&limit=25`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    await sleep(MB_RATE_MS);
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return await res.json();
  } catch (err) {
    await sleep(MB_RATE_MS);
    return { error: err.message };
  }
}

async function queryMusicBrainz(title, artist) {
  const cacheKey = `${normalize(artist)}|${normalize(title)}`;
  if (!FORCE && cache[cacheKey]) return cache[cacheKey];

  // Strip a leading article so e.g. "The Fugees" also matches MB's "Fugees".
  const artistVariants = [artist];
  const stripped = artist.replace(/^(The|A|An)\s+/i, '');
  if (stripped !== artist) artistVariants.push(stripped);

  const result = {
    releaseGroups: [],
    recordings: [],
    queriedAt: new Date().toISOString(),
  };

  // Pass 1: release-groups (Single/Album) — most reliable when present.
  for (const a of artistVariants) {
    const q = `releasegroup:"${title.replace(/"/g, '')}" AND artist:"${a.replace(/"/g, '')}"`;
    const data = await mbFetch('release-group', q);
    if (data.error) {
      result.error = data.error;
      break;
    }
    const rgs = data['release-groups'] || [];
    if (rgs.length) {
      result.releaseGroups = rgs;
      break;
    }
  }

  // Pass 2: recordings — fallback when release-group search misses (e.g. covers
  // only released on EPs/compilations without their own release-group title).
  for (const a of artistVariants) {
    const q = `recording:"${title.replace(/"/g, '')}" AND artist:"${a.replace(/"/g, '')}"`;
    const data = await mbFetch('recording', q);
    if (data.error) {
      result.error = result.error || data.error;
      break;
    }
    const recs = data.recordings || [];
    if (recs.length) {
      result.recordings = recs;
      break;
    }
  }

  cache[cacheKey] = result;
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
  return result;
}

function pickYear(result, targetTitle, targetArtist) {
  // Try release-groups first, recordings as fallback. Within each, pick the
  // earliest valid year among artist+title matches.
  const normTitle = normalize(targetTitle);

  let bestRg = null;
  for (const rg of result.releaseGroups) {
    const artistCredit = (rg['artist-credit'] || [])
      .map((a) => a.name || a.artist?.name || '')
      .join(' ');
    const aScore = artistMatch(artistCredit, targetArtist);
    if (aScore < 0.7) continue;

    const date = rg['first-release-date'];
    if (!date) continue;
    const y = parseInt(date.slice(0, 4));
    if (isNaN(y)) continue;

    const rgTitle = normalize(rg.title || '');
    let titleScore = 0;
    if (rgTitle === normTitle) titleScore = 1;
    else if (rgTitle.includes(normTitle)) titleScore = 0.8;
    else if (normTitle.includes(rgTitle)) titleScore = 0.6;
    else continue;

    const isSingle = rg['primary-type'] === 'Single';

    if (
      !bestRg ||
      y < bestRg.year ||
      (y === bestRg.year && isSingle && !bestRg.isSingle)
    ) {
      bestRg = {
        year: y,
        aScore,
        titleScore,
        isSingle,
        sourceTitle: rg.title,
        sourceArtist: artistCredit,
        primaryType: rg['primary-type'],
        via: 'release-group',
      };
    }
  }

  let bestRec = null;
  for (const rec of result.recordings) {
    const artistCredit = (rec['artist-credit'] || [])
      .map((a) => a.name || a.artist?.name || '')
      .join(' ');
    const aScore = artistMatch(artistCredit, targetArtist);
    if (aScore < 0.7) continue;

    const date = rec['first-release-date'];
    if (!date) continue;
    const y = parseInt(date.slice(0, 4));
    if (isNaN(y)) continue;

    const recTitle = normalize(rec.title || '');
    let titleScore = 0;
    if (recTitle === normTitle) titleScore = 1;
    else if (recTitle.includes(normTitle)) titleScore = 0.8;
    else if (normTitle.includes(recTitle)) titleScore = 0.6;
    else continue;

    if (!bestRec || y < bestRec.year) {
      bestRec = {
        year: y,
        aScore,
        titleScore,
        isSingle: null,
        sourceTitle: rec.title,
        sourceArtist: artistCredit,
        primaryType: 'Recording',
        via: 'recording',
      };
    }
  }

  // Prefer release-group over recording. Release-groups are curated as
  // canonical single/album releases; the recording endpoint can surface
  // unrelated remixes/covers with the same title that predate the real song.
  // Only fall back to recording when release-group has no valid match.
  if (bestRg) return bestRg;
  return bestRec;
}

function writeBackYear(filePath, year) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Match exactly `  year: undefined,` line; replace with the new year.
  const updated = content.replace(
    /^(\s*)year:\s*undefined,\s*$/m,
    `$1year: ${year},`,
  );
  if (updated === content) return false;
  if (!DRY_RUN) fs.writeFileSync(filePath, updated);
  return true;
}

// ── Main loop ───────────────────────────────────────────────────────────
let stats = { skipped: 0, accepted: 0, review: 0, missed: 0 };

for (const slug of slugs) {
  const filePath = path.join(SONGS_DIR, `${slug}.ts`);
  const content = fs.readFileSync(filePath, 'utf-8');

  const existingYear = getYear(content);
  if (existingYear) {
    audit.push({
      slug,
      decision: 'skip',
      reason: `year already set to ${existingYear}`,
    });
    stats.skipped++;
    continue;
  }

  const title = extractStringField(content, 'title');
  const artist = extractStringField(content, 'artist');
  if (!title || !artist) {
    audit.push({ slug, decision: 'miss', reason: 'missing title or artist' });
    misses.push({ slug, reason: 'missing title or artist' });
    stats.missed++;
    continue;
  }

  // Manual override takes precedence over MB lookup.
  if (overrides[slug]) {
    const ov = overrides[slug];
    process.stdout.write(
      `[${audit.length + 1}/${slugs.length}] ${slug} (${title} — ${artist}) ... `,
    );
    const wrote = writeBackYear(filePath, ov.year);
    console.log(
      `override ${ov.year} (${ov.note || 'manual'})${wrote ? '' : ' [no-op]'}`,
    );
    audit.push({ slug, decision: 'override', year: ov.year, note: ov.note });
    stats.accepted++;
    continue;
  }

  process.stdout.write(
    `[${audit.length + 1}/${slugs.length}] ${slug} (${title} — ${artist}) ... `,
  );
  const result = await queryMusicBrainz(title, artist);
  if (result.error) {
    console.log(`ERROR: ${result.error}`);
    audit.push({ slug, decision: 'miss', reason: result.error });
    misses.push({ slug, title, artist, reason: result.error });
    stats.missed++;
    continue;
  }

  const best = pickYear(result, title, artist);
  if (!best) {
    const rgCount = result.releaseGroups.length;
    const recCount = result.recordings.length;
    console.log(`miss (no usable matches; rg=${rgCount} rec=${recCount})`);
    audit.push({
      slug,
      decision: 'miss',
      reason: 'no usable matches',
      rgCount,
      recCount,
    });
    misses.push({
      slug,
      title,
      artist,
      reason: 'no usable matches',
      rgCount,
      recCount,
    });
    stats.missed++;
    continue;
  }

  const tag = `${best.year} via ${best.via} (a=${best.aScore.toFixed(2)} t=${best.titleScore.toFixed(2)} ${best.primaryType}: "${best.sourceTitle}")`;
  // Accept: strong artist match + exact-or-contains title match
  if (best.aScore >= 0.85 && best.titleScore >= 0.8) {
    const wrote = writeBackYear(filePath, best.year);
    console.log(`accept ${tag}${wrote ? '' : ' [no-op]'}`);
    audit.push({ slug, decision: 'accept', year: best.year, ...best });
    stats.accepted++;
  } else if (best.aScore >= 0.7 || best.titleScore >= 0.6) {
    console.log(`review ${tag}`);
    audit.push({ slug, decision: 'review', year: best.year, ...best });
    review.push({ slug, title, artist, suggestedYear: best.year, ...best });
    stats.review++;
  } else {
    console.log(`miss (weak ${tag})`);
    audit.push({
      slug,
      decision: 'miss',
      reason: `weak match`,
      candidate: best,
    });
    misses.push({ slug, title, artist, reason: `weak match`, candidate: best });
    stats.missed++;
  }
}

// ── Persist artifacts ───────────────────────────────────────────────────
fs.writeFileSync(AUDIT_PATH, JSON.stringify(audit, null, 2));
fs.writeFileSync(REVIEW_PATH, JSON.stringify(review, null, 2));
fs.writeFileSync(MISSES_PATH, JSON.stringify(misses, null, 2));

console.log('\n=== Summary ===');
console.log(`accepted: ${stats.accepted}`);
console.log(`review:   ${stats.review} → ${REVIEW_PATH}`);
console.log(`missed:   ${stats.missed} → ${MISSES_PATH}`);
console.log(`skipped:  ${stats.skipped} (year already set)`);
console.log(`audit:    ${AUDIT_PATH}`);
if (DRY_RUN) console.log('\n(--dry-run: no .ts files were written)');
