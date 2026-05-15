/**
 * Claude Vision Chord Chart Extraction
 *
 * Renders each PDF page to PNG, sends to Claude Vision API,
 * and extracts structured chord chart data.
 *
 * Usage:
 *   node src/scripts/visionExtract.mjs --only=1612
 *   node src/scripts/visionExtract.mjs --batch=10
 *   node src/scripts/visionExtract.mjs              # all 647
 *
 * Requires ANTHROPIC_API_KEY in .env or environment.
 *
 * NOT shipped to the browser — development-only.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.scripts' });
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import Anthropic from '@anthropic-ai/sdk';

const PDF_DIR = '/Users/marfizo/Downloads/NEW BASS SOUL PROP BOOK';
const SONGS_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';
const CACHE_DIR = path.join(SONGS_DIR, '_vision_cache');
const TMP_DIR = '/tmp/vision_extract';

const args = process.argv.slice(2);
const ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const BATCH = parseInt(
  args.find((a) => a.startsWith('--batch='))?.split('=')[1] || '647',
);
const OFFSET = parseInt(
  args.find((a) => a.startsWith('--offset='))?.split('=')[1] || '0',
);
const SKIP_CACHE = args.includes('--no-cache');

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['''`ʼ\u2018\u2019]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

/* ── Vision Prompt ──────────────────────────────────────────────────── */

const VISION_PROMPT = `You are analyzing a bass guitar lead sheet / chord chart. Extract ALL musical information with absolute precision.

Return ONLY a JSON object (no markdown, no commentary) with this exact structure:
{
  "title": "Song Title",
  "artist": "Artist Name",
  "tempo": 120,
  "tempoUnit": "quarter note",
  "timeSignature": [4, 4],
  "genre": "funk",
  "systems": [
    {
      "measureNumber": 5,
      "sectionMarker": "A",
      "bars": [
        {
          "chords": [{ "name": "Emin7", "beat": 1 }],
          "fermata": false,
          "restBars": null,
          "repeatStart": false,
          "repeatEnd": false
        }
      ],
      "repeatCount": null
    }
  ]
}

HOW TO COUNT BARS:
- A "bar" (measure) is the space between two vertical bar lines on the staff.
- Count EVERY bar line you see on the staff. The number of bars in a system = number of vertical lines minus 1.
- Each bar has beat slashes (diagonal marks like / / / /) OR written-out notes. Count the slashes to confirm the time signature.
- A chord symbol written ABOVE a bar belongs to THAT bar.
- If a chord symbol sits above the boundary between two bars, it belongs to the bar where it visually starts.
- If two bars in a row have NO new chord symbol, the chord from the previous bar sustains. Still include both bars — the second bar gets "chords": [] (empty, meaning the previous chord continues).
- Bars with only rests or a fermata symbol still count as bars.

HOW TO IDENTIFY REPEAT BARLINES:
- A REPEAT START |: looks like a thick vertical line followed by a thin line, with TWO DOTS to the right (between staff lines 2 and 3).
- A REPEAT END :| looks like TWO DOTS on the left, then a thin line, then a thick vertical line.
- "repeatStart": true goes on the SPECIFIC BAR where the |: appears (the bar that begins the repeated section).
- "repeatEnd": true goes on the SPECIFIC BAR where the :| appears (the last bar of the repeated section).
- The |: and :| may NOT be on the first and last bar of a system — they can appear mid-system.
- "repeatCount" is the "Nx" text (like "3x", "4x") that appears at the end of a system near the :| sign.

HOW TO READ CHORD SYMBOLS:
- Chord symbols are the text written ABOVE the staff (e.g., "G7", "Emin7", "F", "C", "B♭7").
- Read them exactly as printed. Use ♭ and ♯ (Unicode), never b or #.
- Slash chords like "F/C" or "Gmin7/F" mean "chord / bass note". Include the slash.
- If a bar has multiple chord symbols, list each with its beat position.
- If only one chord in a bar, beat = 1.
- If two chords split a bar evenly in 4/4 time, first chord beat = 1, second chord beat = 3.

OTHER ELEMENTS:
- "fermata": true if there is an arc-with-dot symbol (𝄐) above that bar.
- "restBars": N if you see a multi-bar rest — a thick horizontal line with a number N above it.
- "sectionMarker": the boxed rehearsal letter (A, B, C, D, etc.) at the start of a system, or null.
- "measureNumber": the small number at the left margin below the section marker, or null.
- Read title (top center), artist (top right), tempo (left side, e.g., "quarter note = 174"), and genre (left side, e.g., "straight eighth funk").
- "tempoUnit": "quarter note" or "eighth note" or "dotted quarter" — read exactly what the PDF says.

IMPORTANT — READ THIS CAREFULLY:
- Do NOT skip any bars. Every measure on the staff must appear in the output.
- Do NOT merge adjacent bars that have the same chord. If two consecutive bars both have C, output TWO separate bar objects, each with C.
- A chord written once may sustain across multiple bars. If you see "C" written above bar 3 and no new chord until "F" above bar 5, then bar 3 has C, bar 4 has C (sustain — still output it with chords: [{"name": "C", "beat": 1}]), and bar 5 has F.
- Count bar lines precisely. The number of bars = the number of spaces between vertical staff lines. 5 vertical bar lines = 4 bars. 7 vertical bar lines = 6 bars.
- Repeat barlines (|: and :|) count as bar lines too.
- The intro system (if present above the first main staff) counts as its own system.

EXAMPLE — a system might look like: [fermata rest] | G7 notes | |: C notes | C notes | F notes | F notes :| 3x
This is 6 bars: bar1=fermata, bar2=G7, bar3=|:C, bar4=C(sustain), bar5=F, bar6=F(sustain):|
The repeat starts on bar 3 and ends on bar 6. Bars 3-6 repeat 3 times.`;

/* ── Render PDF → PNG ───────────────────────────────────────────────── */

function renderPdfPages(pdfPath) {
  const base = path.join(TMP_DIR, 'page');
  execSync(`/opt/anaconda3/bin/pdftoppm "${pdfPath}" "${base}" -png -r 200`, {
    timeout: 30000,
  });

  // Collect rendered PNGs
  const pngs = [];
  for (let i = 1; i <= 10; i++) {
    const candidates = [`${base}-${i}.png`, `${base}-0${i}.png`];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        pngs.push(c);
        break;
      }
    }
  }
  return pngs;
}

/* ── Call Claude Vision ─────────────────────────────────────────────── */

async function extractWithVision(client, pngPaths) {
  const imageBlocks = pngPaths.map((p) => {
    const data = fs.readFileSync(p);
    return {
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: data.toString('base64'),
      },
    };
  });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 16000,
    messages: [
      {
        role: 'user',
        content: [
          ...imageBlocks,
          {
            type: 'text',
            text:
              pngPaths.length > 1
                ? `This chord chart has ${pngPaths.length} pages. Analyze ALL pages together as one song.\n\n${VISION_PROMPT}`
                : VISION_PROMPT,
          },
        ],
      },
    ],
  });

  // Extract JSON from response
  const text = response.content[0]?.text || '';
  // Try to parse as JSON directly, or extract from code block
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      json = JSON.parse(match[1]);
    } else {
      // Try finding the first { to last }
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start >= 0 && end > start) {
        json = JSON.parse(text.slice(start, end + 1));
      }
    }
  }

  return json;
}

/* ── Convert Vision JSON → Song Schema ──────────────────────────────── */

// (Reuse helpers from parseSongPdfs.mjs)
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

const MAJOR_DEGREE_MAP = [
  { degree: 1, accidental: '' },
  { degree: 2, accidental: '♭' },
  { degree: 2, accidental: '' },
  { degree: 3, accidental: '♭' },
  { degree: 3, accidental: '' },
  { degree: 4, accidental: '' },
  { degree: 5, accidental: '♭' },
  { degree: 5, accidental: '' },
  { degree: 6, accidental: '♭' },
  { degree: 6, accidental: '' },
  { degree: 7, accidental: '♭' },
  { degree: 7, accidental: '' },
];

const MINOR_DEGREE_MAP = [
  { degree: 1, accidental: '' },
  { degree: 2, accidental: '♭' },
  { degree: 2, accidental: '' },
  { degree: 3, accidental: '' },
  { degree: 3, accidental: '♯' },
  { degree: 4, accidental: '' },
  { degree: 5, accidental: '♭' },
  { degree: 5, accidental: '' },
  { degree: 6, accidental: '' },
  { degree: 6, accidental: '♯' },
  { degree: 7, accidental: '' },
  { degree: 7, accidental: '♯' },
];

function chordRootPc(name) {
  const m = name.match(/^([A-G])([♯♭#b]?)/);
  if (!m) return null;
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]];
  let pc = base;
  if (m[2] === '♯' || m[2] === '#') pc += 1;
  if (m[2] === '♭' || m[2] === 'b') pc -= 1;
  return ((pc % 12) + 12) % 12;
}

function extractQuality(name) {
  if (/^N\.?C\.?$/i.test(name)) return 'n.c.';
  const after = name
    .replace(/^[A-G][♯♭#b]?/, '')
    .replace(/\/.*$/, '')
    .trim();
  if (!after) return 'maj';
  if (/^min7/i.test(after)) return 'min7';
  if (/^min/i.test(after) || /^m(?!a)/i.test(after)) return 'min';
  if (/^maj7/i.test(after)) return 'maj7';
  if (/^maj/i.test(after)) return 'maj';
  if (/^dim7/i.test(after)) return 'dim7';
  if (/^dim/i.test(after)) return 'dim';
  if (/^aug/i.test(after)) return 'aug';
  if (/^sus/i.test(after)) return 'sus4';
  if (/^7/i.test(after)) return '7';
  if (/^9/i.test(after)) return '9';
  if (/^13/i.test(after)) return '13';
  if (/^6/i.test(after)) return '6';
  return after.toLowerCase() || 'maj';
}

function computeDegree(chordName, keyRootPc, mode) {
  if (/^N\.?C\.?$/i.test(chordName)) return 'n.c.';
  const rootPc = chordRootPc(chordName);
  if (rootPc == null) return '1 maj';
  const interval = (rootPc - keyRootPc + 12) % 12;
  const map = mode === 'minor' ? MINOR_DEGREE_MAP : MAJOR_DEGREE_MAP;
  const { degree, accidental } = map[interval];
  const quality = extractQuality(chordName);
  const slashMatch = chordName.match(/\/\s*([A-G][♯♭#b]?)\s*$/);
  if (slashMatch) {
    const bassPc = chordRootPc(slashMatch[1]);
    if (bassPc != null) {
      const bassInterval = (bassPc - keyRootPc + 12) % 12;
      const { degree: bd, accidental: ba } = map[bassInterval];
      return `${accidental}${degree} ${quality}/${ba}${bd}`;
    }
  }
  return `${accidental}${degree} ${quality}`;
}

function detectKeyAndMode(chords) {
  const roots = chords.map((c) => chordRootPc(c)).filter((r) => r != null);
  if (roots.length === 0) return { keyName: 'C', mode: 'major', keyRootPc: 0 };
  const counts = new Array(12).fill(0);
  roots.forEach((r, i) => {
    counts[r] += i === 0 || i === roots.length - 1 ? 3 : 1;
  });
  const candidateRoot = counts.indexOf(Math.max(...counts));
  const tonicChords = chords.filter((c) => chordRootPc(c) === candidateRoot);
  const hasMinor = tonicChords.some((c) => /min|m(?!a)/i.test(c));
  const mode = hasMinor ? 'minor' : 'major';
  const PC_TO_NAME = [
    'C',
    'D♭',
    'D',
    'E♭',
    'E',
    'F',
    'F♯',
    'G',
    'A♭',
    'A',
    'B♭',
    'B',
  ];
  return { keyName: PC_TO_NAME[candidateRoot], mode, keyRootPc: candidateRoot };
}

/* ── Build Song from Vision Output ──────────────────────────────────── */

function buildSong(visionData, slug, manifestEntry) {
  const title = manifestEntry?.title || visionData.title || slug;
  const artist = manifestEntry?.artist || visionData.artist || 'Unknown Artist';
  const tempo = visionData.tempo || 120;
  const timeSig = visionData.timeSignature || [4, 4];

  // Collect all chord names for key detection
  const allChordNames = [];
  for (const sys of visionData.systems || []) {
    for (const bar of sys.bars || []) {
      for (const chord of bar.chords || []) {
        if (chord.name) allChordNames.push(chord.name);
      }
    }
  }

  const { keyName, mode, keyRootPc: krpc } = detectKeyAndMode(allChordNames);
  const keyRoot = KEY_TO_MIDI[keyName] || 60;

  // Build sections from systems.
  // Each system becomes its own section. Section markers provide the label;
  // systems without markers get auto-generated labels.
  // This ensures each row in the chord chart matches one section in the output,
  // preserving correct measures-per-row and repeat boundaries.
  const sections = [];
  const beatsPerBar = timeSig[0] || 4;
  let sectionIdx = 0;
  const LABEL_MAP = {
    A: 'Verse',
    B: 'Chorus',
    C: 'Bridge',
    D: 'Verse 2',
    E: 'Section E',
    F: 'Section F',
    G: 'Section G',
  };
  const usedIds = new Set();

  for (const sys of visionData.systems || []) {
    // Determine section label
    const marker = sys.sectionMarker;
    let label;
    if (marker && /^intro$/i.test(marker)) {
      label = 'Intro';
    } else if (marker && LABEL_MAP[marker]) {
      label = LABEL_MAP[marker];
    } else if (marker) {
      label = `Section ${marker}`;
    } else {
      // No marker — auto-generate from index
      label = `Section ${String.fromCharCode(65 + sectionIdx)}`;
    }
    let id = label
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
    // Ensure unique IDs
    if (usedIds.has(id)) {
      let n = 2;
      while (usedIds.has(`${id}_${n}`)) n++;
      id = `${id}_${n}`;
    }
    usedIds.add(id);
    sectionIdx++;

    // Build bars for this system
    const bars = [];
    for (const bar of sys.bars || []) {
      const chordHits = (bar.chords || []).map((c, i) => {
        const degree = computeDegree(c.name, krpc, mode);
        const nextBeat =
          i + 1 < bar.chords.length ? bar.chords[i + 1].beat : beatsPerBar + 1;
        const duration = Math.max(1, nextBeat - (c.beat || 1));
        return { degree, chordName: c.name, beat: c.beat || 1, duration };
      });

      const barObj = { chords: chordHits };
      if (bar.fermata) barObj.fermata = true;
      if (bar.restBars) barObj.restBars = bar.restBars;
      bars.push(barObj);
    }

    if (bars.length === 0) continue;

    const sec = { id, label, bars };
    if (sys.repeatCount && sys.repeatCount > 1)
      sec.repeatCount = sys.repeatCount;
    const barsInSystem = bars.length;
    if (barsInSystem !== 4) sec.measuresPerRow = barsInSystem;
    sections.push(sec);
  }

  // Difficulty
  const hasExtended = allChordNames.some((c) => /9|11|13/.test(c));
  const hasSevenths = allChordNames.some((c) => /7/.test(c));
  const hasAltered = allChordNames.some((c) => /dim|aug|\+|♯5|♭5/.test(c));
  const uniqueChords = new Set(allChordNames).size;
  const difficulty =
    hasAltered || hasExtended || uniqueChords > 12
      ? 3
      : hasSevenths || uniqueChords > 6
        ? 2
        : 1;

  return {
    slug,
    varName: slug.replace(/^(\d)/, '_$1'),
    title,
    artist,
    year: undefined,
    tempo,
    key: `${keyName} ${mode}`,
    keyRoot,
    mode,
    timeSig,
    genreTags: visionData.genre
      ? [visionData.genre.replace(/\s+/g, '_')]
      : ['pop'],
    difficulty,
    sections: sections.map((s) => {
      const sec = { id: s.id, label: s.label, bars: s.bars };
      if (s.repeatCount && s.repeatCount > 1) sec.repeatCount = s.repeatCount;
      if (s.measuresPerRow && s.measuresPerRow !== 4)
        sec.measuresPerRow = s.measuresPerRow;
      return sec;
    }),
  };
}

/* ── Generate TypeScript ────────────────────────────────────────────── */

function songToTypeScript(song) {
  const sectionsStr = song.sections
    .map((section) => {
      const barsStr = section.bars
        .map((bar) => {
          const chordsStr = bar.chords
            .map(
              (c) =>
                `{ degree: '${c.degree.replace(/'/g, "\\'")}', chordName: '${c.chordName.replace(/'/g, "\\'")}', beat: ${c.beat}, duration: ${c.duration} }`,
            )
            .join(', ');
          let barStr = `      { chords: [${chordsStr}]`;
          if (bar.fermata) barStr += `, fermata: true`;
          if (bar.restBars) barStr += `, restBars: ${bar.restBars}`;
          barStr += ` }`;
          return barStr;
        })
        .join(',\n');

      const mprLine =
        section.measuresPerRow && section.measuresPerRow !== 4
          ? `\n      measuresPerRow: ${section.measuresPerRow},`
          : '';
      const repeatLine =
        section.repeatCount && section.repeatCount > 1
          ? `\n      repeatCount: ${section.repeatCount},`
          : '';

      return `    {
      id: '${section.id}',
      label: '${section.label.replace(/\\/g, '').replace(/'/g, "\\'")}',${mprLine}${repeatLine}
      bars: [
${barsStr},
      ],
    }`;
    })
    .join(',\n');

  const yearStr = song.year ? String(song.year) : 'undefined';

  return `import type { Song } from '@/curriculum/types/songLibrary';

export const ${song.varName}: Song = {
  id: '${song.slug}',
  title: "${song.title.replace(/"/g, '\\"')}",
  artist: '${song.artist.replace(/'/g, "\\'")}',
  year: ${yearStr},

  key: '${song.key}',
  keyRoot: ${song.keyRoot},
  mode: '${song.mode}',
  tempo: ${song.tempo},
  timeSignature: [${song.timeSig[0]}, ${song.timeSig[1]}],

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

/* ── Artist Manifest ────────────────────────────────────────────────── */

function loadArtistManifest() {
  const DOCX_PATH = path.join(PDF_DIR, 'SOUL PROP BASS BOOK.docx');
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
        const key = title
          .toLowerCase()
          .replace(/[''""]/g, '')
          .replace(/&amp;/g, 'and')
          .replace(/&/g, 'and')
          .replace(/[^a-z0-9]/g, '');
        manifest.set(key, { title, artist });
      }
    }
  } catch {}
  return manifest;
}

function lookupArtist(pdfFilename, manifest) {
  const baseName = pdfFilename.replace(/\.pdf$/i, '');
  const key = baseName
    .toLowerCase()
    .replace(/[''""]/g, '')
    .replace(/[^a-z0-9]/g, '');
  if (manifest.has(key)) return manifest.get(key);
  const noParen = baseName.replace(/\s*\([^)]+\)\s*$/, '').trim();
  const pk = noParen
    .toLowerCase()
    .replace(/[''""]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return manifest.get(pk) || null;
}

/* ── Main ───────────────────────────────────────────────────────────── */

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      'Error: ANTHROPIC_API_KEY not set. Add it to .env file or environment.',
    );
    console.error(
      'Create .env in project root with: ANTHROPIC_API_KEY=sk-ant-...',
    );
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const manifest = loadArtistManifest();

  // Ensure directories exist
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  const files = fs
    .readdirSync(PDF_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .sort()
    .slice(OFFSET, OFFSET + BATCH);

  const filtered = ONLY
    ? files.filter((f) => slugify(f.replace(/\.pdf$/i, '')) === ONLY)
    : files;

  console.log(`Vision extracting ${filtered.length} songs...`);

  let processed = 0;
  let successes = 0;
  let failures = 0;

  for (const file of filtered) {
    const slug = slugify(file.replace(/\.pdf$/i, ''));
    const cachePath = path.join(CACHE_DIR, `${slug}.json`);

    // Check cache
    if (!SKIP_CACHE && fs.existsSync(cachePath)) {
      console.log(`  [cache] ${slug}`);
      processed++;
      successes++;
      continue;
    }

    try {
      // Render PDF pages
      const pdfPath = path.join(PDF_DIR, file);
      const pngs = renderPdfPages(pdfPath);
      if (pngs.length === 0) {
        console.log(`  [error] ${slug}: no pages rendered`);
        failures++;
        continue;
      }

      // Call Claude Vision
      console.log(`  [vision] ${slug} (${pngs.length} pages)...`);
      const visionData = await extractWithVision(client, pngs);

      if (!visionData || !visionData.systems) {
        console.log(`  [error] ${slug}: invalid vision response`);
        failures++;
        continue;
      }

      // Cache the raw response
      fs.writeFileSync(cachePath, JSON.stringify(visionData, null, 2));

      // Build song and write TypeScript
      const manifestEntry = lookupArtist(file, manifest);
      const song = buildSong(visionData, slug, manifestEntry);
      const tsContent = songToTypeScript(song);
      const outPath = path.join(SONGS_DIR, `${slug}.ts`);

      // Don't overwrite protected files
      if (['24k_magic', 'dont_stop_believin'].includes(slug)) {
        console.log(`  [skip] ${slug} (protected)`);
      } else {
        fs.writeFileSync(outPath, tsContent);
      }

      successes++;

      // Clean up temp PNGs
      for (const png of pngs) {
        try {
          fs.unlinkSync(png);
        } catch {}
      }
    } catch (err) {
      console.log(`  [error] ${slug}: ${err.message}`);
      failures++;
    }

    processed++;
    if (processed % 10 === 0) {
      console.log(
        `  Progress: ${processed}/${filtered.length} (${successes} ok, ${failures} fail)`,
      );
    }

    // Rate limiting: small delay between API calls
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n═══ Vision Extraction Complete ═══`);
  console.log(`  Total: ${processed}`);
  console.log(`  Success: ${successes}`);
  console.log(`  Failures: ${failures}`);
  console.log(`  Cache dir: ${CACHE_DIR}`);
}

main().catch(console.error);
