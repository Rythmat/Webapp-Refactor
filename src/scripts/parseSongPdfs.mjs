/**
 * PDF Chord Chart Parser — Development Tool
 *
 * Reads PDFs from the Bass Soul Prop Book, extracts chord chart data,
 * and generates Song TypeScript files for the song library.
 *
 * Usage: node src/scripts/parseSongPdfs.mjs
 *
 * NOT shipped to the browser — development-only.
 */

import fs from 'fs';
import path from 'path';

const PDF_DIR = '/Users/marfizo/Downloads/NEW BASS SOUL PROP BOOK';
const OUT_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';

/* ── Helpers ─────────────────────────────────────────────────────────── */

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

// Key signature: number of sharps/flats → key
const SHARP_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F♯', 'C♯'];
const FLAT_KEYS = ['C', 'F', 'B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭'];

const KEY_TO_MIDI = {
  C: 60,
  'C♯': 61,
  'D♭': 61,
  D: 62,
  'E♭': 63,
  E: 64,
  F: 65,
  'F♯': 66,
  'G♭': 66,
  G: 67,
  'A♭': 68,
  A: 69,
  'B♭': 70,
  B: 71,
};

// Chord name regex — matches standard chord symbols
const CHORD_RE =
  /^([A-G][#♯b♭]?)\s*(maj7?|min7?|m7?|dim7?|aug|dom7|\+|sus[24]|7|9|11|13|add\d+|6)?(\s*\/\s*[A-G][#♯b♭]?)?$/;

function isChordName(s) {
  const cleaned = s.trim();
  if (!cleaned || cleaned.length > 20) return false;
  return CHORD_RE.test(cleaned);
}

// Normalize chord notation: # → ♯, b (after note letter) → ♭
function normalizeChord(s) {
  return s
    .replace(/([A-G])#/g, '$1♯')
    .replace(/([A-G])b/g, '$1♭')
    .replace(/\s+/g, ' ')
    .trim();
}

// Genre normalization map
const GENRE_MAP = {
  soul: ['soul', 'r_and_b'],
  pop: ['pop'],
  'pop rock': ['pop', 'rock'],
  rock: ['rock'],
  funk: ['funk'],
  'r&b': ['r_and_b'],
  jazz: ['jazz'],
  blues: ['blues'],
  folk: ['folk'],
  reggae: ['reggae'],
  latin: ['latin'],
  'hip hop': ['hip_hop'],
  electronic: ['electronic'],
  'neo soul': ['neo_soul'],
  country: ['folk'],
  motown: ['soul', 'r_and_b'],
  disco: ['funk', 'pop'],
  'straight eighth rock': ['rock'],
  swing: ['jazz'],
  ballad: ['pop'],
  'bossa nova': ['latin', 'jazz'],
  shuffle: ['blues'],
  gospel: ['soul'],
  'new wave': ['pop', 'rock'],
};

function normalizeGenre(raw) {
  const key = raw.toLowerCase().trim();
  return GENRE_MAP[key] || [key.replace(/\s+/g, '_')];
}

/* ── PDF Text Parser ─────────────────────────────────────────────────── */

function parseMetadata(fullText) {
  const lines = fullText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // The metadata is typically near the end of page 1 text
  // Pattern: Title + Artist on same or adjacent lines, then genre, tempo, album

  let title = '';
  let artist = '';
  let bassist = '';
  let genre = 'pop';
  let tempo = 120;
  let album = '';
  let timeSig = [4, 4];

  // Find tempo line
  const tempoLine = lines.find((l) => /quarter note\s*=\s*\d+/i.test(l));
  if (tempoLine) {
    const m = tempoLine.match(/quarter note\s*=\s*(\d+)/i);
    if (m) tempo = parseInt(m[1], 10);
  }

  // Find time signature from text like "4\n4" or "3\n4"
  const tsMatch = fullText.match(/\?\s*[#♯♭b]*\s*(\d)\s*\n\s*(\d)/);
  if (tsMatch) {
    timeSig = [parseInt(tsMatch[1], 10), parseInt(tsMatch[2], 10)];
  }

  // Find title — usually the longest line that's not a chord or notation
  // In these PDFs, the title appears at the bottom of the extracted text for page 1
  for (const line of lines) {
    if (/quarter note/i.test(line)) continue;
    if (/^[©®]/.test(line)) continue;
    if (/^(intro|fine|\d+)$/i.test(line)) continue;
    if (/^[?\s#♯♭œ]/.test(line)) continue;
    if (CHORD_RE.test(line)) continue;

    // Lines with artist names often have title on the same line
    // Format: "Title Artist" or "Title\nArtist"
    if (line.length > 5 && !title) {
      // Check if this line has both title and artist (common format)
      title = line;
    }
  }

  // Genre line — usually one of the known genre strings
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (
      Object.keys(GENRE_MAP).some((g) => lower === g || lower.startsWith(g))
    ) {
      genre = line.toLowerCase();
      break;
    }
  }

  // Album — in quotes
  const albumMatch = fullText.match(/"([^"]+)"/);
  if (albumMatch) album = albumMatch[1];

  // Key signature — count sharps/flats after the bass clef
  let keyName = 'C';
  const sharpCount = (fullText.match(/\?\s*(#+|♯+)/)?.[1] || '').length;
  const flatCount = (fullText.match(/\?\s*(b+|♭+)/)?.[1] || '').length;
  if (sharpCount > 0 && sharpCount < SHARP_KEYS.length)
    keyName = SHARP_KEYS[sharpCount];
  else if (flatCount > 0 && flatCount < FLAT_KEYS.length)
    keyName = FLAT_KEYS[flatCount];

  return { title, artist, bassist, genre, tempo, album, keyName, timeSig };
}

function extractChords(fullText) {
  // Find all chord-like tokens in the text
  const tokens = fullText.split(/[\s\t\n]+/);
  const chords = [];

  for (let i = 0; i < tokens.length; i++) {
    const normalized = normalizeChord(tokens[i]);
    // Handle multi-word chords like "D 7" → "D7", "A min7" → "Amin7"
    let combined = normalized;
    if (i + 1 < tokens.length) {
      const next = tokens[i + 1]?.trim();
      if (
        next &&
        /^(maj7?|min7?|m7?|dim7?|aug|dom7|7|9|11|13|sus[24]|add\d+|6)$/i.test(
          next,
        )
      ) {
        combined = normalized + next;
        i++; // skip the quality token
      }
    }

    if (isChordName(combined) && combined.length <= 12) {
      chords.push(normalizeChord(combined));
    }
  }

  return chords;
}

function extractSections(fullText) {
  // Find section markers: boxed letters A, B, C, D or "intro", "Fine"
  const sections = [];
  const sectionRe = /\b(intro|A|B|C|D|E|F|Fine|Coda|outro)\b/gi;
  let match;
  while ((match = sectionRe.exec(fullText)) !== null) {
    const label = match[1];
    if (label.length === 1 && /[A-F]/.test(label)) {
      sections.push(label);
    } else if (/^intro$/i.test(label)) {
      sections.push('Intro');
    }
  }
  return [...new Set(sections)]; // dedupe
}

/* ── Song File Generator ─────────────────────────────────────────────── */

function generateSongFile(pdfPath) {
  const fileName = path.basename(pdfPath, '.pdf');

  return import('pdf-parse').then(async (mod) => {
    const { PDFParse } = mod;
    const buf = fs.readFileSync(pdfPath);
    const uint8 = new Uint8Array(buf);
    const parser = new PDFParse(uint8);
    await parser.load();
    const result = await parser.getText();
    const pageText = result.pages?.[0]?.text || result.text || '';
    const fullText = result.text || '';

    const meta = parseMetadata(pageText);
    const allChords = extractChords(fullText);
    const sectionLabels = extractSections(fullText);

    // Use filename as title if parsing failed
    if (!meta.title || meta.title.length < 2) {
      meta.title = fileName;
    }

    // Split artist from title if on same line
    // Common format: "Song Title Artist Name"
    // We can't reliably split these, so use the filename as title
    const cleanTitle = fileName
      .replace(/\s*\(\d+\)\s*$/, '') // remove trailing (1) etc
      .trim();

    // Build sections from chords — group into 4-bar sections
    const barsPerSection = 4;
    const sections = [];
    const labels = sectionLabels.length > 0 ? sectionLabels : ['A'];

    let chordIdx = 0;
    for (let si = 0; si < Math.max(labels.length, 1); si++) {
      const label = labels[si] || String.fromCharCode(65 + si);
      const sectionChords = [];
      const chordsPerSection = Math.ceil(
        allChords.length / Math.max(labels.length, 1),
      );

      for (
        let j = 0;
        j < chordsPerSection && chordIdx < allChords.length;
        j++
      ) {
        sectionChords.push(allChords[chordIdx]);
        chordIdx++;
      }

      if (sectionChords.length === 0) continue;

      // Group chords into bars (1 chord per bar default, unless many chords)
      const bars = sectionChords.map((chord) => ({
        chords: [{ degree: '1 maj', chordName: chord, beat: 1, duration: 4 }],
      }));

      sections.push({
        id: slugify(
          label === 'Intro' ? 'intro' : `section_${label.toLowerCase()}`,
        ),
        label: label === 'Intro' ? 'Intro' : `Section ${label}`,
        bars,
      });
    }

    // If no chords found, create a placeholder
    if (sections.length === 0) {
      sections.push({
        id: 'section_a',
        label: 'Section A',
        bars: [
          {
            chords: [
              {
                degree: '1 maj',
                chordName: meta.keyName,
                beat: 1,
                duration: 4,
              },
            ],
          },
        ],
      });
    }

    const slug = slugify(cleanTitle);
    const genreTags = normalizeGenre(meta.genre);
    const keyRoot = KEY_TO_MIDI[meta.keyName] || 60;

    // Estimate difficulty from chord complexity
    const hasSevenths = allChords.some((c) => /7|9|11|13/.test(c));
    const hasAltered = allChords.some((c) => /dim|aug|\+|♯|♭/.test(c));
    const difficulty = hasAltered ? 3 : hasSevenths ? 2 : 1;

    return {
      slug,
      varName: slug.replace(/^(\d)/, '_$1'), // ensure valid JS identifier
      title: cleanTitle,
      artist: meta.artist || 'Unknown Artist',
      tempo: meta.tempo,
      key: `${meta.keyName} major`,
      keyRoot,
      genreTags,
      difficulty,
      sections,
      album: meta.album,
    };
  });
}

function songToTypeScript(song) {
  const sectionsStr = song.sections
    .map((section) => {
      const barsStr = section.bars
        .map((bar) => {
          const chordsStr = bar.chords
            .map(
              (c) =>
                `{ degree: '1 maj', chordName: '${c.chordName.replace(/'/g, "\\'")}', beat: ${c.beat}, duration: ${c.duration} }`,
            )
            .join(', ');
          return `      { chords: [${chordsStr}] }`;
        })
        .join(',\n');

      return `    {
      id: '${section.id}',
      label: '${section.label}',
      bars: [
${barsStr},
      ],
    }`;
    })
    .join(',\n');

  return `import type { Song } from '@/curriculum/types/songLibrary';

export const ${song.varName}: Song = {
  id: '${song.slug}',
  title: "${song.title.replace(/"/g, '\\"')}",
  artist: '${song.artist.replace(/'/g, "\\'")}',
  year: undefined,

  key: '${song.key}',
  keyRoot: ${song.keyRoot},
  mode: 'major',
  tempo: ${song.tempo},
  timeSignature: [4, 4],

  difficulty: ${song.difficulty},
  genreTags: [${song.genreTags.map((g) => `'${g}'`).join(', ')}],
  techniques: [],

  sections: [
${sectionsStr},
  ],

  audioSources: [],
  artistImageSource: 'none',
  popularity: 50,
};
`;
}

/* ── Main ────────────────────────────────────────────────────────────── */

async function main() {
  const files = fs
    .readdirSync(PDF_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .sort();

  console.log(`Found ${files.length} PDFs to process`);

  const results = [];
  const failures = [];
  let processed = 0;

  for (const file of files) {
    const pdfPath = path.join(PDF_DIR, file);
    try {
      const song = await generateSongFile(pdfPath);

      // Skip if slug conflicts with existing dont_stop_believin
      if (song.slug === 'dont_stop_believin') {
        console.log(`  SKIP: ${file} (already exists)`);
        processed++;
        continue;
      }

      const tsContent = songToTypeScript(song);
      const outPath = path.join(OUT_DIR, `${song.slug}.ts`);
      fs.writeFileSync(outPath, tsContent);
      results.push(song);
      processed++;

      if (processed % 50 === 0) {
        console.log(`  Processed ${processed}/${files.length}...`);
      }
    } catch (err) {
      failures.push({ file, error: err.message });
      processed++;
    }
  }

  console.log(
    `\nDone! ${results.length} songs generated, ${failures.length} failures`,
  );

  if (failures.length > 0) {
    console.log('\nFailures:');
    for (const f of failures.slice(0, 20)) {
      console.log(`  ${f.file}: ${f.error}`);
    }
    if (failures.length > 20)
      console.log(`  ... and ${failures.length - 20} more`);
  }

  // Generate index imports
  const indexImports = results
    .map((s) => `import { ${s.varName} } from './${s.slug}';`)
    .join('\n');

  const indexEntries = results
    .map((s) => `  ${s.slug}: ${s.varName},`)
    .join('\n');

  const indexPath = path.join(OUT_DIR, '_generated_index.ts');
  fs.writeFileSync(
    indexPath,
    `// Auto-generated song imports — paste into index.ts\n\n${indexImports}\n\n// Add to SONGS record:\n// {\n${indexEntries}\n// }\n`,
  );

  console.log(`\nGenerated index file: ${indexPath}`);
}

main().catch(console.error);
