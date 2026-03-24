import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';
import type { MidiClip, Track } from './tracksSlice';
import { guessTrackRole } from '@/daw/utils/trackRole';
import {
  DEFAULT_EFFECTS,
  type EffectSlotType,
} from '@/daw/audio/EffectChain';
import { GROOVES, type GrooveItem } from '@/daw/data/groovesLibrary';
import { importMidiFile } from '@/daw/midi/MidiFileIO';
import { TRACK_PALETTES } from '@/daw/constants/trackColors';
import {
  StrumMode,
  VelocityTilt,
  InstrumentChannel,
  type MidiNoteEvent,
  type SuggestionChord,
  getFirstChords,
  getOptions,
  graphToken,
  degreeMidi,
  unstepChord,
  generateChord,
  normalizeSequence,
  chordName,
  abbreviateSequence,
  GENRE_MAP,
  GENRE_SWING,
  GENRE_STRUM,
  getChordColorFromNotes,
  getChordColor,
  KEY_COLORS,
  ALL_MODES,
  noteNameInKey,
  detectChordWithInversion,
  noteNameLetter,
  getModeOffset,
  ionianToModeLabel,
  resolveDegreeKey,
  orchestrate,
} from '@prism/engine';

// ── Types ────────────────────────────────────────────────────────────────

let _chordIdCounter = 0;
/** Generate a stable unique ID for a ChordRegion. */
export function nextChordId(): string {
  return `cr-${++_chordIdCounter}`;
}

export type ChordRecordMode = 'replace' | 'locked' | 'merge';

export interface ChordRegion {
  id: string;
  startTick: number;
  endTick: number;
  rawStartTick?: number; // un-snapped actual chord hit time (for MIDI note coloring)
  name: string;
  noteName: string;
  color: [number, number, number];
  degreeKey?: string;
  midis?: number[]; // MIDI pitches used for merge-mode recalculation
  confidence?: number; // 0-1 chord confidence score (Phase 9)
}

export interface PrismSlice {
  // Chord progression
  chordSeq: number[][];
  stringSeq: string[];
  rootNote: number | null; // 0-11 (C=0), null = none

  // Rhythm & genre
  rhythmName: string;
  genre: string;
  swing: number;

  // Strum & tilt
  strumMode: StrumMode;
  strumAmount: number;
  tiltMode: VelocityTilt;
  tiltAmount: number;

  // Mode
  mode: string;

  // Derived / UI
  availableFirstChords: string[];
  availableNextChords: string[];
  chordRegions: ChordRegion[];
  filterPercent: number;
  selectedTrackId: string | null;
  rootTrackColor: string | null;
  rootLocked: boolean;
  chordRulerShowNotes: boolean;
  chordRecordMode: ChordRecordMode;
  /** Region IDs the user has marked as melody (excluded from lead sheet display) */
  melodyOverrides: string[];

  // Actions — parameters
  setRootNote: (root: number | null) => void;
  toggleRootLock: () => void;
  setMode: (mode: string) => void;
  setRhythm: (name: string) => void;
  selectGenre: (genre: string) => void;
  setSwing: (swing: number) => void;
  setStrumMode: (mode: StrumMode) => void;
  setStrumAmount: (amount: number) => void;
  setTiltMode: (mode: VelocityTilt) => void;
  setTiltAmount: (amount: number) => void;
  setFilterPercent: (percent: number) => void;

  toggleChordRulerLabels: () => void;
  setChordRecordMode: (mode: ChordRecordMode) => void;

  // Actions — chord building
  addChord: (chordName: string) => void;
  undoChord: () => void;
  clearSequence: () => void;

  // Actions — generation
  generateToTracks: () => void;
  loadProgression: (chords: SuggestionChord[]) => void;
  generateOrchestration: () => Promise<void>;

  // Actions — track selection
  setSelectedTrackId: (id: string | null) => void;

  // Actions — chord regions
  setChordRegions: (regions: ChordRegion[], force?: boolean) => void;
  offsetChordRegions: (deltaTicks: number) => void;
  refineWithMelody: (
    melodyTrackId: string,
    pitchRange: { low: number; high: number },
  ) => void;

  // Actions — lead sheet chord editing
  insertChordRegion: (
    tick: number,
    name: string,
    noteName: string,
    color?: [number, number, number],
  ) => void;
  deleteChordRegion: (id: string) => void;
  renameChordRegion: (id: string, newName: string, newNoteName: string) => void;
  resizeChordRegion: (id: string, newEndTick: number) => void;
  moveChordRegion: (id: string, newStartTick: number) => void;
  insertMeasure: (measureIdx: number) => void;
  deleteMeasure: (measureIdx: number) => void;

  // Actions — melody overrides (Phase 10)
  markAsMelody: (regionId: string) => void;
  unmarkAsMelody: (regionId: string) => void;
  clearMelodyOverrides: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────

// Maps chromatic root (0-11) to KEY_COLORS index (circle of fifths)
const ROOT_TO_KEY_INDEX = [1, 8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6];

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Scale-degree order for each mode family (used for parent root offset) */
const FAMILY_DEGREE_ORDER: Record<string, string[]> = {
  Diatonic: [
    'ionian',
    'dorian',
    'phrygian',
    'lydian',
    'mixolydian',
    'aeolian',
    'locrian',
  ],
  'Harmonic Minor': [
    'harmonicMinor',
    'locrianNat6',
    'ionianSharp5',
    'dorianSharp4',
    'phrygianDominant',
    'lydianSharp2',
    'alteredDiminished',
  ],
  'Melodic Minor': [
    'melodicMinor',
    'dorianFlat2',
    'lydianAugmented',
    'lydianDominant',
    'mixolydianFlat6',
    'locrianNat2',
    'altered',
  ],
  'Harmonic Major': [
    'harmonicMajor',
    'dorianFlat5',
    'alteredDominantNat5',
    'melodicMinorSharp4',
    'mixolydianFlat2',
    'lydianAugmentedSharp2',
    'locrianDoubleFlat7',
  ],
  'Double Harmonic': [
    'doubleHarmonicMajor',
    'lydianSharp2Sharp6',
    'ultraphrygian',
    'doubleHarmonicMinor',
    'oriental',
    'ionianSharp2Sharp5',
    'locrianDoubleFlat3DoubleFlat7',
  ],
};

const FAMILY_FIXED_COLOR: Record<string, number> = {
  'Melodic Minor': 13,
  'Harmonic Minor': 14,
  'Harmonic Major': 15,
  'Double Harmonic': 16,
};

/** Compute track color hex from rootNote + mode (parent key center logic) */
function getModeTrackColor(rootNote: number, mode: string): string {
  for (const [family, modes] of Object.entries(FAMILY_DEGREE_ORDER)) {
    const pos = modes.indexOf(mode);
    if (pos === -1) continue;

    const fixedIdx = FAMILY_FIXED_COLOR[family];
    if (fixedIdx != null) {
      const [r, g, b] = KEY_COLORS[fixedIdx];
      return rgbToHex(r, g, b);
    }
    const offset = ALL_MODES.ionian[pos];
    const parentRoot = (rootNote - offset + 12) % 12;
    const [r, g, b] = KEY_COLORS[ROOT_TO_KEY_INDEX[parentRoot]];
    return rgbToHex(r, g, b);
  }
  const [r, g, b] = KEY_COLORS[ROOT_TO_KEY_INDEX[rootNote]];
  return rgbToHex(r, g, b);
}

/** Reverse lookup: note letter (with accidental) → pitch class */
const NOTE_LETTER_TO_PC: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
};

/** Un-abbreviate quality from abbreviated noteName form back to long form */
const UNABBREV: Record<string, string> = {
  maj: 'major',
  min: 'minor',
  dim: 'diminished',
  aug: 'augmented',
  dom: 'dominant',
  maj7: 'major7',
  min7: 'minor7',
  dom7: 'dominant7',
  dim7: 'diminished7',
  dom9: 'dominant9',
  maj9: 'major9',
  min9: 'minor9',
  'min7(b5)': 'minor7b5',
  'min(maj7)': 'minormajor7',
  'maj7(#5)': 'major7#5',
  'dom7(b5)': 'dominant7b5',
  'dom7(#5)': 'dominant7#5',
  'dom7(b9)': 'dominant7b9',
  'dom7(#11)': 'dominant7#11',
  'maj7(#11)': 'major7#11',
  min6: 'minor6',
  maj6: 'major6',
  dom7sus4: 'dominant7sus4',
  dom7sus2: 'dominant7sus2',
  maj7sus4: 'major7sus4',
  maj7sus2: 'major7sus2',
};

/**
 * Parse an abbreviated noteName like "Ab maj" or "F# dom7" into rootPc + long quality.
 * Returns null if unparseable.
 */
function parseNoteNameChord(
  noteName: string,
): { rootPc: number; quality: string } | null {
  const spaceIdx = noteName.indexOf(' ');
  if (spaceIdx < 1) return null;
  const letter = noteName.slice(0, spaceIdx);
  const abbrevQuality = noteName.slice(spaceIdx + 1);
  const pc = NOTE_LETTER_TO_PC[letter];
  if (pc === undefined) return null;
  const quality = UNABBREV[abbrevQuality] ?? abbrevQuality;
  return { rootPc: pc, quality };
}

/**
 * Re-derive degreeKey, name, noteName, and color for all chord regions
 * when the key (rootNote/mode) changes.
 */
function rederiveChordRegions(
  regions: ChordRegion[],
  rootMidi: number,
  mode: string,
): ChordRegion[] {
  const keyPc = rootMidi % 12;
  return regions.map((r) => {
    const parsed = parseNoteNameChord(r.noteName);
    if (!parsed) {
      // Can't parse — just recolor if we have a degreeKey
      if (!r.degreeKey) return r;
      return { ...r, color: getChordColor(r.degreeKey, rootMidi, mode) };
    }

    // Re-derive degree relative to new key
    const newDegreeKey = resolveDegreeKey(parsed.rootPc, parsed.quality, keyPc);

    // Rebuild noteName with new key's enharmonic spelling
    const newNoteName = abbreviateSequence(
      `${noteNameInKey(parsed.rootPc, keyPc)} ${parsed.quality}`,
    );

    const newName = newDegreeKey ? abbreviateSequence(newDegreeKey) : r.name;

    return {
      ...r,
      degreeKey: newDegreeKey,
      name: newName,
      noteName: newNoteName,
      color: newDegreeKey
        ? getChordColor(newDegreeKey, rootMidi, mode)
        : r.color,
    };
  });
}

/** Map STUDIO_GENRES to GENRE_MAP genre names for rhythm lookup */
const GENRE_RHYTHM_ALIAS: Record<string, string[]> = {
  'Rock': ['Rock'],
  'Folk': ['Folk'],
  'EDM': ['Electronic', 'Pop'],
  'R&B': ['R&B', 'Neo Soul'],
  'Hip Hop': ['Hip Hop'],
  'Reggae': ['Reggae'],
  'Indie': ['Pop', 'Rock'],
  'Latin': ['Salsa', 'Bossa', 'Samba'],
};

/** Extra weight for certain rhythms (added N extra times to the pool) */
const RHYTHM_WEIGHT: Record<string, number> = {
  'Whole Notes': 4,
};

function findRandomRhythmForGenre(genre: string): string | undefined {
  // Collect all rhythms matching this genre or its aliases
  const targets = GENRE_RHYTHM_ALIAS[genre] ?? [genre];
  const pool: string[] = [];
  for (const [rhythm, g] of Object.entries(GENRE_MAP)) {
    if (targets.includes(g)) pool.push(rhythm);
  }
  if (pool.length === 0) return undefined;
  // Always include Whole Notes as a weighted option for any genre
  const extra = RHYTHM_WEIGHT['Whole Notes'] ?? 0;
  for (let i = 0; i < extra; i++) pool.push('Whole Notes');
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Map STUDIO_GENRES to groove genre names for matching */
const GENRE_GROOVE_ALIAS: Record<string, string[]> = {
  'Pop': ['Pop'],
  'Rock': ['Rock', 'Punk'],
  'Jazz': ['Jazz', 'Neo Soul'],
  'Funk': ['Funk'],
  'Folk': ['Rock', 'Indie'],
  'EDM': ['House'],
  'Hip Hop': ['Hip Hop', 'Trap'],
  'R&B': ['R&B', 'Neo Soul'],
  'Reggae': ['Latin'],
  'Latin': ['Latin'],
  'Indie': ['Indie', 'Rock'],
};

/** Find a matching groove by genre and closest BPM */
function findGrooveForGenreBpm(genre: string, bpm: number): GrooveItem | null {
  const targets = GENRE_GROOVE_ALIAS[genre] ?? [genre];
  const matches = GROOVES.filter((g) => targets.includes(g.genre));
  if (matches.length === 0) return null;

  // Sort by BPM proximity, then pick randomly among the closest tier
  const sorted = [...matches].sort(
    (a, b) => Math.abs(a.bpm - bpm) - Math.abs(b.bpm - bpm),
  );
  const closestDist = Math.abs(sorted[0].bpm - bpm);
  const closestTier = sorted.filter(
    (g) => Math.abs(g.bpm - bpm) === closestDist,
  );
  return closestTier[Math.floor(Math.random() * closestTier.length)];
}

const OUR_PPQ = 480;

/** Fetch a groove MIDI file and return normalized events, or null on failure */
async function fetchGrooveEvents(
  groove: GrooveItem,
): Promise<MidiNoteEvent[] | null> {
  try {
    const resp = await fetch(groove.url);
    if (!resp.ok) return null;
    const buf = await resp.arrayBuffer();
    const sequences = importMidiFile(buf);
    if (sequences.length === 0) return null;

    const seq = sequences[0];
    const ppq = seq.ticksPerQuarterNote;
    return seq.events.map((evt) => ({
      ...evt,
      startTick: Math.round((evt.startTick / ppq) * OUR_PPQ),
      durationTicks: Math.round((evt.durationTicks / ppq) * OUR_PPQ),
    }));
  } catch {
    return null;
  }
}

function computeNextChords(
  stringSeq: string[],
  filterPercent: number,
): string[] {
  if (stringSeq.length === 0) return [];
  const token = graphToken(stringSeq);
  return getOptions(filterPercent, token);
}

function degreeNameToChord(
  chordName: string,
  rootMidi: number,
  mode: string = 'ionian',
): number[] {
  const parentRoot = rootMidi - getModeOffset(mode);
  const bassMidi = degreeMidi(parentRoot, chordName);
  const quality = unstepChord(chordName);
  return generateChord(bassMidi, quality);
}

/** Compute note-letter chord name from a degree-qualified name, e.g. "1 major" → "C maj" */
function degreeToNoteName(
  degreeName: string,
  rootMidi: number,
  mode: string = 'ionian',
): string {
  const parentRoot = rootMidi - getModeOffset(mode);
  const midi = degreeMidi(parentRoot, degreeName);
  const rootPc = rootMidi % 12; // user's root for enharmonic spelling
  const letter = noteNameInKey(midi % 12, rootPc);
  const quality = unstepChord(degreeName);
  return abbreviateSequence(`${letter} ${quality}`);
}

/** Snap a tick to the nearest quarter note (480 ticks). */
const SNAP_PPQ = 480;
function snapToQuarter(tick: number): number {
  return Math.round(tick / SNAP_PPQ) * SNAP_PPQ;
}

/** Derive chord regions from actual MIDI events (post-hoc from worker output). */
function deriveChordRegions(
  events: MidiNoteEvent[],
  rootMidi: number,
  stringSeq: string[],
  mode: string = 'ionian',
): ChordRegion[] {
  if (events.length === 0) return [];

  // Collapse consecutive duplicate chord names so region indices align 1:1
  const collapsed: string[] = [];
  for (const name of stringSeq) {
    if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== name) {
      collapsed.push(name);
    }
  }

  const sorted = [...events].sort((a, b) => a.startTick - b.startTick);

  // Group notes into chord hits (notes within TOLERANCE ticks = same hit, accounts for strum)
  const TOLERANCE = 60;
  const hits: { tick: number; notes: number[] }[] = [];
  let group = { tick: sorted[0].startTick, notes: [sorted[0].note] };

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTick - group.tick <= TOLERANCE) {
      group.notes.push(sorted[i].note);
    } else {
      hits.push(group);
      group = { tick: sorted[i].startTick, notes: [sorted[i].note] };
    }
  }
  hits.push(group);

  // Normalize note sets for comparison (sort ascending)
  for (const h of hits) h.notes.sort((a, b) => a - b);

  // Build regions by merging consecutive same-chord hits
  const notesMatch = (a: number[], b: number[]) =>
    a.length === b.length && a.every((n, j) => n === b[j]);

  const parentRoot = rootMidi - getModeOffset(mode);
  const regions: ChordRegion[] = [];
  let regionStart = 0;
  let currentNotes = hits[0].notes;
  let regionIndex = 0;

  for (let i = 1; i < hits.length; i++) {
    if (!notesMatch(hits[i].notes, currentNotes)) {
      const known = collapsed[regionIndex];
      regions.push({
        id: nextChordId(),
        startTick: snapToQuarter(regionStart),
        endTick: snapToQuarter(hits[i].tick),
        name: known
          ? abbreviateSequence(ionianToModeLabel(known, mode))
          : abbreviateSequence(chordName(currentNotes)),
        noteName: known
          ? degreeToNoteName(known, rootMidi, mode)
          : abbreviateSequence(chordName(currentNotes)),
        color: known
          ? getChordColor(known, parentRoot)
          : getChordColorFromNotes(currentNotes, rootMidi, mode),
        degreeKey: known ? ionianToModeLabel(known, mode) : undefined,
        midis: [...currentNotes],
      });
      regionStart = hits[i].tick;
      currentNotes = hits[i].notes;
      regionIndex++;
    }
  }

  // Final region extends to end of 4 bars
  const knownFinal = collapsed[regionIndex];
  regions.push({
    id: nextChordId(),
    startTick: snapToQuarter(regionStart),
    endTick: 7680,
    name: knownFinal
      ? abbreviateSequence(ionianToModeLabel(knownFinal, mode))
      : abbreviateSequence(chordName(currentNotes)),
    noteName: knownFinal
      ? degreeToNoteName(knownFinal, rootMidi, mode)
      : abbreviateSequence(chordName(currentNotes)),
    color: knownFinal
      ? getChordColor(knownFinal, parentRoot)
      : getChordColorFromNotes(currentNotes, rootMidi, mode),
    degreeKey: knownFinal ? ionianToModeLabel(knownFinal, mode) : undefined,
    midis: [...currentNotes],
  });

  return regions;
}

// ── Shared label helpers (used by derivation and reconcile logic) ─────────

function noteLabelFromNotes(notes: number[], keyPc: number): string {
  const match = detectChordWithInversion(notes);
  if (match) {
    return abbreviateSequence(
      `${noteNameInKey(match.rootPc, keyPc)} ${match.quality}`,
    );
  }
  const raw = chordName(notes);
  const bassPc = notes[0] % 12;
  const oldLetter = noteNameLetter(bassPc);
  const newLetter = noteNameInKey(bassPc, keyPc);
  return abbreviateSequence(raw.replace(oldLetter, newLetter));
}

function rawDegreeKeyFromNotes(
  notes: number[],
  keyPc: number,
): string | undefined {
  const match = detectChordWithInversion(notes);
  if (!match) return undefined;
  return resolveDegreeKey(match.rootPc, match.quality, keyPc);
}

function degreeLabelFromNotes(notes: number[], keyPc: number): string {
  const raw = rawDegreeKeyFromNotes(notes, keyPc);
  return raw ? abbreviateSequence(raw) : noteLabelFromNotes(notes, keyPc);
}

// ── Reconcile chord regions (Replace / Locked / Merge) ──────────────────

function regionsOverlap(a: ChordRegion, b: ChordRegion): boolean {
  return a.startTick < b.endTick && a.endTick > b.startTick;
}

function reconcileChordRegions(
  existing: ChordRegion[],
  incoming: ChordRegion[],
  mode: ChordRecordMode,
  rootMidi: number,
  currentMode: string,
): ChordRegion[] {
  // Fast path: nothing existing → all modes just accept incoming
  if (existing.length === 0) return incoming;

  if (mode === 'replace') return incoming;

  const keyPc = rootMidi % 12;

  if (mode === 'locked') {
    // Keep all existing regions. Only add incoming regions (or slices of them)
    // that don't overlap any existing region.
    const result = [...existing];
    for (const inc of incoming) {
      // Check if any existing region overlaps this incoming region
      const overlapping = existing.filter((ex) => regionsOverlap(ex, inc));
      if (overlapping.length === 0) {
        result.push(inc);
        continue;
      }
      // Try to fit the incoming region into gaps between existing regions
      let cursor = inc.startTick;
      const overlappingSorted = [...overlapping].sort(
        (a, b) => a.startTick - b.startTick,
      );
      for (const ex of overlappingSorted) {
        if (cursor < ex.startTick) {
          // Gap before this existing region
          result.push({
            ...inc,
            id: nextChordId(),
            startTick: cursor,
            endTick: ex.startTick,
          });
        }
        cursor = Math.max(cursor, ex.endTick);
      }
      // Gap after last overlapping region
      if (cursor < inc.endTick) {
        result.push({
          ...inc,
          id: nextChordId(),
          startTick: cursor,
          endTick: inc.endTick,
        });
      }
    }
    return result.sort((a, b) => a.startTick - b.startTick);
  }

  // mode === 'merge'
  // For overlapping positions, union pitch classes and recalculate chord identity.
  // Non-overlapping regions from both sides pass through unchanged.
  const result: ChordRegion[] = [];
  const usedExisting = new Set<string>();

  for (const inc of incoming) {
    const overlapping = existing.filter((ex) => regionsOverlap(ex, inc));
    if (overlapping.length === 0) {
      result.push(inc);
      continue;
    }
    for (const ex of overlapping) {
      usedExisting.add(ex.id);
      // Union pitch classes from both regions
      const pcSet = new Set<number>();
      for (const m of ex.midis ?? []) pcSet.add(m % 12);
      for (const m of inc.midis ?? []) pcSet.add(m % 12);
      // Reconstruct at octave 4 for detection
      const combined = Array.from(pcSet)
        .sort((a, b) => a - b)
        .map((pc) => 60 + pc);

      const noteLabel = noteLabelFromNotes(combined, keyPc);
      const degreeLabel = degreeLabelFromNotes(combined, keyPc);
      const rawKey = rawDegreeKeyFromNotes(combined, keyPc);

      // Use the union of the two regions' time spans
      const mergedStart = Math.min(ex.startTick, inc.startTick);
      const mergedEnd = Math.max(ex.endTick, inc.endTick);

      result.push({
        id: ex.id, // preserve existing region ID
        startTick: mergedStart,
        endTick: mergedEnd,
        rawStartTick: ex.rawStartTick,
        name: degreeLabel,
        noteName: noteLabel,
        color: rawKey
          ? getChordColor(rawKey, rootMidi, currentMode)
          : getChordColorFromNotes(combined, rootMidi, currentMode),
        degreeKey: rawKey,
        midis: combined,
      });
    }
  }
  // Add non-overlapping existing regions
  for (const ex of existing) {
    if (!usedExisting.has(ex.id)) {
      result.push(ex);
    }
  }
  // Add non-overlapping incoming regions (those with no overlapping existing)
  // These were already added in the loop above.

  return result.sort((a, b) => a.startTick - b.startTick);
}

// ── Phase 9: Chord confidence scoring ────────────────────────────────────

/**
 * Compute a 0-1 confidence score for a chord hit based on:
 *   - Pitch class count (3+ = high, 2 = medium)
 *   - Onset simultaneity (tight attack spread = high)
 *   - Register coherence (notes within ~14 semitones = high)
 *   - Velocity consistency (low CV = chord-like strum)
 *   - Duration similarity (similar durations = chord voicing)
 */
function computeHitConfidence(
  events: MidiNoteEvent[],
  originalCount: number,
): number {
  if (events.length === 0) return 0;

  const notes = events.map((e) => e.note).sort((a, b) => a - b);
  const pcs = new Set(notes.map((n) => n % 12));

  // 1. Pitch class count (weight: 0.25)
  let pcScore: number;
  if (pcs.size >= 4) pcScore = 1.0;
  else if (pcs.size === 3) pcScore = 0.85;
  else if (pcs.size === 2)
    pcScore = 0.5; // power chord
  else pcScore = 0;

  // 2. Onset simultaneity (weight: 0.20)
  // How tightly clustered are the attacks? Max spread within onset.
  const ticks = events.map((e) => e.startTick);
  const tickSpread = Math.max(...ticks) - Math.min(...ticks);
  // 0 spread = perfect, 30 (ONSET_TOLERANCE) = still good, beyond = weaker
  const onsetScore = Math.max(0, 1.0 - tickSpread / 60);

  // 3. Register coherence (weight: 0.15)
  const range = notes[notes.length - 1] - notes[0];
  const registerScore = range <= 14 ? 1.0 : range <= 24 ? 0.6 : 0.3;

  // 4. Velocity consistency (weight: 0.15)
  const vels = events.map((e) => e.velocity);
  const velMean = vels.reduce((a, b) => a + b, 0) / vels.length;
  let velScore = 1.0;
  if (vels.length >= 2 && velMean > 0) {
    const velStd = Math.sqrt(
      vels.reduce((sum, v) => sum + (v - velMean) ** 2, 0) / vels.length,
    );
    const cv = velStd / velMean;
    velScore = cv < 0.15 ? 1.0 : cv < 0.3 ? 0.7 : 0.4;
  }

  // 5. Duration similarity (weight: 0.15)
  const durs = events.map((e) => e.durationTicks);
  const durMean = durs.reduce((a, b) => a + b, 0) / durs.length;
  let durScore = 1.0;
  if (durs.length >= 2 && durMean > 0) {
    const durStd = Math.sqrt(
      durs.reduce((sum, d) => sum + (d - durMean) ** 2, 0) / durs.length,
    );
    const durCv = durStd / durMean;
    durScore = durCv < 0.2 ? 1.0 : durCv < 0.5 ? 0.6 : 0.3;
  }

  // 6. Stripped notes penalty (weight: 0.10)
  // If velocity/register filtering removed notes, slightly lower confidence
  const strippedRatio = events.length / Math.max(originalCount, 1);
  const strippedScore =
    strippedRatio >= 0.9 ? 1.0 : strippedRatio >= 0.7 ? 0.7 : 0.4;

  // Weighted sum
  return (
    pcScore * 0.25 +
    onsetScore * 0.2 +
    registerScore * 0.15 +
    velScore * 0.15 +
    durScore * 0.15 +
    strippedScore * 0.1
  );
}

/** Derive chord regions from recorded MIDI (no stringSeq — pure detection). */
export function deriveChordRegionsFromNotes(
  events: MidiNoteEvent[],
  rootMidi: number,
  mode: string = 'ionian',
): ChordRegion[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.startTick - b.startTick);

  // ── Phase 2: Onset clustering ──
  // Group notes by simultaneous attack (tight TOLERANCE window).
  // Only notes whose startTick falls within ONSET_TOLERANCE of the group's
  // first note are considered part of the same onset cluster.
  const ONSET_TOLERANCE = 30;
  const onsets: { tick: number; events: MidiNoteEvent[] }[] = [];
  let group = { tick: sorted[0].startTick, events: [sorted[0]] };

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startTick - group.tick <= ONSET_TOLERANCE) {
      group.events.push(sorted[i]);
    } else {
      onsets.push(group);
      group = { tick: sorted[i].startTick, events: [sorted[i]] };
    }
  }
  onsets.push(group);

  // ── Phase 3: Sustain-aware chord hits ──
  // For each onset, build the chord from newly attacked notes only.
  // If new attacks are < 3 unique PCs, check if a previous chord is still
  // sustaining — if so, the new notes are melody over the sustained chord.
  //
  // ── Phase 6: Velocity profile ──
  // When an onset has enough PCs but velocities are extremely inconsistent
  // (one loud note + several quiet ones), the loud outlier may be a melody
  // accent over a soft chord pad. We skip onsets where a single note's
  // velocity deviates > 50 from the mean AND the onset has exactly 1 outlier.
  const hits: { tick: number; notes: number[]; confidence: number }[] = [];
  let lastChordEnd = 0; // latest endTick of the most recent chord's notes

  for (const onset of onsets) {
    const newNotes = onset.events.map((e) => e.note);
    newNotes.sort((a, b) => a - b);
    const newPcs = new Set(newNotes.map((n) => n % 12));

    const isChordSized = newPcs.size >= 3;
    const isPowerChord =
      newPcs.size === 2 &&
      (() => {
        const arr = [...newPcs].sort((a, b) => a - b);
        return (arr[1] - arr[0] + 12) % 12 === 7;
      })();

    if (isChordSized || isPowerChord) {
      // Phase 6: check for a single velocity outlier that may be melody
      let chordEvents = onset.events;
      if (chordEvents.length >= 4) {
        const vels = chordEvents.map((e) => e.velocity);
        const mean = vels.reduce((a, b) => a + b, 0) / vels.length;
        const outliers = chordEvents.filter(
          (e) => Math.abs(e.velocity - mean) > 50,
        );
        if (outliers.length === 1) {
          // Strip the velocity outlier if remaining notes still form a chord
          const remaining = chordEvents.filter((e) => e !== outliers[0]);
          const remainPcs = new Set(remaining.map((e) => e.note % 12));
          if (remainPcs.size >= 3) {
            chordEvents = remaining;
          }
        }
      }

      const chordNotes = chordEvents.map((e) => e.note).sort((a, b) => a - b);

      // ── Phase 9: Compute per-hit confidence score ──
      const conf = computeHitConfidence(chordEvents, onset.events.length);

      hits.push({ tick: onset.tick, notes: chordNotes, confidence: conf });
      // Track when these chord notes end (for sustain detection)
      lastChordEnd = Math.max(
        ...chordEvents.map((e) => e.startTick + e.durationTicks),
      );
    } else if (onset.tick >= lastChordEnd) {
      // No chord is sustaining — these isolated notes still get recorded
      // (they'll likely be filtered by the chord-size gate below, but
      // if someone plays a power chord as two quick sequential notes
      // they should still pass)
      hits.push({ tick: onset.tick, notes: newNotes, confidence: 0.3 });
    }
    // else: a chord is still sustaining and new notes are < 3 PCs → melody, skip
  }

  // Phase 1 gate: filter out hits with < 3 unique PCs (except power chords)
  const chordHits = hits.filter((h) => {
    const pcs = new Set(h.notes.map((n) => n % 12));
    if (pcs.size >= 3) return true;
    if (pcs.size === 2) {
      const arr = [...pcs].sort((a, b) => a - b);
      return (arr[1] - arr[0] + 12) % 12 === 7;
    }
    return false;
  });

  if (chordHits.length === 0) return [];

  // ── Phase 4: Register separation ──
  // If a hit spans > 14 semitones, strip outlier notes in a higher register
  // that are likely melody, as long as the remaining cluster is still a chord.
  const REGISTER_SPAN = 14;
  for (const h of chordHits) {
    if (h.notes.length < 4) continue; // need 4+ to strip and still have 3
    const lo = h.notes[0]; // already sorted ascending
    const hi = h.notes[h.notes.length - 1];
    if (hi - lo <= REGISTER_SPAN) continue;
    // Keep notes within REGISTER_SPAN of the lowest; check the cluster is valid
    const cluster = h.notes.filter((n) => n - lo <= REGISTER_SPAN);
    const clusterPcs = new Set(cluster.map((n) => n % 12));
    if (clusterPcs.size >= 3) {
      h.notes = cluster;
    }
  }

  // Build note-letter and degree labels for each hit
  const keyPc = rootMidi % 12;

  const noteLabelForHit = (notes: number[]) => noteLabelFromNotes(notes, keyPc);
  const rawDegreeKeyForHit = (notes: number[]) =>
    rawDegreeKeyFromNotes(notes, keyPc);
  const degreeLabelForHit = (notes: number[]) =>
    degreeLabelFromNotes(notes, keyPc);

  // Build regions by merging consecutive same-chord hits
  const regions: ChordRegion[] = [];
  let regionStart = chordHits[0].tick;
  let currentNotes = chordHits[0].notes;
  let currentNoteLabel = noteLabelForHit(currentNotes);
  let currentDegreeLabel = degreeLabelForHit(currentNotes);
  let regionConfidences = [chordHits[0].confidence];

  for (let i = 1; i < chordHits.length; i++) {
    const nextNoteLabel = noteLabelForHit(chordHits[i].notes);
    if (nextNoteLabel !== currentNoteLabel) {
      const rawKey = rawDegreeKeyForHit(currentNotes);
      const avgConf =
        regionConfidences.reduce((a, b) => a + b, 0) / regionConfidences.length;
      regions.push({
        id: nextChordId(),
        startTick: snapToQuarter(regionStart),
        endTick: snapToQuarter(chordHits[i].tick),
        rawStartTick: regionStart,
        name: currentDegreeLabel,
        noteName: currentNoteLabel,
        color: rawKey
          ? getChordColor(rawKey, rootMidi, mode)
          : getChordColorFromNotes(currentNotes, rootMidi, mode),
        degreeKey: rawKey,
        midis: [...currentNotes],
        confidence: Math.round(avgConf * 100) / 100,
      });
      regionStart = chordHits[i].tick;
      currentNotes = chordHits[i].notes;
      currentNoteLabel = nextNoteLabel;
      currentDegreeLabel = degreeLabelForHit(chordHits[i].notes);
      regionConfidences = [chordHits[i].confidence];
    } else {
      regionConfidences.push(chordHits[i].confidence);
    }
  }

  // Final region extends to last event's end
  const lastEvent = sorted[sorted.length - 1];
  const rawKeyFinal = rawDegreeKeyForHit(currentNotes);
  const avgConfFinal =
    regionConfidences.reduce((a, b) => a + b, 0) / regionConfidences.length;
  regions.push({
    id: nextChordId(),
    startTick: snapToQuarter(regionStart),
    endTick: snapToQuarter(lastEvent.startTick + lastEvent.durationTicks),
    rawStartTick: regionStart,
    name: currentDegreeLabel,
    noteName: currentNoteLabel,
    color: rawKeyFinal
      ? getChordColor(rawKeyFinal, rootMidi, mode)
      : getChordColorFromNotes(currentNotes, rootMidi, mode),
    degreeKey: rawKeyFinal,
    midis: [...currentNotes],
    confidence: Math.round(avgConfFinal * 100) / 100,
  });

  // Remove zero-length regions and deduplicate same-startTick (from snapToQuarter collisions)
  const cleaned: ChordRegion[] = [];
  for (const r of regions) {
    if (r.startTick >= r.endTick) continue;
    if (
      cleaned.length > 0 &&
      cleaned[cleaned.length - 1].startTick === r.startTick
    ) {
      cleaned[cleaned.length - 1] = r;
    } else {
      cleaned.push(r);
    }
  }

  // Extend first/last region to cover all events (snapToQuarter may shift boundaries)
  if (cleaned.length > 0) {
    cleaned[0].startTick = Math.min(cleaned[0].startTick, sorted[0].startTick);
    const lastEnd = lastEvent.startTick + lastEvent.durationTicks;
    cleaned[cleaned.length - 1].endTick = Math.max(
      cleaned[cleaned.length - 1].endTick,
      lastEnd,
    );
  }

  return cleaned;
}

/**
 * Convert audio chord detection snapshots (captured during recording)
 * into ChordRegion[] for the chord ruler.
 */
export function deriveChordRegionsFromAudioSnapshots(
  snapshots: { tick: number; notes: number[] }[],
  rootMidi: number,
  mode: string = 'ionian',
): ChordRegion[] {
  if (snapshots.length === 0) return [];

  // Filter out melody snapshots (< 3 unique pitch classes, unless power chord)
  const chordSnapshots = snapshots.filter((s) => {
    const pcs = new Set(s.notes.map((n) => n % 12));
    if (pcs.size >= 3) return true;
    if (pcs.size === 2) {
      const arr = [...pcs].sort((a, b) => a - b);
      return (arr[1] - arr[0] + 12) % 12 === 7;
    }
    return false;
  });

  if (chordSnapshots.length === 0) return [];

  const keyPc = rootMidi % 12;

  const noteLabelForNotes = (notes: number[]) =>
    noteLabelFromNotes(notes, keyPc);
  const rawDegreeKeyForNotes = (notes: number[]) =>
    rawDegreeKeyFromNotes(notes, keyPc);
  const degreeLabelForNotes = (notes: number[]) =>
    degreeLabelFromNotes(notes, keyPc);

  // Merge consecutive snapshots with same chord label into regions
  const regions: ChordRegion[] = [];
  let regionStart = chordSnapshots[0].tick;
  let currentNotes = chordSnapshots[0].notes;
  let currentNoteLabel = noteLabelForNotes(currentNotes);
  let currentDegreeLabel = degreeLabelForNotes(currentNotes);

  for (let i = 1; i < chordSnapshots.length; i++) {
    const nextLabel = noteLabelForNotes(chordSnapshots[i].notes);
    if (nextLabel !== currentNoteLabel) {
      const rawKey = rawDegreeKeyForNotes(currentNotes);
      regions.push({
        id: nextChordId(),
        startTick: snapToQuarter(regionStart),
        endTick: snapToQuarter(chordSnapshots[i].tick),
        rawStartTick: regionStart,
        name: currentDegreeLabel,
        noteName: currentNoteLabel,
        color: rawKey
          ? getChordColor(rawKey, rootMidi, mode)
          : getChordColorFromNotes(currentNotes, rootMidi, mode),
        degreeKey: rawKey,
        midis: [...currentNotes],
      });
      regionStart = chordSnapshots[i].tick;
      currentNotes = chordSnapshots[i].notes;
      currentNoteLabel = nextLabel;
      currentDegreeLabel = degreeLabelForNotes(chordSnapshots[i].notes);
    }
  }

  // Final region extends to last snapshot + a quarter note
  const lastTick = chordSnapshots[chordSnapshots.length - 1].tick;
  const rawKeyFinal = rawDegreeKeyForNotes(currentNotes);
  regions.push({
    id: nextChordId(),
    startTick: snapToQuarter(regionStart),
    endTick: snapToQuarter(lastTick + 480),
    rawStartTick: regionStart,
    name: currentDegreeLabel,
    noteName: currentNoteLabel,
    color: rawKeyFinal
      ? getChordColor(rawKeyFinal, rootMidi, mode)
      : getChordColorFromNotes(currentNotes, rootMidi, mode),
    degreeKey: rawKeyFinal,
    midis: [...currentNotes],
  });

  // Remove zero-length regions and deduplicate same-startTick (from snapToQuarter collisions)
  const cleaned: ChordRegion[] = [];
  for (const r of regions) {
    if (r.startTick >= r.endTick) continue;
    if (
      cleaned.length > 0 &&
      cleaned[cleaned.length - 1].startTick === r.startTick
    ) {
      cleaned[cleaned.length - 1] = r;
    } else {
      cleaned.push(r);
    }
  }

  // Extend first/last region to cover all chord snapshots
  if (cleaned.length > 0) {
    cleaned[0].startTick = Math.min(
      cleaned[0].startTick,
      chordSnapshots[0].tick,
    );
    cleaned[cleaned.length - 1].endTick = Math.max(
      cleaned[cleaned.length - 1].endTick,
      lastTick + 480,
    );
  }

  return cleaned;
}

// ── Phase 7B: Multi-track chord derivation ──────────────────────────────

/**
 * Derive chord regions from all tracks in the session, using track roles
 * to decide which notes contribute to harmony vs melody vs bass.
 */
export function deriveChordRegionsFromSession(
  tracks: Track[],
  rootMidi: number,
  mode: string = 'ionian',
): ChordRegion[] {
  const harmonyEvents: MidiNoteEvent[] = [];
  const bassEvents: MidiNoteEvent[] = [];

  for (const track of tracks) {
    if (track.type !== 'midi') continue;
    const events = track.midiClips.flatMap((c) => c.events);
    if (events.length === 0) continue;

    const role =
      track.trackRole === 'auto'
        ? guessTrackRole(track.name, track.instrument)
        : track.trackRole;

    switch (role) {
      case 'chords':
      case 'auto':
        harmonyEvents.push(...events);
        break;
      case 'bass':
        bassEvents.push(...events);
        break;
      case 'melody':
      case 'drums':
        break; // excluded from chord detection
    }
  }

  if (harmonyEvents.length === 0) return [];

  const regions = deriveChordRegionsFromNotes(harmonyEvents, rootMidi, mode);
  return enrichWithBass(regions, bassEvents, rootMidi);
}

// ── Phase 7C: Bass note enrichment ──────────────────────────────────────

/**
 * Enrich chord regions with bass note information. If the bass plays a
 * different pitch class than the chord root, the chord becomes a slash
 * chord (e.g., C maj → C maj/E for first inversion).
 */
function enrichWithBass(
  regions: ChordRegion[],
  bassEvents: MidiNoteEvent[],
  rootMidi: number,
): ChordRegion[] {
  if (bassEvents.length === 0 || regions.length === 0) return regions;

  const sorted = [...bassEvents].sort((a, b) => a.startTick - b.startTick);
  const keyPc = rootMidi % 12;

  return regions.map((region) => {
    // Find bass notes within this region's time span
    const bassInRegion = sorted.filter(
      (e) => e.startTick >= region.startTick && e.startTick < region.endTick,
    );
    if (bassInRegion.length === 0) return region;

    // Use the first bass note as the bass pitch class
    const bassPc = bassInRegion[0].note % 12;

    // Parse the current chord to check if bass matches the root
    const parsed = parseNoteNameChord(region.noteName);
    if (!parsed || parsed.rootPc === bassPc) return region;

    // Bass differs from chord root → slash chord
    const bassLetter = noteNameInKey(bassPc, keyPc);
    return {
      ...region,
      noteName: `${region.noteName}/${bassLetter}`,
    };
  });
}

// ── Phase 8: UNISON Melody Feedback Loop ─────────────────────────────────

/**
 * Re-derive chord regions after UNISON identifies a melody track.
 * If the melody track has trackRole 'auto', exclude it from harmony.
 * For same-track melody+chords, strip notes within the melody pitch range
 * from chord hits (they're likely melody notes over held chords).
 */
export function refineChordRegionsWithMelody(
  tracks: Track[],
  rootMidi: number,
  mode: string,
  melodyTrackId: string,
  melodyPitchRange: { low: number; high: number },
): ChordRegion[] {
  const harmonyEvents: MidiNoteEvent[] = [];
  const bassEvents: MidiNoteEvent[] = [];

  for (const track of tracks) {
    if (track.type !== 'midi') continue;
    const events = track.midiClips.flatMap((c) => c.events);
    if (events.length === 0) continue;

    const role =
      track.trackRole === 'auto'
        ? guessTrackRole(track.name, track.instrument)
        : track.trackRole;

    // If UNISON identified this auto track as melody, skip it
    if (
      track.id === melodyTrackId &&
      (role === 'auto' || track.trackRole === 'auto')
    ) {
      continue;
    }

    switch (role) {
      case 'chords':
      case 'auto': {
        // For auto tracks, strip notes in the melody pitch range
        // (they're likely melody notes on a mixed track)
        const filtered = events.filter((e) => {
          if (role !== 'auto') return true;
          return (
            e.note < melodyPitchRange.low || e.note > melodyPitchRange.high
          );
        });
        harmonyEvents.push(...(filtered.length > 0 ? filtered : events));
        break;
      }
      case 'bass':
        bassEvents.push(...events);
        break;
      case 'melody':
      case 'drums':
        break;
    }
  }

  if (harmonyEvents.length === 0) return [];

  const regions = deriveChordRegionsFromNotes(harmonyEvents, rootMidi, mode);
  return enrichWithBass(regions, bassEvents, rootMidi);
}

// ── Slice ────────────────────────────────────────────────────────────────

export const createPrismSlice: StateCreator<
  AllSlices,
  [['zustand/subscribeWithSelector', never]],
  [],
  PrismSlice
> = (set, get) => ({
  // ── State ──
  chordSeq: [],
  stringSeq: [],
  rootNote: null,

  mode: 'ionian',

  rhythmName: 'Quarters',
  genre: 'Pop',
  swing: 0,

  strumMode: StrumMode.Synchronized,
  strumAmount: 0,
  tiltMode: VelocityTilt.Balanced,
  tiltAmount: 0,

  availableFirstChords: getFirstChords(),
  availableNextChords: [],
  chordRegions: [],
  filterPercent: 1.0,
  selectedTrackId: 'demo-chords',
  rootTrackColor: null,
  rootLocked: false,
  chordRulerShowNotes: false,
  chordRecordMode: 'replace',
  melodyOverrides: [] as string[],

  // ── Actions — parameters ──

  setRootNote: (root) => {
    if (root === null) {
      set({ rootNote: null, rootTrackColor: null, rootLocked: false });
      return;
    }
    if (get().rootLocked) return;

    const clamped = Math.max(0, Math.min(11, root));
    const { stringSeq, tracks, mode: currentMode, chordRegions } = get();
    const hex = getModeTrackColor(clamped, currentMode);

    // Batch all updates into a single set() to avoid cascading re-renders
    const updates: Record<string, unknown> = {
      rootNote: clamped,
      rootTrackColor: hex,
      tracks: tracks.map((t) => ({ ...t, color: hex })),
    };

    if (stringSeq.length > 0) {
      const rootMidi = clamped + 48;
      updates.chordSeq = normalizeSequence(
        stringSeq.map((name) => degreeNameToChord(name, rootMidi, currentMode)),
      );
    }

    if (chordRegions.length > 0) {
      updates.chordRegions = rederiveChordRegions(
        chordRegions,
        clamped + 48,
        currentMode,
      );
    }

    set(updates);
  },

  toggleRootLock: () => set((s) => ({ rootLocked: !s.rootLocked })),

  toggleChordRulerLabels: () =>
    set((s) => ({ chordRulerShowNotes: !s.chordRulerShowNotes })),

  setChordRecordMode: (mode) => set({ chordRecordMode: mode }),

  setMode: (mode) => {
    const { rootNote, stringSeq, tracks, chordRegions } = get();
    if (rootNote === null) {
      set({ mode });
      return;
    }
    const hex = getModeTrackColor(rootNote, mode);
    const updates: Record<string, unknown> = {
      mode,
      rootTrackColor: hex,
      tracks: tracks.map((t) => ({ ...t, color: hex })),
    };

    if (stringSeq.length > 0) {
      const rootMidi = rootNote + 48;
      updates.chordSeq = normalizeSequence(
        stringSeq.map((name) => degreeNameToChord(name, rootMidi, mode)),
      );
    }

    if (chordRegions.length > 0) {
      updates.chordRegions = rederiveChordRegions(chordRegions, rootNote + 48, mode);
    }

    set(updates);
  },

  setRhythm: (name) => set({ rhythmName: name }),

  selectGenre: (genre) => {
    const rhythm = findRandomRhythmForGenre(genre);
    const swing = GENRE_SWING[genre as keyof typeof GENRE_SWING] ?? 0;
    const strum = GENRE_STRUM[genre] ?? { mode: 0, amount: 0 };
    set({
      genre,
      swing,
      strumMode: strum.mode,
      strumAmount: strum.amount,
      ...(rhythm ? { rhythmName: rhythm } : {}),
    });
  },

  setSwing: (swing) => set({ swing: Math.max(0, Math.min(60, swing)) }),
  setStrumMode: (mode) => set({ strumMode: mode }),
  setStrumAmount: (amount) => set({ strumAmount: Math.max(0, amount) }),
  setTiltMode: (mode) => set({ tiltMode: mode }),
  setTiltAmount: (amount) => set({ tiltAmount: Math.max(0, amount) }),

  setFilterPercent: (percent) => {
    const clamped = Math.max(0, Math.min(1, percent));
    const { stringSeq } = get();
    set({
      filterPercent: clamped,
      availableNextChords: computeNextChords(stringSeq, clamped),
    });
  },

  // ── Actions — chord building ──

  addChord: (chordName) => {
    const { chordSeq, stringSeq, rootNote, filterPercent, mode } = get();
    const rootMidi = (rootNote ?? 0) + 48;
    const newChord = degreeNameToChord(chordName, rootMidi, mode);

    const newStringSeq = [...stringSeq, chordName];
    const newChordSeq = normalizeSequence([...chordSeq, newChord]);

    set({
      chordSeq: newChordSeq,
      stringSeq: newStringSeq,
      availableNextChords: computeNextChords(newStringSeq, filterPercent),
    });
  },

  undoChord: () => {
    const { chordSeq, stringSeq, filterPercent } = get();
    if (stringSeq.length === 0) return;

    const newStringSeq = stringSeq.slice(0, -1);
    const newChordSeq = chordSeq.slice(0, -1);

    set({
      chordSeq: newChordSeq,
      stringSeq: newStringSeq,
      availableNextChords: computeNextChords(newStringSeq, filterPercent),
    });
  },

  clearSequence: () =>
    set({
      chordSeq: [],
      stringSeq: [],
      availableNextChords: [],
      chordRegions: [],
    }),

  // ── Actions — generation (offloaded to Web Worker) ──

  generateToTracks: () => {
    const state = get();
    if (state.chordSeq.length === 0) return;

    // Must have a selected MIDI track
    const track = state.tracks.find((t) => t.id === state.selectedTrackId);
    if (!track || track.type !== 'midi') return;

    const trackId = track.id;
    const rootMidi = (state.rootNote ?? 0) + 48;

    const worker = new Worker(
      new URL('../workers/midiWorker.ts', import.meta.url),
      { type: 'module' },
    );

    worker.postMessage({
      chordSeq: state.chordSeq,
      stringSeq: state.stringSeq,
      rhythmName: state.rhythmName,
      swing: state.swing,
      strum: state.strumMode,
      strumAmount: state.strumAmount,
      tilt: state.tiltMode,
      tiltAmount: state.tiltAmount,
    });

    worker.onmessage = (e) => {
      const { events } = e.data;
      const currentState = get();

      currentState.clearMidiClips(trackId);

      const clip: MidiClip = {
        id: crypto.randomUUID(),
        startTick: 0,
        durationTicks: 7680, // 4 bars (4 × 4 × 480)
        events,
      };

      currentState.addMidiClip(trackId, clip);

      // Derive chord regions using known chord names from stringSeq
      set({
        chordRegions: deriveChordRegions(
          events,
          rootMidi,
          state.stringSeq,
          state.mode,
        ),
      });
      currentState.setClipColorMode('prism');

      worker.terminate();
    };
  },

  // ── Actions — bulk load a chord progression from suggestion engine ──

  loadProgression: (chords) => {
    const { rootNote, mode, filterPercent } = get();
    const rootMidi = (rootNote ?? 0) + 48;

    const chordSeq = normalizeSequence(chords.map((c) => c.midi));
    const stringSeq = chords.map((c) => c.degree);

    set({
      chordSeq,
      stringSeq,
      availableNextChords: computeNextChords(stringSeq, filterPercent),
      chordRegions: deriveChordRegions(
        // We need chord MIDI events for deriveChordRegions — generate a
        // simple one-hit-per-chord sequence so regions can be derived.
        chordSeq.flatMap((notes, i) =>
          notes.map((note) => ({
            note,
            velocity: 80,
            startTick: i * 1920, // 1 bar per chord
            durationTicks: 1920,
            channel: 1,
          })),
        ),
        rootMidi,
        stringSeq,
        mode,
      ),
    });
  },

  // ── Actions — orchestrate chords + drums and create tracks ──

  generateOrchestration: async () => {
    const state = get();
    if (state.chordSeq.length === 0) return;

    const rootMidi = (state.rootNote ?? 0) + 48;
    const bpm = state.bpm ?? 120;

    // Try to find a matching groove from the grooves library
    const groove = findGrooveForGenreBpm(state.genre, bpm);
    const grooveEvents = groove ? await fetchGrooveEvents(groove) : null;

    // Run orchestrator for chords (and procedural drums as fallback)
    const result = orchestrate({
      chordSeq: state.chordSeq,
      stringSeq: state.stringSeq,
      root: rootMidi,
      rhythmName: state.rhythmName,
      swing: state.swing,
      strum: state.strumMode,
      strumAmount: state.strumAmount,
      tilt: state.tiltMode,
      tiltAmount: state.tiltAmount,
      enableChords: true,
      enableDrums: !grooveEvents, // skip procedural drums if groove loaded
      enableBass: false,
      enablePad: false,
      enableMelody: false,
    });

    // Clear existing tracks (same pattern as loadProjectTemplate)
    set({ tracks: [], nextColorIndex: 0, pitchData: {} });

    // Helper to create a track (mirrors loadProjectTemplate in tracksSlice)
    const makeDrumDefaults = () => {
      const effects = structuredClone(DEFAULT_EFFECTS);
      effects.compressor = { ...effects.compressor, enabled: true };
      return { effects, activeEffects: ['compressor'] as EffectSlotType[] };
    };

    // Electric Piano 1 (GM program 4) for Jazz and R&B, Acoustic Grand Piano (0) otherwise
    const useElectricPiano = state.genre === 'Jazz' || state.genre === 'R&B';
    const chordsGmProgram = useElectricPiano ? 4 : 0;

    // ── Create Chords track ──
    const chordsColor = TRACK_PALETTES[get().nextColorIndex % TRACK_PALETTES.length];
    const chordsId = crypto.randomUUID();
    const chordsTrack: Track = {
      id: chordsId,
      name: 'Chords',
      type: 'midi',
      instrument: 'soundfont' as Track['instrument'],
      gmProgram: chordsGmProgram,
      color: chordsColor,
      mute: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      recordArmed: false,
      monitoring: false,
      midiInputId: null,
      audioInputId: null,
      audioInputChannel: null,
      effects: structuredClone(DEFAULT_EFFECTS),
      activeEffects: [] as EffectSlotType[],
      midiClips: [],
      audioClips: [],
      trackRole: guessTrackRole('Chords', 'soundfont'),
    };
    set((s) => ({ tracks: [...s.tracks, chordsTrack], nextColorIndex: s.nextColorIndex + 1 }));

    const chordSeq = result.get(InstrumentChannel.Chords);
    if (chordSeq && chordSeq.events.length > 0) {
      get().addMidiClip(chordsId, {
        id: crypto.randomUUID(),
        startTick: 0,
        durationTicks: 7680,
        events: chordSeq.events,
      });
    }

    // ── Create Drums track ──
    const drumsColor = TRACK_PALETTES[get().nextColorIndex % TRACK_PALETTES.length];
    const drumsId = crypto.randomUUID();
    const drumsTrack: Track = {
      id: drumsId,
      name: 'Drums',
      type: 'midi',
      instrument: 'drum-machine' as Track['instrument'],
      color: drumsColor,
      mute: false,
      solo: false,
      volume: 0.8,
      pan: 0,
      recordArmed: false,
      monitoring: false,
      midiInputId: null,
      audioInputId: null,
      audioInputChannel: null,
      ...makeDrumDefaults(),
      midiClips: [],
      audioClips: [],
      trackRole: guessTrackRole('Drums', 'drum-machine'),
    };
    set((s) => ({ tracks: [...s.tracks, drumsTrack], nextColorIndex: s.nextColorIndex + 1 }));

    if (grooveEvents && grooveEvents.length > 0) {
      // Use the pre-recorded groove MIDI
      const maxTick = Math.max(...grooveEvents.map((e) => e.startTick + e.durationTicks));
      get().addMidiClip(drumsId, {
        id: crypto.randomUUID(),
        startTick: 0,
        durationTicks: Math.max(7680, maxTick),
        events: grooveEvents,
      });
    } else {
      // Fallback: use procedural drum pattern from orchestrator
      const drumSeq = result.get(InstrumentChannel.Drums);
      if (drumSeq && drumSeq.events.length > 0) {
        get().addMidiClip(drumsId, {
          id: crypto.randomUUID(),
          startTick: 0,
          durationTicks: 7680,
          events: drumSeq.events,
        });
      }
    }

    // Derive chord regions from the chord track events
    if (chordSeq) {
      set({
        chordRegions: deriveChordRegions(
          chordSeq.events,
          rootMidi,
          state.stringSeq,
          state.mode,
        ),
      });
    }

    // Select first track and set Prism color mode
    set((s) => ({
      tracks: s.tracks.map((t) =>
        t.id === chordsId
          ? { ...t, monitoring: true, recordArmed: true }
          : t,
      ),
      selectedTrackId: chordsId,
    }));
    get().setClipColorMode('prism');
  },

  // ── Actions — track selection ──

  setSelectedTrackId: (id) => set({ selectedTrackId: id }),

  // ── Actions — chord regions ──

  setChordRegions: (regions, force) => {
    const tagged = regions.map((r) => (r.id ? r : { ...r, id: nextChordId() }));
    const {
      chordRecordMode,
      chordRegions: existing,
      rootNote,
      mode: currentMode,
    } = get();
    const effectiveMode = force ? 'replace' : chordRecordMode;
    const rootMidi = (rootNote ?? 0) + 48;
    const result = reconcileChordRegions(
      existing,
      tagged,
      effectiveMode,
      rootMidi,
      currentMode,
    );
    set({ chordRegions: result });
    if (result.length > 0) {
      get().setClipColorMode('prism');
    }
  },

  offsetChordRegions: (deltaTicks) =>
    set((s) => ({
      chordRegions: s.chordRegions.map((r) => ({
        ...r,
        startTick: r.startTick + deltaTicks,
        endTick: r.endTick + deltaTicks,
      })),
    })),

  refineWithMelody: (melodyTrackId, pitchRange) => {
    const state = get();
    const rootMidi = (state.rootNote ?? 0) + 48;
    const regions = refineChordRegionsWithMelody(
      state.tracks,
      rootMidi,
      state.mode,
      melodyTrackId,
      pitchRange,
    );
    if (regions.length === 0) return;

    // Only update if the refined regions differ from current ones
    // (prevents infinite loop with auto-analyze in InsightContent)
    const current = state.chordRegions;
    if (
      regions.length === current.length &&
      regions.every(
        (r, i) =>
          r.startTick === current[i].startTick &&
          r.endTick === current[i].endTick &&
          r.noteName === current[i].noteName,
      )
    ) {
      return; // No change — skip update to avoid re-triggering analysis
    }

    set({ chordRegions: regions });
  },

  // ── Actions — lead sheet chord editing ──

  insertChordRegion: (tick, name, noteName, color) =>
    set((s) => {
      const regions = [...s.chordRegions];
      const c: [number, number, number] = color ?? [128, 128, 128];
      // Find the region that contains this tick and split it
      const idx = regions.findIndex(
        (r) => r.startTick <= tick && r.endTick > tick,
      );
      if (idx >= 0) {
        const existing = regions[idx];
        if (tick === existing.startTick) {
          // Replace the existing region at this exact position
          regions[idx] = { ...existing, name, noteName, color: c };
        } else {
          // Truncate the existing region at the insertion point
          regions[idx] = { ...existing, endTick: tick };
          // Insert the new region from tick to the original endTick
          regions.splice(idx + 1, 0, {
            id: nextChordId(),
            startTick: tick,
            endTick: existing.endTick,
            name,
            noteName,
            color: c,
          });
        }
      } else {
        // No overlapping region — insert with a default 1-beat duration
        regions.push({
          id: nextChordId(),
          startTick: tick,
          endTick: tick + 480,
          name,
          noteName,
          color: c,
        });
      }
      regions.sort((a, b) => a.startTick - b.startTick);
      return { chordRegions: regions };
    }),

  deleteChordRegion: (id) =>
    set((s) => {
      const regions = [...s.chordRegions];
      const index = regions.findIndex((r) => r.id === id);
      if (index < 0) return s;
      const removed = regions[index];
      regions.splice(index, 1);
      // Fill the gap left by the removed region
      if (index > 0 && regions[index - 1]) {
        // Extend previous region forward
        regions[index - 1] = {
          ...regions[index - 1],
          endTick: removed.endTick,
        };
      } else if (index === 0 && regions.length > 0) {
        // Extend next region backward
        regions[0] = {
          ...regions[0],
          startTick: removed.startTick,
        };
      }
      return { chordRegions: regions };
    }),

  renameChordRegion: (id, newName, newNoteName) =>
    set((s) => {
      const regions = [...s.chordRegions];
      const index = regions.findIndex((r) => r.id === id);
      if (index < 0) return s;
      regions[index] = {
        ...regions[index],
        name: newName,
        noteName: newNoteName,
      };
      return { chordRegions: regions };
    }),

  resizeChordRegion: (id, newEndTick) =>
    set((s) => {
      const regions = [...s.chordRegions];
      const index = regions.findIndex((r) => r.id === id);
      if (index < 0) return s;
      // Snap to quarter note
      const snapped = Math.round(newEndTick / 480) * 480;
      const minEnd = regions[index].startTick + 480; // at least 1 beat
      // Clamp so next region keeps at least 1 beat
      const maxEnd =
        index + 1 < regions.length
          ? regions[index + 1].endTick - 480
          : Infinity;
      regions[index] = {
        ...regions[index],
        endTick: Math.min(Math.max(snapped, minEnd), maxEnd),
      };
      // Adjust the next region's start to match
      if (index + 1 < regions.length) {
        regions[index + 1] = {
          ...regions[index + 1],
          startTick: regions[index].endTick,
        };
      }
      return { chordRegions: regions };
    }),

  moveChordRegion: (id, newStartTick) =>
    set((s) => {
      const regions = [...s.chordRegions];
      const index = regions.findIndex((r) => r.id === id);
      if (index < 0) return s;
      const region = regions[index];
      const snapped = Math.max(0, Math.round(newStartTick / 480) * 480);
      if (snapped === region.startTick) return s;
      const duration = region.endTick - region.startTick;
      regions[index] = {
        ...region,
        startTick: snapped,
        endTick: snapped + duration,
      };
      // Adjust neighbors to avoid overlap
      const sorted = [...regions].sort((a, b) => a.startTick - b.startTick);
      for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].endTick > sorted[i + 1].startTick) {
          sorted[i] = { ...sorted[i], endTick: sorted[i + 1].startTick };
        }
      }
      return { chordRegions: sorted };
    }),

  insertMeasure: (measureIdx) =>
    set((s) => {
      const insertTick = measureIdx * 1920;
      return {
        chordRegions: s.chordRegions.map((r) => {
          if (r.startTick >= insertTick) {
            return {
              ...r,
              startTick: r.startTick + 1920,
              endTick: r.endTick + 1920,
            };
          }
          if (r.endTick > insertTick) {
            // Region spans the insertion point — extend it
            return { ...r, endTick: r.endTick + 1920 };
          }
          return r;
        }),
      };
    }),

  deleteMeasure: (measureIdx) =>
    set((s) => {
      const delStart = measureIdx * 1920;
      const delEnd = delStart + 1920;
      return {
        chordRegions: s.chordRegions
          .filter((r) => !(r.startTick >= delStart && r.endTick <= delEnd))
          .map((r) => {
            if (r.startTick >= delEnd) {
              return {
                ...r,
                startTick: r.startTick - 1920,
                endTick: r.endTick - 1920,
              };
            }
            if (r.endTick > delStart && r.startTick < delStart) {
              // Region spans into the deleted measure — truncate
              return { ...r, endTick: delStart };
            }
            if (r.startTick >= delStart && r.startTick < delEnd) {
              // Region starts within deleted measure but extends beyond
              return { ...r, startTick: delStart, endTick: r.endTick - 1920 };
            }
            return r;
          })
          .filter((r) => r.startTick < r.endTick),
      };
    }),

  // ── Actions — melody overrides (Phase 10) ──

  markAsMelody: (regionId) =>
    set((s) => {
      if (s.melodyOverrides.includes(regionId)) return {};
      return {
        melodyOverrides: [...s.melodyOverrides, regionId],
        chordRegions: s.chordRegions.filter((r) => r.id !== regionId),
      };
    }),

  unmarkAsMelody: (regionId) =>
    set((s) => ({
      melodyOverrides: s.melodyOverrides.filter((id) => id !== regionId),
    })),

  clearMelodyOverrides: () => set({ melodyOverrides: [] }),
});
