import {
  MODES,
  TRIADS,
  TETRADS,
  DEGREES,
  findTriadChords,
  findSeventhChords,
  getChordColor,
  noteNameLetter,
  abbreviateSequence,
} from '@prism/engine';
import { nextChordId, type ChordRegion } from '@/daw/store/prismSlice';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { GROOVES } from '@/daw/data/groovesLibrary';
import { importMidiFile } from '@/daw/midi/MidiFileIO';
import { chordRegionsToMidiClip } from '@/curriculum/songLibrary/exportToStudio';

/**
 * The 7 diatonic modes this generator supports. Non-diatonic mode families
 * (harmonic minor, melodic minor, etc.) don't get a Practice Track entry
 * point yet — see the Theory Module Simplification plan.
 */
export type DiatonicMode =
  | 'lydian'
  | 'ionian'
  | 'mixolydian'
  | 'dorian'
  | 'aeolian'
  | 'phrygian'
  | 'locrian';

export type PracticeOpenTrack = 'melody' | 'chords';

export interface PracticeTrackResult {
  rootNote: number;
  mode: DiatonicMode;
  bpm: number;
  openTrack: PracticeOpenTrack;
  chordRegions: ChordRegion[];
  /** Only populated when openTrack === 'melody' (chords are generated). */
  chordsClip: MidiClip | null;
  bassClip: MidiClip;
  beatClip: MidiClip;
  /** Only populated when openTrack === 'chords' (melody is generated). */
  melodyClip: MidiClip | null;
}

// ── Constants ───────────────────────────────────────────────────────────

const PPQ = 480;
const TICKS_PER_BAR = 4 * PPQ; // 1920, 4/4 time
const HALF_NOTE_TICKS = 2 * PPQ;
const QUARTER_NOTE_TICKS = PPQ;
const BPM = 96;

/** Scale degrees (1-indexed) used per mode to build the 4/5-bar progression. */
const DEGREE_SEQUENCES: Record<DiatonicMode, number[]> = {
  lydian: [1, 4, 5, 1],
  ionian: [1, 4, 5, 1],
  mixolydian: [1, 4, 5, 1],
  dorian: [1, 4, 5, 1],
  aeolian: [1, 4, 5, 1],
  // Degree-1 triad is diminished/unresolved in Locrian — use tetrads instead.
  locrian: [1, 4, 3, 7],
  // Also uses tetrads; 5 bars (not 4) — everything downstream must follow
  // this mode's actual bar count.
  phrygian: [1, 2, 6, 4, 7],
};

/** Modes whose progression is built from tetrads (TETRADS) instead of triads. */
const TETRAD_MODES = new Set<DiatonicMode>(['locrian', 'phrygian']);

/**
 * One fixed, neutral, real groove — same for every mode. This is one of
 * Studio's own curated Grooves-browser entries (`GROOVES` in
 * `daw/data/groovesLibrary.ts`): a plain, straight-ahead rock backbeat
 * (kick/snare/hi-hat, no swing, no genre-extreme character like Trap or
 * Latin), picked over the curriculum's procedural `DRUM_GROOVE_LIBRARY`
 * because that data's `positions` arrays don't encode real per-instrument
 * slot placement (they're always `[0,1,...,hitCount-1]`), so anything built
 * from it — even after fixing the tick math — never sounded musically
 * right. Reusing a real, hand-authored MIDI performance sidesteps that
 * entirely.
 */
const PRACTICE_TRACK_GROOVE_ID = 'groove-rock-2';

// ── Internal shape: one built chord per bar ────────────────────────────

interface BarChord {
  /** Semitone offsets from the tonic (rootMidi) for every chord tone. */
  intervals: number[];
  startTick: number;
  endTick: number;
  /** Long-form degree-qualified label, e.g. "4 dominant7" — for coloring/regions. */
  degreeLabel: string;
}

/** Build one chord (absolute-from-tonic semitone offsets) per scale degree in the sequence. */
function buildBarChords(mode: DiatonicMode, degreeSequence: number[]): BarChord[] {
  const useTetrads = TETRAD_MODES.has(mode);
  const chordTable = useTetrads ? findSeventhChords(mode) : findTriadChords(mode);
  const qualityTable = useTetrads ? TETRADS[mode] : TRIADS[mode];
  const scaleSteps = MODES[mode];

  return degreeSequence.map((degree, barIndex) => {
    const degreeIndex = degree - 1;
    const intervals = chordTable[degreeIndex];
    const quality = qualityTable[degreeIndex];
    const degreeStep = scaleSteps[degreeIndex];
    const degreeLabel = `${DEGREES[degreeStep]} ${quality}`;

    return {
      intervals,
      startTick: barIndex * TICKS_PER_BAR,
      endTick: (barIndex + 1) * TICKS_PER_BAR,
      degreeLabel,
    };
  });
}

// ── Chord regions (harmonic skeleton) ──────────────────────────────────

function buildChordRegions(
  barChords: BarChord[],
  rootMidi: number,
  mode: DiatonicMode,
): ChordRegion[] {
  return barChords.map((bar) => {
    const midis = bar.intervals.map((offset) => rootMidi + offset);
    const chordRootLetter = noteNameLetter(rootMidi + bar.intervals[0]);
    const quality = bar.degreeLabel.slice(bar.degreeLabel.indexOf(' ') + 1);
    // getChordColor expects `mode` explicitly — omitting it silently defaults
    // to Ionian coloring (a known bug elsewhere in dawBridge.ts); don't repeat that.
    const color = getChordColor(bar.degreeLabel, rootMidi, mode);

    return {
      id: nextChordId(),
      startTick: bar.startTick,
      endTick: bar.endTick,
      name: abbreviateSequence(bar.degreeLabel),
      noteName: abbreviateSequence(`${chordRootLetter} ${quality}`),
      color,
      degreeKey: bar.degreeLabel,
      midis,
    };
  });
}

// ── Bass line (always generated) ───────────────────────────────────────

function buildBassClip(barChords: BarChord[], rootMidi: number): MidiClip {
  const bassRegister = rootMidi - 24; // 2 octaves below the chord root
  const events = barChords.flatMap((bar) => {
    const chordRoot = bassRegister + bar.intervals[0];
    // "5th-equivalent" tone read directly off the built chord (index 2 is
    // always the 5th/b5 position for both triads and tetrads in CHORDS) —
    // this stays correct even for Locrian's built-in ♭5, unlike a naive +7.
    const fifthEquivalent = bassRegister + bar.intervals[2];

    return [
      {
        note: chordRoot,
        velocity: 90,
        startTick: bar.startTick,
        durationTicks: HALF_NOTE_TICKS,
        channel: 0,
      },
      {
        note: fifthEquivalent,
        velocity: 85,
        startTick: bar.startTick + HALF_NOTE_TICKS,
        durationTicks: HALF_NOTE_TICKS,
        channel: 0,
      },
    ];
  });

  const durationTicks = barChords.length * TICKS_PER_BAR;
  return {
    id: crypto.randomUUID(),
    name: 'Bass',
    startTick: 0,
    durationTicks,
    events,
  };
}

// ── Beat/drum track (always generated, mode-agnostic) ──────────────────

/**
 * Fetch + parse the fixed practice-track groove through the exact same
 * pipeline Studio's own Grooves browser uses when a user manually drops a
 * groove onto a Drums track — see `doLoadGroove` in
 * `daw/components/Controls/GroovesBrowser.tsx`: `fetch` the `.mid` file,
 * parse it with `importMidiFile` (`daw/midi/MidiFileIO.ts`), then rescale
 * its ticks from the file's own PPQ to ours (480, matching `OUR_PPQ` in
 * GroovesBrowser).
 *
 * This groove's source file is a real ~8-bar drum performance, not a tight
 * 1-bar loop — so, mirroring GroovesBrowser exactly, the resulting clip is
 * used at its *natural* length with no forced repeat/truncate to
 * `barCount`. The practice track's transport loop range (set from
 * `bassClip.durationTicks` back in `seedStudioFromPracticeTrack.ts`) already
 * caps playback to the progression's first `barCount` bars, which has the
 * same audible effect as a user dropping this same groove on a Drums track
 * and then setting a loop region shorter than the clip: only the opening
 * bars of the performance ever play.
 */
async function buildBeatClip(barCount: number): Promise<MidiClip> {
  const fallbackClip: MidiClip = {
    id: crypto.randomUUID(),
    name: 'Drums',
    startTick: 0,
    durationTicks: barCount * TICKS_PER_BAR,
    events: [],
  };

  const groove = GROOVES.find((g) => g.id === PRACTICE_TRACK_GROOVE_ID);
  if (!groove) return fallbackClip;

  try {
    const resp = await fetch(groove.url);
    if (!resp.ok) return fallbackClip;
    const buf = await resp.arrayBuffer();
    const sequences = importMidiFile(buf);
    if (sequences.length === 0) return fallbackClip;

    const seq = sequences[0];
    const ppq = seq.ticksPerQuarterNote;
    const events = seq.events.map((evt) => ({
      ...evt,
      startTick: Math.round((evt.startTick / ppq) * PPQ),
      durationTicks: Math.round((evt.durationTicks / ppq) * PPQ),
    }));
    const durationTicks = events.reduce(
      (max, e) => Math.max(max, e.startTick + e.durationTicks),
      0,
    );

    return {
      id: crypto.randomUUID(),
      name: 'Drums',
      startTick: 0,
      durationTicks,
      events,
    };
  } catch (err) {
    console.error('Failed to load practice track groove:', err);
    return fallbackClip;
  }
}

// ── Melody (only when openTrack === 'chords') ──────────────────────────

/**
 * Simple chord-tone-outlining melody: per bar, arpeggiate root-3rd-5th-3rd
 * as quarter notes, one octave above the chord register, so the generated
 * line is audibly tied to the (invisible) underlying harmony.
 */
function buildMelodyClip(barChords: BarChord[], rootMidi: number): MidiClip {
  const melodyRegister = rootMidi + 12;
  const events = barChords.flatMap((bar) => {
    const [root, third, fifth] = bar.intervals;
    const pattern = [root, third, fifth, third];
    return pattern.map((offset, i) => ({
      note: melodyRegister + offset,
      velocity: 75,
      startTick: bar.startTick + i * QUARTER_NOTE_TICKS,
      durationTicks: QUARTER_NOTE_TICKS,
      channel: 0,
    }));
  });

  const durationTicks = barChords.length * TICKS_PER_BAR;
  return {
    id: crypto.randomUUID(),
    name: 'Melody',
    startTick: 0,
    durationTicks,
    events,
  };
}

// ── Main entry point ────────────────────────────────────────────────────

/**
 * Generate a Practice Track: a chord progression + bass line + beat, plus
 * either a generated Chords clip or a generated Melody clip (whichever
 * ISN'T `openTrack`, which is left empty for the student to fill in).
 */
export async function generatePracticeTrack(
  mode: DiatonicMode,
  root: number,
  openTrack: PracticeOpenTrack,
): Promise<PracticeTrackResult> {
  const clampedRoot = Math.max(0, Math.min(11, Math.round(root)));
  const rootMidi = 60 + clampedRoot;
  const degreeSequence = DEGREE_SEQUENCES[mode];
  const barChords = buildBarChords(mode, degreeSequence);
  const barCount = barChords.length;

  const chordRegions = buildChordRegions(barChords, rootMidi, mode);
  const chordsClip =
    openTrack === 'melody' ? chordRegionsToMidiClip(chordRegions) : null;
  const bassClip = buildBassClip(barChords, rootMidi);
  const beatClip = await buildBeatClip(barCount);
  const melodyClip =
    openTrack === 'chords' ? buildMelodyClip(barChords, rootMidi) : null;

  return {
    rootNote: clampedRoot,
    mode,
    bpm: BPM,
    openTrack,
    chordRegions,
    chordsClip,
    bassClip,
    beatClip,
    melodyClip,
  };
}
