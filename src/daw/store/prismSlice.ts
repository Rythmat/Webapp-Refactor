import type { StateCreator } from 'zustand';
import type { AllSlices } from './index';
import type { MidiClip } from './tracksSlice';
import {
  StrumMode,
  VelocityTilt,
  type MidiNoteEvent,
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
} from '@prism/engine';

// ── Types ────────────────────────────────────────────────────────────────

let _chordIdCounter = 0;
/** Generate a stable unique ID for a ChordRegion. */
export function nextChordId(): string {
  return `cr-${++_chordIdCounter}`;
}

export interface ChordRegion {
  id: string;
  startTick: number;
  endTick: number;
  name: string;
  noteName: string;
  color: [number, number, number];
  degreeKey?: string;
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

  // Actions — chord building
  addChord: (chordName: string) => void;
  undoChord: () => void;
  clearSequence: () => void;

  // Actions — generation
  generateToTracks: () => void;

  // Actions — track selection
  setSelectedTrackId: (id: string | null) => void;

  // Actions — chord regions
  setChordRegions: (regions: ChordRegion[]) => void;
  offsetChordRegions: (deltaTicks: number) => void;

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

function recolorChordRegions(
  regions: ChordRegion[],
  rootMidi: number,
  mode: string,
): ChordRegion[] {
  const parentRoot = rootMidi - getModeOffset(mode);
  return regions.map((r) => ({
    ...r,
    color: r.degreeKey ? getChordColor(r.degreeKey, parentRoot) : r.color,
  }));
}

function findFirstRhythmForGenre(genre: string): string | undefined {
  for (const [rhythm, g] of Object.entries(GENRE_MAP)) {
    if (g === genre) return rhythm;
  }
  return undefined;
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
        degreeKey: known ?? undefined,
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
    degreeKey: knownFinal ?? undefined,
  });

  return regions;
}

/** Derive chord regions from recorded MIDI (no stringSeq — pure detection). */
export function deriveChordRegionsFromNotes(
  events: MidiNoteEvent[],
  rootMidi: number,
  mode: string = 'ionian',
): ChordRegion[] {
  if (events.length === 0) return [];

  const sorted = [...events].sort((a, b) => a.startTick - b.startTick);

  // Group notes into chord hits (notes within TOLERANCE ticks = same hit)
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

  // Sort each hit's notes ascending
  for (const h of hits) h.notes.sort((a, b) => a - b);

  // Build note-letter and degree labels for each hit
  const keyPc = rootMidi % 12;
  const ionian = ALL_MODES.ionian; // [0, 2, 4, 5, 7, 9, 11]

  function noteLabelForHit(notes: number[]): string {
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

  function degreeLabelForHit(notes: number[]): string {
    const match = detectChordWithInversion(notes);
    if (!match) return noteLabelForHit(notes);
    const diff = (match.rootPc - keyPc + 12) % 12;
    const directIdx = ionian.indexOf(diff);
    if (directIdx >= 0) {
      return abbreviateSequence(`${directIdx + 1} ${match.quality}`);
    }
    const flatIdx = ionian.indexOf(diff + 1);
    if (flatIdx >= 0)
      return abbreviateSequence(`b${flatIdx + 1} ${match.quality}`);
    const sharpIdx = ionian.indexOf(diff - 1);
    if (sharpIdx >= 0)
      return abbreviateSequence(`#${sharpIdx + 1} ${match.quality}`);
    return noteLabelForHit(notes);
  }

  // Build regions by merging consecutive same-chord hits
  const regions: ChordRegion[] = [];
  let regionStart = hits[0].tick;
  let currentNotes = hits[0].notes;
  let currentNoteLabel = noteLabelForHit(currentNotes);
  let currentDegreeLabel = degreeLabelForHit(currentNotes);

  for (let i = 1; i < hits.length; i++) {
    const nextNoteLabel = noteLabelForHit(hits[i].notes);
    if (nextNoteLabel !== currentNoteLabel) {
      regions.push({
        id: nextChordId(),
        startTick: snapToQuarter(regionStart),
        endTick: snapToQuarter(hits[i].tick),
        name: currentDegreeLabel,
        noteName: currentNoteLabel,
        color: getChordColorFromNotes(currentNotes, rootMidi, mode),
      });
      regionStart = hits[i].tick;
      currentNotes = hits[i].notes;
      currentNoteLabel = nextNoteLabel;
      currentDegreeLabel = degreeLabelForHit(hits[i].notes);
    }
  }

  // Final region extends to last event's end
  const lastEvent = sorted[sorted.length - 1];
  regions.push({
    id: nextChordId(),
    startTick: snapToQuarter(regionStart),
    endTick: snapToQuarter(lastEvent.startTick + lastEvent.durationTicks),
    name: currentDegreeLabel,
    noteName: currentNoteLabel,
    color: getChordColorFromNotes(currentNotes, rootMidi, mode),
  });

  return regions;
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

  const keyPc = rootMidi % 12;
  const ionian = ALL_MODES.ionian;

  function noteLabelForNotes(notes: number[]): string {
    const match = detectChordWithInversion(notes);
    if (match) {
      return abbreviateSequence(
        `${noteNameInKey(match.rootPc, keyPc)} ${match.quality}`,
      );
    }
    const raw = chordName(notes);
    const bassPc = notes[0] % 12;
    return abbreviateSequence(
      raw.replace(noteNameLetter(bassPc), noteNameInKey(bassPc, keyPc)),
    );
  }

  function degreeLabelForNotes(notes: number[]): string {
    const match = detectChordWithInversion(notes);
    if (!match) return noteLabelForNotes(notes);
    const diff = (match.rootPc - keyPc + 12) % 12;
    const directIdx = ionian.indexOf(diff);
    if (directIdx >= 0)
      return abbreviateSequence(`${directIdx + 1} ${match.quality}`);
    const flatIdx = ionian.indexOf(diff + 1);
    if (flatIdx >= 0)
      return abbreviateSequence(`b${flatIdx + 1} ${match.quality}`);
    const sharpIdx = ionian.indexOf(diff - 1);
    if (sharpIdx >= 0)
      return abbreviateSequence(`#${sharpIdx + 1} ${match.quality}`);
    return noteLabelForNotes(notes);
  }

  // Merge consecutive snapshots with same chord label into regions
  const regions: ChordRegion[] = [];
  let regionStart = snapshots[0].tick;
  let currentNotes = snapshots[0].notes;
  let currentNoteLabel = noteLabelForNotes(currentNotes);
  let currentDegreeLabel = degreeLabelForNotes(currentNotes);

  for (let i = 1; i < snapshots.length; i++) {
    const nextLabel = noteLabelForNotes(snapshots[i].notes);
    if (nextLabel !== currentNoteLabel) {
      regions.push({
        id: nextChordId(),
        startTick: snapToQuarter(regionStart),
        endTick: snapToQuarter(snapshots[i].tick),
        name: currentDegreeLabel,
        noteName: currentNoteLabel,
        color: getChordColorFromNotes(currentNotes, rootMidi, mode),
      });
      regionStart = snapshots[i].tick;
      currentNotes = snapshots[i].notes;
      currentNoteLabel = nextLabel;
      currentDegreeLabel = degreeLabelForNotes(snapshots[i].notes);
    }
  }

  // Final region extends to last snapshot + a quarter note
  const lastTick = snapshots[snapshots.length - 1].tick;
  regions.push({
    id: nextChordId(),
    startTick: snapToQuarter(regionStart),
    endTick: snapToQuarter(lastTick + 480),
    name: currentDegreeLabel,
    noteName: currentNoteLabel,
    color: getChordColorFromNotes(currentNotes, rootMidi, mode),
  });

  return regions;
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

  // ── Actions — parameters ──

  setRootNote: (root) => {
    if (root === null) {
      set({ rootNote: null, rootTrackColor: null, rootLocked: false });
      return;
    }
    if (get().rootLocked) return;

    const clamped = Math.max(0, Math.min(11, root));
    set({ rootNote: clamped });

    // Recompute chordSeq from stringSeq with new root
    const { stringSeq, tracks, updateTrack, mode: currentMode } = get();
    if (stringSeq.length > 0) {
      const rootMidi = clamped + 48;
      const newChordSeq = stringSeq.map((name) =>
        degreeNameToChord(name, rootMidi, currentMode),
      );
      set({ chordSeq: normalizeSequence(newChordSeq) });
    }

    // Color all tracks to match the root note + mode, cache for new tracks
    const hex = getModeTrackColor(clamped, currentMode);
    set({ rootTrackColor: hex });
    for (const track of tracks) {
      updateTrack(track.id, { color: hex });
    }

    // Recolor chord regions with new root
    const { chordRegions } = get();
    if (chordRegions.length > 0) {
      set({
        chordRegions: recolorChordRegions(
          chordRegions,
          clamped + 48,
          currentMode,
        ),
      });
    }
  },

  toggleRootLock: () => set((s) => ({ rootLocked: !s.rootLocked })),

  toggleChordRulerLabels: () =>
    set((s) => ({ chordRulerShowNotes: !s.chordRulerShowNotes })),

  setMode: (mode) => {
    set({ mode });
    const { rootNote, stringSeq, tracks, updateTrack, chordRegions } = get();
    if (rootNote === null) return;
    const hex = getModeTrackColor(rootNote, mode);
    set({ rootTrackColor: hex });
    for (const track of tracks) {
      updateTrack(track.id, { color: hex });
    }

    // Recompute chordSeq with new parent root (mode offset changes pitches)
    if (stringSeq.length > 0) {
      const rootMidi = rootNote + 48;
      const newChordSeq = stringSeq.map((name) =>
        degreeNameToChord(name, rootMidi, mode),
      );
      set({ chordSeq: normalizeSequence(newChordSeq) });
    }

    // Recolor chord regions with new mode
    if (chordRegions.length > 0) {
      set({
        chordRegions: recolorChordRegions(chordRegions, rootNote + 48, mode),
      });
    }
  },

  setRhythm: (name) => set({ rhythmName: name }),

  selectGenre: (genre) => {
    const rhythm = findFirstRhythmForGenre(genre);
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

  // ── Actions — track selection ──

  setSelectedTrackId: (id) => set({ selectedTrackId: id }),

  // ── Actions — chord regions ──

  setChordRegions: (regions) =>
    set({
      chordRegions: regions.map((r) =>
        r.id ? r : { ...r, id: nextChordId() },
      ),
    }),

  offsetChordRegions: (deltaTicks) =>
    set((s) => ({
      chordRegions: s.chordRegions.map((r) => ({
        ...r,
        startTick: r.startTick + deltaTicks,
        endTick: r.endTick + deltaTicks,
      })),
    })),

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
});
