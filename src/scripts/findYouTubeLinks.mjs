/**
 * YouTube Link Finder
 *
 * Searches YouTube for each song and adds the video link to audioSources.
 *
 * Usage:
 *   node src/scripts/findYouTubeLinks.mjs              # all songs
 *   node src/scripts/findYouTubeLinks.mjs --only=africa # single song
 *   node src/scripts/findYouTubeLinks.mjs --search-only # search without updating files
 *
 * NOT shipped to the browser — development-only.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import youtubeSearch from 'youtube-search-api';

const SONGS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';
const CACHE_PATH = path.join(SONGS_DIR, '_youtube_links.json');
const PDF_DIR = '/Users/marfizo/Downloads/NEW BASS SOUL PROP BOOK';
const DOCX_PATH = path.join(PDF_DIR, 'SOUL PROP BASS BOOK.docx');

const args = process.argv.slice(2);
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const SEARCH_ONLY = args.includes('--search-only');

const PROTECTED = new Set(['dont_stop_believin']);

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['''`ʼ\u2018\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

/* ── Load artist manifest ───────────────────────────────────────────── */

function loadManifest() {
  const manifest = new Map();
  if (!fs.existsSync(DOCX_PATH)) return manifest;
  try {
    const xml = execSync(`unzip -p "${DOCX_PATH}" word/document.xml`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
    const text = xml
      .replace(/<\/w:p>/g, '\n')
      .replace(/<w:br[^>]*\/>/g, '\n')
      .replace(/<[^>]+>/g, '');
    for (const entry of text.split(/\n/).filter((l) => l.trim().length > 3)) {
      let sep = ' – ',
        idx = entry.indexOf(sep);
      if (idx === -1) {
        sep = ' - ';
        idx = entry.indexOf(sep);
      }
      if (idx === -1) continue;
      const title = entry.slice(0, idx).trim();
      const artist = entry.slice(idx + sep.length).trim();
      if (title && artist) {
        manifest.set(slugify(title), { title, artist });
      }
    }
  } catch {
    /* ignore */
  }
  return manifest;
}

/* ── Search YouTube ─────────────────────────────────────────────────── */

async function searchYouTube(title, artist) {
  const query = `${title} ${artist}`;
  try {
    const results = await youtubeSearch.GetListByKeyword(query, false, 3);
    if (!results?.items?.length) return null;

    // Prefer results that match the artist/title closely
    for (const item of results.items) {
      if (!item.id || item.type !== 'video') continue;
      const itemTitle = (item.title || '').toLowerCase();
      const titleLower = title.toLowerCase();
      const artistLower = artist.toLowerCase();

      // Check if the result title contains the song title or artist
      if (
        itemTitle.includes(titleLower.slice(0, 10)) ||
        itemTitle.includes(artistLower.slice(0, 8))
      ) {
        return {
          videoId: item.id,
          title: item.title,
          channel: item.channelTitle || '',
          url: `https://youtube.com/watch?v=${item.id}`,
        };
      }
    }

    // Fallback: first video result
    const first = results.items.find((i) => i.type === 'video' && i.id);
    if (first) {
      return {
        videoId: first.id,
        title: first.title,
        channel: first.channelTitle || '',
        url: `https://youtube.com/watch?v=${first.id}`,
      };
    }
  } catch (err) {
    console.log(`  [error] Search failed for "${title}": ${err.message}`);
  }
  return null;
}

/* ── Update song .ts file ───────────────────────────────────────────── */

function updateSongFile(slug, videoId) {
  const filePath = path.join(SONGS_DIR, `${slug}.ts`);
  if (!fs.existsSync(filePath)) return false;

  let content = fs.readFileSync(filePath, 'utf-8');

  // Check if already has a youtube source
  if (
    content.includes("provider: 'youtube'") ||
    content.includes('provider: "youtube"')
  ) {
    return false; // Already has YouTube
  }

  const ytEntry = `{ provider: 'youtube', uri: 'https://youtube.com/watch?v=${videoId}' }`;

  // Replace empty audioSources
  if (content.includes('audioSources: [],')) {
    content = content.replace(
      'audioSources: [],',
      `audioSources: [\n    ${ytEntry},\n  ],`,
    );
  } else if (content.includes('audioSources: [')) {
    // Has existing sources — add YouTube to the array
    content = content.replace(
      'audioSources: [',
      `audioSources: [\n    ${ytEntry},`,
    );
  }

  fs.writeFileSync(filePath, content);
  return true;
}

/* ── Main ───────────────────────────────────────────────────────────── */

async function main() {
  const manifest = loadManifest();
  console.log(`Loaded ${manifest.size} songs from manifest`);

  // Load existing cache
  let cache = {};
  if (fs.existsSync(CACHE_PATH)) {
    cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
    console.log(`Loaded ${Object.keys(cache).length} cached results`);
  }

  // Get all song files
  const songFiles = fs
    .readdirSync(SONGS_DIR)
    .filter(
      (f) => f.endsWith('.ts') && !f.startsWith('_') && !f.startsWith('index'),
    )
    .map((f) => f.replace('.ts', ''));

  const filtered = ONLY ? songFiles.filter((s) => s === ONLY) : songFiles;
  console.log(`Processing ${filtered.length} songs...\n`);

  let found = 0;
  let skipped = 0;
  let failed = 0;
  let updated = 0;

  for (let i = 0; i < filtered.length; i++) {
    const slug = filtered[i];

    // Skip protected
    if (PROTECTED.has(slug)) {
      skipped++;
      continue;
    }

    // Check cache
    if (cache[slug]?.videoId) {
      if (!SEARCH_ONLY) {
        const didUpdate = updateSongFile(slug, cache[slug].videoId);
        if (didUpdate) updated++;
      }
      found++;
      continue;
    }

    // Look up title/artist from manifest
    const entry = manifest.get(slug);
    let title = entry?.title || slug.replace(/_/g, ' ');
    let artist = entry?.artist || '';

    // If no manifest entry, try to read from the .ts file
    if (!artist) {
      const filePath = path.join(SONGS_DIR, `${slug}.ts`);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        const artistMatch = content.match(/artist: '([^']+)'/);
        const titleMatch = content.match(/title: "([^"]+)"/);
        if (artistMatch) artist = artistMatch[1];
        if (titleMatch) title = titleMatch[1];
      }
    }

    // Search YouTube
    const result = await searchYouTube(title, artist);
    if (result) {
      cache[slug] = result;
      found++;
      console.log(
        `  [${i + 1}/${filtered.length}] ${slug}: ${result.title} (${result.videoId})`,
      );

      if (!SEARCH_ONLY) {
        const didUpdate = updateSongFile(slug, result.videoId);
        if (didUpdate) updated++;
      }
    } else {
      failed++;
      console.log(`  [${i + 1}/${filtered.length}] ${slug}: NOT FOUND`);
    }

    // Save cache periodically
    if ((i + 1) % 25 === 0) {
      fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));
      console.log(
        `  Progress: ${i + 1}/${filtered.length} (${found} found, ${failed} failed)`,
      );
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Final cache save
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2));

  console.log(`\n═══ YouTube Link Search Complete ═══`);
  console.log(`  Total: ${filtered.length}`);
  console.log(`  Found: ${found}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Files updated: ${updated}`);
  console.log(`  Cache: ${CACHE_PATH}`);
}

main().catch(console.error);
