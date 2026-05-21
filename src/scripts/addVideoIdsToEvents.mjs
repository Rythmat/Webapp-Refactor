/**
 * Add YouTube Video IDs to Globe Events
 *
 * Phase 1: Song events — pull from _youtube_links.json (instant)
 * Phase 2: Historical events — search YouTube (takes ~18 minutes)
 *
 * Usage:
 *   node src/scripts/addVideoIdsToEvents.mjs                  # all events
 *   node src/scripts/addVideoIdsToEvents.mjs --songs-only     # only song events
 *   node src/scripts/addVideoIdsToEvents.mjs --historical-only # only historical events
 */

import fs from 'fs';
import path from 'path';
import youtubeSearch from 'youtube-search-api';

const SONGS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';
const EVENTS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/components/atlas/data/events';
const YT_CACHE = path.join(SONGS_DIR, '_youtube_links.json');
const HIST_CACHE = path.join(EVENTS_DIR, '_historical_youtube_links.json');

const args = process.argv.slice(2);
const SONGS_ONLY = args.includes('--songs-only');
const HIST_ONLY = args.includes('--historical-only');

/* ── Phase 2: Song Events ──────────────────────────────────────────── */

function addVideoIdsToSongEvents() {
  // Load YouTube links cache
  if (!fs.existsSync(YT_CACHE)) {
    console.log('No _youtube_links.json found — skipping song events');
    return;
  }
  const ytLinks = JSON.parse(fs.readFileSync(YT_CACHE, 'utf-8'));
  console.log(`Loaded ${Object.keys(ytLinks).length} YouTube links`);

  // Read songLibrary.ts
  const songLibPath = path.join(EVENTS_DIR, 'songLibrary.ts');
  let content = fs.readFileSync(songLibPath, 'utf-8');

  let added = 0;
  for (const [slug, data] of Object.entries(ytLinks)) {
    if (!data.videoId) continue;
    const eventId = `song-${slug}`;

    // Check if this event exists in the file
    if (!content.includes(`"id": "${eventId}"`)) continue;

    // Check if videoId already exists for this event
    const eventIdx = content.indexOf(`"id": "${eventId}"`);
    const nextEventIdx = content.indexOf(`"id": "song-`, eventIdx + 1);
    const eventBlock = content.slice(
      eventIdx,
      nextEventIdx > 0 ? nextEventIdx : undefined,
    );

    if (eventBlock.includes('"videoId"')) continue; // Already has videoId

    // Insert videoId after the tags array
    const tagsEnd = content.indexOf(']', content.indexOf('"tags"', eventIdx));
    if (tagsEnd > 0) {
      content =
        content.slice(0, tagsEnd + 1) +
        `,\n    "videoId": "${data.videoId}"` +
        content.slice(tagsEnd + 1);
      added++;
    }
  }

  fs.writeFileSync(songLibPath, content);
  console.log(`Added videoId to ${added} song events`);
}

/* ── Phase 3: Historical Events ────────────────────────────────────── */

async function addVideoIdsToHistoricalEvents() {
  // Load or create cache
  let cache = {};
  if (fs.existsSync(HIST_CACHE)) {
    cache = JSON.parse(fs.readFileSync(HIST_CACHE, 'utf-8'));
    console.log(
      `Loaded ${Object.keys(cache).length} cached historical YouTube links`,
    );
  }

  // Find all historical event files
  const eventFiles = fs
    .readdirSync(EVENTS_DIR)
    .filter(
      (f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'songLibrary.ts',
    );

  let searched = 0;
  let found = 0;
  let failed = 0;

  for (const file of eventFiles) {
    const filePath = path.join(EVENTS_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    // Find all evt- IDs in this file
    const idMatches = [...content.matchAll(/id:\s*'(evt-[^']+)'/g)];

    for (const idMatch of idMatches) {
      const eventId = idMatch[1];

      // Check if already has videoId
      const idPos = content.indexOf(`'${eventId}'`);
      const nextIdPos = content.indexOf("id: '", idPos + 1);
      const block = content.slice(
        idPos,
        nextIdPos > 0 ? nextIdPos : idPos + 500,
      );
      if (block.includes('videoId:')) continue;

      // Check cache
      if (cache[eventId]?.videoId) {
        // Insert videoId
        const tagsEnd = content.indexOf('],', content.indexOf('tags:', idPos));
        if (tagsEnd > 0) {
          content =
            content.slice(0, tagsEnd + 2) +
            `\n    videoId: '${cache[eventId].videoId}',` +
            content.slice(tagsEnd + 2);
          modified = true;
          found++;
        }
        continue;
      }

      // Extract title for search
      const titleMatch = block.match(/title:\s*['"]([^'"]+)['"]/);
      const cityMatch = block.match(/city:\s*['"]([^'"]+)['"]/);
      const yearMatch = block.match(/year:\s*(\d+)/);

      if (!titleMatch) continue;

      const query = `${titleMatch[1]} ${cityMatch?.[1] || ''} ${yearMatch?.[1] || ''} music`;

      try {
        const results = await youtubeSearch.GetListByKeyword(query, false, 1);
        const video = results?.items?.find((i) => i.type === 'video' && i.id);

        if (video) {
          cache[eventId] = { videoId: video.id, title: video.title };
          // Insert videoId
          const tagsEnd = content.indexOf(
            '],',
            content.indexOf('tags:', idPos),
          );
          if (tagsEnd > 0) {
            content =
              content.slice(0, tagsEnd + 2) +
              `\n    videoId: '${video.id}',` +
              content.slice(tagsEnd + 2);
            modified = true;
            found++;
          }
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
      }

      searched++;
      if (searched % 25 === 0) {
        console.log(
          `  Progress: ${searched} searched, ${found} found, ${failed} failed`,
        );
        fs.writeFileSync(HIST_CACHE, JSON.stringify(cache, null, 2));
      }

      // Rate limit
      await new Promise((r) => setTimeout(r, 1000));
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
    }
  }

  // Final cache save
  fs.writeFileSync(HIST_CACHE, JSON.stringify(cache, null, 2));
  console.log(
    `Historical events: ${found} found, ${failed} failed, ${searched} searched`,
  );
}

/* ── Main ──────────────────────────────────────────────────────────── */

async function main() {
  if (!HIST_ONLY) {
    console.log('=== Song Events ===');
    addVideoIdsToSongEvents();
  }

  if (!SONGS_ONLY) {
    console.log('\n=== Historical Events ===');
    await addVideoIdsToHistoricalEvents();
  }

  console.log('\nDone!');
}

main().catch(console.error);
