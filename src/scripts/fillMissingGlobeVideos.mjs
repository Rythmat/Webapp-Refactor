/**
 * Fill the `videoId` gap in the globe event data.
 *
 * Every "Influenced by" / "Influenced" pill opens an event card, and a card
 * without a video is a dead end — which is what made some pills feel broken.
 * This finds a candidate YouTube video for each event that has none, verifies
 * it resolves through YouTube's oEmbed endpoint, and writes it into the
 * bundled `.ts` data.
 *
 * The search query is built from the curated tags, where `tags[0]` is reliably
 * the artist, plus the quoted work in the title ("Thriller", "Purple Rain").
 *
 * Usage:
 *   node src/scripts/fillMissingGlobeVideos.mjs --dry-run   # report only
 *   node src/scripts/fillMissingGlobeVideos.mjs             # write the files
 *   node src/scripts/fillMissingGlobeVideos.mjs --only=evt-pop-nyc-2014-taylorswift
 *
 * Writes a review report to src/scripts/enrichment/globe-video-fills.json so
 * every automated choice can be checked (and corrected in the admin console,
 * which is the source of truth once content is published to the CDN).
 *
 * NOT shipped to the browser — development-only.
 */

import fs from 'fs';
import path from 'path';
import process from 'process';
import { fileURLToPath } from 'url';
import yt from 'youtube-search-api';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EVENTS_DIR = path.resolve(HERE, '../components/atlas/data/events');
const REPORT = path.resolve(HERE, 'enrichment/globe-video-fills.json');
const OVERRIDES = path.resolve(HERE, 'enrichment/globe-video-queries.json');

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1];
/** Re-run ids that already carry a videoId, replacing it — for bad picks. */
const REFILL = args.includes('--refill');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── Parse the bundled event files ──────────────────────────────────────── */

/**
 * String entries of an array literal, respecting both quote styles. A naive
 * single-quote scan splits `["Ma'luf", 'Arabic Classical']` at the apostrophe
 * and yields garbage.
 */
function parseList(block) {
  return [...block.matchAll(/'([^']*)'|"([^"]*)"/g)].map((m) => m[1] ?? m[2]);
}

/** Every event in a file, as `{ id, title, tags, hasVideo, body }`. */
function parseEvents(source) {
  const events = [];
  for (const block of source.split(/\n {2}\{\n/).slice(1)) {
    const body = block.split('\n  },')[0];
    const id = body.match(/id: '([^']+)'/)?.[1];
    if (!id) continue;
    const title = body.match(/title:\s*(?:\n\s*)?(['"])([\s\S]*?)\1,/)?.[2];
    const tagBlock = body.match(/tags: \[([\s\S]*?)\]/)?.[1] ?? '';
    const genreBlock = body.match(/genre: \[([\s\S]*?)\]/)?.[1] ?? '';
    events.push({
      id,
      title: title ?? '',
      tags: parseList(tagBlock),
      genre: parseList(genreBlock),
      hasVideo: /videoId:/.test(body),
    });
  }
  return events;
}

/* ── Query building ─────────────────────────────────────────────────────── */

/** The named work in the title, in smart or straight double quotes. */
function workFromTitle(title) {
  return title.match(/[“"]([^”"]{2,60})[”"]/)?.[1] ?? '';
}

/**
 * Two shapes of event need two shapes of query.
 *
 * A release event names its work in the title ("Thriller", "Purple Rain"), and
 * `artist + work` finds it exactly. A scene or movement event ("Ska erupts as
 * Jamaica gains independence") names no work, and `artist + tag` drifts into
 * documentaries and shopping listings — so those ask for the genre's music
 * instead, which is what the card wants to play anyway.
 */
function buildQuery(event, overrides) {
  // A hand-written query always wins — the generated one cannot know that 1962
  // Kingston ska means the Skatalites and not a 1979 Coventry 2-tone band.
  const override = overrides[event.id];
  if (override) return override;

  const artist = event.tags[0] ?? '';
  const work = workFromTitle(event.title);

  if (work && work.toLowerCase() !== artist.toLowerCase()) {
    return `${artist} ${work}`.trim();
  }

  const genre = event.genre[0] ?? '';
  const parts = [artist];
  if (genre && !artist.toLowerCase().includes(genre.toLowerCase())) {
    parts.push(genre);
  }
  parts.push('music');
  const query = parts.filter(Boolean).join(' ').trim();
  return query || event.title.replace(/\\'/g, "'").slice(0, 80);
}

/* ── YouTube ────────────────────────────────────────────────────────────── */

/** Confirms the id resolves to a real, public video and returns its title. */
async function verify(videoId) {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.title ?? '';
  } catch {
    return null;
  }
}

async function findVideo(query, taken) {
  let results;
  try {
    results = await yt.GetListByKeyword(query, false, 6);
  } catch (caught) {
    return { error: `search failed: ${caught.message}` };
  }
  const videos = (results.items ?? []).filter((i) => i.type === 'video');
  for (const video of videos) {
    // Never attach a video already used elsewhere — a duplicate reads as a bug
    // to anyone clicking two pills in a row.
    if (taken.has(video.id)) continue;
    const verified = await verify(video.id);
    if (verified === null) continue;
    return { videoId: video.id, ytTitle: verified };
  }
  return { error: 'no verified result' };
}

/* ── Main ───────────────────────────────────────────────────────────────── */

const overrides = fs.existsSync(OVERRIDES)
  ? JSON.parse(fs.readFileSync(OVERRIDES, 'utf-8'))
  : {};

const files = fs
  .readdirSync(EVENTS_DIR)
  .filter((f) => f.endsWith('.ts') && f !== 'index.ts');

// Every id already in use anywhere in the dataset, so fills stay unique.
const taken = new Set();
for (const file of files) {
  const source = fs.readFileSync(path.join(EVENTS_DIR, file), 'utf-8');
  for (const m of source.matchAll(/videoId: '([^']+)'/g)) taken.add(m[1]);
}

const report = [];
let filled = 0;
let failed = 0;

for (const file of files) {
  const filePath = path.join(EVENTS_DIR, file);
  let source = fs.readFileSync(filePath, 'utf-8');
  const missing = parseEvents(source).filter((e) => {
    if (ONLY) return e.id === ONLY;
    if (REFILL) return e.id in overrides;
    return !e.hasVideo;
  });
  if (missing.length === 0) continue;

  console.log(`\n${file} — ${missing.length} without a video`);

  for (const event of missing) {
    // A null override means "this event has no canonical video" — a scene or
    // movement with no one recording to point at. Leaving videoId off lets the
    // card show its "Find on YouTube" fallback, which is honest; embedding an
    // approximately-right video is not.
    if (overrides[event.id] === null) {
      if (!DRY_RUN && event.hasVideo) {
        source = source.replace(
          new RegExp(
            `(    id: '${event.id}',[\\s\\S]*?)\n    videoId: '[^']*',`,
          ),
          '$1',
        );
      }
      console.log(`  ⊘ ${event.id} — left without a video (by override)`);
      report.push({ id: event.id, cleared: true });
      continue;
    }

    const query = buildQuery(event, overrides);
    const { videoId, ytTitle, error } = await findVideo(query, taken);

    if (!videoId) {
      console.log(`  ✗ ${event.id}\n      query: ${query}\n      ${error}`);
      report.push({ id: event.id, query, error });
      failed++;
      await sleep(400);
      continue;
    }

    taken.add(videoId);
    console.log(`  ✓ ${event.id}\n      query: ${query}\n      → ${ytTitle}`);
    report.push({
      id: event.id,
      eventTitle: event.title,
      query,
      videoId,
      ytTitle,
    });
    filled++;

    if (!DRY_RUN) {
      // Insert `videoId` as the last field of this event object, matching the
      // field order every other event uses.
      const anchor = `    id: '${event.id}',`;
      const start = source.indexOf(anchor);
      const end = source.indexOf('\n  },', start);
      if (start === -1 || end === -1) {
        console.log(`      ! could not locate ${event.id} to write`);
        continue;
      }
      const block = source.slice(start, end);
      const replaced = event.hasVideo
        ? block.replace(/videoId: '[^']*',/, `videoId: '${videoId}',`)
        : `${block}\n    videoId: '${videoId}',`;
      source = source.slice(0, start) + replaced + source.slice(end);
    }
    await sleep(400);
  }

  if (!DRY_RUN) fs.writeFileSync(filePath, source);
}

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2));

console.log(
  `\n${DRY_RUN ? '[dry run] ' : ''}filled ${filled}, failed ${failed}`,
);
console.log(`review report → ${path.relative(process.cwd(), REPORT)}`);
