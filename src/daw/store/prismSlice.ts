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
} from '@prism/engine';

// ── Types ────────────────────────────────────────────────────────────────

export interface ChordRegion {
  startTick: number;
  endTick: number;
  name: string;
  color: [number, number, number];
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

  // Derived / UI
  availableFirstChords: string[];
  availableNextChords: string[];
  chordRegions: ChordRegion[];
  filterPercent: number;
  selectedTrackId: string | null;
  rootTrackColor: string | null;
  rootLocked: boolean;

  // Actions — parameters
  setRootNote: (root: number | null) => void;
  toggleRootLock: () => void;
  setRhythm: (name: string) => void;
  selectGenre: (genre: string) => void;
  setSwing: (swing: number) => void;
  setStrumMode: (mode: StrumMode) => void;
  setStrumAmount: (amount: number) => void;
  setTiltMode: (mode: VelocityTilt) => void;
  setTiltAmount: (amount: number) => void;
  setFilterPercent: (percent: number) => void;

  // Actions — chord building
  addChord: (chordName: string) => void;
  undoChord: () => void;
  clearSequence: () => void;

  // Actions — generation
  generateToTracks: () => void;

  // Actions — track selection
  setSelectedTrackId: (id: string | null) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────

// Maps chromatic root (0-11) to KEY_COLORS index (circle of fifths)
const ROOT_TO_KEY_INDEX = [1, 8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6];

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
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

function degreeNameToChord(chordName: string, rootMidi: number): number[] {
  const bassMidi = degreeMidi(rootMidi, chordName);
  const quality = unstepChord(chordName);
  return generateChord(bassMidi, quality);
}

/** Derive chord regions from actual MIDI events (post-hoc from worker output). */
function deriveChordRegions(
  events: MidiNoteEvent[],
  rootMidi: number,
  stringSeq: string[],
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

  const regions: ChordRegion[] = [];
  let regionStart = 0;
  let currentNotes = hits[0].notes;
  let regionIndex = 0;

  for (let i = 1; i < hits.length; i++) {
    if (!notesMatch(hits[i].notes, currentNotes)) {
      const known = collapsed[regionIndex];
      regions.push({
        startTick: regionStart,
        endTick: hits[i].tick,
        name: known
          ? abbreviateSequence(known)
          : abbreviateSequence(chordName(currentNotes)),
        color: known
          ? getChordColor(known, rootMidi)
          : getChordColorFromNotes(currentNotes, rootMidi),
      });
      regionStart = hits[i].tick;
      currentNotes = hits[i].notes;
      regionIndex++;
    }
  }

  // Final region extends to end of 4 bars
  const knownFinal = collapsed[regionIndex];
  regions.push({
    startTick: regionStart,
    endTick: 7680,
    name: knownFinal
      ? abbreviateSequence(knownFinal)
      : abbreviateSequence(chordName(currentNotes)),
    color: knownFinal
      ? getChordColor(knownFinal, rootMidi)
      : getChordColorFromNotes(currentNotes, rootMidi),
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
    const { stringSeq, tracks, updateTrack } = get();
    if (stringSeq.length > 0) {
      const rootMidi = clamped + 48;
      const newChordSeq = stringSeq.map((name) =>
        degreeNameToChord(name, rootMidi),
      );
      set({ chordSeq: normalizeSequence(newChordSeq) });
    }

    // Color all tracks to match the root note + cache for new tracks
    const [r, g, b] = KEY_COLORS[ROOT_TO_KEY_INDEX[clamped]];
    const hex = rgbToHex(r, g, b);
    set({ rootTrackColor: hex, rootLocked: true });
    for (const track of tracks) {
      updateTrack(track.id, { color: hex });
    }
  },

  toggleRootLock: () => set((s) => ({ rootLocked: !s.rootLocked })),

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
    const { chordSeq, stringSeq, rootNote, filterPercent } = get();
    const rootMidi = (rootNote ?? 0) + 48;
    const newChord = degreeNameToChord(chordName, rootMidi);

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
        chordRegions: deriveChordRegions(events, rootMidi, state.stringSeq),
      });
      currentState.setClipColorMode('prism');

      worker.terminate();
    };
  },

  // ── Actions — track selection ──

  setSelectedTrackId: (id) => set({ selectedTrackId: id }),
});
