/**
 * Build Song Connections
 *
 * Generates four kinds of connections involving song events on the globe:
 *
 *   (a) song ← historical event   (genre + era + location heuristic, tightened)
 *   (b) song ← other song          (same-artist or cover heuristic)
 *   (c) song → historical event    (hand-curated from songInfluencesEvent.json)
 *   (d) song → later song          (reverse of b)
 *
 * Each generator emits a comment-delimited block inside EVENT_CONNECTIONS in
 * eventConnections.ts so blocks can be replaced independently.
 *
 * Usage:
 *   node src/scripts/buildSongConnections.mjs           # all songs
 *   node src/scripts/buildSongConnections.mjs --pilot   # restrict to pilotSongs.json
 *   node src/scripts/buildSongConnections.mjs --dry-run # don't write to file
 */

import fs from 'fs';
import path from 'path';

const EVENTS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/components/atlas/data/events';
const CONNECTIONS_FILE =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/components/atlas/data/eventConnections.ts';
const ENRICH_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/scripts/enrichment';
const PILOT_PATH = path.join(ENRICH_DIR, 'pilotSongs.json');
const INFLUENCES_PATH = path.join(ENRICH_DIR, 'songInfluencesEvent.json');

const args = process.argv.slice(2);
const PILOT = args.includes('--pilot');
const DRY_RUN = args.includes('--dry-run');

// Block markers — used to find & replace generated sections in eventConnections.ts.
const BLOCK_START =
  '  // ── BEGIN auto-generated song connections (buildSongConnections.mjs)';
const BLOCK_END = '  // ── END auto-generated song connections';

// Genre family mapping (song genreTag → historical event genre strings)
const GENRE_FAMILY = {
  soul: ['Soul', 'R&B', 'Motown', 'Neo-Soul', 'Funk'],
  r_and_b: ['R&B', 'Soul', 'Motown', 'Neo-Soul'],
  funk: ['Funk', 'Soul', 'R&B', 'Go-Go'],
  rock: [
    'Rock',
    'Rock & Roll',
    'Classic Rock',
    'Alternative',
    'Garage Rock',
    'Psychedelic Rock',
  ],
  classic_rock: ['Rock', 'Classic Rock', 'Hard Rock'],
  pop_rock: ['Rock', 'Pop', 'Power Pop'],
  pop: ['Pop', 'Dance Pop', 'Synth Pop', 'Power Pop', 'Britpop'],
  jazz: ['Jazz', 'Bebop', 'Cool Jazz', 'Fusion', 'Hard Bop', 'Free Jazz'],
  blues: ['Blues', 'Delta Blues', 'Chicago Blues', 'Electric Blues'],
  hip_hop: ['Hip-Hop', 'Rap', 'Gangsta Rap', 'Boom Bap'],
  reggae: ['Reggae', 'Ska', 'Dancehall', 'Dub'],
  folk: ['Folk', 'Country', 'Singer-Songwriter', 'Americana'],
  latin: ['Latin', 'Salsa', 'Bossa Nova', 'Cuban', 'Afro-Cuban'],
  electronic: ['Electronic', 'House', 'Techno', 'EDM', 'Synth'],
  country: ['Country', 'Folk', 'Americana', 'Bluegrass'],
  neo_soul: ['Neo-Soul', 'Soul', 'R&B', 'Hip-Hop'],
  disco: ['Disco', 'Funk', 'Dance', 'Dance Pop'],
  new_wave: ['New Wave', 'Post-Punk', 'Synth Pop', 'Alternative'],
  alt_rock: ['Alternative', 'Indie', 'Grunge', 'Post-Punk'],
  grunge: ['Grunge', 'Alternative', 'Rock'],
  art_rock: ['Art Rock', 'Progressive', 'Experimental', 'Glam Rock'],
  ska: ['Ska', 'Reggae', 'Punk'],
  blues_rock: ['Blues', 'Rock', 'Blues Rock'],
  singer_songwriter: ['Singer-Songwriter', 'Folk', 'Pop'],
  world: ['World', 'Afrobeat', 'Latin', 'Reggae'],
  motown: ['Motown', 'Soul', 'R&B'],
  funky_soul: ['Funk', 'Soul'],
  funky_pop: ['Funk', 'Pop'],
  straight_eighth_funk: ['Funk'],
  pop_ballad: ['Pop', 'Ballad'],
  country_pop: ['Country', 'Pop'],
  jazzy_pop: ['Pop', 'Jazz'],
};

// ── Load song events from the generated songLibrary.ts ──────────────────
function loadSongEvents() {
  const content = fs.readFileSync(
    path.join(EVENTS_DIR, 'songLibrary.ts'),
    'utf-8',
  );
  const arrStart = content.indexOf('[');
  const arrEnd = content.lastIndexOf(']');
  const arrStr = content
    .slice(arrStart, arrEnd + 1)
    .replace(/\/\/.*/g, '')
    .replace(/,\s*([\]}])/g, '$1');
  try {
    return JSON.parse(arrStr);
  } catch {
    return eval(arrStr);
  }
}

// ── Load curated historical events ──────────────────────────────────────
function loadHistoricalEvents() {
  const files = fs
    .readdirSync(EVENTS_DIR)
    .filter(
      (f) => f.endsWith('.ts') && f !== 'index.ts' && f !== 'songLibrary.ts',
    );
  const out = [];
  for (const file of files) {
    const content = fs.readFileSync(path.join(EVENTS_DIR, file), 'utf-8');
    const blocks = content.split(/\n\s*\{/).slice(1);
    for (const block of blocks) {
      const idMatch = block.match(/id:\s*'(evt-[^']+)'/);
      const yearMatch = block.match(/year:\s*(\d+)/);
      const cityMatch = block.match(/city:\s*'([^']+)'/);
      const countryMatch = block.match(/country:\s*'([^']+)'/);
      const genreMatch = block.match(/genre:\s*\[([^\]]*)\]/);
      if (idMatch && yearMatch && cityMatch && countryMatch && genreMatch) {
        const genres = genreMatch[1]
          .replace(/'/g, '')
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean);
        out.push({
          id: idMatch[1],
          year: parseInt(yearMatch[1]),
          city: cityMatch[1].toLowerCase(),
          country: countryMatch[1].toLowerCase(),
          genres,
        });
      }
    }
  }
  return out;
}

function normalizeTitle(t) {
  return t
    .toLowerCase()
    .replace(/['''`ʼ‘’]/g, '')
    .replace(/\s*[—–-]\s*[^—–-]*$/, '') // strip "Song — Artist" suffix
    .replace(/\s*\([^)]*\)\s*$/, '') // strip trailing parens
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function songTitleFromEvent(evt) {
  // event.title is "Song — Artist", we want the song part only
  const m = evt.title.match(/^(.+?)\s+—\s+/);
  return normalizeTitle(m ? m[1] : evt.title);
}

function songArtistFromEvent(evt) {
  const m = evt.title.match(/—\s+(.+)$/);
  if (!m) return '';
  return m[1].trim().toLowerCase();
}

function expandGenres(songGenres) {
  const out = new Set();
  for (const sg of songGenres) {
    const key = sg.toLowerCase().replace(/\s+/g, '_');
    const family = GENRE_FAMILY[key];
    if (family) for (const f of family) out.add(f.toLowerCase());
    out.add(key.replace(/_/g, ' '));
    // Split compound: "pop_rock" → "pop" + "rock"
    for (const word of key.split('_')) {
      const wf = GENRE_FAMILY[word];
      if (wf) for (const f of wf) out.add(f.toLowerCase());
      out.add(word);
    }
  }
  return out;
}

// ── Generator (a): song ← historical event ──────────────────────────────
// Require: genre overlap AND era proximity ≤30 yrs AND (city OR country match).
// Cap at top 2.
function generateSongFromEvent(songEvents, histEvents) {
  const pairs = [];
  for (const song of songEvents) {
    const expanded = expandGenres(song.genre);
    const songCity = song.location.city.toLowerCase();
    const songCountry = song.location.country.toLowerCase();
    const songYear = song.year;

    const scored = [];
    for (const hist of histEvents) {
      if (hist.year > songYear) continue;
      const yearGap = songYear - hist.year;
      if (yearGap > 30) continue;

      const genreOverlap = hist.genres.some((g) =>
        expanded.has(g.toLowerCase()),
      );
      if (!genreOverlap) continue;

      const locMatch = hist.city === songCity || hist.country === songCountry;
      if (!locMatch) continue;

      let score = 10; // genre
      if (hist.city === songCity) score += 5;
      else if (hist.country === songCountry) score += 2;
      if (yearGap <= 5) score += 4;
      else if (yearGap <= 15) score += 3;
      else score += 1;

      scored.push({ histId: hist.id, score });
    }

    scored.sort((a, b) => b.score - a.score);
    for (const t of scored.slice(0, 2)) {
      pairs.push({ from: t.histId, to: song.id });
    }
  }
  return pairs;
}

// ── Generator (b): song ← other song ────────────────────────────────────
// Heuristic A: same artist, earlier song → later song (depth-1 only).
// Heuristic B: same normalized title across different artists, year delta ≥5.
function generateSongFromSong(songEvents) {
  const pairs = [];
  // Index by artist and by normalized title
  const byArtist = new Map();
  const byTitle = new Map();
  for (const s of songEvents) {
    const artist = songArtistFromEvent(s);
    const title = songTitleFromEvent(s);
    if (!artist || !title) continue;
    if (!byArtist.has(artist)) byArtist.set(artist, []);
    byArtist.get(artist).push({ ...s, _artist: artist, _title: title });
    if (!byTitle.has(title)) byTitle.set(title, []);
    byTitle.get(title).push({ ...s, _artist: artist, _title: title });
  }

  // Heuristic A: same artist, immediate predecessor only (closest earlier year).
  for (const [, songs] of byArtist) {
    if (songs.length < 2) continue;
    const sorted = songs.slice().sort((a, b) => a.year - b.year);
    for (let i = 1; i < sorted.length; i++) {
      const later = sorted[i];
      const earlier = sorted[i - 1];
      if (later.year - earlier.year < 0) continue;
      pairs.push({ from: earlier.id, to: later.id, _reason: 'same-artist' });
    }
  }

  // Heuristic B: cover relationships — same normalized title across artists,
  // earlier influenced later by year gap ≥5.
  for (const [, songs] of byTitle) {
    if (songs.length < 2) continue;
    const artists = new Set(songs.map((s) => s._artist));
    if (artists.size < 2) continue; // need different artists
    const sorted = songs.slice().sort((a, b) => a.year - b.year);
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (sorted[i]._artist === sorted[j]._artist) continue;
        if (sorted[j].year - sorted[i].year < 5) continue;
        pairs.push({ from: sorted[i].id, to: sorted[j].id, _reason: 'cover' });
      }
    }
  }

  return pairs;
}

// ── Generator (c): song → historical event (hand-curated) ───────────────
function generateSongToEvent(songEvents) {
  if (!fs.existsSync(INFLUENCES_PATH)) return [];
  const data = JSON.parse(fs.readFileSync(INFLUENCES_PATH, 'utf-8'));
  const songIds = new Set(songEvents.map((s) => s.id));
  const pairs = [];
  for (const [slug, eventIds] of Object.entries(data.pairs || {})) {
    const songId = `song-${slug}`;
    if (!songIds.has(songId)) continue;
    for (const evtId of eventIds) {
      pairs.push({ from: songId, to: evtId });
    }
  }
  return pairs;
}

// ── Main ────────────────────────────────────────────────────────────────
let songEvents = loadSongEvents();
const histEvents = loadHistoricalEvents();
console.log(
  `Loaded ${songEvents.length} song events, ${histEvents.length} historical events`,
);

if (PILOT) {
  const pilot = JSON.parse(fs.readFileSync(PILOT_PATH, 'utf-8'));
  const pilotIds = new Set(pilot.slugs.map((s) => `song-${s}`));
  songEvents = songEvents.filter((s) => pilotIds.has(s.id));
  console.log(`Pilot mode: restricted to ${songEvents.length} song events`);
}

const aPairs = generateSongFromEvent(songEvents, histEvents);
const bRawPairs = generateSongFromSong(songEvents);
const cPairs = generateSongToEvent(songEvents);
const dPairs = []; // reverse of (b) is identical edge with from/to swapped — but
// (b) already encodes the same chronological direction (earlier → later),
// which IS the (d) direction (earlier song influences later song). So (b) and
// (d) describe the same set of directed edges and the export is a single block.
// We keep (b) as the song-song block.

console.log(`(a) song ← event:   ${aPairs.length}`);
console.log(`(b) song ← song:    ${bRawPairs.length}`);
console.log(`(c) song → event:   ${cPairs.length}`);

// ── Build the comment-delimited block ───────────────────────────────────
function fmt(pairs) {
  return pairs.map((p) => `  { from: '${p.from}', to: '${p.to}' },`).join('\n');
}

const block = [
  BLOCK_START,
  '  // (a) song ← historical event (genre + era + location heuristic)',
  fmt(aPairs),
  '',
  '  // (b/d) song ← song (same-artist sequence + cover heuristic; same edges',
  '  //       cover both \"influenced by an earlier song\" and \"influenced a later song\")',
  fmt(bRawPairs),
  '',
  '  // (c) song → historical event (hand-curated from songInfluencesEvent.json)',
  fmt(cPairs),
  BLOCK_END,
]
  .filter(Boolean)
  .join('\n');

// ── Splice into eventConnections.ts ─────────────────────────────────────
let connectionsContent = fs.readFileSync(CONNECTIONS_FILE, 'utf-8');

// Remove any existing auto-generated block (current or previous version)
const beginIdx = connectionsContent.indexOf(BLOCK_START);
if (beginIdx !== -1) {
  const endIdx = connectionsContent.indexOf(BLOCK_END, beginIdx);
  if (endIdx !== -1) {
    const after = connectionsContent.indexOf('\n', endIdx) + 1;
    connectionsContent =
      connectionsContent.slice(0, beginIdx) + connectionsContent.slice(after);
  }
}

// Also remove the old "// ── Song Library Connections (auto-generated) ──" block
// from the prior version of this script if it's still present.
const oldMarker = '// ── Song Library Connections (auto-generated) ──';
if (connectionsContent.includes(oldMarker)) {
  const oldStart = connectionsContent.indexOf(oldMarker);
  // Find the closing `];` after the marker, walk backwards from there to the last entry.
  const closingBracket = connectionsContent.indexOf('];', oldStart);
  if (closingBracket !== -1) {
    // Find the line start of oldMarker (preserve leading whitespace handling)
    const lineStart = connectionsContent.lastIndexOf('\n', oldStart) + 1;
    connectionsContent =
      connectionsContent.slice(0, lineStart) +
      connectionsContent.slice(closingBracket);
  }
}

// Find the `];` that closes EVENT_CONNECTIONS specifically (NOT the last `];` in
// the file — the file has other array literals inside helper functions).
const declMatch = connectionsContent.match(
  /const EVENT_CONNECTIONS\s*:[^=]*=\s*\[/,
);
if (!declMatch) {
  console.error('ERROR: Could not find EVENT_CONNECTIONS declaration.');
  process.exit(1);
}
const declEnd = declMatch.index + declMatch[0].length;
// Walk forward tracking bracket depth to find the matching close.
let depth = 1;
let closeBracket = -1;
for (let i = declEnd; i < connectionsContent.length; i++) {
  const c = connectionsContent[i];
  if (c === '[') depth++;
  else if (c === ']') {
    depth--;
    if (depth === 0) {
      if (connectionsContent[i + 1] === ';') {
        closeBracket = i;
        break;
      }
    }
  }
}
if (closeBracket === -1) {
  console.error('ERROR: Could not find EVENT_CONNECTIONS closing bracket.');
  process.exit(1);
}
const updated =
  connectionsContent.slice(0, closeBracket) +
  '\n' +
  block +
  '\n' +
  connectionsContent.slice(closeBracket);

if (!DRY_RUN) {
  fs.writeFileSync(CONNECTIONS_FILE, updated);
  console.log(
    `Wrote ${aPairs.length + bRawPairs.length + cPairs.length} connections to ${CONNECTIONS_FILE}`,
  );
} else {
  console.log('(--dry-run: not writing to file)');
}
