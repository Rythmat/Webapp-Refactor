import {
  ALL_MODES,
  MODES,
  NOTES,
  getModeOffset,
  ionianToModeLabel,
  noteNameInKey,
} from '@prism/engine';
import { noteNameToPitchClass } from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import { formatQuality } from '@/daw/components/Library/insightConstants';
import { chordToneNames } from '@/daw/prism-engine/data/notes';
import { resolveDegreeKey } from '@/daw/prism-engine/engine/naming';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import {
  baseQuality,
  isMinorQuality,
  jazzSuffix,
  normalizeQuality,
  qualityIntervals,
} from './qualities';
import type { ChordNotation } from './types';

// ── One chord, three notations ─────────────────────────────────────────────
// Every chord symbol the app shows can be written three ways (ChordNotation).
// Call sites describe the chord with whatever they have — a degree, a spelled
// root, a quality in any spelling, a bass — plus the key, and formatChord writes
// it. Where the notation needs something the site doesn't have (Roman needs a
// degree, so a key; jazz needs a root letter), it falls back to hybrid.

/** A chord, described with whatever the call site has. */
export interface ChordSpec {
  /** Quality in any spelling the app uses: "minor7", "min7(♭5)", "m7", "Δ7", "ø7". */
  quality: string;
  /** Root as a spelled letter ("Bb", "F♯") or a pitch class (0–11). */
  root?: string | number;
  /**
   * Scale degree of the root counted from the major scale of the key's TONIC,
   * as every degree label shown in the app is written: "1 min7" is the tonic
   * chord in A minor, "♭3 maj" its C major. A whole label is fine — only the
   * degree is read. parseChord fills this for degree-style labels.
   */
  tonicDegree?: string;
  /**
   * Scale degree of the root counted from the major scale of the key's PARENT,
   * as the engine's degree keys (Prism's stringSeq) are written: in A aeolian
   * "1 major" is C major. Ignored when `tonicDegree` is given.
   */
  degree?: string;
  /**
   * Slash bass: a letter ("F#"), a pitch class, or a degree — counted from the
   * parent when the chord is given by `degree`, else from the tonic.
   */
  bass?: string | number;
}

export interface ChordContext {
  /** Tonic pitch class of the key (the app's rootNote); null/undefined when unknown. */
  keyRootPc?: number | null;
  /** Mode (ALL_MODES key); defaults to "ionian". */
  mode?: string | null;
}

export interface FormatChordOptions {
  /**
   * Hybrid notation only: name the root by letter ("D min7") or by scale degree
   * ("2 min7"). Default: the degree when it's known, else the letter.
   */
  hybridRoot?: 'letter' | 'degree';
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;
const IONIAN = MODES.ionian;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const DEGREE = /^([b#♭♯]?)([1-7])$/;
const LETTER = /^[A-G](?:bb|##|b|#|♭|♯)?$/;

const ascii = (s: string) => s.replace(/♭/g, 'b').replace(/♯/g, '#');

/** "♭7" → "b7"; null when it isn't a degree. */
function parseDegree(text: string): string | null {
  const m = DEGREE.exec(ascii(text.trim()));
  return m ? `${m[1]}${m[2]}` : null;
}

function degreePc(degree: string, parentPc: number): number {
  const accidental = degree.startsWith('b')
    ? -1
    : degree.startsWith('#')
      ? 1
      : 0;
  return mod12(
    parentPc + IONIAN[Number(degree.replace(/^[b#]/, '')) - 1] + accidental,
  );
}

/** A parent-major-scale degree as a degree of the mode ("1" in C → "b3" in A aeolian). */
const modeDegree = (degree: string, mode: string) =>
  ionianToModeLabel(`${degree} major`, mode).split(' ')[0];

const LETTERS = 'CDEFGAB';

/**
 * A spelled note's degree counted from the tonic's major scale, read from the
 * letters: B in F is "#4" (not "b5"), C♭ in A♭ is "b3". Null when it would
 * need a double accidental.
 */
function spelledTonicDegree(
  name: string,
  keyPc: number,
  mode: string,
): string | null {
  const pc = noteNameToPitchClass(name);
  if (pc === null) return null;
  const tonic = noteNameInKey(keyPc, keyPc, mode);
  const steps =
    (((LETTERS.indexOf(name[0]) - LETTERS.indexOf(tonic[0])) % 7) + 7) % 7;
  let accidental = mod12(pc - (keyPc + IONIAN[steps]));
  if (accidental > 6) accidental -= 12;
  if (Math.abs(accidental) > 1) return null;
  return `${accidental === -1 ? 'b' : accidental === 1 ? '#' : ''}${steps + 1}`;
}

interface ResolvedChord {
  quality: string;
  base: string;
  /** The quality already names its bass (an engine slash quality, "major/5"). */
  qualityHasBass: boolean;
  rootName?: string;
  degree?: string;
  bassName?: string;
  bassDegree?: string;
}

function resolveChord(spec: ChordSpec, context: ChordContext): ResolvedChord {
  const quality = normalizeQuality(spec.quality);
  const base = baseQuality(quality);
  const qualityHasBass = base !== quality;
  const keyPc = context.keyRootPc ?? null;
  const mode = context.mode || 'ionian';
  const parentPc = keyPc === null ? null : mod12(keyPc - getModeOffset(mode));

  // Root
  let rootPc: number | null = null;
  let rootName: string | undefined;
  if (typeof spec.root === 'number') {
    rootPc = mod12(spec.root);
  } else if (typeof spec.root === 'string' && LETTER.test(spec.root.trim())) {
    rootName = ascii(spec.root.trim());
    rootPc = noteNameToPitchClass(rootName);
  }
  const tonicDegree = spec.tonicDegree
    ? parseDegree(spec.tonicDegree.split(' ')[0])
    : null;
  const degree =
    !tonicDegree && spec.degree ? parseDegree(spec.degree.split(' ')[0]) : null;
  if (rootPc === null && tonicDegree && keyPc !== null) {
    rootPc = degreePc(tonicDegree, keyPc);
  }
  if (rootPc === null && degree && parentPc !== null) {
    rootPc = degreePc(degree, parentPc);
  }
  if (!rootName && rootPc !== null) {
    rootName =
      keyPc === null ? NOTES[rootPc] : noteNameInKey(rootPc, keyPc, mode);
  }

  // Degree, relative to the mode
  let resolvedDegree: string | undefined;
  if (tonicDegree) {
    resolvedDegree = tonicDegree;
  } else if (degree) {
    resolvedDegree = modeDegree(degree, mode);
  } else if (rootName && keyPc !== null) {
    resolvedDegree = spelledTonicDegree(rootName, keyPc, mode) ?? undefined;
  }
  if (!resolvedDegree && !tonicDegree && !degree && rootPc !== null) {
    const key =
      parentPc === null ? null : resolveDegreeKey(rootPc, base, parentPc);
    if (key) resolvedDegree = modeDegree(key.split(' ')[0], mode);
  }

  // Bass
  let bassPc: number | null = null;
  let bassName: string | undefined;
  let bassDegreeText: string | null = null;
  // A degree bass counts from the same scale as the chord's own degree.
  const bassFromParent = degree !== null;
  const bassScalePc = bassFromParent ? parentPc : keyPc;
  if (typeof spec.bass === 'number') {
    bassPc = mod12(spec.bass);
  } else if (typeof spec.bass === 'string' && spec.bass.trim()) {
    const text = spec.bass.trim();
    bassDegreeText = parseDegree(text);
    if (bassDegreeText) {
      if (bassScalePc !== null) bassPc = degreePc(bassDegreeText, bassScalePc);
    } else if (LETTER.test(text)) {
      bassName = ascii(text);
      bassPc = noteNameToPitchClass(bassName);
    }
  } else if (qualityHasBass && rootPc !== null) {
    const lowest = Math.min(...(qualityIntervals(quality) ?? [0]));
    if (lowest < 0) bassPc = mod12(rootPc + lowest);
  }
  if (bassPc !== null && !bassName) {
    const intervals = qualityIntervals(base);
    const chordTone =
      rootName && intervals
        ? chordToneNames(rootName, intervals).get(bassPc)
        : undefined;
    bassName =
      chordTone ??
      (keyPc === null ? NOTES[bassPc] : noteNameInKey(bassPc, keyPc, mode));
  }
  let bassDegree: string | undefined;
  if (bassDegreeText) {
    bassDegree = bassFromParent
      ? modeDegree(bassDegreeText, mode)
      : bassDegreeText;
  } else if (bassName && keyPc !== null) {
    bassDegree = spelledTonicDegree(bassName, keyPc, mode) ?? undefined;
  }
  if (!bassDegree && !bassDegreeText && bassPc !== null && parentPc !== null) {
    const key = resolveDegreeKey(bassPc, 'major', parentPc);
    if (key) bassDegree = modeDegree(key.split(' ')[0], mode);
  }

  return {
    quality,
    base,
    qualityHasBass,
    rootName,
    degree: resolvedDegree,
    bassName,
    bassDegree,
  };
}

const hybridDegree = (degree: string) => degree.replace(/^b/, '♭');
const symbolDegree = (degree: string) =>
  degree.replace(/^b/, '♭').replace(/^#/, '♯');

function romanDegree(degree: string, lowerCase: boolean): string {
  const accidental = /^[b#]/.exec(degree)?.[0] ?? '';
  const numeral = ROMAN[Number(degree.slice(accidental.length)) - 1];
  return `${symbolDegree(accidental)}${lowerCase ? numeral.toLowerCase() : numeral}`;
}

function formatHybrid(
  chord: ResolvedChord,
  options: FormatChordOptions,
): string {
  const wantLetter =
    options.hybridRoot === 'letter' ||
    (options.hybridRoot === undefined && !chord.degree);
  const useLetter = wantLetter
    ? !!chord.rootName
    : !chord.degree && !!chord.rootName;
  const root = useLetter
    ? displayAccidentals(chord.rootName!)
    : chord.degree && hybridDegree(chord.degree);
  let bass = '';
  if (!chord.qualityHasBass) {
    if (useLetter && chord.bassName)
      bass = `/${displayAccidentals(chord.bassName)}`;
    else if (!useLetter && chord.bassDegree)
      bass = `/${hybridDegree(chord.bassDegree)}`;
  }
  const quality = formatQuality(chord.quality);
  return root ? `${root} ${quality}${bass}` : `${quality}${bass}`;
}

/** Write a chord in a notation. Missing pieces fall back to hybrid. */
export function formatChord(
  spec: ChordSpec,
  notation: ChordNotation,
  context: ChordContext = {},
  options: FormatChordOptions = {},
): string {
  const chord = resolveChord(spec, context);
  const suffix = jazzSuffix(chord.base);

  if (notation === 'jazz' && chord.rootName && suffix !== undefined) {
    const bass = chord.bassName ? `/${displayAccidentals(chord.bassName)}` : '';
    return `${displayAccidentals(chord.rootName)}${suffix}${bass}`;
  }

  if (notation === 'roman' && chord.degree && suffix !== undefined) {
    const lowerCase = isMinorQuality(chord.base);
    const bass = chord.bassDegree ? `/${symbolDegree(chord.bassDegree)}` : '';
    const romanSuffix = lowerCase ? suffix.replace(/^−/, '') : suffix;
    return `${romanDegree(chord.degree, lowerCase)}${romanSuffix}${bass}`;
  }

  return formatHybrid(chord, options);
}

// ── Chord labels ────────────────────────────────────────────────────────────

const DEGREE_LABEL = /^([b#♭♯]?[1-7])\s+(.+)$/;
const LETTER_LABEL = /^([A-G](?:bb|##|b|#|♭|♯)?)\s*(.*)$/;

/**
 * Split a trailing "/bass" off a quality. A degree-rooted label keeps an engine
 * slash quality ("maj/5"); a letter-rooted label reads "/1" as a bass degree.
 * "6/9" is never a bass.
 */
function splitBass(
  rest: string,
  keepEngineSlash: boolean,
): { quality: string; bass?: string } {
  const slash = rest.lastIndexOf('/');
  if (slash < 0) return { quality: rest };
  if (
    keepEngineSlash &&
    baseQuality(normalizeQuality(rest)) !== normalizeQuality(rest)
  ) {
    return { quality: rest };
  }
  const bass = rest.slice(slash + 1).trim();
  if (!parseDegree(bass) && !LETTER.test(bass)) return { quality: rest };
  return { quality: rest.slice(0, slash).trim(), bass };
}

/**
 * Read a chord label the app writes: hybrid degree labels ("2 min7", "♭7 maj/1",
 * counted from the key's tonic — see ChordSpec.tonicDegree) or letter names
 * ("D min7", "Dm7", "Bb/D", "C# Minor"). Null when the text isn't a chord.
 */
export function parseChord(label: string): ChordSpec | null {
  const text = label.trim();
  const byDegree = DEGREE_LABEL.exec(text);
  if (byDegree) {
    return {
      tonicDegree: parseDegree(byDegree[1])!,
      ...splitBass(byDegree[2], true),
    };
  }
  const byLetter = LETTER_LABEL.exec(text);
  if (byLetter) return { root: byLetter[1], ...splitBass(byLetter[2], false) };
  return null;
}

/**
 * Rewrite an existing chord label in a notation. In hybrid notation the label
 * comes back exactly as given, so a call site's current text never changes.
 */
export function formatChordLabel(
  label: string,
  notation: ChordNotation,
  context: ChordContext = {},
  options: FormatChordOptions = {},
): string {
  if (notation === 'hybrid') return label;
  const spec = parseChord(label);
  if (!spec) return label;
  const written = formatChord(spec, notation, context, options);
  // A chord the notation can't write (formatChord answers in hybrid) keeps its label.
  return written === formatChord(spec, 'hybrid', context, options)
    ? label
    : written;
}

/**
 * Rewrite a progression string — chord labels joined by " - ", " – " or " → " —
 * in a notation, keeping the separators. Hybrid returns it unchanged.
 */
export function formatProgression(
  progression: string,
  notation: ChordNotation,
  context: ChordContext = {},
  options: FormatChordOptions = {},
): string {
  if (notation === 'hybrid') return progression;
  return progression
    .split(/(\s+[-–—→|]\s+)/)
    .map((part, i) =>
      i % 2 === 1 ? part : formatChordLabel(part, notation, context, options),
    )
    .join('');
}

// ── Secondary dominants ─────────────────────────────────────────────────────

/**
 * Rewrite a secondary-dominant label ("5 of 2", or "7 of 6" for a leading-tone
 * chord) in a notation: Roman "V/ii", "vii°/vi"; jazz names the target chord,
 * "5 of D−". Other text comes back unchanged.
 */
export function formatSecondaryLabel(
  label: string,
  notation: ChordNotation,
  context: ChordContext = {},
): string {
  const match = /^([57]) of ([1-7])$/.exec(label.trim());
  if (!match || notation === 'hybrid') return label;
  const [, source, target] = match;
  const mode = context.mode || 'ionian';
  const scale = ALL_MODES[mode] ?? IONIAN;
  if (scale.length !== 7) return label;

  const index = Number(target) - 1;
  const third = mod12(scale[(index + 2) % 7] - scale[index]);
  const fifth = mod12(scale[(index + 4) % 7] - scale[index]);
  const minor = third === 3;
  const diminished = minor && fifth === 6;

  if (notation === 'roman') {
    const numeral = minor ? ROMAN[index].toLowerCase() : ROMAN[index];
    return `${source === '5' ? 'V' : 'vii°'}/${numeral}${diminished ? '°' : ''}`;
  }
  if (context.keyRootPc === null || context.keyRootPc === undefined)
    return label;
  const targetPc = mod12(context.keyRootPc + scale[index]);
  const name = displayAccidentals(
    noteNameInKey(targetPc, context.keyRootPc, mode),
  );
  return `${source} of ${name}${diminished ? '°' : minor ? '−' : ''}`;
}
