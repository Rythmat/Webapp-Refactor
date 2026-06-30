/**
 * PDF Chord Chart Parser — Development Tool (v2)
 *
 * Reads PDFs from the Bass Soul Prop Book, extracts chord chart data,
 * and generates Song TypeScript files for the song library.
 *
 * Usage: node src/scripts/parseSongPdfs.mjs [--only=slug] [--validate] [--diff]
 *
 * NOT shipped to the browser — development-only.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PDF_DIR = '/Users/marfizo/Downloads/NEW BASS SOUL PROP BOOK';
const OUT_DIR =
  '/Users/marfizo/Documents/Full App Code/Webapp-Refactor/src/curriculum/data/songs';
const DOCX_PATH = path.join(PDF_DIR, 'SOUL PROP BASS BOOK.docx');

/** Songs that were hand-edited — never overwrite */
const PROTECTED_SLUGS = new Set(['24k_magic', 'dont_stop_believin']);

/** OCR-derived bass note corrections — fixes font encoding mismatches */
let OCR_CORRECTIONS = {};
try {
  OCR_CORRECTIONS = JSON.parse(
    fs.readFileSync(path.join(OUT_DIR, '_ocr_corrections.json'), 'utf-8'),
  );
} catch {
  /* no corrections file */
}

/**
 * Apply OCR bass note corrections to a chord name.
 * If the song has known font encoding mismatches (e.g., /F should be /C),
 * correct the bass note in slash chords.
 */
function applyBassCorrection(chordName, slug) {
  const corrections = OCR_CORRECTIONS[slug]?.bassCorrections;
  if (!corrections) return chordName;

  const slashIdx = chordName.lastIndexOf('/');
  if (slashIdx === -1) return chordName;

  const bassNote = chordName.slice(slashIdx + 1).replace(/[♯♭]/g, '');
  const correctedBass = corrections[bassNote];
  if (!correctedBass) return chordName;

  // Replace the bass note letter, preserving any accidental
  const bassAccidental = chordName.slice(slashIdx + 1).replace(/[A-G]/g, '');
  return chordName.slice(0, slashIdx + 1) + correctedBass + bassAccidental;
}

/* ── CLI Flags ──────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const FLAG_ONLY = args.find((a) => a.startsWith('--only='))?.split('=')[1];
const FLAG_VALIDATE = args.includes('--validate');
const FLAG_DIFF = args.includes('--diff');

/* ── Helpers ─────────────────────────────────────────────────────────── */

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['''`ʼ\u2018\u2019]/g, '') // Remove all apostrophe variants
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/(^_|_$)/g, '');
}

/* ── Phase 1: .docx Artist Manifest ─────────────────────────────────── */

/**
 * Parses SOUL PROP BASS BOOK.docx to extract title → artist mapping.
 * The .docx contains lines like: "Song Title – Artist Name"
 * Separator is either – (en-dash) or - (hyphen).
 */
function loadArtistManifest() {
  const manifest = new Map(); // normalizedTitle → { title, artist }

  if (!fs.existsSync(DOCX_PATH)) {
    console.warn('⚠ .docx manifest not found — artist lookup disabled');
    return manifest;
  }

  // Extract XML from .docx (it's a zip file)
  let xml;
  try {
    xml = execSync(`unzip -p "${DOCX_PATH}" word/document.xml`, {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch {
    console.warn('⚠ Failed to extract .docx — artist lookup disabled');
    return manifest;
  }

  // Insert newlines at paragraph boundaries, then strip remaining XML tags
  const text = xml
    .replace(/<\/w:p>/g, '\n') // End of paragraph → newline
    .replace(/<w:br[^>]*\/>/g, '\n') // Line breaks → newline
    .replace(/<[^>]+>/g, ''); // Strip all remaining tags

  // Split into entries — each line is "Title – Artist" or "Title - Artist"
  // The separator is en-dash (–) or sometimes hyphen (-) with spaces
  const entries = text.split(/\n/).filter((l) => l.trim().length > 3);

  for (const entry of entries) {
    // Try en-dash first, then spaced hyphen
    let sep = ' – ';
    let idx = entry.indexOf(sep);
    if (idx === -1) {
      sep = ' - ';
      idx = entry.indexOf(sep);
    }
    if (idx === -1) continue;

    const title = entry.slice(0, idx).trim();
    const artist = entry.slice(idx + sep.length).trim();
    if (!title || !artist) continue;

    // Store with normalized key for fuzzy matching
    const key = normalizeForLookup(title);
    manifest.set(key, { title, artist });
  }

  console.log(`✓ Loaded ${manifest.size} entries from artist manifest`);
  return manifest;
}

/** Normalize a title string for fuzzy matching against the manifest */
function normalizeForLookup(s) {
  return s
    .toLowerCase()
    .replace(/['''`ʼ"""\u2018\u2019\u201C\u201D]/g, '') // All quote/apostrophe variants
    .replace(/&amp;/g, 'and') // XML entity
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Look up artist for a given PDF filename.
 * Handles disambiguation like "Another Day (Lidell)" → matches "Another Day - Jamie Lidell"
 */
function lookupArtist(pdfFilename, manifest) {
  const baseName = pdfFilename.replace(/\.pdf$/i, '');
  const key = normalizeForLookup(baseName);

  // Direct match
  if (manifest.has(key)) {
    return manifest.get(key);
  }

  // Try without parenthetical disambiguation
  const withoutParen = baseName.replace(/\s*\([^)]+\)\s*$/, '').trim();
  const parenKey = normalizeForLookup(withoutParen);
  if (manifest.has(parenKey)) {
    return manifest.get(parenKey);
  }

  // Try with parenthetical content as artist hint
  const parenMatch = baseName.match(/\(([^)]+)\)$/);
  if (parenMatch) {
    const hint = parenMatch[1].toLowerCase();
    // Find all manifest entries matching the base title
    for (const [mKey, mVal] of manifest) {
      if (mKey === parenKey && mVal.artist.toLowerCase().includes(hint)) {
        return mVal;
      }
    }
    // If multiple entries share the base title, find one whose artist contains the hint
    for (const [, mVal] of manifest) {
      const mNorm = normalizeForLookup(mVal.title);
      if (mNorm === parenKey && mVal.artist.toLowerCase().includes(hint)) {
        return mVal;
      }
    }
  }

  // Fuzzy: try stripping leading articles
  const noArticle = key.replace(/^(the|a|an)/, '');
  for (const [mKey, mVal] of manifest) {
    const mNoArticle = mKey.replace(/^(the|a|an)/, '');
    if (mNoArticle === noArticle && noArticle.length > 3) {
      return mVal;
    }
  }

  return null;
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

/* ── Phase 2: Enhanced Chord Recognition ─────────────────────────────── */

// Comprehensive chord regex — handles extensions, alterations, slash chords
// ROOT: A-G with optional sharp/flat
// QUALITY: maj, min, m, dim, aug, sus, add, dom
// EXTENSION: 6, 7, 9, 11, 13 (may follow quality directly)
// ALTERATIONS: #5, b5, #9, b9, #11, b13 etc. (with or without parens)
// BASS: /A-G with optional accidental
const CHORD_RE =
  /^([A-G][#♯b♭]?)\s*(maj|min|m(?!a)|dim|aug|sus|add|dom|[Mm]aj|half-dim|hdim|ø|°|\+)?\s*(6|7|9|11|13)?\s*(?:([#♯b♭]\d+[#♯b♭]?\d*|\([^)]*\))*)\s*(\/\s*[A-G][#♯b♭]?)?$/;

// Quick-check: does this token start like a chord?
const CHORD_START_RE = /^[A-G][#♯b♭]?/;

// Known non-chord words that start with A-G
const FALSE_POSITIVES = new Set([
  'and',
  'an',
  'a',
  'at',
  'as',
  'be',
  'by',
  'do',
  'da',
  'de',
  'go',
  'got',
  'get',
  'god',
  'good',
  'great',
  'back',
  'bad',
  'band',
  'bass',
  'beat',
  'been',
  'big',
  'blue',
  'burn',
  'can',
  'come',
  'could',
  'cut',
  'day',
  'did',
  'down',
  'don',
  'end',
  'every',
  'for',
  'from',
  'feel',
  'fine',
  'fire',
  'first',
  'free',
  'funk',
  'full',
  'give',
  'girl',
  'all',
  'about',
  'after',
  'again',
  'baby',
  'before',
  'chorus',
  'coda',
  'ds',
  'dc',
  'eight',
  'four',
  'five',
  'groove',
  'bridge',
  'bar',
  'bars',
  'feel',
  'finger',
  'fill',
  'etc',
  'ending',
]);

function isChordName(s) {
  const cleaned = s.trim();
  if (!cleaned || cleaned.length > 25) return false;
  if (cleaned.length === 1 && /[A-G]/.test(cleaned)) return true; // Single note letter is valid
  if (/^N\.?C\.?$/i.test(cleaned)) return true; // No Chord
  if (FALSE_POSITIVES.has(cleaned.toLowerCase())) return false;
  if (!CHORD_START_RE.test(cleaned)) return false;
  return CHORD_RE.test(cleaned);
}

/**
 * Normalize chord notation to use proper Unicode symbols.
 * # → ♯, b (after note letter) → ♭, strips PDF artifacts
 */
function normalizeChord(s) {
  return s
    .replace(/œ|¬|†|‡/g, '') // Strip PDF artifacts
    .replace(/([A-G])#/g, '$1♯')
    .replace(/([A-G])b(?![a-z])/g, '$1♭')
    .replace(/\/([A-G])#/g, '/$1♯') // Explicit slash bass sharp
    .replace(/\/([A-G])b(?![a-z])/g, '/$1♭') // Explicit slash bass flat
    .replace(/\(\s*([#♯b♭])/g, '($1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract the quality string from a chord name for degree computation.
 * E.g. "Cmin7" → "min7", "Gmaj9" → "maj9", "F♯" → "maj", "D7" → "7"
 */
function extractChordQuality(chordName) {
  if (/^N\.?C\.?$/i.test(chordName)) return 'n.c.';
  const match = chordName.match(CHORD_RE);
  if (!match) return 'maj';

  const quality = (match[2] || '').toLowerCase();
  const extension = match[3] || '';

  // Normalize quality names
  let q = '';
  if (quality === 'min' || quality === 'm') q = 'min';
  else if (quality === 'maj') q = 'maj';
  else if (
    quality === 'dim' ||
    quality === '°' ||
    quality === 'ø' ||
    quality === 'half-dim' ||
    quality === 'hdim'
  )
    q = 'dim';
  else if (quality === 'aug' || quality === '+') q = 'aug';
  else if (quality === 'sus') q = 'sus';
  else if (quality === 'add') q = 'add';
  else if (quality === 'dom') q = 'dom';
  else q = 'maj'; // default

  // Combine with extension
  if (extension) {
    // Key distinction: bare "7" (no prefix) = dominant, "maj7" = major seventh
    if (q === 'maj' && quality === 'maj') return `maj${extension}`; // Explicit "maj" prefix
    if (q === 'maj' && quality === '') return extension; // No prefix + 7/9/11/13 = dominant
    if (q === 'min') return `min${extension || ''}`;
    if (q === 'dim') return `dim${extension || ''}`;
    if (q === 'aug') return `aug${extension || ''}`;
    if (q === 'sus') return `sus${extension || '4'}`;
    if (q === 'dom') return extension || '7';
    if (q === 'add') return `add${extension}`;
    return `${q}${extension}`;
  }

  // No extension — just quality (or bare note letter)
  if (q === 'min') return 'min';
  if (q === 'dim') return 'dim';
  if (q === 'aug') return 'aug';
  if (q === 'sus') return 'sus4';
  return 'maj'; // Default: bare letter or explicit 'maj' both → major triad
}

/**
 * Extract the root MIDI note from a chord name.
 */
function chordRootMidi(chordName) {
  if (/^N\.?C\.?$/i.test(chordName)) return null;
  const m = chordName.match(/^([A-G])([♯♭#b]?)/);
  if (!m) return null;
  const letter = m[1];
  const acc = m[2];
  const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter];
  if (base == null) return null;
  let midi = base;
  if (acc === '♯' || acc === '#') midi += 1;
  if (acc === '♭' || acc === 'b') midi -= 1;
  return ((midi % 12) + 12) % 12; // 0-11 pitch class
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

/* ── Phase 5: Degree Computation ─────────────────────────────────────── */

/**
 * Maps semitone interval (0-11) to scale degree in major key.
 * Returns { degree: number, accidental: '' | '♭' | '♯' }
 */
const MAJOR_DEGREE_MAP = [
  { degree: 1, accidental: '' }, // 0: unison
  { degree: 2, accidental: '♭' }, // 1: ♭2 (Neapolitan)
  { degree: 2, accidental: '' }, // 2: major 2nd
  { degree: 3, accidental: '♭' }, // 3: minor 3rd (♭3)
  { degree: 3, accidental: '' }, // 4: major 3rd
  { degree: 4, accidental: '' }, // 5: perfect 4th
  { degree: 5, accidental: '♭' }, // 6: ♭5 / ♯4 (tritone)
  { degree: 5, accidental: '' }, // 7: perfect 5th
  { degree: 6, accidental: '♭' }, // 8: ♭6 (common borrowed chord)
  { degree: 6, accidental: '' }, // 9: major 6th
  { degree: 7, accidental: '♭' }, // 10: minor 7th (♭7)
  { degree: 7, accidental: '' }, // 11: major 7th
];

const MINOR_DEGREE_MAP = [
  { degree: 1, accidental: '' }, // 0: unison
  { degree: 2, accidental: '♭' }, // 1: ♭2
  { degree: 2, accidental: '' }, // 2: major 2nd
  { degree: 3, accidental: '' }, // 3: minor 3rd (natural in minor)
  { degree: 3, accidental: '♯' }, // 4: ♯3 (major 3rd in minor context)
  { degree: 4, accidental: '' }, // 5: perfect 4th
  { degree: 5, accidental: '♭' }, // 6: ♭5
  { degree: 5, accidental: '' }, // 7: perfect 5th
  { degree: 6, accidental: '' }, // 8: minor 6th (natural in minor)
  { degree: 6, accidental: '♯' }, // 9: ♯6 (major 6th)
  { degree: 7, accidental: '' }, // 10: minor 7th (natural in minor)
  { degree: 7, accidental: '♯' }, // 11: major 7th
];

/**
 * Compute the Hybrid Number System degree for a chord relative to a key.
 * @param {string} chordName - e.g. "C♯min7", "B/D♯"
 * @param {number} keyRootPc - key root as pitch class 0-11 (C=0, D=2, etc.)
 * @param {string} mode - 'major' or 'minor'
 * @returns {string} - e.g. '1 maj', '♭7 min7', '5/3'
 */
function computeDegree(chordName, keyRootPc, mode) {
  if (/^N\.?C\.?$/i.test(chordName)) return 'n.c.';

  const rootPc = chordRootMidi(chordName);
  if (rootPc == null) return '1 maj';

  const interval = (rootPc - keyRootPc + 12) % 12;
  const degreeMap = mode === 'minor' ? MINOR_DEGREE_MAP : MAJOR_DEGREE_MAP;
  const { degree, accidental } = degreeMap[interval];

  const quality = extractChordQuality(chordName);

  // Handle slash chords (bass note)
  const slashMatch = chordName.match(/\/\s*([A-G][♯♭#b]?)\s*$/);
  if (slashMatch) {
    const bassPc = chordRootMidi(slashMatch[1]);
    if (bassPc != null) {
      const bassInterval = (bassPc - keyRootPc + 12) % 12;
      const { degree: bassDeg, accidental: bassAcc } = degreeMap[bassInterval];
      return `${accidental}${degree} ${quality}/${bassAcc}${bassDeg}`;
    }
  }

  return `${accidental}${degree} ${quality}`;
}

/* ── Phase 6: Key & Mode Detection ──────────────────────────────────── */

/**
 * Analyze a set of chords to detect the likely key and mode.
 * Uses multiple heuristics: first/last chord, chord frequency, quality patterns.
 */
function detectKeyAndMode(chords, pdfKeySigName) {
  if (chords.length === 0) {
    return { keyName: pdfKeySigName || 'C', mode: 'major' };
  }

  // Get all root pitch classes
  const roots = chords
    .map((c) => chordRootMidi(normalizeChord(c)))
    .filter((r) => r != null);

  if (roots.length === 0) {
    return { keyName: pdfKeySigName || 'C', mode: 'major' };
  }

  // Count root occurrences (weighted: first and last chords count triple)
  const counts = new Array(12).fill(0);
  roots.forEach((r, i) => {
    const weight = i === 0 || i === roots.length - 1 ? 3 : 1;
    counts[r] += weight;
  });

  // Find the most common root
  const maxCount = Math.max(...counts);
  const candidateRoot = counts.indexOf(maxCount);

  // Determine mode by checking chord qualities on the tonic
  const tonicChords = chords.filter((c) => {
    const r = chordRootMidi(normalizeChord(c));
    return r === candidateRoot;
  });

  const tonicQualities = tonicChords.map((c) =>
    extractChordQuality(normalizeChord(c)),
  );
  const hasMinorTonic = tonicQualities.some((q) => q.startsWith('min'));
  const hasMajorTonic = tonicQualities.some(
    (q) => q.startsWith('maj') || q === 'maj' || q === '7',
  );

  // Also check if the ♭3, ♭6, ♭7 above candidate are minor-indicators
  const minorIndicators = [3, 8, 10]; // minor 3rd, minor 6th, minor 7th intervals
  let minorScore = 0;
  for (const r of roots) {
    const interval = (r - candidateRoot + 12) % 12;
    if (minorIndicators.includes(interval)) minorScore++;
  }

  const mode =
    (hasMinorTonic && !hasMajorTonic) || minorScore > roots.length * 0.2
      ? 'minor'
      : 'major';

  // Map pitch class to key name
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
  const keyName = PC_TO_NAME[candidateRoot] || pdfKeySigName || 'C';

  // If PDF key sig is available and close to our detection, prefer PDF version
  if (pdfKeySigName && pdfKeySigName !== 'C') {
    const pdfPc = KEY_TO_MIDI[pdfKeySigName];
    if (pdfPc != null) {
      const pdfInterval = (((pdfPc - 60) % 12) + 12) % 12;
      // If PDF key matches our detected root (within enharmonic), use PDF key name
      if (pdfInterval === candidateRoot) {
        return { keyName: pdfKeySigName, mode };
      }
    }
  }

  return { keyName, mode };
}

/* ── Phase 7: Section Structure Detection ────────────────────────────── */

/** Map rehearsal letters to semantic section labels */
const SECTION_LABEL_MAP = {
  intro: { id: 'intro', label: 'Intro' },
  A: { id: 'verse_1', label: 'Verse' },
  B: { id: 'chorus_1', label: 'Chorus' },
  C: { id: 'bridge', label: 'Bridge' },
  D: { id: 'verse_2', label: 'Verse 2' },
  E: { id: 'section_e', label: 'Section E' },
  F: { id: 'section_f', label: 'Section F' },
  outro: { id: 'outro', label: 'Outro' },
  coda: { id: 'coda', label: 'Coda' },
  fine: { id: 'outro', label: 'Outro' },
};

/**
 * Assign semantic labels to sections detected from PDF markers.
 * Also detects repeated sections and consolidates them.
 */
function assignSectionLabels(sectionMarkers) {
  const labels = [];
  const usedIds = new Set();

  for (const marker of sectionMarkers) {
    const m = marker.toLowerCase();
    let info = SECTION_LABEL_MAP[m] || SECTION_LABEL_MAP[marker];

    if (!info) {
      // Generic fallback for unknown letters
      info = { id: `section_${m}`, label: `Section ${marker.toUpperCase()}` };
    }

    // Ensure unique IDs
    let id = info.id;
    if (usedIds.has(id)) {
      let num = 2;
      while (usedIds.has(`${info.id}_${num}`)) num++;
      id = `${info.id}_${num}`;
    }
    usedIds.add(id);

    labels.push({ id, label: info.label, originalMarker: marker });
  }

  return labels;
}

/* ── Phase 8: Genre & Metadata Enrichment ────────────────────────────── */

/** Artist → genre tag mapping for known artists */
const ARTIST_GENRE_MAP = {
  'stevie wonder': ['soul', 'funk'],
  'michael jackson': ['pop', 'soul'],
  'the beatles': ['rock', 'pop'],
  'talking heads': ['new_wave', 'art_rock'],
  'david bowie': ['art_rock', 'glam_rock'],
  'james brown': ['funk', 'soul'],
  prince: ['funk', 'pop'],
  'earth, wind and fire': ['funk', 'soul'],
  'earth, wind, and fire': ['funk', 'soul'],
  'marvin gaye': ['soul', 'r_and_b'],
  'aretha franklin': ['soul', 'r_and_b'],
  'bill withers': ['soul', 'r_and_b'],
  'the rolling stones': ['rock'],
  'led zeppelin': ['rock', 'blues_rock'],
  'fleetwood mac': ['rock', 'pop'],
  'bob marley': ['reggae'],
  jamiroquai: ['funk', 'acid_jazz'],
  'kool and the gang': ['funk', 'disco'],
  'the meters': ['funk', 'r_and_b'],
  'sly and the family stone': ['funk', 'soul'],
  'hall and oates': ['pop', 'soul'],
  'carole king': ['pop', 'singer_songwriter'],
  'van morrison': ['rock', 'soul'],
  'eric clapton': ['rock', 'blues'],
  'bruno mars': ['pop', 'funk'],
  'daft punk': ['electronic', 'funk'],
  'red hot chili peppers': ['rock', 'funk'],
  'the red hot chili peppers': ['rock', 'funk'],
  'tom petty': ['rock'],
  'paul simon': ['folk', 'world'],
  radiohead: ['alt_rock'],
  nirvana: ['grunge', 'alt_rock'],
  sublime: ['ska', 'reggae'],
  'otis redding': ['soul', 'r_and_b'],
  'al green': ['soul', 'r_and_b'],
  'sam cooke': ['soul'],
  'ray charles': ['soul', 'blues'],
  chic: ['disco', 'funk'],
  'kc and the sunshine band': ['disco', 'funk'],
  parliament: ['funk'],
  'the commodores': ['funk', 'soul'],
  'jill scott': ['neo_soul'],
  'erykah badu': ['neo_soul'],
  "d'angelo": ['neo_soul'],
  'lauryn hill': ['hip_hop', 'neo_soul'],
  'the roots': ['hip_hop'],
  outkast: ['hip_hop'],
  beyonce: ['pop', 'r_and_b'],
  rihanna: ['pop', 'r_and_b'],
  'justin timberlake': ['pop', 'r_and_b'],
  'taylor swift': ['pop', 'country'],
  adele: ['pop', 'soul'],
  'amy winehouse': ['soul', 'jazz'],
  'norah jones': ['jazz', 'pop'],
  'leon bridges': ['soul', 'r_and_b'],
  'john legend': ['r_and_b', 'soul'],
  'the doobie brothers': ['rock', 'soul'],
  'tower of power': ['funk', 'soul'],
  'average white band': ['funk', 'soul'],
  war: ['funk', 'latin'],
  santana: ['rock', 'latin'],
  'bob dylan': ['folk', 'rock'],
  'joni mitchell': ['folk', 'singer_songwriter'],
  'james taylor': ['folk', 'singer_songwriter'],
  'grateful dead': ['rock', 'jam'],
  'the allman brothers': ['rock', 'blues_rock'],
  'johnny cash': ['country'],
  'dolly parton': ['country'],
  'garth brooks': ['country'],
  'willie nelson': ['country'],
  'zac brown band': ['country'],
  'chris stapleton': ['country', 'soul'],
};

/** Artist → approximate era mapping */
const ARTIST_ERA_MAP = {
  'the beatles': [1963, 1970],
  'stevie wonder': [1972, 1980],
  'michael jackson': [1979, 1991],
  'david bowie': [1969, 1983],
  'james brown': [1965, 1975],
  prince: [1982, 1992],
  'bruno mars': [2012, 2020],
  'taylor swift': [2008, 2024],
  beyonce: [2003, 2024],
  adele: [2011, 2021],
  'talking heads': [1977, 1988],
  'fleetwood mac': [1975, 1987],
  'led zeppelin': [1969, 1980],
  'the rolling stones': [1965, 1980],
  radiohead: [1993, 2016],
  nirvana: [1989, 1994],
  'bob marley': [1973, 1981],
  'marvin gaye': [1968, 1982],
  'aretha franklin': [1967, 1972],
};

/**
 * Look up genre tags from artist name.
 * Falls back to PDF-extracted genre if no artist match.
 */
function getGenreFromArtist(artist, pdfGenre) {
  if (!artist || artist === 'Unknown Artist') {
    return normalizeGenre(pdfGenre || 'pop');
  }
  const key = artist.toLowerCase().trim();
  if (ARTIST_GENRE_MAP[key]) return ARTIST_GENRE_MAP[key];

  // Partial match — check if any key is contained in the artist string
  for (const [mapKey, genres] of Object.entries(ARTIST_GENRE_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) return genres;
  }

  return normalizeGenre(pdfGenre || 'pop');
}

/**
 * Estimate release year from artist era data.
 */
function estimateYear(artist) {
  if (!artist) return undefined;
  const key = artist.toLowerCase().trim();
  const era = ARTIST_ERA_MAP[key];
  if (era) {
    // Return midpoint of era
    return Math.round((era[0] + era[1]) / 2);
  }
  return undefined;
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
    const raw = tokens[i];

    // Handle slash tokens: "/D♯", "/A", etc. — attach to previous chord
    if (raw.startsWith('/') && raw.length > 1) {
      const bassNote = normalizeChord(raw.slice(1));
      if (/^[A-G][♯♭]?$/i.test(bassNote) && chords.length > 0) {
        chords[chords.length - 1] += '/' + bassNote;
      }
      continue;
    }

    const normalized = normalizeChord(raw);
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

      // Check if next token is a slash bass note: "/" or "/D♯"
      if (i + 1 < tokens.length) {
        const nextTok = tokens[i + 1]?.trim();
        if (nextTok === '/' && i + 2 < tokens.length) {
          // "B" "/" "D♯" pattern
          const bassRaw = normalizeChord(tokens[i + 2]);
          if (/^[A-G][♯♭]?$/i.test(bassRaw)) {
            chords[chords.length - 1] += '/' + bassRaw;
            i += 2; // skip "/" and bass note
          }
        } else if (nextTok?.startsWith('/') && nextTok.length > 1) {
          // "B" "/D♯" pattern
          const bassNote = normalizeChord(nextTok.slice(1));
          if (/^[A-G][♯♭]?$/i.test(bassNote)) {
            chords[chords.length - 1] += '/' + bassNote;
            i++; // skip the slash token
          }
        }
      }
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

/* ── Phase 3 & 4: Spatial PDF Extraction ──────────────────────────────── */

/**
 * Extract chords with positional data using pdfjs-dist.
 * Returns structured data: metadata + chord systems (rows of measures).
 */
async function extractSpatial(pdfPath, slug) {
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data }).promise;

  const allItems = []; // { text, x, y, fontSize, page }
  let pageWidth = 612;
  let pageHeight = 792;

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale: 1 });
    if (p === 1) {
      pageWidth = viewport.width;
      pageHeight = viewport.height;
    }
    const textContent = await page.getTextContent();

    for (const item of textContent.items) {
      const text = item.str.trim();
      if (!text) continue;
      allItems.push({
        text,
        x: Math.round(item.transform[4]),
        y: Math.round(viewport.height - item.transform[5]), // flip: top=0
        fontSize: Math.round(Math.abs(item.transform[0])),
        width: Math.round(item.width),
        page: p,
      });
    }
  }

  // ── Detect bars per system from printed measure numbers ──
  // These PDFs print measure numbers (e.g., "5", "9", "13") at the left margin
  // of each system. The difference between consecutive numbers = bars in that system.
  const measureNumbers = allItems
    .filter(
      (i) =>
        /^\d+$/.test(i.text) &&
        i.x < 85 &&
        i.fontSize >= 8 &&
        i.fontSize <= 10 &&
        i.y > (i.page === 1 ? 120 : 40) &&
        parseInt(i.text) > 1,
    )
    .sort((a, b) => a.page - b.page || a.y - b.y)
    .map((i) => ({ num: parseInt(i.text), y: i.y, page: i.page }));

  // Compute bars per system from consecutive measure numbers
  const barsPerSystem = []; // { y, page, numBars }
  for (let i = 0; i < measureNumbers.length - 1; i++) {
    const bars = measureNumbers[i + 1].num - measureNumbers[i].num;
    if (bars > 0 && bars <= 8) {
      // Skip page-break gaps (>8 bars = cross-page)
      barsPerSystem.push({
        y: measureNumbers[i].y,
        page: measureNumbers[i].page,
        numBars: bars,
      });
    }
  }
  // Add the last system (estimate from context or default to 4)
  if (measureNumbers.length > 0) {
    const last = measureNumbers[measureNumbers.length - 1];
    const prevBars =
      barsPerSystem.length > 0
        ? barsPerSystem[barsPerSystem.length - 1].numBars
        : 4;
    barsPerSystem.push({ y: last.y, page: last.page, numBars: prevBars });
  }

  // ── Extract metadata from page 1 top area (y < 120) ──
  const metaItems = allItems.filter((i) => i.page === 1 && i.y < 130);
  let genre = 'pop';
  let tempo = 120;
  let keyName = 'C';

  for (const item of metaItems) {
    // Tempo
    const tempoMatch = item.text.match(/quarter note\s*=\s*(\d+)/i);
    if (tempoMatch) tempo = parseInt(tempoMatch[1], 10);
    if (
      /^\d+$/.test(item.text) &&
      item.x < 200 &&
      parseInt(item.text) > 40 &&
      parseInt(item.text) < 240
    ) {
      // Standalone number near tempo position — might be BPM
      const n = parseInt(item.text);
      if (n >= 50 && n <= 220 && !tempoMatch) tempo = n;
    }

    // Genre — left side of header
    const lower = item.text.toLowerCase();
    if (
      Object.keys(GENRE_MAP).some((g) => lower === g || lower.startsWith(g))
    ) {
      genre = lower;
    }
  }

  // ── Time signature detection ──
  // Time sig numbers appear near the bass clef (y:130-160) as large digits (fontSize ~20)
  const timeSigItems = allItems
    .filter(
      (i) =>
        i.page === 1 &&
        i.y > 130 &&
        i.y < 160 &&
        /^[2-9]$/.test(i.text) &&
        i.fontSize >= 18,
    )
    .sort((a, b) => a.y - b.y);
  let timeSig = [4, 4];
  if (timeSigItems.length >= 2) {
    const top = parseInt(timeSigItems[0].text);
    const bottom = parseInt(timeSigItems[1].text);
    if (top >= 2 && top <= 12 && [2, 4, 8].includes(bottom)) {
      timeSig = [top, bottom];
    }
  }
  // Also check eighth note / dotted quarter tempo markings that imply compound time
  const hasEighthNote = metaItems.some((i) => /eighth note/i.test(i.text));
  if (hasEighthNote && timeSig[1] === 8) {
    // Confirmed compound time (6/8, 3/8, etc.)
  }

  // Key signature: count # symbols near bass clef on page 1
  const keySigItems = allItems.filter(
    (i) => i.page === 1 && i.y > 125 && i.y < 160 && /^[#♯]+$/.test(i.text),
  );
  const sharpCount = keySigItems.reduce((n, i) => n + i.text.length, 0);
  const flatSigItems = allItems.filter(
    (i) => i.page === 1 && i.y > 125 && i.y < 160 && /^[b♭]+$/.test(i.text),
  );
  const flatCount = flatSigItems.reduce((n, i) => n + i.text.length, 0);
  if (sharpCount > 0 && sharpCount < SHARP_KEYS.length)
    keyName = SHARP_KEYS[sharpCount];
  else if (flatCount > 0 && flatCount < FLAT_KEYS.length)
    keyName = FLAT_KEYS[flatCount];

  // ── Section markers: single letters A-F at fontSize ~10-12, or "intro"/"Fine" ──
  const sectionMarkers = [];
  const sectionItems = allItems.filter(
    (i) =>
      i.fontSize >= 9 &&
      i.fontSize <= 14 &&
      /^(intro|A|B|C|D|E|F|Fine|Coda|outro)$/i.test(i.text),
  );
  for (const item of sectionItems) {
    const label = item.text;
    if (label.length === 1 && /[A-F]/.test(label)) {
      sectionMarkers.push({ label, y: item.y, x: item.x, page: item.page });
    } else if (/^intro$/i.test(label)) {
      sectionMarkers.push({
        label: 'Intro',
        y: item.y,
        x: item.x,
        page: item.page,
      });
    } else if (/^(Fine|Coda|outro)$/i.test(label)) {
      sectionMarkers.push({
        label: label.charAt(0).toUpperCase() + label.slice(1).toLowerCase(),
        y: item.y,
        x: item.x,
        page: item.page,
      });
    }
  }

  // Page-aware chord area cutoff:
  // Page 1: detect if there are intro chords at y:100-130 (fontSize 9-10)
  // Page 2+: y > 50 (only skip page number)
  const hasIntroChords = allItems.some(
    (i) =>
      i.page === 1 &&
      i.y > 100 &&
      i.y < 130 &&
      i.fontSize >= 9 &&
      i.fontSize <= 11 &&
      /^[A-G]$/.test(i.text),
  );
  function chordYCutoff(page) {
    if (page === 1) return hasIntroChords ? 100 : 130;
    return 50;
  }

  // ── Chord extraction: combine root + accidental + quality ──
  // Chord roots: single letters A-G at fontSize 9-11
  // EXCLUDE section markers: single A-F letters at x < 80 (left margin = rehearsal letters)
  const chordCandidates = allItems.filter((i) => {
    if (i.fontSize < 8 || i.fontSize > 12) return false;
    if (!/^[A-G]$/.test(i.text)) return false;
    if (i.y <= chordYCutoff(i.page)) return false;

    // Filter out section markers: letters A-F at left margin
    if (/^[A-F]$/.test(i.text) && i.x < 80) {
      // Check if this has a quality suffix immediately adjacent (within 12px)
      // If it does, it might be a real chord at the start of a measure
      const hasImmediateQuality = allItems.some(
        (q) =>
          q.page === i.page &&
          Math.abs(q.y - i.y) <= 4 &&
          q.x > i.x &&
          q.x < i.x + 12 &&
          /^(min|maj|m|dim|aug|7|9|sus)/i.test(q.text),
      );
      if (!hasImmediateQuality) return false; // It's a section marker
    }

    return true;
  });

  // Quality/accidental items nearby
  // NOTE: Do NOT use /i flag — uppercase B is a chord root, not a flat accidental
  const qualityItems = allItems.filter(
    (i) =>
      i.fontSize >= 7 &&
      i.fontSize <= 12 &&
      /^(#|♯|b|♭|min7?|[Mm]aj7?|m7?|dim7?|aug|dom7?|7|9|11|13|sus[24]?|add\d+|6|\+|ø|°)$/.test(
        i.text,
      ) &&
      i.y > chordYCutoff(i.page),
  );

  // Slash chord bass items: "/" followed by note
  const slashItems = allItems.filter(
    (i) =>
      i.fontSize >= 8 &&
      i.fontSize <= 12 &&
      /^\/[A-G]/.test(i.text) &&
      i.y > chordYCutoff(i.page),
  );

  // Also look for standalone accidentals that might be positioned differently
  const accidentalItems = allItems.filter(
    (i) =>
      i.fontSize >= 8 &&
      i.fontSize <= 16 &&
      /^[#♯b♭]+$/.test(i.text) &&
      i.y > chordYCutoff(i.page),
  );

  // Assemble complete chord names from nearby items
  const assembledChords = []; // { chordName, x, y, page }

  for (const root of chordCandidates) {
    let chordName = root.text;
    let maxX = root.x + root.width;

    // Look for accidental near root — can be right of root OR slightly above/before
    const acc = [...qualityItems, ...accidentalItems].find(
      (q) =>
        q.page === root.page &&
        Math.abs(q.y - root.y) <= 10 &&
        q.x >= root.x - 2 &&
        q.x <= root.x + root.width + 15 &&
        /^[#♯b♭]+$/.test(q.text),
    );
    if (acc) {
      chordName += acc.text.charAt(0);
      maxX = Math.max(maxX, acc.x + acc.width);
    }

    // Look for quality suffix after root+accidental (within 25px x, ±5 y)
    const quals = qualityItems
      .filter(
        (q) =>
          q.page === root.page &&
          Math.abs(q.y - root.y) <= 5 &&
          q.x >= maxX - 3 &&
          q.x <= maxX + 20 &&
          !/^[#♯b♭]$/.test(q.text),
      )
      .sort((a, b) => a.x - b.x);

    for (const q of quals) {
      chordName += q.text;
      maxX = q.x + q.width;
    }

    // Look for slash bass note
    const slash = slashItems.find(
      (s) =>
        s.page === root.page &&
        Math.abs(s.y - root.y) <= 5 &&
        s.x >= maxX - 3 &&
        s.x <= maxX + 20,
    );
    if (slash) {
      chordName += slash.text;
    }

    // Validate the assembled chord
    const normalized = normalizeChord(chordName);
    if (isChordName(normalized)) {
      assembledChords.push({
        chordName: normalized,
        x: root.x,
        y: root.y,
        page: root.page,
      });
    }
  }

  // ── Phase 1: Combined chord text items ──
  // Detect multi-character chord items (slash chords like "B/F♯",
  // combined items like "Dm7"). Only accept items at y-bands where
  // single-letter roots were already found (prevents false positives).
  const chordYBands = [...new Set(assembledChords.map((c) => c.y))];

  const combinedChordItems = allItems.filter((i) => {
    if (i.fontSize < 8 || i.fontSize > 12) return false;
    if (i.y <= chordYCutoff(i.page)) return false;
    if (i.text.length < 2 || i.text.length > 12) return false;
    if (!/^[A-G]/.test(i.text)) return false;
    if (FALSE_POSITIVES.has(i.text.toLowerCase())) return false;
    if (i.y > pageHeight - 80) return false;
    // Must be near an existing chord y-band (or accept if no bands found yet)
    if (chordYBands.length > 0) {
      const nearBand = chordYBands.some((y) => Math.abs(y - i.y) <= 8);
      if (!nearBand) return false;
    }
    const normalized = normalizeChord(i.text);
    return isChordName(normalized);
  });

  for (const item of combinedChordItems) {
    // Only add if no existing assembled chord is nearby
    const nearby = assembledChords.find(
      (a) =>
        a.page === item.page &&
        Math.abs(a.x - item.x) <= 15 &&
        Math.abs(a.y - item.y) <= 8,
    );
    if (!nearby) {
      assembledChords.push({
        chordName: normalizeChord(item.text),
        x: item.x,
        y: item.y,
        page: item.page,
      });
    }
  }

  // Deduplicate: if single-letter assembly AND combined both found the same chord,
  // keep the more complete name (longer = more specific)
  assembledChords.sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
  const deduped = [];
  for (const chord of assembledChords) {
    const dup = deduped.find(
      (d) =>
        d.page === chord.page &&
        Math.abs(d.x - chord.x) <= 10 &&
        Math.abs(d.y - chord.y) <= 6,
    );
    if (dup) {
      // Keep the longer/more complete chord name (e.g., "B/F♯" over "B")
      if (chord.chordName.length > dup.chordName.length) {
        dup.chordName = chord.chordName;
      }
    } else {
      deduped.push({ ...chord });
    }
  }
  assembledChords.length = 0;
  assembledChords.push(...deduped);

  // ── Intro chord detection (y:100-130, page 1 only) ──
  // These chords appear above the first staff system in PDFs with an "intro" marker.
  // STRICT criteria: only add when intro chords have slash chords or accidentals
  // that DIFFER from the first main system (otherwise they're just redundant previews).
  const hasIntroMarker = allItems.some(
    (i) => i.page === 1 && i.y > 100 && i.y < 145 && /^intro$/i.test(i.text),
  );
  if (hasIntroMarker) {
    // Check if intro area has SLASH CHORDS that differ from main system
    const introSlash = allItems.filter(
      (i) =>
        i.page === 1 &&
        i.y > 100 &&
        i.y < 130 &&
        i.fontSize >= 8 &&
        i.fontSize <= 12 &&
        /^\/[A-G]/.test(i.text),
    );
    const mainSlash = allItems.filter(
      (i) =>
        i.page === 1 &&
        i.y > 130 &&
        i.y < 210 &&
        i.fontSize >= 8 &&
        i.fontSize <= 12 &&
        /^\/[A-G]/.test(i.text),
    );

    // Only proceed if intro has slash chords with DIFFERENT bass notes than main system
    const introBassNotes = new Set(introSlash.map((i) => i.text.slice(1)));
    const mainBassNotes = new Set(mainSlash.map((i) => i.text.slice(1)));
    const hasDifferentBass = [...introBassNotes].some(
      (b) => !mainBassNotes.has(b),
    );

    if (hasDifferentBass && introSlash.length >= 2) {
      const introRoots = allItems.filter(
        (i) =>
          i.page === 1 &&
          i.y > 100 &&
          i.y < 130 &&
          i.fontSize >= 9 &&
          i.fontSize <= 11 &&
          /^[A-G]$/.test(i.text),
      );
      const introQuality = allItems.filter(
        (i) =>
          i.page === 1 &&
          i.y > 100 &&
          i.y < 130 &&
          i.fontSize >= 7 &&
          i.fontSize <= 12 &&
          /^(min7?|maj7?|m7?|dim7?|aug|dom7?|7|9|11|13|sus[24]?)$/i.test(
            i.text,
          ),
      );
      const introCombined = allItems.filter(
        (i) =>
          i.page === 1 &&
          i.y > 100 &&
          i.y < 130 &&
          i.fontSize >= 9 &&
          i.fontSize <= 11 &&
          i.text.length >= 2 &&
          /^[A-G]/.test(i.text) &&
          isChordName(normalizeChord(i.text)),
      );

      for (const root of introRoots) {
        let chordName = root.text;
        let maxX = root.x + root.width;
        const quals = introQuality
          .filter(
            (q) =>
              Math.abs(q.y - root.y) <= 5 &&
              q.x >= maxX - 3 &&
              q.x <= maxX + 20,
          )
          .sort((a, b) => a.x - b.x);
        for (const q of quals) {
          chordName += q.text;
          maxX = q.x + q.width;
        }
        const slash = introSlash.find(
          (s) =>
            Math.abs(s.y - root.y) <= 5 && s.x >= maxX - 3 && s.x <= maxX + 20,
        );
        if (slash) chordName += slash.text;
        const normalized = normalizeChord(chordName);
        if (isChordName(normalized)) {
          const nearby = assembledChords.find(
            (a) =>
              a.page === 1 &&
              Math.abs(a.x - root.x) <= 10 &&
              Math.abs(a.y - root.y) <= 6,
          );
          if (!nearby)
            assembledChords.push({
              chordName: normalized,
              x: root.x,
              y: root.y,
              page: 1,
            });
        }
      }
      for (const item of introCombined) {
        const nearby = assembledChords.find(
          (a) =>
            a.page === 1 &&
            Math.abs(a.x - item.x) <= 10 &&
            Math.abs(a.y - item.y) <= 6,
        );
        if (!nearby)
          assembledChords.push({
            chordName: normalizeChord(item.text),
            x: item.x,
            y: item.y,
            page: 1,
          });
      }
    }
  }

  // ── Group chords into systems (y-bands) ──
  // Sort by page then y for grouping
  assembledChords.sort((a, b) => a.page - b.page || a.y - b.y);

  const systems = []; // Each system = one staff line group
  for (const chord of assembledChords) {
    const existing = systems.find(
      (s) => s.page === chord.page && Math.abs(s.y - chord.y) <= 6,
    );
    if (existing) {
      existing.chords.push(chord);
    } else {
      systems.push({ y: chord.y, page: chord.page, chords: [chord] });
    }
  }

  // CRITICAL: Sort each system's chords by x-position (left to right)
  // This ensures correct chord sequence regardless of y-variation within a band
  for (const system of systems) {
    system.chords.sort((a, b) => a.x - b.x);
  }

  // ── Phase 4: Assign chords to measures based on x-position ──
  const LEFT_MARGIN = 70;
  const RIGHT_MARGIN = pageWidth - 45;
  const SYSTEM_WIDTH = RIGHT_MARGIN - LEFT_MARGIN;

  /** Standard measures per system for Bass Soul Prop Book PDFs */
  const DEFAULT_MEASURES_PER_SYSTEM = 4;

  const measures = []; // { chords: [{ chordName, beat }] }

  for (const system of systems) {
    // Look up the number of bars in this system from measure numbers
    const matchingRow = barsPerSystem.find(
      (r) => r.page === system.page && Math.abs(r.y - system.y) <= 15,
    );
    const numMeasures = matchingRow?.numBars || DEFAULT_MEASURES_PER_SYSTEM;
    const numChords = system.chords.length;

    // ── Lead sheet chord assignment ──
    // In lead sheets, each chord symbol typically represents a full bar.
    // The relationship between chord count and measure count determines layout:
    //   chords == measures → 1 chord per bar (most common)
    //   chords < measures  → some chords span 2+ bars
    //   chords > measures  → some bars have multiple chords

    if (numChords === numMeasures) {
      // Perfect: 1 chord per bar, each on beat 1 with full duration
      for (const chord of system.chords) {
        measures.push({
          chords: [
            {
              chordName: applyBassCorrection(chord.chordName, slug),
              beat: 1,
              duration: 4, // Full bar
            },
          ],
        });
      }
    } else if (numChords < numMeasures) {
      // Fewer chords than measures — distribute evenly
      // Each chord gets ceil(numMeasures/numChords) bars, except the last
      const barsPerChord = Math.floor(numMeasures / Math.max(numChords, 1));
      let remaining = numMeasures;

      for (let ci = 0; ci < numChords; ci++) {
        const isLast = ci === numChords - 1;
        const bars = isLast ? remaining : Math.min(barsPerChord, remaining);
        const corrected = applyBassCorrection(
          system.chords[ci].chordName,
          slug,
        );

        // First bar has the chord on beat 1
        measures.push({
          chords: [{ chordName: corrected, beat: 1, duration: 4 }],
        });
        // Subsequent bars are sustains (repeat the chord)
        for (let b = 1; b < bars; b++) {
          measures.push({
            chords: [{ chordName: corrected, beat: 1, duration: 4 }],
          });
        }
        remaining -= bars;
      }
    } else {
      // More chords than measures — figure out which bars have 2+ chords
      // If the ratio is exactly 2:1 (e.g., 8 chords in 4 bars), pair them sequentially
      const chordsPerMeas = numChords / numMeasures;
      if (Number.isInteger(chordsPerMeas) && chordsPerMeas <= 4) {
        // Clean ratio: distribute chords evenly (2 per bar, 3 per bar, etc.)
        for (let mi = 0; mi < numMeasures; mi++) {
          const measChords = [];
          const beatsPerChord = Math.floor(4 / chordsPerMeas);
          for (let ci = 0; ci < chordsPerMeas; ci++) {
            const idx = mi * chordsPerMeas + ci;
            if (idx < numChords) {
              measChords.push({
                chordName: applyBassCorrection(
                  system.chords[idx].chordName,
                  slug,
                ),
                beat: ci * beatsPerChord + 1,
                duration:
                  ci === chordsPerMeas - 1
                    ? 4 - ci * beatsPerChord
                    : beatsPerChord,
              });
            }
          }
          if (measChords.length > 0) measures.push({ chords: measChords });
        }
        continue; // Skip the x-position fallback
      }

      // Uneven ratio — use x-position to assign chords to measures
      const chordMinX = Math.min(...system.chords.map((c) => c.x));
      const sysRight = Math.max(RIGHT_MARGIN, chordMinX + SYSTEM_WIDTH * 0.7);
      const measWidth = (sysRight - chordMinX) / numMeasures;
      const sysLeft = chordMinX;

      const systemMeasures = Array.from({ length: numMeasures }, () => ({
        chords: [],
      }));

      for (const chord of system.chords) {
        const relX = chord.x - sysLeft;
        const measureIdx = Math.min(
          Math.max(0, Math.floor(relX / measWidth)),
          numMeasures - 1,
        );
        systemMeasures[measureIdx].chords.push({
          chordName: applyBassCorrection(chord.chordName, slug),
        });
      }

      // Assign beats within multi-chord measures
      for (const meas of systemMeasures) {
        if (meas.chords.length === 0) continue;
        if (meas.chords.length === 1) {
          meas.chords[0].beat = 1;
          meas.chords[0].duration = 4;
        } else {
          // Distribute chords evenly across the bar
          const beatsPerChord = Math.floor(4 / meas.chords.length);
          for (let ci = 0; ci < meas.chords.length; ci++) {
            meas.chords[ci].beat = ci * beatsPerChord + 1;
            meas.chords[ci].duration =
              ci === meas.chords.length - 1
                ? 4 - ci * beatsPerChord
                : beatsPerChord;
          }
        }
        measures.push(meas);
      }
    }
  }

  // Compute dominant measures per row for output
  const measCountFreq = {};
  for (const r of barsPerSystem)
    measCountFreq[r.numBars] = (measCountFreq[r.numBars] || 0) + 1;
  const dominantMeasPerRow = parseInt(
    Object.entries(measCountFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || '4',
  );

  // Remove completely empty measures at the end
  while (
    measures.length > 0 &&
    measures[measures.length - 1].chords.length === 0
  ) {
    measures.pop();
  }

  // ── Detect repeat counts (Nx markers) ──
  // These appear as "3x", "4x", "5x" etc. at the right edge of a system
  const repeatCountItems = allItems.filter(
    (i) =>
      /^\d+x$/i.test(i.text) &&
      i.x > 400 &&
      i.fontSize >= 9 &&
      i.fontSize <= 14,
  );

  // ── Build system-grouped output with section marker annotations ──
  const systemGroups = [];
  let measOffset = 0;
  for (const system of systems) {
    const matchingRow = barsPerSystem.find(
      (r) => r.page === system.page && Math.abs(r.y - system.y) <= 15,
    );
    const numBars = matchingRow?.numBars || DEFAULT_MEASURES_PER_SYSTEM;

    // Find section marker at this system's position
    const marker = sectionMarkers.find(
      (m) => m.page === system.page && Math.abs(m.y - system.y) <= 15,
    );

    // Find repeat count marker for this system (Nx at right edge, same y-band)
    const repeatItem = repeatCountItems.find(
      (r) => r.page === system.page && Math.abs(r.y - system.y) <= 20,
    );
    const repeatCount = repeatItem ? parseInt(repeatItem.text) : null;

    // Collect the measures that belong to this system
    const sysMeasures = [];
    for (
      let mi = measOffset;
      mi < measures.length && sysMeasures.length < numBars;
      mi++
    ) {
      if (measures[mi].chords.length > 0) {
        sysMeasures.push(measures[mi]);
      }
      measOffset = mi + 1;
    }

    systemGroups.push({
      measures: sysMeasures,
      numBars,
      sectionLabel: marker?.label || null,
      repeatCount,
      page: system.page,
      y: system.y,
    });
  }

  // Dedupe section markers
  const uniqueSections = [];
  const seenLabels = new Set();
  for (const s of sectionMarkers) {
    if (!seenLabels.has(s.label)) {
      seenLabels.add(s.label);
      uniqueSections.push(s.label);
    }
  }

  return {
    measures,
    systemGroups,
    sectionMarkers: uniqueSections,
    metadata: { genre, tempo, keyName, timeSig },
    totalPages: doc.numPages,
    measuresPerRow: dominantMeasPerRow,
  };
}

/* ── Song File Generator ─────────────────────────────────────────────── */

async function generateSongFile(pdfPath, artistManifest) {
  const fileName = path.basename(pdfPath, '.pdf');

  // ── Phase 3: Try spatial extraction first ──
  let spatialResult = null;
  try {
    const preSlug = slugify(fileName);
    spatialResult = await extractSpatial(pdfPath, preSlug);
  } catch (err) {
    // Fall back to text-based extraction if spatial fails
    // console.warn(`  Spatial failed for ${fileName}: ${err.message}`);
  }

  if (spatialResult && spatialResult.measures.length >= 1) {
    // Use spatial extraction (better quality) — even for very short charts
    // Only fall back to text when spatial finds literally nothing
    return generateFromSpatial(pdfPath, spatialResult, artistManifest);
  }

  // ── Fallback: text-based extraction ──
  return generateFromText(pdfPath, artistManifest);
}

async function generateFromSpatial(pdfPath, spatial, artistManifest) {
  const fileName = path.basename(pdfPath, '.pdf');

  // Phase 1: Artist lookup
  const manifestEntry = lookupArtist(path.basename(pdfPath), artistManifest);
  const cleanTitle = manifestEntry
    ? manifestEntry.title
    : fileName.replace(/\s*\([^)]+\)\s*$/, '').trim();
  const artist = manifestEntry ? manifestEntry.artist : 'Unknown Artist';

  // Collect all chord names for key detection
  const allChordNames = spatial.measures
    .flatMap((m) => m.chords)
    .map((c) => c.chordName);

  // Phase 6: Key & mode detection
  const { keyName: detectedKey, mode: detectedMode } = detectKeyAndMode(
    allChordNames,
    spatial.metadata.keyName,
  );
  const keyRootPc = (() => {
    const midi = KEY_TO_MIDI[detectedKey];
    return midi != null ? (midi - 60 + 12) % 12 : 0;
  })();

  // Phase 7: Section structure
  const sectionLabels = assignSectionLabels(
    spatial.sectionMarkers.length > 0 ? spatial.sectionMarkers : ['A'],
  );

  // ── Split measures into sections using system groups ──
  // Each systemGroup has measures, numBars, and optionally a sectionLabel.
  // Group consecutive systems into sections: a section starts at a system
  // with a sectionLabel, and continues until the next section marker.
  const sections = [];
  const groups = spatial.systemGroups || [];

  // Helper to compute degree/duration for a measure
  function processMeasure(meas) {
    return {
      chords: meas.chords.map((c, i) => {
        const degree = computeDegree(c.chordName, keyRootPc, detectedMode);
        const nextBeat =
          i + 1 < meas.chords.length ? meas.chords[i + 1].beat : 5;
        const duration = Math.max(1, nextBeat - c.beat);
        return { degree, chordName: c.chordName, beat: c.beat, duration };
      }),
    };
  }

  if (groups.length > 0) {
    // Build sections from system groups
    let labelIdx = 0;
    let currentBars = [];
    let currentLabel = sectionLabels[0] || {
      id: 'section_a',
      label: 'Section A',
    };
    let currentNumBars = null;
    let currentRepeatCount = null;

    function flushSection() {
      if (currentBars.length === 0) return;
      const sec = {
        id: currentLabel.id,
        label: currentLabel.label,
        bars: currentBars,
      };
      if (currentNumBars && currentNumBars !== 4)
        sec.measuresPerRow = currentNumBars;
      if (currentRepeatCount && currentRepeatCount > 1)
        sec.repeatCount = currentRepeatCount;
      sections.push(sec);
    }

    for (const group of groups) {
      // If this group starts a new section, flush the current one
      if (group.sectionLabel && currentBars.length > 0) {
        flushSection();
        currentBars = [];
        currentRepeatCount = null;
        labelIdx++;
        currentLabel = sectionLabels[labelIdx] || {
          id: 'section_' + (labelIdx + 1),
          label: 'Section ' + String.fromCharCode(65 + labelIdx),
        };
      }

      // Add this group's measures to the current section
      for (const meas of group.measures) {
        if (meas.chords.length > 0) {
          currentBars.push(processMeasure(meas));
        }
      }
      currentNumBars = group.numBars;
      // Repeat count from this system applies to the section
      if (group.repeatCount) currentRepeatCount = group.repeatCount;
    }

    // Flush last section
    flushSection();
  } else {
    // Fallback: evenly divide measures across sections
    const measuresPerSection = Math.ceil(
      spatial.measures.length / Math.max(sectionLabels.length, 1),
    );
    let measIdx = 0;

    for (const sectionInfo of sectionLabels) {
      const bars = [];
      for (
        let j = 0;
        j < measuresPerSection && measIdx < spatial.measures.length;
        j++
      ) {
        const meas = spatial.measures[measIdx++];
        if (meas.chords.length === 0) continue;
        bars.push(processMeasure(meas));
      }
      if (bars.length > 0) {
        sections.push({ id: sectionInfo.id, label: sectionInfo.label, bars });
      }
    }
  }

  const slug = slugify(cleanTitle);
  const keyRoot = KEY_TO_MIDI[detectedKey] || 60;
  const genreTags = getGenreFromArtist(artist, spatial.metadata.genre);
  const year = estimateYear(artist);

  // Difficulty scoring
  const hasExtended = allChordNames.some((c) => /9|11|13/.test(c));
  const hasSevenths = allChordNames.some((c) => /7/.test(c));
  const hasAltered = allChordNames.some((c) =>
    /dim|aug|\+|♯5|♭5|♯9|♭9/.test(c),
  );
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
    title: cleanTitle,
    artist,
    year,
    tempo: spatial.metadata.tempo,
    key: `${detectedKey} ${detectedMode}`,
    keyRoot,
    mode: detectedMode,
    timeSig: spatial.metadata.timeSig || [4, 4],
    genreTags,
    difficulty,
    sections,
    album: '',
  };
}

async function generateFromText(pdfPath, artistManifest) {
  const fileName = path.basename(pdfPath, '.pdf');

  // Use pdfjs-dist to extract plain text (no positional data)
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await getDocument({ data }).promise;

  let allPagesText = '';
  let pageText = '';
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((i) => i.str).join(' ');
    if (p === 1) pageText = text;
    allPagesText += text + '\n';
  }

  const meta = parseMetadata(pageText);
  const allChords = extractChords(allPagesText);
  const sectionMarkers = extractSections(allPagesText);

  // Phase 1: Artist lookup from manifest
  const manifestEntry = lookupArtist(path.basename(pdfPath), artistManifest);
  const cleanTitle = manifestEntry
    ? manifestEntry.title
    : fileName.replace(/\s*\(\d+\)\s*$/, '').trim();
  const artist = manifestEntry
    ? manifestEntry.artist
    : meta.artist || 'Unknown Artist';

  // Phase 6: Key & mode detection
  const { keyName: detectedKey, mode: detectedMode } = detectKeyAndMode(
    allChords,
    meta.keyName,
  );
  const keyRootPc = (() => {
    const midi = KEY_TO_MIDI[detectedKey];
    return midi != null ? (midi - 60 + 12) % 12 : 0;
  })();

  // Phase 7: Section structure
  const sectionLabels = assignSectionLabels(
    sectionMarkers.length > 0 ? sectionMarkers : ['A'],
  );

  // Build sections from chords
  const sections = [];
  let chordIdx = 0;
  const chordsPerSection = Math.ceil(
    allChords.length / Math.max(sectionLabels.length, 1),
  );

  for (let si = 0; si < sectionLabels.length; si++) {
    const sectionInfo = sectionLabels[si];
    const sectionChords = [];

    for (let j = 0; j < chordsPerSection && chordIdx < allChords.length; j++) {
      sectionChords.push(allChords[chordIdx]);
      chordIdx++;
    }

    if (sectionChords.length === 0) continue;

    // Phase 5: Compute real degrees
    const bars = sectionChords.map((chord) => {
      const normalized = normalizeChord(chord);
      const degree = computeDegree(normalized, keyRootPc, detectedMode);
      return {
        chords: [{ degree, chordName: normalized, beat: 1, duration: 4 }],
      };
    });

    sections.push({
      id: sectionInfo.id,
      label: sectionInfo.label,
      bars,
    });
  }

  // If no chords found, create a placeholder
  if (sections.length === 0) {
    sections.push({
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: detectedKey, beat: 1, duration: 4 },
          ],
        },
      ],
    });
  }

  const slug = slugify(cleanTitle);
  const keyRoot = KEY_TO_MIDI[detectedKey] || 60;

  // Phase 8: Genre & metadata enrichment
  const genreTags = getGenreFromArtist(artist, meta.genre);
  const year = estimateYear(artist);

  // Difficulty scoring
  const hasExtended = allChords.some((c) => /9|11|13/.test(c));
  const hasSevenths = allChords.some((c) => /7/.test(c));
  const hasAltered = allChords.some((c) => /dim|aug|\+|♯5|♭5|♯9|♭9/.test(c));
  const uniqueChords = new Set(allChords.map((c) => normalizeChord(c))).size;
  const difficulty =
    hasAltered || hasExtended || uniqueChords > 12
      ? 3
      : hasSevenths || uniqueChords > 6
        ? 2
        : 1;

  return {
    slug,
    varName: slug.replace(/^(\d)/, '_$1'),
    title: cleanTitle,
    artist,
    year,
    tempo: meta.tempo,
    key: `${detectedKey} ${detectedMode}`,
    keyRoot,
    mode: detectedMode,
    genreTags,
    difficulty,
    sections,
    album: meta.album,
  };
}

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
          return `      { chords: [${chordsStr}] }`;
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
  timeSignature: [${song.timeSig?.[0] || 4}, ${song.timeSig?.[1] || 4}],

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

/* ── Phase 10: Validation ────────────────────────────────────────────── */

function validateSong(song) {
  const issues = [];
  let score = 100;

  // Check artist
  if (!song.artist || song.artist === 'Unknown Artist') {
    issues.push('missing_artist');
    score -= 15;
  }

  // Check bar count
  const totalBars = song.sections.reduce((n, s) => n + s.bars.length, 0);
  if (totalBars < 8) {
    issues.push(`low_bar_count:${totalBars}`);
    score -= 20;
  }

  // Check degrees — are they all '1 maj'?
  const allDegrees = song.sections
    .flatMap((s) => s.bars)
    .flatMap((b) => b.chords)
    .map((c) => c.degree);
  const uniqueDegrees = new Set(allDegrees);
  if (uniqueDegrees.size === 1 && uniqueDegrees.has('1 maj')) {
    issues.push('all_degrees_same');
    score -= 15;
  }

  // Check for invalid characters in chordName (# instead of ♯)
  const allChordNames = song.sections
    .flatMap((s) => s.bars)
    .flatMap((b) => b.chords)
    .map((c) => c.chordName);
  if (allChordNames.some((n) => /#/.test(n))) {
    issues.push('ascii_sharp_in_chordName');
    score -= 5;
  }

  // Check tempo range
  if (song.tempo < 40 || song.tempo > 220) {
    issues.push(`suspicious_tempo:${song.tempo}`);
    score -= 10;
  }

  // Check key consistency — do chords fit the key?
  const keyRootPc = (() => {
    const midi = KEY_TO_MIDI[song.key.split(' ')[0]];
    return midi != null ? (midi - 60 + 12) % 12 : 0;
  })();
  const mode = song.mode || 'major';
  let fitsKey = 0;
  const diatonic =
    mode === 'minor' ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];

  for (const name of allChordNames) {
    const pc = chordRootMidi(name);
    if (pc == null) continue;
    const interval = (pc - keyRootPc + 12) % 12;
    if (diatonic.includes(interval)) fitsKey++;
  }
  const fitRatio =
    allChordNames.length > 0 ? fitsKey / allChordNames.length : 0;
  if (fitRatio < 0.5 && allChordNames.length > 4) {
    issues.push(`low_key_fit:${Math.round(fitRatio * 100)}%`);
    score -= 10;
  }

  // Check section labels
  const hasSemanticLabels = song.sections.some((s) =>
    /verse|chorus|bridge|intro|outro/i.test(s.label),
  );
  if (!hasSemanticLabels) {
    issues.push('generic_section_labels');
    score -= 5;
  }

  return { score: Math.max(0, score), issues };
}

/* ── Main ────────────────────────────────────────────────────────────── */

async function main() {
  // ── Load artist manifest (Phase 1) ──
  const artistManifest = loadArtistManifest();

  const files = fs
    .readdirSync(PDF_DIR)
    .filter((f) => f.endsWith('.pdf'))
    .sort();

  // Filter by --only flag
  const filteredFiles = FLAG_ONLY
    ? files.filter((f) => slugify(f.replace(/\.pdf$/i, '')) === FLAG_ONLY)
    : files;

  console.log(`Found ${filteredFiles.length} PDFs to process`);

  const results = [];
  const failures = [];
  const validationResults = [];
  let processed = 0;

  for (const file of filteredFiles) {
    const pdfPath = path.join(PDF_DIR, file);
    try {
      const song = await generateSongFile(pdfPath, artistManifest);

      // Skip protected songs (hand-edited)
      if (PROTECTED_SLUGS.has(song.slug)) {
        console.log(`  SKIP: ${file} (protected — hand-edited)`);
        processed++;
        continue;
      }

      // Phase 10: Validate
      const validation = validateSong(song);
      validationResults.push({ slug: song.slug, ...validation });

      if (FLAG_VALIDATE) {
        processed++;
        results.push(song);
        continue;
      }

      if (FLAG_DIFF) {
        const outPath = path.join(OUT_DIR, `${song.slug}.ts`);
        const existing = fs.existsSync(outPath)
          ? fs.readFileSync(outPath, 'utf-8')
          : '';
        const newContent = songToTypeScript(song);
        if (existing !== newContent) {
          console.log(
            `  CHANGED: ${song.slug} (artist: ${song.artist}, score: ${validation.score})`,
          );
        }
        processed++;
        results.push(song);
        continue;
      }

      const tsContent = songToTypeScript(song);
      const outPath = path.join(OUT_DIR, `${song.slug}.ts`);
      fs.writeFileSync(outPath, tsContent);
      results.push(song);
      processed++;

      if (processed % 50 === 0) {
        console.log(`  Processed ${processed}/${filteredFiles.length}...`);
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

  // ── Phase 10: Quality Report ──
  if (validationResults.length > 0) {
    const avgScore = Math.round(
      validationResults.reduce((sum, v) => sum + v.score, 0) /
        validationResults.length,
    );
    const passing = validationResults.filter((v) => v.score >= 70).length;
    const withArtist = results.filter(
      (s) => s.artist !== 'Unknown Artist',
    ).length;

    console.log(`\n── Quality Report ──`);
    console.log(`  Average score: ${avgScore}/100`);
    console.log(
      `  Passing (≥70): ${passing}/${validationResults.length} (${Math.round((passing / validationResults.length) * 100)}%)`,
    );
    console.log(
      `  With artist: ${withArtist}/${results.length} (${Math.round((withArtist / results.length) * 100)}%)`,
    );

    // Show worst 10
    const worst = [...validationResults]
      .sort((a, b) => a.score - b.score)
      .slice(0, 10);
    console.log(`\n  Lowest scoring:`);
    for (const w of worst) {
      console.log(`    ${w.slug}: ${w.score} — ${w.issues.join(', ')}`);
    }

    // Write quality report JSON
    const reportPath = path.join(OUT_DIR, '_quality_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(validationResults, null, 2));
    console.log(`\n  Report written: ${reportPath}`);
  }

  // Generate index imports (skip in validate/diff mode)
  if (!FLAG_VALIDATE && !FLAG_DIFF) {
    const indexImports = results
      .map((s) => `import { ${s.varName} } from './${s.slug}';`)
      .join('\n');

    const indexEntries = results
      .map((s) => `  '${s.slug}': ${s.varName},`)
      .join('\n');

    const indexPath = path.join(OUT_DIR, '_generated_index.ts');
    fs.writeFileSync(
      indexPath,
      `// Auto-generated song imports — paste into index.ts\n\n${indexImports}\n\n// Add to SONGS record:\n// {\n${indexEntries}\n// }\n`,
    );

    console.log(`\nGenerated index file: ${indexPath}`);
  }
}

main().catch(console.error);
