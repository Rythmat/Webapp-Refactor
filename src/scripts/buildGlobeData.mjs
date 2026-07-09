/**
 * Build Globe Data for Song Library
 *
 * Creates HistoricalEvent entries for each song and updates song files with GlobeOrigin.
 *
 * Usage: node src/scripts/buildGlobeData.mjs
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SONGS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';
const EVENTS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/components/atlas/data/events';
const LOCATIONS_PATH =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/scripts/artistLocations.json';
const YT_LINKS_PATH = path.join(SONGS_DIR, '_youtube_links.json');

// Load artist locations
const artistLocations = JSON.parse(fs.readFileSync(LOCATIONS_PATH, 'utf-8'));
console.log(`Loaded ${Object.keys(artistLocations).length} artist locations`);

// Load YouTube videoId cache (so regenerating songLibrary.ts doesn't drop videoIds)
let ytLinks = {};
if (fs.existsSync(YT_LINKS_PATH)) {
  ytLinks = JSON.parse(fs.readFileSync(YT_LINKS_PATH, 'utf-8'));
  console.log(`Loaded ${Object.keys(ytLinks).length} YouTube videoId mappings`);
}

// Load artist manifest for title/artist mapping
const PDF_DIR = '/Users/marfizo/Downloads/NEW BASS SOUL PROP BOOK';
const DOCX_PATH = path.join(PDF_DIR, 'SOUL PROP BASS BOOK.docx');
const manifest = new Map();
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
      const slug = title
        .toLowerCase()
        .replace(/['''`ʼ\u2018\u2019]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/(^_|_$)/g, '');
      manifest.set(slug, { title, artist });
    }
  }
} catch {
  /* ignore */
}

// Get all song files
const songFiles = fs
  .readdirSync(SONGS_DIR)
  .filter(
    (f) => f.endsWith('.ts') && !f.startsWith('_') && !f.startsWith('index'),
  )
  .map((f) => f.replace('.ts', ''));

console.log(`Processing ${songFiles.length} songs...`);

// Tolerant string-field extractor: handles "...", '...', or `...` with escapes.
// Returns undefined if field is absent or undefined-valued.
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
    if (m) {
      return m[1]
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\`/g, '`')
        .replace(/\\n/g, '\n')
        .replace(/\\\\/g, '\\');
    }
  }
  return undefined;
}

// Word/DOCX-derived manifests store '&' as the XML entity '&amp;'; decode common
// HTML entities so generated titles/artists render as plain text (not '&amp;').
function decodeEntities(s) {
  return (s || '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

const events = [];
let matched = 0;
let unmatched = 0;

for (const slug of songFiles) {
  const filePath = path.join(SONGS_DIR, `${slug}.ts`);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract data from the .ts file (tolerant of single/double/template quotes)
  const title = decodeEntities(
    extractStringField(content, 'title') || slug.replace(/_/g, ' '),
  );
  const artist = decodeEntities(
    extractStringField(content, 'artist') ||
      manifest.get(slug)?.artist ||
      'Unknown Artist',
  );
  const key = extractStringField(content, 'key') || '';
  const tempoMatch = content.match(/\btempo:\s*(\d+)/);
  const tempo = tempoMatch?.[1] || '';
  const yearMatch = content.match(/\byear:\s*(\d+)/);
  const year = yearMatch?.[1] ? parseInt(yearMatch[1]) : undefined;
  const genreMatch = content.match(/\bgenreTags:\s*\[([^\]]*)\]/);
  const genreTags =
    genreMatch?.[1]
      ?.replace(/'/g, '')
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean) || [];
  const historicalDescription = decodeEntities(
    extractStringField(content, 'historicalDescription'),
  );

  // Look up artist location
  const artistKey = artist.toLowerCase().trim();
  let loc = artistLocations[artistKey];

  // Try partial match if exact fails
  if (!loc) {
    for (const [key, val] of Object.entries(artistLocations)) {
      if (artistKey.includes(key) || key.includes(artistKey)) {
        loc = val;
        break;
      }
    }
  }

  // Default to New York if no match
  if (!loc) {
    loc = { city: 'New York', country: 'US', lat: 40.71, lng: -74.01 };
    unmatched++;
  } else {
    matched++;
  }

  const eventId = `song-${slug}`;
  const fallbackDescription = [
    artist,
    year ? `(${year})` : '',
    key ? `Key: ${key}` : '',
    tempo ? `${tempo} BPM` : '',
  ]
    .filter(Boolean)
    .join('. ');
  // Prefer the curated narrative from the Song .ts file when present,
  // otherwise fall back to the metadata template.
  const description = historicalDescription || fallbackDescription;

  const videoId = ytLinks[slug]?.videoId;
  events.push({
    id: eventId,
    year: year || 2000,
    location: {
      lat: loc.lat,
      lng: loc.lng,
      city: loc.city,
      country: loc.country,
    },
    genre: genreTags.map((g) =>
      g.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    ),
    title: `${title} — ${artist}`,
    description,
    tags: [
      artist.toLowerCase(),
      title.toLowerCase(),
      ...genreTags,
      loc.city.toLowerCase(),
    ],
    ...(videoId ? { videoId } : {}),
  });
}

console.log(`Matched: ${matched}, Unmatched (defaulted): ${unmatched}`);

// Write the events file
const eventsContent = `import type { HistoricalEvent } from '@/components/atlas/types';

/**
 * Song Library Events — ${events.length} songs as Globe events.
 *
 * AUTO-GENERATED by src/scripts/buildGlobeData.mjs — DO NOT EDIT BY HAND.
 * Year and historicalDescription must be edited on the source Song .ts files
 * in src/curriculum/data/songs/<slug>.ts; this file is regenerated from those.
 */
export const SONG_LIBRARY_EVENTS: HistoricalEvent[] = ${JSON.stringify(events, null, 2)};
`;

const eventsPath = path.join(EVENTS_DIR, 'songLibrary.ts');
fs.writeFileSync(eventsPath, eventsContent);
console.log(`Written ${events.length} events to ${eventsPath}`);

// Now find the events index file and add the import
const indexCandidates = [
  path.join(EVENTS_DIR, 'index.ts'),
  path.join(path.dirname(EVENTS_DIR), 'musicHistory.ts'),
];

// Search for MUSIC_HISTORY
const musicHistoryFiles = execSync(
  `grep -rl "MUSIC_HISTORY" "${path.dirname(EVENTS_DIR)}" 2>/dev/null`,
  { encoding: 'utf-8' },
)
  .trim()
  .split('\n')
  .filter(Boolean);

console.log('Files with MUSIC_HISTORY:', musicHistoryFiles);

for (const mhFile of musicHistoryFiles) {
  const mhContent = fs.readFileSync(mhFile, 'utf-8');
  if (mhContent.includes('SONG_LIBRARY_EVENTS')) {
    console.log(`${mhFile} already imports SONG_LIBRARY_EVENTS`);
    continue;
  }
  if (mhContent.includes('export const MUSIC_HISTORY')) {
    // Add import at top and spread into array
    let updated =
      `import { SONG_LIBRARY_EVENTS } from './events/songLibrary';\n` +
      mhContent;
    updated = updated.replace(
      /export const MUSIC_HISTORY[^=]*=\s*\[/,
      'export const MUSIC_HISTORY: HistoricalEvent[] = [\n  ...SONG_LIBRARY_EVENTS,',
    );
    fs.writeFileSync(mhFile, updated);
    console.log(`Updated ${mhFile} with SONG_LIBRARY_EVENTS`);
  }
}

console.log('\nDone! Song events added to Globe.');
